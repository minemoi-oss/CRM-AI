from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User


def create(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_by_email(db: Session, email: str) -> User | None:
    return (
        db.query(User)
        .filter(func.lower(User.email) == email.strip().casefold())
        .first()
    )


def get_by_username(db: Session, username: str) -> User | None:
    return (
        db.query(User)
        .filter(func.lower(User.username) == username.strip().casefold())
        .first()
    )


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)
