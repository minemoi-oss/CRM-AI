from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.customer import Customer

from app.database.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str]
    email: Mapped[str]
    phone: Mapped[str]
    website: Mapped[str]

    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    customers: Mapped[list["Customer"]] = relationship(
        back_populates="company"
    )
    products = relationship(
    "Product",
    back_populates="company"
    )

    services = relationship(
    "Service",
    back_populates="company"
    )