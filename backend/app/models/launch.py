import uuid
from datetime import datetime

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Launch(Base):
    __tablename__ = "launches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    tagline: Mapped[str | None] = mapped_column(String(500))
    ai_tagline: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    ai_description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="live")  # draft/live/ended
    launch_date: Mapped[datetime | None] = mapped_column(Date)
    upvote_count: Mapped[int] = mapped_column(Integer, default=0)
    trending_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    product = relationship("Product", back_populates="launches")
    upvotes = relationship("Upvote", back_populates="launch", cascade="all, delete-orphan")


class Upvote(Base):
    __tablename__ = "upvotes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    launch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("launches.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    launch = relationship("Launch", back_populates="upvotes")
    user = relationship("User", back_populates="upvotes")

    __table_args__ = (
        {"sqlite_autoincrement": False},
    )
