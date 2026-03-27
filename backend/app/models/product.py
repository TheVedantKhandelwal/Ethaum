import uuid
from datetime import datetime

from sqlalchemy import Float, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    startup_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("startups.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    tagline: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(String(500))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    category: Mapped[str | None] = mapped_column(String(100))  # legacy; will migrate to category_id FK
    subcategory: Mapped[str | None] = mapped_column(String(100))
    stage: Mapped[str | None] = mapped_column(String(20))  # seed/A/B/C/D
    arr_range: Mapped[str | None] = mapped_column(String(50))
    pricing_model: Mapped[str | None] = mapped_column(String(30))  # free | freemium | paid | enterprise
    features: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    media: Mapped[list | None] = mapped_column(JSONB, default=list)  # [{type, url, caption, order}]
    pricing_tiers: Mapped[list | None] = mapped_column(JSONB, default=list)  # [{name, price, period, features}]
    integrations: Mapped[list | None] = mapped_column(JSONB, default=list)  # ["Slack", "Zapier"]
    alternatives: Mapped[list | None] = mapped_column(JSONB, default=list)  # ["Competitor A"]
    best_for: Mapped[list | None] = mapped_column(JSONB, default=list)  # ["Marketers", "Small teams"]
    deployment_model: Mapped[str | None] = mapped_column(String(20))  # cloud | on-premise | hybrid
    credibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    avg_rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    upvote_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | published | archived
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="products")
    startup = relationship("Startup", back_populates="products")
    launches = relationship("Launch", back_populates="product")
    reviews = relationship("Review", back_populates="product")
    deals = relationship("Deal", back_populates="product")
    boosts = relationship("Boost", back_populates="product")
    comments = relationship("Comment")
