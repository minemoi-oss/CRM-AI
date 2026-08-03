from pydantic import BaseModel, ConfigDict


class QuoteItemCreate(BaseModel):
    quote_id: int
    product_id: int
    quantity: int


class QuoteItemResponse(BaseModel):
    id: int
    quote_id: int
    product_id: int
    quantity: int
    unit_price: float
    line_total: float

    model_config = ConfigDict(from_attributes=True)