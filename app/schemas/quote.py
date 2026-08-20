from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.quote_item import QuoteLineCreate


class QuoteCreate(BaseModel):
    customer_id: int


class QuoteCreateWithItems(BaseModel):
    customer_id: int
    items: list[QuoteLineCreate] = Field(min_length=1, max_length=50)


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
