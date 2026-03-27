import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    product_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    title: str
    content: str | None = None
    pros: list[str] | None = None
    cons: list[str] | None = None
    sub_ratings: dict | None = None  # keys: ease_of_use, support, value, features — values 1-5
    company_size: str | None = None
    industry: str | None = None
    job_role: str | None = None
    would_recommend: bool | None = None


class ReviewOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    title: str
    content: str | None
    pros: list | None
    cons: list | None
    sentiment_score: float
    verification_score: float
    is_verified: bool
    created_at: datetime
    user_name: str | None = None

    model_config = {"from_attributes": True}


class CompareResult(BaseModel):
    products: list[dict]
    comparison_summary: str | None = None
