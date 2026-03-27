import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    pros: Mapped[list | None] = mapped_column(JSONB, default=list)
    cons: Mapped[list | None] = mapped_column(JSONB, default=list)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    verification_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    sub_ratings: Mapped[dict | None] = mapped_column(JSONB, default=dict)  # {ease_of_use, support, value, features}
    use_case: Mapped[str | None] = mapped_column(Text)
    company_size: Mapped[str | None] = mapped_column(String(20))
    industry: Mapped[str | None] = mapped_column(String(100))
    job_role: Mapped[str | None] = mapped_column(String(100))
    usage_duration: Mapped[str | None] = mapped_column(String(20))
    would_recommend: Mapped[bool | None] = mapped_column(Boolean)
    screenshots: Mapped[list | None] = mapped_column(JSONB, default=list)
    vendor_response: Mapped[str | None] = mapped_column(Text)
    vendor_responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
