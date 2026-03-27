import uuid
from datetime import datetime

from pydantic import BaseModel


class StartupCreate(BaseModel):
    name: str
    description: str | None = None
    website: str | None = None
    logo_url: str | None = None
    founded_year: int | None = None
    team_size: str | None = None  # 1-10 | 11-50 | 51-200 | 200+


class StartupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    website: str | None = None
    logo_url: str | None = None
    founded_year: int | None = None
    team_size: str | None = None


class StartupOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    slug: str
    description: str | None
    website: str | None
    logo_url: str | None
    founded_year: int | None
    team_size: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
