from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InvoiceCreate(BaseModel):
    quote_id: int


class InvoiceUpdate(BaseModel):
    status: str


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    quote_id: int
    status: str
    total: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)