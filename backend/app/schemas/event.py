import uuid

from pydantic import BaseModel


class EventCreate(BaseModel):
    event_type: str  # page_view | upvote | purchase | search | click | boost_impression
    user_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    metadata: dict | None = None


class EventBatch(BaseModel):
    events: list[EventCreate]
