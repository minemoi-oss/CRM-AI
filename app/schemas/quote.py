from datetime import datetime

from pydantic import BaseModel, ConfigDict


class QuoteCreate(BaseModel):
    customer_id: int


class QuoteUpdate(BaseModel):
    customer_id: int
    status: str


class QuoteResponse(BaseModel):
    id: int
    customer_id: int
    status: str
    total: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)