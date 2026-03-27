import uuid
from datetime import datetime

from pydantic import BaseModel


class BoostCreate(BaseModel):
    product_id: uuid.UUID
    boost_type: str  # featured | trending | category
    bid_amount: float
    daily_budget: float | None = None
    starts_at: datetime
    ends_at: datetime


class BoostOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    boost_type: str
    bid_amount: float
    daily_budget: float | None
    total_spent: float
    starts_at: datetime
    ends_at: datetime
    status: str
    impressions: int
    clicks: int
    created_at: datetime
    ctr: float | None = None
    remaining_budget: float | None = None
    days_remaining: int | None = None

    model_config = {"from_attributes": True}
