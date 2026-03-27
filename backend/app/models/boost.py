import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Boost(Base):
    __tablename__ = "boosts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    boost_type: Mapped[str] = mapped_column(String(20), nullable=False)  # featured | trending | category
    bid_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    daily_budget: Mapped[float | None] = mapped_column(Numeric(10, 2))
    total_spent: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | active | paused | ended
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    product = relationship("Product", back_populates="boosts")
    payments = relationship("Payment", back_populates="boost")
