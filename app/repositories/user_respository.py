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
        .filter(User.email == email)
        .first()
    )


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)