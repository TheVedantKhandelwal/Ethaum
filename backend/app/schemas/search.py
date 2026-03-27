import uuid
from datetime import datetime

from pydantic import BaseModel


class SearchProductHit(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    tagline: str | None
    logo_url: str | None
    category: str | None
    avg_rating: float
    review_count: int

    model_config = {"from_attributes": True}


class SearchLaunchHit(BaseModel):
    id: uuid.UUID
    title: str
    tagline: str | None
    upvote_count: int
    product_name: str | None = None
    product_slug: str | None = None

    model_config = {"from_attributes": True}


class SearchDealHit(BaseModel):
    id: uuid.UUID
    title: str
    deal_type: str
    original_price: float
    deal_price: float
    product_name: str | None = None
    product_slug: str | None = None

    model_config = {"from_attributes": True}


class SearchCategoryHit(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    icon: str | None
    product_count: int

    model_config = {"from_attributes": True}


class SearchResults(BaseModel):
    products: list[SearchProductHit] = []
    launches: list[SearchLaunchHit] = []
    deals: list[SearchDealHit] = []
    categories: list[SearchCategoryHit] = []
    total: int = 0
