import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    deal_type: Mapped[str] = mapped_column(String(20), default="discount")  # pilot/discount/lifetime
    original_price: Mapped[float] = mapped_column(Float, nullable=False)
    deal_price: Mapped[float] = mapped_column(Float, nullable=False)
    max_redemptions: Mapped[int] = mapped_column(Integer, default=100)
    current_redemptions: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    product = relationship("Product", back_populates="deals")
    payments = relationship("Payment", back_populates="deal")
