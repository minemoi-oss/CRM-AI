from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.dependencies import get_db
from app.models.auth import AuthSession
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@dataclass(frozen=True)
class AuthContext:
    user: User
    session: AuthSession
    claims: dict


def _unauthorized(detail: str = "Session invalide ou expirée.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def get_auth_context(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AuthContext:
    claims = decode_access_token(token)
    if claims is None:
        raise _unauthorized()

    try:
        user_id = int(claims.get("sub"))
        session_id = str(claims["sid"])
    except (KeyError, TypeError, ValueError):
        raise _unauthorized()

    auth_session = db.get(AuthSession, session_id)
    now = datetime.now(timezone.utc)
    if (
        auth_session is None
        or auth_session.user_id != user_id
        or auth_session.revoked_at is not None
        or _aware(auth_session.expires_at) <= now
    ):
        raise _unauthorized()

    user = auth_session.user
    if user is None or not user.is_active:
        raise _unauthorized("Utilisateur inactif ou introuvable.")

    # Keep a useful last-seen timestamp without a database write per API call.
    if now - _aware(auth_session.last_used_at) >= timedelta(minutes=5):
        auth_session.last_used_at = now
        db.commit()

    return AuthContext(user=user, session=auth_session, claims=claims)


def get_current_user(context: AuthContext = Depends(get_auth_context)) -> User:
    return context.user
