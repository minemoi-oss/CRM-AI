from pydantic import BaseModel, ConfigDict, Field, model_validator


class QuoteLineCreate(BaseModel):
    product_id: int | None = None
    service_id: int | None = None
    quantity: float = Field(gt=0)

    @model_validator(mode="after")
    def require_exactly_one_catalog_item(self):
        if (self.product_id is None) == (self.service_id is None):
            raise ValueError("Une ligne doit contenir un produit ou un service, jamais les deux.")
        return self


class QuoteItemCreate(QuoteLineCreate):
    quote_id: int


class QuoteItemResponse(BaseModel):
    id: int
    quote_id: int
    product_id: int | None
    service_id: int | None
    item_type: str
    item_name: str
    unit: str
    quantity: float
    unit_price: float
    line_total: float

    model_config = ConfigDict(from_attributes=True)
