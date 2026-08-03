from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_method: str


class PaymentUpdate(BaseModel):
    status: str


class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_method: str
    status: str
    paid_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

