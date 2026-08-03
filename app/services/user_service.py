from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories import user_respository
from app.schemas.user import UserCreate


def create_user(
    db: Session,
    user_data: UserCreate
) -> User:

    existing = user_respository.get_by_email(
        db,
        user_data.email
    )

    if existing:
        raise ValueError(
            "Cet email existe déjà."
        )

    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(
            user_data.password
        )
    )

    return user_respository.create(
        db,
        user
    )


def get_user(
    db: Session,
    user_id: int
) -> User:

    user = user_respository.get_by_id(db, user_id)

    if user is None:
        raise ValueError("Utilisateur introuvable.")

    return user


def get_user_by_email(
    db: Session,
    email: str
) -> User | None:

    return user_respository.get_by_email(db, email)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)

def login(
    db: Session,
    email: str,
    password: str
):

    user = user_respository.get_by_email(
        db,
        email
    )

    if user is None:
        return None

    if not verify_password(
        password,
        user.hashed_password
    ):
        return None

    token = create_access_token(
        {
            "sub": str(user.id)
        }
    )

    return token