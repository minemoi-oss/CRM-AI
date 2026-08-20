from typing import TYPE_CHECKING

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
if TYPE_CHECKING:
    from app.models.company import Company


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pending_email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    company: Mapped["Company | None"] = relationship(
        back_populates="owner",
        uselist=False,
    )
    auth_sessions = relationship(
        "AuthSession", back_populates="user", cascade="all, delete-orphan"
    )
    auth_tokens = relationship(
        "AuthToken", back_populates="user", cascade="all, delete-orphan"
    )
    security_events = relationship("SecurityEvent", back_populates="user")

    __table_args__ = (
        Index("uq_users_email_normalized", func.lower(email), unique=True),
        Index("uq_users_username_normalized", func.lower(username), unique=True),
        Index(
            "uq_users_pending_email_normalized",
            func.lower(pending_email),
            unique=True,
            postgresql_where=text("pending_email IS NOT NULL"),
            sqlite_where=text("pending_email IS NOT NULL"),
        ),
    )
