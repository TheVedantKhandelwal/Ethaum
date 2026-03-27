import uuid
from datetime import datetime

from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    parent_id: uuid.UUID | None = None


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    icon: str | None
    parent_id: uuid.UUID | None
    product_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryTree(CategoryOut):
    children: list["CategoryTree"] = []


class CategoryWithProducts(CategoryOut):
    children: list[CategoryOut] = []
