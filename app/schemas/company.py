from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)
    website: str | None = Field(default=None, max_length=255)


class CompanyUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)
    website: str | None = Field(default=None, max_length=255)


class CompanyResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    website: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)