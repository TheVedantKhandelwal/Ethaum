"""Badge auto-computation service.

Defines badge criteria and awards badges to products based on their metrics.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Badge, Launch, Product, ProductBadge, Review

# Badge definitions: (name, slug, description, icon, badge_type, criteria)
BADGE_DEFINITIONS = [
    (
        "Category Leader",
        "category-leader",
        "Highest credibility score in its category",
        "crown",
        "award",
        {"rule": "highest_credibility_in_category"},
    ),
    (
        "Users Love It",
        "users-love-it",
        "Average rating >= 4.5 with at least 5 reviews",
        "heart",
        "quality",
        {"min_avg_rating": 4.5, "min_review_count": 5},
    ),
    (
        "High Performer",
        "high-performer",
        "Credibility score >= 0.6 with at least 3 reviews",
        "rocket",
        "quality",
        {"min_credibility": 0.6, "min_review_count": 3},
    ),
    (
        "Momentum Leader",
        "momentum-leader",
        "Most upvotes across launches in the last 30 days",
        "flame",
        "award",
        {"rule": "most_upvotes_last_30_days"},
    ),
    (
        "Best Value",
        "best-value",
        "Recognized for outstanding value",
        "gem",
        "quality",
        {},
    ),
    (
        "Easiest to Use",
        "easiest-to-use",
        "Recognized for ease of use",
        "sparkles",
        "quality",
        {},
    ),
    (
        "Customers Choice",
        "customers-choice",
        "Chosen by customers for excellence",
        "trophy",
        "quality",
        {},
    ),
]


async def _ensure_badge_definitions(db: AsyncSession) -> dict[str, Badge]:
    """Create badge definitions if they don't exist. Returns slug->Badge mapping."""
    badge_map: dict[str, Badge] = {}

    # Load existing badges
    result = await db.execute(select(Badge))
    for badge in result.scalars().all():
        badge_map[badge.slug] = badge

    # Create missing ones
    for name, slug, description, icon, badge_type, criteria in BADGE_DEFINITIONS:
        if slug not in badge_map:
            badge = Badge(
                name=name,
                slug=slug,
                description=description,
                icon=icon,
                badge_type=badge_type,
                criteria=criteria,
            )
            db.add(badge)
            badge_map[slug] = badge

    await db.flush()
    return badge_map


async def _award_badge(
    db: AsyncSession,
    product_id: uuid.UUID,
    badge_id: uuid.UUID,
    existing_pairs: set[tuple[uuid.UUID, uuid.UUID]],
    period: str | None = None,
) -> bool:
    """Award a badge to a product if not already awarded. Returns True if newly awarded."""
    if (product_id, badge_id) in existing_pairs:
        return False
    db.add(ProductBadge(product_id=product_id, badge_id=badge_id, period=period))
    existing_pairs.add((product_id, badge_id))
    return True


async def compute_badges(db: AsyncSession) -> int:
    """Auto-compute and award badges to all qualifying products.

    Returns the count of newly awarded badges.
    """
    badge_map = await _ensure_badge_definitions(db)

    # Load existing product-badge pairs to avoid duplicates
    result = await db.execute(select(ProductBadge.product_id, ProductBadge.badge_id))
    existing_pairs: set[tuple[uuid.UUID, uuid.UUID]] = set(result.all())

    # Load all products
    result = await db.execute(select(Product))
    products = result.scalars().all()

    # Precompute review stats for all products
    review_stats: dict[uuid.UUID, tuple[float, int]] = {}
    for product in products:
        stats_result = await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(
                Review.product_id == product.id
            )
        )
        avg_rating, review_count = stats_result.one()
        review_stats[product.id] = (
            float(avg_rating) if avg_rating else 0.0,
            int(review_count) if review_count else 0,
        )

    awarded = 0
    now = datetime.now(timezone.utc)
    quarter = (now.month - 1) // 3 + 1
    period = f"{now.year}-Q{quarter}"  # e.g. "2026-Q1"

    # --- Category Leader: highest credibility_score in each category ---
    category_leaders: dict[str, Product] = {}
    for product in products:
        cat = product.category
        if not cat:
            continue
        if cat not in category_leaders or product.credibility_score > category_leaders[cat].credibility_score:
            category_leaders[cat] = product

    badge = badge_map["category-leader"]
    for product in category_leaders.values():
        if await _award_badge(db, product.id, badge.id, existing_pairs, period):
            awarded += 1

    # --- Users Love It: avg_rating >= 4.5 AND review_count >= 5 ---
    badge = badge_map["users-love-it"]
    for product in products:
        avg_rating, review_count = review_stats[product.id]
        if avg_rating >= 4.5 and review_count >= 5:
            if await _award_badge(db, product.id, badge.id, existing_pairs, period):
                awarded += 1

    # --- High Performer: credibility_score >= 0.6 AND review_count >= 3 ---
    badge = badge_map["high-performer"]
    for product in products:
        _avg, review_count = review_stats[product.id]
        if product.credibility_score >= 0.6 and review_count >= 3:
            if await _award_badge(db, product.id, badge.id, existing_pairs, period):
                awarded += 1

    # --- Momentum Leader: most upvotes across launches in last 30 days ---
    thirty_days_ago = (now - timedelta(days=30)).date()
    result = await db.execute(
        select(Launch.product_id, func.sum(Launch.upvote_count).label("total_upvotes"))
        .where(Launch.launch_date >= thirty_days_ago)
        .group_by(Launch.product_id)
        .order_by(func.sum(Launch.upvote_count).desc())
        .limit(1)
    )
    top_row = result.one_or_none()
    if top_row:
        badge = badge_map["momentum-leader"]
        if await _award_badge(db, top_row.product_id, badge.id, existing_pairs, period):
            awarded += 1

    await db.flush()
    return awarded


async def get_product_badges(
    db: AsyncSession, product_id: uuid.UUID
) -> list[dict]:
    """Return list of badge dicts for a product."""
    result = await db.execute(
        select(Badge.name, Badge.slug, Badge.icon, Badge.description, ProductBadge.awarded_at, ProductBadge.period)
        .join(ProductBadge, ProductBadge.badge_id == Badge.id)
        .where(ProductBadge.product_id == product_id)
        .order_by(ProductBadge.awarded_at.desc())
    )
    rows = result.all()
    return [
        {
            "name": row.name,
            "slug": row.slug,
            "icon": row.icon,
            "description": row.description,
            "awarded_at": row.awarded_at.isoformat() if row.awarded_at else None,
            "period": row.period,
        }
        for row in rows
    ]
