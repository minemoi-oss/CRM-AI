from datetime import datetime

from sqlalchemy import ForeignKey, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(100))

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    hourly_rate: Mapped[float] = mapped_column(Float)

    duration: Mapped[int]

    created_at: Mapped[datetime]

    updated_at: Mapped[datetime]

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id")
    )

    company = relationship(
        "Company",
        back_populates="services"
    )