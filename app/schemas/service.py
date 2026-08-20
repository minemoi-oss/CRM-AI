from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ServiceData(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    pricing_type: Literal["fixed", "hourly"] = "fixed"
    price: float = Field(gt=0)
    duration: int | None = Field(default=None, gt=0)


class ServiceCreate(ServiceData):
    pass


class ServiceUpdate(ServiceData):
    pass


class ServiceResponse(ServiceData):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
