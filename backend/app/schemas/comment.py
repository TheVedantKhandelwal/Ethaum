import uuid
from datetime import datetime

from pydantic import BaseModel


class CommentCreate(BaseModel):
    body: str
    parent_id: uuid.UUID | None = None


class CommentOut(BaseModel):
    id: uuid.UUID
    launch_id: uuid.UUID | None
    product_id: uuid.UUID | None
    user_id: uuid.UUID
    parent_id: uuid.UUID | None
    body: str
    upvote_count: int
    is_maker: bool
    created_at: datetime
    user_name: str | None = None
    user_avatar: str | None = None

    model_config = {"from_attributes": True}


class CommentThread(CommentOut):
    replies: list["CommentThread"] = []
