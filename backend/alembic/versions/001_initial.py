"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="vendor"),
        sa.Column("company", sa.String(255)),
        sa.Column("bio", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False),
        sa.Column("tagline", sa.String(500)),
        sa.Column("description", sa.Text),
        sa.Column("website", sa.String(500)),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("category", sa.String(100)),
        sa.Column("stage", sa.String(20)),
        sa.Column("arr_range", sa.String(50)),
        sa.Column("features", postgresql.JSONB, server_default="{}"),
        sa.Column("credibility_score", sa.Float, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "launches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("tagline", sa.String(500)),
        sa.Column("ai_tagline", sa.String(500)),
        sa.Column("description", sa.Text),
        sa.Column("ai_description", sa.Text),
        sa.Column("status", sa.String(20), server_default="live"),
        sa.Column("launch_date", sa.Date),
        sa.Column("upvote_count", sa.Integer, server_default="0"),
        sa.Column("trending_score", sa.Float, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "upvotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("launch_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("launches.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("launch_id", "user_id", name="uq_upvote_launch_user"),
    )

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("pros", postgresql.JSONB, server_default="[]"),
        sa.Column("cons", postgresql.JSONB, server_default="[]"),
        sa.Column("sentiment_score", sa.Float, server_default="0"),
        sa.Column("verification_score", sa.Float, server_default="0"),
        sa.Column("is_verified", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "deals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("deal_type", sa.String(20), server_default="discount"),
        sa.Column("original_price", sa.Float, nullable=False),
        sa.Column("deal_price", sa.Float, nullable=False),
        sa.Column("max_redemptions", sa.Integer, server_default="100"),
        sa.Column("current_redemptions", sa.Integer, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("buyer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("match_score", sa.Float, server_default="0"),
        sa.Column("match_reasons", postgresql.JSONB, server_default="{}"),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "referrals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("referrer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("referred_email", sa.String(255), nullable=False),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deals.id")),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("referrals")
    op.drop_table("matches")
    op.drop_table("deals")
    op.drop_table("reviews")
    op.drop_table("upvotes")
    op.drop_table("launches")
    op.drop_table("products")
    op.drop_table("users")
