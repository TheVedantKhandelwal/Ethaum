import uuid
from datetime import datetime

from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    tagline: str | None = None
    description: str | None = None
    website: str | None = None
    logo_url: str | None = None
    category: str | None = None
    stage: str | None = None
    arr_range: str | None = None
    features: dict | None = None


class ProductOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    slug: str
    tagline: str | None
    description: str | None
    website: str | None
    logo_url: str | None
    category: str | None
    stage: str | None
    arr_range: str | None
    features: dict | None
    credibility_score: float
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductDetail(ProductOut):
    avg_rating: float | None = None
    review_count: int = 0
    launch_count: int = 0
    badges: list[dict] = []
