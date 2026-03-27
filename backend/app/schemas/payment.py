import uuid
from datetime import datetime

from pydantic import BaseModel


class PaymentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    deal_id: uuid.UUID | None
    boost_id: uuid.UUID | None
    amount: float
    currency: str
    status: str
    payment_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CheckoutResponse(BaseModel):
    checkout_url: str
    payment_id: uuid.UUID
