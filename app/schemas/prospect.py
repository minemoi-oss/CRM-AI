from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.customer import CustomerResponse


ProspectStatus = Literal["new", "contacted", "qualified", "lost", "converted"]
EditableProspectStatus = Literal["new", "contacted", "qualified", "lost"]
ProspectPriority = Literal["low", "medium", "high"]


class ProspectCreate(BaseModel):
    first_name: str = Field(min_length=2, max_length=50)
    last_name: str = Field(min_length=2, max_length=50)
    email: EmailStr = Field(max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    organization: str | None = Field(default=None, max_length=150)
    notes: str | None = Field(default=None, max_length=5000)
    status: EditableProspectStatus = "new"
    priority: ProspectPriority = "medium"

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("organization", "notes")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return value or None


class ProspectUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=50)
    last_name: str | None = Field(default=None, min_length=2, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, min_length=8, max_length=20)
    organization: str | None = Field(default=None, max_length=150)
    notes: str | None = Field(default=None, max_length=5000)
    status: EditableProspectStatus | None = None
    priority: ProspectPriority | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("organization", "notes")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return value or None


class ProspectResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    organization: str | None
    notes: str | None
    status: ProspectStatus
    priority: ProspectPriority
    company_id: int
    customer_id: int | None
    converted_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProspectListResponse(BaseModel):
    items: list[ProspectResponse]
    total: int
    page: int
    size: int
    pages: int


class ProspectConversionResponse(BaseModel):
    prospect: ProspectResponse
    customer: CustomerResponse
