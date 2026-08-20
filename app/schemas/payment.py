from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float = Field(gt=0)
    payment_method: str = Field(min_length=2, max_length=50)


class PaymentUpdate(BaseModel):
    status: str


class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_method: str
    status: str
    paid_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

