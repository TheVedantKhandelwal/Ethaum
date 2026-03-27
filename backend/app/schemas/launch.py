import uuid
from datetime import date, datetime

from pydantic import BaseModel


class LaunchCreate(BaseModel):
    product_id: uuid.UUID
    title: str
    tagline: str | None = None
    description: str | None = None
    launch_date: date | None = None


class LaunchOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    title: str
    tagline: str | None
    ai_tagline: str | None
    description: str | None
    ai_description: str | None
    status: str
    launch_date: date | None
    upvote_count: int
    trending_score: float
    created_at: datetime
    product_name: str | None = None
    product_slug: str | None = None
    product_logo: str | None = None

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    launch: LaunchOut
    rank: int


class LaunchPreviewRequest(BaseModel):
    product_name: str
    features: list[str] | None = None


class LaunchPreviewResponse(BaseModel):
    ai_tagline: str
    ai_description: str


class WizardCreate(BaseModel):
    # Product fields
    product_name: str
    category: str | None = None
    stage: str | None = None
    website: str | None = None
    features: list[str] | None = None
    # Launch fields
    title: str
    tagline: str | None = None
    description: str | None = None
    launch_date: date | None = None
