import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import bcrypt
from fastapi import HTTPException, Response
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.requests import Request

import app.models  # noqa: F401 - registers all relationships in Base.metadata
from app.api.auth import (
    _client_ip,
    _cleared_auth_error_response,
    _csrf_from_request,
    _set_session_cookies,
)
from app.api.dependencies import get_auth_context
from app.core.config import Settings
from app.core.security import decode_access_token, hash_password, token_digest, verify_password
from app.database.base import Base
from app.models.auth import AuthSession, AuthToken
from app.models.user import User
from app.schemas.user import PasswordChange, PasswordReset, UserCreate, UserUpdate
from app.services import auth_service, email_service
from app.services.ai_memory import copilot_memory


class AuthHardeningTests(unittest.TestCase):
    def setUp(self):
        # Tests must not inherit the developer's optional local token helper.
        copilot_memory.clear_all_for_tests()
        self.dev_token_patcher = patch.object(
            auth_service.settings,
            "AUTH_DEV_EXPOSE_TOKENS",
            False,
        )
        self.dev_token_patcher.start()
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)

    def tearDown(self):
        copilot_memory.clear_all_for_tests()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()
        self.dev_token_patcher.stop()

    def test_client_ip_ignores_untrusted_forwarding_header(self):
        request = Request(
            {
                "type": "http",
                "method": "POST",
                "path": "/auth/login",
                "headers": [(b"x-forwarded-for", b"203.0.113.77")],
                "client": ("198.51.100.10", 4321),
                "server": ("test", 80),
                "scheme": "http",
                "query_string": b"",
            }
        )

        self.assertEqual(_client_ip(request), "198.51.100.10")

    def create_verified_user(
        self,
        db,
        email="owner@example.com",
        username="owner",
        password="MotDePasse123!",
        password_hash=None,
    ):
        user = User(
            username=username,
            email=email,
            hashed_password=password_hash or hash_password(password),
            email_verified=True,
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def authenticate(self, db, email="owner@example.com", password="MotDePasse123!"):
        return auth_service.authenticate(
            db,
            email,
            password,
            ip_address="127.0.0.1",
            user_agent="auth-tests",
        )

    def test_access_claims_session_check_rotation_and_real_logout(self):
        with self.Session() as db:
            self.create_verified_user(db)
            issued = self.authenticate(db)
            claims = decode_access_token(issued.access_token)
            self.assertEqual(claims["type"], "access")
            self.assertIn("sid", claims)
            self.assertIn("jti", claims)
            self.assertIn("iat", claims)
            self.assertIn("iss", claims)
            self.assertIn("aud", claims)
            self.assertEqual(get_auth_context(issued.access_token, db).user.id, issued.user.id)
            copilot_memory.append_turn(
                issued.session.id,
                page="dashboard",
                user_content="Que dois-je suivre ?",
                assistant_content="Voici les priorités.",
                active_entity=None,
            )

            refreshed = auth_service.refresh_session(
                db,
                issued.refresh_token,
                issued.csrf_token,
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            self.assertNotEqual(refreshed.refresh_token, issued.refresh_token)
            self.assertNotEqual(refreshed.csrf_token, issued.csrf_token)
            self.assertEqual(len(copilot_memory.history(issued.session.id)), 2)

            auth_service.revoke_session_from_refresh(
                db,
                refreshed.refresh_token,
                refreshed.csrf_token,
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            self.assertEqual(copilot_memory.history(issued.session.id), [])
            with self.assertRaises(HTTPException) as context:
                get_auth_context(refreshed.access_token, db)
            self.assertEqual(context.exception.status_code, 401)

    def test_refresh_reuse_is_detected_and_revokes_session(self):
        with self.Session() as db:
            self.create_verified_user(db)
            issued = self.authenticate(db)
            auth_service.refresh_session(
                db,
                issued.refresh_token,
                issued.csrf_token,
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            with self.assertRaises(auth_service.InvalidCredentialsError):
                auth_service.refresh_session(
                    db,
                    issued.refresh_token,
                    issued.csrf_token,
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )
            stored = db.get(AuthSession, issued.session.id)
            self.assertEqual(stored.revoke_reason, "refresh_reuse")

    def test_double_submit_csrf_and_origin_are_enforced(self):
        good_scope = {
            "type": "http",
            "method": "POST",
            "path": "/auth/refresh",
            "headers": [
                (b"cookie", b"mine_crm_csrf=safe-token"),
                (b"x-csrf-token", b"safe-token"),
                (b"origin", b"http://localhost:5173"),
            ],
        }
        self.assertEqual(_csrf_from_request(Request(good_scope)), "safe-token")

        bad_origin = dict(good_scope)
        bad_origin["headers"] = [
            (b"cookie", b"mine_crm_csrf=safe-token"),
            (b"x-csrf-token", b"safe-token"),
            (b"origin", b"https://attacker.example"),
        ]
        with self.assertRaises(HTTPException) as context:
            _csrf_from_request(Request(bad_origin))
        self.assertEqual(context.exception.status_code, 403)

        missing_header = dict(good_scope)
        missing_header["headers"] = [(b"cookie", b"mine_crm_csrf=safe-token")]
        with self.assertRaises(HTTPException) as context:
            _csrf_from_request(Request(missing_header))
        self.assertEqual(context.exception.status_code, 403)

    def test_cookie_attributes_and_error_cleanup_are_preserved(self):
        response = Response()
        _set_session_cookies(response, "refresh-secret", "csrf-secret")
        cookies = response.headers.getlist("set-cookie")
        refresh_cookie = next(item for item in cookies if item.startswith("mine_crm_refresh="))
        csrf_cookie = next(item for item in cookies if item.startswith("mine_crm_csrf="))
        self.assertIn("HttpOnly", refresh_cookie)
        self.assertIn("Path=/auth", refresh_cookie)
        self.assertIn("SameSite=lax", refresh_cookie)
        self.assertNotIn("HttpOnly", csrf_cookie)
        self.assertIn("Path=/", csrf_cookie)

        cleared = _cleared_auth_error_response(401, "Session invalide.")
        deletion_headers = cleared.headers.getlist("set-cookie")
        self.assertTrue(any(item.startswith("mine_crm_refresh=") and "Max-Age=0" in item for item in deletion_headers))
        self.assertTrue(any(item.startswith("mine_crm_csrf=") and "Max-Age=0" in item for item in deletion_headers))

        with (
            patch.object(auth_service.settings, "AUTH_COOKIE_DOMAIN", None),
            patch.object(auth_service.settings, "AUTH_CSRF_COOKIE_DOMAIN", ".mine-crm.example"),
        ):
            scoped = Response()
            _set_session_cookies(scoped, "refresh-secret", "csrf-secret")
            scoped_cookies = scoped.headers.getlist("set-cookie")
        scoped_refresh = next(item for item in scoped_cookies if item.startswith("mine_crm_refresh="))
        scoped_csrf = next(item for item in scoped_cookies if item.startswith("mine_crm_csrf="))
        self.assertNotIn("Domain=", scoped_refresh)
        self.assertIn("Domain=.mine-crm.example", scoped_csrf)

    def test_production_configuration_rejects_insecure_examples(self):
        secure_values = {
            "DB_NAME": "mine_crm",
            "DB_USER": "postgres",
            "DB_PASSWORD": "database-password",
            "DB_HOST": "db.mine-crm.example",
            "DB_PORT": 5432,
            "DB_SSLMODE": "require",
            "SECRET_KEY": "4bd31c49a5324c2a863baf3d8bd62f5b5fbca047fc44b52d",
            "ALGORITHM": "HS256",
            "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
            "APP_ENV": "production",
            "FRONTEND_URL": "https://app.mine-crm.example",
            "BACKEND_URL": "https://api.mine-crm.example",
            "BACKEND_TRUSTED_HOSTS": "api.mine-crm.example",
            "AUTH_CSRF_COOKIE_DOMAIN": ".mine-crm.example",
            "AUTH_ALLOWED_ORIGINS": "https://app.mine-crm.example",
            "SMTP_HOST": "smtp.example.com",
            "SMTP_FROM_EMAIL": "security@mine-crm.example",
            "SMTP_USE_TLS": True,
            "AUTH_DEV_EXPOSE_TOKENS": False,
        }
        Settings(**secure_values)

        unsafe_variants = (
            {"SECRET_KEY": "replace-with-a-long-random-secret"},
            {"FRONTEND_URL": "http://app.mine-crm.example"},
            {"AUTH_ALLOWED_ORIGINS": "http://app.mine-crm.example"},
            {"BACKEND_URL": "http://api.mine-crm.example"},
            {"DB_HOST": "localhost"},
            {"DB_SSLMODE": "prefer"},
            {"AUTH_CSRF_COOKIE_DOMAIN": ""},
            {"SMTP_USE_TLS": False},
        )
        for overrides in unsafe_variants:
            with self.subTest(overrides=overrides), self.assertRaises(ValidationError):
                Settings(**(secure_values | overrides))

    def test_smtp_starttls_uses_system_certificate_validation(self):
        tls_context = object()
        with (
            patch.object(email_service.settings, "SMTP_HOST", "smtp.example.com"),
            patch.object(email_service.settings, "SMTP_FROM_EMAIL", "security@example.com"),
            patch.object(email_service.settings, "SMTP_USE_TLS", True),
            patch("app.services.email_service.ssl.create_default_context", return_value=tls_context),
            patch("app.services.email_service.smtplib.SMTP") as smtp_class,
        ):
            email_service.send_email("owner@example.com", "Sujet", "Message")
        smtp = smtp_class.return_value.__enter__.return_value
        smtp.starttls.assert_called_once_with(context=tls_context)

    def test_legacy_bcrypt_is_upgraded_on_successful_login(self):
        legacy_hash = bcrypt.hashpw(b"MotDePasse123!", bcrypt.gensalt()).decode("ascii")
        with self.Session() as db:
            user = self.create_verified_user(db, password_hash=legacy_hash)
            self.authenticate(db)
            db.refresh(user)
            self.assertTrue(user.hashed_password.startswith("$argon2id$"))
            self.assertTrue(verify_password("MotDePasse123!", user.hashed_password))

    def test_register_normalizes_email_verifies_once_and_blocks_username_duplicate(self):
        captured = []
        with self.Session() as db, patch(
            "app.services.email_service.send_verification_email",
            side_effect=lambda recipient, token: captured.append((recipient, token)),
        ):
            user, development_token = auth_service.register_user(
                db,
                UserCreate(
                    username=" FirstOwner ",
                    email="FIRST@Example.COM",
                    password="MotDePasse123!",
                ),
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            self.assertEqual(user.email, "first@example.com")
            self.assertFalse(user.email_verified)
            self.assertIsNone(development_token)
            self.assertEqual(captured[0][0], "first@example.com")
            with self.assertRaises(auth_service.EmailNotVerifiedError):
                self.authenticate(db, "FIRST@example.com")

            auth_service.verify_email_token(
                db,
                captured[0][1],
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            self.authenticate(db, "FIRST@example.com")
            with self.assertRaises(auth_service.InvalidTokenError):
                auth_service.verify_email_token(
                    db,
                    captured[0][1],
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )
            with self.assertRaises(auth_service.AuthConflictError):
                auth_service.register_user(
                    db,
                    UserCreate(
                        username="firstowner",
                        email="another@example.com",
                        password="MotDePasse123!",
                    ),
                    ip_address="127.0.0.2",
                    user_agent="auth-tests",
                )

    def test_password_reset_is_one_time_and_revokes_every_session(self):
        captured = []
        with self.Session() as db:
            user = self.create_verified_user(db)
            self.authenticate(db)
            self.authenticate(db)
            with patch(
                "app.services.email_service.send_password_reset_email",
                side_effect=lambda recipient, token: captured.append(token),
            ):
                auth_service.request_password_reset(
                    db,
                    "OWNER@EXAMPLE.COM",
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )
            reset = PasswordReset(
                token=captured[0], new_password="NouveauMotDePasse456!"
            )
            auth_service.reset_password(
                db,
                reset,
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            with self.assertRaises(auth_service.InvalidTokenError):
                auth_service.reset_password(
                    db,
                    reset,
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )
            sessions = db.query(AuthSession).filter_by(user_id=user.id).all()
            self.assertEqual(len(sessions), 2)
            self.assertTrue(all(session.revoked_at is not None for session in sessions))
            stored_token = db.query(AuthToken).filter_by(token_hash=token_digest(captured[0])).one()
            self.assertIsNotNone(stored_token.used_at)
            self.assertTrue(verify_password("NouveauMotDePasse456!", user.hashed_password))

    def test_progressive_login_rate_limit_is_persisted_by_email_and_ip(self):
        with self.Session() as db:
            self.create_verified_user(db)
            for _ in range(5):
                with self.assertRaises(auth_service.InvalidCredentialsError):
                    self.authenticate(db, password="MauvaisMotDePasse!")
            with self.assertRaises(auth_service.RateLimitedError) as context:
                self.authenticate(db, password="MauvaisMotDePasse!")
            self.assertGreaterEqual(context.exception.retry_after, 1)

    def test_password_change_revokes_all_sessions(self):
        with self.Session() as db:
            user = self.create_verified_user(db)
            self.authenticate(db)
            self.authenticate(db)
            auth_service.change_password(
                db,
                user,
                PasswordChange(
                    current_password="MotDePasse123!",
                    new_password="NouveauMotDePasse456!",
                ),
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            sessions = db.query(AuthSession).filter_by(user_id=user.id).all()
            self.assertEqual(len(sessions), 2)
            self.assertTrue(all(session.revoked_at is not None for session in sessions))

    def test_email_change_requires_password_and_is_pending_until_verified(self):
        captured = []
        with self.Session() as db:
            user = self.create_verified_user(db)
            issued = self.authenticate(db)
            with self.assertRaisesRegex(auth_service.AuthServiceError, "mot de passe"):
                auth_service.update_profile(
                    db,
                    user,
                    UserUpdate(email="new@example.com"),
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )

            with patch(
                "app.services.email_service.send_email_change_confirmation",
                side_effect=lambda recipient, token: captured.append((recipient, token)),
            ):
                updated, development_token = auth_service.update_profile(
                    db,
                    user,
                    UserUpdate(
                        email="NEW@Example.COM",
                        current_password="MotDePasse123!",
                    ),
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )
            self.assertEqual(updated.email, "owner@example.com")
            self.assertEqual(updated.pending_email, "new@example.com")
            self.assertIsNone(development_token)
            self.assertEqual(captured[0][0], "new@example.com")

            verified = auth_service.verify_email_token(
                db,
                captured[0][1],
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            self.assertEqual(verified.email, "new@example.com")
            self.assertIsNone(verified.pending_email)
            self.assertIsNotNone(db.get(AuthSession, issued.session.id).revoked_at)

    def test_sensitive_changes_invalidate_older_one_time_tokens(self):
        reset_tokens = []
        email_tokens = []
        with self.Session() as db:
            user = self.create_verified_user(db)
            with patch(
                "app.services.email_service.send_password_reset_email",
                side_effect=lambda recipient, token: reset_tokens.append(token),
            ):
                auth_service.request_password_reset(
                    db,
                    user.email,
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )
            with patch(
                "app.services.email_service.send_email_change_confirmation",
                side_effect=lambda recipient, token: email_tokens.append(token),
            ):
                auth_service.update_profile(
                    db,
                    user,
                    UserUpdate(
                        email="new@example.com",
                        current_password="MotDePasse123!",
                    ),
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )

            auth_service.verify_email_token(
                db,
                email_tokens[0],
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            with self.assertRaises(auth_service.InvalidTokenError):
                auth_service.reset_password(
                    db,
                    PasswordReset(
                        token=reset_tokens[0],
                        new_password="NouveauMotDePasse456!",
                    ),
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )

            reset_tokens.clear()
            with patch(
                "app.services.email_service.send_password_reset_email",
                side_effect=lambda recipient, token: reset_tokens.append(token),
            ):
                auth_service.request_password_reset(
                    db,
                    "new@example.com",
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )
            auth_service.change_password(
                db,
                user,
                PasswordChange(
                    current_password="MotDePasse123!",
                    new_password="EncoreUnMotDePasse789!",
                ),
                ip_address="127.0.0.1",
                user_agent="auth-tests",
            )
            with self.assertRaises(auth_service.InvalidTokenError):
                auth_service.reset_password(
                    db,
                    PasswordReset(
                        token=reset_tokens[0],
                        new_password="MotDePasseFinal987!",
                    ),
                    ip_address="127.0.0.1",
                    user_agent="auth-tests",
                )

    def test_sessions_and_security_events_are_scoped_to_the_user(self):
        with self.Session() as db:
            first_user = self.create_verified_user(db)
            first_session = self.authenticate(db)
            second_user = self.create_verified_user(
                db,
                email="second@example.com",
                username="second",
            )
            second_session = self.authenticate(db, "second@example.com")
            for session in (first_session.session, second_session.session):
                copilot_memory.append_turn(
                    session.id,
                    page="dashboard",
                    user_content="Question",
                    assistant_content="Réponse",
                    active_entity=None,
                )

            listed = auth_service.list_sessions(db, first_user.id)
            self.assertEqual([item.id for item in listed], [first_session.session.id])
            self.assertFalse(
                auth_service.revoke_owned_session(
                    db, first_user.id, second_session.session.id
                )
            )
            self.assertIsNone(db.get(AuthSession, second_session.session.id).revoked_at)
            self.assertEqual(len(copilot_memory.history(second_session.session.id)), 2)
            self.assertTrue(
                auth_service.revoke_owned_session(
                    db, first_user.id, first_session.session.id
                )
            )
            self.assertEqual(copilot_memory.history(first_session.session.id), [])
            auth_service.revoke_all_sessions(db, second_user.id, "logout_all")
            db.commit()
            self.assertEqual(copilot_memory.history(second_session.session.id), [])
            events = auth_service.list_security_events(db, first_user.id, 100)
            self.assertTrue(any(event.event_type == "session_revoked" for event in events))
            self.assertTrue(all(event.user_id == first_user.id for event in events))


if __name__ == "__main__":
    unittest.main()
