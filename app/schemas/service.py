from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    hourly_rate: float = Field(gt=0)
    duration: int = Field(gt=0)
    company_id: int


class ServiceUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    hourly_rate: float = Field(gt=0)
    duration: int = Field(gt=0)
    company_id: int


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: str | None
    hourly_rate: float
    duration: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)