import uuid
from datetime import datetime

from pydantic import BaseModel


class DealCreate(BaseModel):
    product_id: uuid.UUID
    title: str
    description: str | None = None
    deal_type: str = "discount"
    original_price: float
    deal_price: float
    max_redemptions: int = 100
    expires_at: datetime | None = None


class DealOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    title: str
    description: str | None
    deal_type: str
    original_price: float
    deal_price: float
    max_redemptions: int
    current_redemptions: int
    expires_at: datetime | None
    created_at: datetime
    product_name: str | None = None
    product_slug: str | None = None

    model_config = {"from_attributes": True}


class MatchRequest(BaseModel):
    buyer_id: uuid.UUID
    requirements: dict  # {category, features_needed, budget, stage_preference}


class MatchOut(BaseModel):
    product_id: uuid.UUID
    product_name: str
    product_slug: str
    match_score: float
    match_reasons: dict

    model_config = {"from_attributes": True}


class ReferralCreate(BaseModel):
    referrer_id: uuid.UUID
    referred_email: str
    deal_id: uuid.UUID | None = None
