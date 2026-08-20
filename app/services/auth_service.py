from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    constant_time_equal,
    create_access_token,
    hash_password,
    new_csrf_token,
    new_opaque_token,
    normalized_key_digest,
    token_digest,
    verify_and_update_password,
    verify_password,
)
from app.models.auth import AuthRateLimit, AuthSession, AuthToken, SecurityEvent
from app.models.user import User
from app.schemas.user import PasswordChange, PasswordReset, UserCreate, UserUpdate, normalize_email
from app.services import email_service
from app.services.ai_memory import copilot_memory


LOGIN_WINDOW = timedelta(minutes=15)
MAX_BACKOFF = timedelta(minutes=15)
_DUMMY_PASSWORD_HASH = hash_password("not-a-real-account-password")


class AuthServiceError(ValueError):
    status_code = 400


class InvalidCredentialsError(AuthServiceError):
    status_code = 401


class EmailNotVerifiedError(AuthServiceError):
    status_code = 403


class AuthConflictError(AuthServiceError):
    status_code = 409


class InvalidTokenError(AuthServiceError):
    status_code = 400


class InvalidCsrfError(AuthServiceError):
    status_code = 403


class RateLimitedError(AuthServiceError):
    status_code = 429

    def __init__(self, retry_after: int):
        super().__init__("Trop de tentatives. Réessayez plus tard.")
        self.retry_after = max(1, retry_after)


@dataclass(frozen=True)
class IssuedSession:
    user: User
    session: AuthSession
    access_token: str
    refresh_token: str
    csrf_token: str


@dataclass(frozen=True)
class RefreshedSession:
    access_token: str
    refresh_token: str
    csrf_token: str


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _safe_user_agent(value: str | None) -> str | None:
    return value[:500] if value else None


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized = normalize_email(email)
    return db.query(User).filter(func.lower(User.email) == normalized).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(func.lower(User.username) == username.strip().casefold()).first()


def log_security_event(
    db: Session,
    event_type: str,
    *,
    user_id: int | None,
    ip_address: str | None,
    user_agent: str | None,
    success: bool = True,
    details: dict | None = None,
) -> SecurityEvent:
    event = SecurityEvent(
        user_id=user_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=_safe_user_agent(user_agent),
        success=success,
        details=details,
    )
    db.add(event)
    return event


def _rate_record(db: Session, scope: str, raw_key: str) -> AuthRateLimit | None:
    digest = normalized_key_digest(scope, raw_key)
    return (
        db.query(AuthRateLimit)
        .filter(AuthRateLimit.scope == scope, AuthRateLimit.key_hash == digest)
        .with_for_update()
        .first()
    )


def check_rate_limits(db: Session, keys: list[tuple[str, str]]) -> None:
    now = utcnow()
    retry_after = 0
    for scope, raw_key in keys:
        record = _rate_record(db, scope, raw_key)
        if record and record.blocked_until and _aware(record.blocked_until) > now:
            retry_after = max(
                retry_after,
                int((_aware(record.blocked_until) - now).total_seconds()) + 1,
            )
    if retry_after:
        raise RateLimitedError(retry_after)


def record_rate_attempt(
    db: Session,
    scope: str,
    raw_key: str,
    *,
    threshold: int,
    base_delay_seconds: int = 30,
) -> None:
    now = utcnow()
    record = _rate_record(db, scope, raw_key)
    if record is None:
        candidate = AuthRateLimit(
            scope=scope,
            key_hash=normalized_key_digest(scope, raw_key),
            attempts=0,
            window_started_at=now,
            updated_at=now,
        )
        try:
            # A savepoint keeps simultaneous attempts for a previously unseen
            # key from turning the unique-key race into a 500 response.
            with db.begin_nested():
                db.add(candidate)
                db.flush()
            record = candidate
        except IntegrityError:
            record = _rate_record(db, scope, raw_key)
            if record is None:
                raise
    elif now - _aware(record.window_started_at) >= LOGIN_WINDOW:
        record.attempts = 0
        record.window_started_at = now
        record.blocked_until = None

    record.attempts += 1
    record.updated_at = now
    if record.attempts >= threshold:
        exponent = min(record.attempts - threshold, 8)
        delay = min(base_delay_seconds * (2**exponent), int(MAX_BACKOFF.total_seconds()))
        record.blocked_until = now + timedelta(seconds=delay)


def clear_rate_limit(db: Session, scope: str, raw_key: str) -> None:
    record = _rate_record(db, scope, raw_key)
    if record:
        db.delete(record)


def _issue_one_time_token(
    db: Session,
    user: User,
    purpose: str,
    lifetime: timedelta,
    payload: dict | None = None,
) -> str:
    now = utcnow()
    db.query(AuthToken).filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == purpose,
        AuthToken.used_at.is_(None),
    ).update({AuthToken.used_at: now}, synchronize_session=False)
    raw_token = new_opaque_token()
    db.add(
        AuthToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=token_digest(raw_token),
            payload=payload,
            expires_at=now + lifetime,
        )
    )
    return raw_token


def _invalidate_active_tokens(
    db: Session,
    user_id: int,
    *,
    used_at: datetime,
    except_token_id: int | None = None,
) -> int:
    """Invalidate outstanding recovery and verification capabilities."""
    query = db.query(AuthToken).filter(
        AuthToken.user_id == user_id,
        AuthToken.used_at.is_(None),
    )
    if except_token_id is not None:
        query = query.filter(AuthToken.id != except_token_id)
    return query.update({AuthToken.used_at: used_at}, synchronize_session=False)


def _development_token(raw_token: str) -> str | None:
    if settings.APP_ENV != "production" and settings.AUTH_DEV_EXPOSE_TOKENS:
        return raw_token
    return None


def register_user(
    db: Session,
    data: UserCreate,
    *,
    ip_address: str,
    user_agent: str | None,
) -> tuple[User, str | None]:
    email = normalize_email(str(data.email))
    username = data.username.strip()
    rate_keys = [("register_ip", ip_address)]
    check_rate_limits(db, rate_keys)

    if get_user_by_email(db, email):
        record_rate_attempt(db, "register_ip", ip_address, threshold=5, base_delay_seconds=60)
        db.commit()
        raise AuthConflictError("Cet email existe déjà.")
    if get_user_by_username(db, username):
        record_rate_attempt(db, "register_ip", ip_address, threshold=5, base_delay_seconds=60)
        db.commit()
        raise AuthConflictError("Ce nom d'utilisateur existe déjà.")

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(data.password),
        email_verified=False,
    )
    db.add(user)
    try:
        db.flush()
        raw_token = _issue_one_time_token(db, user, "verify_email", timedelta(hours=24))
        record_rate_attempt(db, "register_ip", ip_address, threshold=5, base_delay_seconds=60)
        log_security_event(
            db,
            "account_registered",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.commit()
        db.refresh(user)
    except IntegrityError as error:
        db.rollback()
        raise AuthConflictError("Cet email ou ce nom d'utilisateur existe déjà.") from error

    try:
        email_service.send_verification_email(user.email, raw_token)
        exposed_token = _development_token(raw_token)
    except email_service.EmailDeliveryError:
        log_security_event(
            db,
            "email_delivery_failed",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            details={"message_type": "email_verification"},
        )
        db.commit()
        exposed_token = None
    return user, exposed_token


def authenticate(
    db: Session,
    email_input: str,
    password: str,
    *,
    ip_address: str,
    user_agent: str | None,
) -> IssuedSession:
    email = normalize_email(email_input)
    input_shape_valid = (
        0 < len(email) <= 100
        and 0 < len(password) <= 128
        and len(password.encode("utf-8")) <= 1024
    )
    rate_keys = [("login_email", email), ("login_ip", ip_address)]
    check_rate_limits(db, rate_keys)

    user = get_user_by_email(db, email) if input_shape_valid else None
    valid, replacement_hash = verify_and_update_password(
        password if input_shape_valid else "invalid-input-shape",
        user.hashed_password if user else _DUMMY_PASSWORD_HASH,
    )
    if user is None or not valid or not user.is_active:
        record_rate_attempt(db, "login_email", email, threshold=5)
        record_rate_attempt(db, "login_ip", ip_address, threshold=10)
        log_security_event(
            db,
            "login_failed",
            user_id=user.id if user else None,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            details={"reason": "invalid_credentials"},
        )
        db.commit()
        raise InvalidCredentialsError("Email ou mot de passe incorrect.")

    if not user.email_verified:
        log_security_event(
            db,
            "login_failed",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            details={"reason": "email_not_verified"},
        )
        db.commit()
        raise EmailNotVerifiedError("Veuillez vérifier votre adresse email.")

    if replacement_hash:
        user.hashed_password = replacement_hash

    clear_rate_limit(db, "login_email", email)
    now = utcnow()
    session_id = str(uuid.uuid4())
    refresh_token = f"{session_id}.{new_opaque_token()}"
    csrf_token = new_csrf_token()
    auth_session = AuthSession(
        id=session_id,
        user_id=user.id,
        refresh_token_hash=token_digest(refresh_token),
        csrf_token_hash=token_digest(csrf_token),
        ip_address=ip_address,
        user_agent=_safe_user_agent(user_agent),
        created_at=now,
        last_used_at=now,
        expires_at=now + timedelta(days=settings.AUTH_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(auth_session)
    access_token = create_access_token({"sub": str(user.id), "sid": session_id})
    log_security_event(
        db,
        "login_success",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    db.refresh(user)
    db.refresh(auth_session)
    return IssuedSession(user, auth_session, access_token, refresh_token, csrf_token)


def _session_id_from_refresh(refresh_token: str) -> str | None:
    session_id, separator, secret = refresh_token.partition(".")
    if not separator or not secret:
        return None
    try:
        return str(uuid.UUID(session_id))
    except ValueError:
        return None


def refresh_session(
    db: Session,
    refresh_token: str,
    csrf_token: str,
    *,
    ip_address: str,
    user_agent: str | None,
) -> RefreshedSession:
    session_id = _session_id_from_refresh(refresh_token)
    if not session_id:
        raise InvalidCredentialsError("Session invalide.")
    auth_session = (
        db.query(AuthSession)
        .filter(AuthSession.id == session_id)
        .with_for_update()
        .first()
    )
    if not auth_session:
        raise InvalidCredentialsError("Session invalide.")

    now = utcnow()
    refresh_matches = constant_time_equal(
        auth_session.refresh_token_hash, token_digest(refresh_token)
    )
    csrf_matches = constant_time_equal(auth_session.csrf_token_hash, token_digest(csrf_token))
    if not refresh_matches:
        if auth_session.revoked_at is None:
            auth_session.revoked_at = now
            auth_session.revoke_reason = "refresh_reuse"
        log_security_event(
            db,
            "refresh_token_reuse",
            user_id=auth_session.user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
        )
        db.commit()
        copilot_memory.clear_session(session_id)
        raise InvalidCredentialsError("Session invalide.")
    if not csrf_matches:
        raise InvalidCsrfError("Protection CSRF invalide.")
    if auth_session.revoked_at is not None or _aware(auth_session.expires_at) <= now:
        raise InvalidCredentialsError("Session expirée ou révoquée.")
    if not auth_session.user.is_active:
        raise InvalidCredentialsError("Session invalide.")

    new_refresh = f"{session_id}.{new_opaque_token()}"
    new_csrf = new_csrf_token()
    auth_session.refresh_token_hash = token_digest(new_refresh)
    auth_session.csrf_token_hash = token_digest(new_csrf)
    auth_session.last_used_at = now
    auth_session.ip_address = ip_address
    auth_session.user_agent = _safe_user_agent(user_agent)
    access_token = create_access_token(
        {"sub": str(auth_session.user_id), "sid": auth_session.id}
    )
    db.commit()
    return RefreshedSession(access_token, new_refresh, new_csrf)


def revoke_session_from_refresh(
    db: Session,
    refresh_token: str,
    csrf_token: str,
    *,
    ip_address: str,
    user_agent: str | None,
) -> None:
    session_id = _session_id_from_refresh(refresh_token)
    if not session_id:
        return
    auth_session = (
        db.query(AuthSession).filter(AuthSession.id == session_id).with_for_update().first()
    )
    if not auth_session:
        return
    if not constant_time_equal(auth_session.refresh_token_hash, token_digest(refresh_token)):
        if auth_session.revoked_at is None:
            auth_session.revoked_at = utcnow()
            auth_session.revoke_reason = "refresh_reuse"
        log_security_event(
            db,
            "refresh_token_reuse",
            user_id=auth_session.user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
        )
        db.commit()
        copilot_memory.clear_session(session_id)
        raise InvalidCredentialsError("Session invalide.")
    if not constant_time_equal(auth_session.csrf_token_hash, token_digest(csrf_token)):
        raise InvalidCsrfError("Protection CSRF invalide.")
    if auth_session.revoked_at is None:
        auth_session.revoked_at = utcnow()
        auth_session.revoke_reason = "logout"
    log_security_event(
        db,
        "logout",
        user_id=auth_session.user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    copilot_memory.clear_session(session_id)


def revoke_all_sessions(
    db: Session,
    user_id: int,
    reason: str,
    *,
    except_session_id: str | None = None,
) -> int:
    query = db.query(AuthSession).filter(
        AuthSession.user_id == user_id,
        AuthSession.revoked_at.is_(None),
    )
    if except_session_id:
        query = query.filter(AuthSession.id != except_session_id)
    session_ids = [item[0] for item in query.with_entities(AuthSession.id).all()]
    updated = query.update(
        {AuthSession.revoked_at: utcnow(), AuthSession.revoke_reason: reason},
        synchronize_session="fetch",
    )
    for session_id in session_ids:
        copilot_memory.clear_session(session_id)
    return updated


def request_email_verification(
    db: Session,
    email: str,
    *,
    ip_address: str,
    user_agent: str | None,
) -> str | None:
    normalized = normalize_email(email)
    keys = [("verify_email", normalized), ("verify_ip", ip_address)]
    check_rate_limits(db, keys)
    record_rate_attempt(db, "verify_email", normalized, threshold=3, base_delay_seconds=60)
    record_rate_attempt(db, "verify_ip", ip_address, threshold=10, base_delay_seconds=60)
    user = get_user_by_email(db, normalized)
    raw_token: str | None = None
    if user and user.is_active and not user.email_verified:
        raw_token = _issue_one_time_token(db, user, "verify_email", timedelta(hours=24))
        log_security_event(
            db,
            "email_verification_requested",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    db.commit()
    if raw_token and user:
        try:
            email_service.send_verification_email(user.email, raw_token)
            return _development_token(raw_token)
        except email_service.EmailDeliveryError:
            log_security_event(
                db,
                "email_delivery_failed",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                details={"message_type": "email_verification"},
            )
            db.commit()
    return None


def request_password_reset(
    db: Session,
    email: str,
    *,
    ip_address: str,
    user_agent: str | None,
) -> str | None:
    normalized = normalize_email(email)
    keys = [("forgot_email", normalized), ("forgot_ip", ip_address)]
    check_rate_limits(db, keys)
    record_rate_attempt(db, "forgot_email", normalized, threshold=3, base_delay_seconds=60)
    record_rate_attempt(db, "forgot_ip", ip_address, threshold=10, base_delay_seconds=60)
    user = get_user_by_email(db, normalized)
    raw_token: str | None = None
    if user and user.is_active:
        raw_token = _issue_one_time_token(db, user, "password_reset", timedelta(minutes=30))
        log_security_event(
            db,
            "password_reset_requested",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    db.commit()
    if raw_token and user:
        try:
            email_service.send_password_reset_email(user.email, raw_token)
            return _development_token(raw_token)
        except email_service.EmailDeliveryError:
            log_security_event(
                db,
                "email_delivery_failed",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                details={"message_type": "password_reset"},
            )
            db.commit()
    return None


def _valid_one_time_token(db: Session, raw_token: str, purposes: tuple[str, ...]) -> AuthToken:
    token = (
        db.query(AuthToken)
        .filter(
            AuthToken.token_hash == token_digest(raw_token),
            AuthToken.purpose.in_(purposes),
        )
        .with_for_update()
        .first()
    )
    now = utcnow()
    if not token or token.used_at is not None or _aware(token.expires_at) <= now:
        raise InvalidTokenError("Ce lien est invalide ou a expiré.")
    return token


def verify_email_token(
    db: Session,
    raw_token: str,
    *,
    ip_address: str,
    user_agent: str | None,
) -> User:
    token = _valid_one_time_token(db, raw_token, ("verify_email", "email_change"))
    user = token.user
    now = utcnow()
    old_email = user.email
    event_type = "email_verified"
    if token.purpose == "email_change":
        new_email = normalize_email(str((token.payload or {}).get("email", "")))
        if not new_email or user.pending_email != new_email:
            raise InvalidTokenError("Ce lien est invalide ou a expiré.")
        existing = get_user_by_email(db, new_email)
        if existing and existing.id != user.id:
            raise AuthConflictError("Cette adresse email est déjà utilisée.")
        user.email = new_email
        user.pending_email = None
        _invalidate_active_tokens(
            db,
            user.id,
            used_at=now,
            except_token_id=token.id,
        )
        revoke_all_sessions(db, user.id, "email_changed")
        event_type = "email_changed"
    user.email_verified = True
    user.email_verified_at = now
    token.used_at = now
    log_security_event(
        db,
        event_type,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as error:
        db.rollback()
        raise AuthConflictError("Cette adresse email est déjà utilisée.") from error

    if event_type == "email_changed":
        _send_security_notification_safely(
            old_email,
            "Adresse email modifiée",
            "L'adresse email de votre compte a été modifiée. Si ce n'était pas vous, contactez le support immédiatement.",
        )
    return user


def reset_password(
    db: Session,
    data: PasswordReset,
    *,
    ip_address: str,
    user_agent: str | None,
) -> None:
    token = _valid_one_time_token(db, data.token, ("password_reset",))
    user = token.user
    if verify_password(data.new_password, user.hashed_password):
        raise AuthServiceError("Le nouveau mot de passe doit être différent de l'ancien.")
    now = utcnow()
    user.hashed_password = hash_password(data.new_password)
    user.password_changed_at = now
    user.email_verified = True
    user.email_verified_at = user.email_verified_at or now
    token.used_at = now
    _invalidate_active_tokens(
        db,
        user.id,
        used_at=now,
        except_token_id=token.id,
    )
    revoke_all_sessions(db, user.id, "password_reset")
    log_security_event(
        db,
        "password_reset",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    _send_security_notification_safely(
        user.email,
        "Mot de passe réinitialisé",
        "Votre mot de passe a été réinitialisé et toutes vos sessions ont été déconnectées.",
    )


def change_password(
    db: Session,
    user: User,
    data: PasswordChange,
    *,
    ip_address: str,
    user_agent: str | None,
) -> None:
    valid, _ = verify_and_update_password(data.current_password, user.hashed_password)
    if not valid:
        log_security_event(
            db,
            "password_change_failed",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
        )
        db.commit()
        raise AuthServiceError("Le mot de passe actuel est incorrect.")
    if verify_password(data.new_password, user.hashed_password):
        raise AuthServiceError("Le nouveau mot de passe doit être différent du mot de passe actuel.")
    user.hashed_password = hash_password(data.new_password)
    now = utcnow()
    user.password_changed_at = now
    _invalidate_active_tokens(db, user.id, used_at=now)
    revoke_all_sessions(db, user.id, "password_changed")
    log_security_event(
        db,
        "password_changed",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    _send_security_notification_safely(
        user.email,
        "Mot de passe modifié",
        "Votre mot de passe a été modifié et toutes vos sessions ont été déconnectées.",
    )


def update_profile(
    db: Session,
    user: User,
    data: UserUpdate,
    *,
    ip_address: str,
    user_agent: str | None,
) -> tuple[User, str | None]:
    raw_email_token: str | None = None
    if data.username is not None:
        username = data.username.strip()
        existing = get_user_by_username(db, username)
        if existing and existing.id != user.id:
            raise AuthConflictError("Ce nom d'utilisateur existe déjà.")
        user.username = username

    if data.email is not None:
        new_email = normalize_email(str(data.email))
        if new_email != normalize_email(user.email):
            if not data.current_password:
                raise AuthServiceError("Le mot de passe actuel est requis pour modifier l'email.")
            valid, replacement = verify_and_update_password(data.current_password, user.hashed_password)
            if not valid:
                raise AuthServiceError("Le mot de passe actuel est incorrect.")
            if replacement:
                user.hashed_password = replacement
            existing = get_user_by_email(db, new_email)
            if existing and existing.id != user.id:
                raise AuthConflictError("Cet email existe déjà.")
            user.pending_email = new_email
            raw_email_token = _issue_one_time_token(
                db,
                user,
                "email_change",
                timedelta(minutes=30),
                {"email": new_email},
            )
            log_security_event(
                db,
                "email_change_requested",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
            )

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as error:
        db.rollback()
        raise AuthConflictError("Cet email ou ce nom d'utilisateur existe déjà.") from error

    if raw_email_token and user.pending_email:
        try:
            email_service.send_email_change_confirmation(user.pending_email, raw_email_token)
            exposed_token = _development_token(raw_email_token)
        except email_service.EmailDeliveryError:
            log_security_event(
                db,
                "email_delivery_failed",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                details={"message_type": "email_change"},
            )
            db.commit()
            exposed_token = None
        _send_security_notification_safely(
            user.email,
            "Modification d'adresse email demandée",
            "Une modification de votre adresse email a été demandée. Si ce n'était pas vous, changez votre mot de passe.",
        )
    else:
        exposed_token = None
    return user, exposed_token


def _send_security_notification_safely(recipient: str, subject: str, message: str) -> None:
    try:
        email_service.send_security_notification(recipient, subject, message)
    except email_service.EmailDeliveryError:
        # The security operation has already committed. Delivery failure must
        # not roll it back; production logging can report the exception without
        # ever including tokens or recipient addresses.
        return


def list_sessions(db: Session, user_id: int) -> list[AuthSession]:
    now = utcnow()
    return (
        db.query(AuthSession)
        .filter(
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
        .order_by(AuthSession.last_used_at.desc())
        .all()
    )


def revoke_owned_session(db: Session, user_id: int, session_id: str) -> bool:
    auth_session = db.query(AuthSession).filter(
        AuthSession.id == session_id,
        AuthSession.user_id == user_id,
    ).first()
    if not auth_session:
        return False
    if auth_session.revoked_at is None:
        auth_session.revoked_at = utcnow()
        auth_session.revoke_reason = "user_revoked"
        log_security_event(
            db,
            "session_revoked",
            user_id=user_id,
            ip_address=None,
            user_agent=None,
            details={"session_id": session_id},
        )
        db.commit()
    copilot_memory.clear_session(session_id)
    return True


def list_security_events(db: Session, user_id: int, limit: int) -> list[SecurityEvent]:
    return (
        db.query(SecurityEvent)
        .filter(SecurityEvent.user_id == user_id)
        .order_by(SecurityEvent.created_at.desc(), SecurityEvent.id.desc())
        .limit(limit)
        .all()
    )
