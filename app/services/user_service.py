"""Legacy user helpers used outside the authentication router.

Authentication/session operations live in ``auth_service``. Keeping these
helpers small avoids offering a second, session-less login path.
"""

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories import user_respository
from app.schemas.user import PasswordChange, UserCreate, UserUpdate, normalize_email
from app.services import auth_service


def create_user(db: Session, user_data: UserCreate) -> User:
    user, _ = auth_service.register_user(
        db,
        user_data,
        ip_address="internal",
        user_agent="legacy-user-service",
    )
    return user


def get_user(db: Session, user_id: int) -> User:
    user = user_respository.get_by_id(db, user_id)
    if user is None:
        raise ValueError("Utilisateur introuvable.")
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return user_respository.get_by_email(db, normalize_email(email))


def update_user(db: Session, user: User, user_data: UserUpdate) -> User:
    updated, _ = auth_service.update_profile(
        db,
        user,
        user_data,
        ip_address="internal",
        user_agent="legacy-user-service",
    )
    return updated


def change_password(db: Session, user: User, password_data: PasswordChange) -> None:
    auth_service.change_password(
        db,
        user,
        password_data,
        ip_address="internal",
        user_agent="legacy-user-service",
    )
