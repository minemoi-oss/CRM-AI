from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from argon2.low_level import Type
from jose import JWTError, jwt

from app.core.config import settings


# OWASP's current minimum Argon2id profile: 19 MiB, two iterations, p=1.
# We use a moderately stronger 64 MiB / 3 iteration profile for interactive auth.
password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_and_update_password(
    plain_password: str,
    hashed_password: str,
) -> tuple[bool, str | None]:
    """Verify either Argon2id or a legacy bcrypt hash.

    Successful bcrypt verification returns a replacement Argon2id hash so the
    caller can migrate the account transparently in the same transaction.
    """
    if hashed_password.startswith("$argon2"):
        try:
            valid = password_hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False, None
        if not valid:
            return False, None
        replacement = (
            password_hasher.hash(plain_password)
            if password_hasher.check_needs_rehash(hashed_password)
            else None
        )
        return True, replacement

    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        encoded = plain_password.encode("utf-8")
        if len(encoded) > 72:
            return False, None
        try:
            valid = bcrypt.checkpw(encoded, hashed_password.encode("ascii"))
        except (ValueError, TypeError):
            return False, None
        return (True, hash_password(plain_password)) if valid else (False, None)

    return False, None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return verify_and_update_password(plain_password, hashed_password)[0]


def create_access_token(data: dict[str, Any], expires_minutes: int | None = None) -> str:
    now = datetime.now(timezone.utc)
    lifetime = expires_minutes or settings.AUTH_ACCESS_TOKEN_EXPIRE_MINUTES
    claims: dict[str, Any] = {
        **data,
        "jti": data.get("jti", str(uuid.uuid4())),
        "type": data.get("type", "access"),
        "iat": now,
        "exp": now + timedelta(minutes=lifetime),
        "iss": settings.AUTH_JWT_ISSUER,
        "aud": settings.AUTH_JWT_AUDIENCE,
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=settings.AUTH_JWT_AUDIENCE,
            issuer=settings.AUTH_JWT_ISSUER,
            options={"require_exp": True, "require_iat": True, "require_sub": True},
        )
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload


def new_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def normalized_key_digest(scope: str, value: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        f"{scope}:{value}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
