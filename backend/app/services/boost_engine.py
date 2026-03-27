from datetime import datetime, timezone
from math import ceil

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.boost import Boost
from app.models.product import Product

# Boost configuration
BOOST_SLOTS = {"featured": 5, "trending": 3, "category": 3}
MIN_CREDIBILITY = 20.0
BOOST_DAMPENER = 0.15  # boosts shift rank by max 15%
BOOST_WEIGHT = 30  # out of 100-point scale


def compute_decay_factor(boost: Boost) -> float:
    """Time decay: linear from 1.0 to 0.3 over the boost duration."""
    now = datetime.now(timezone.utc)
    total_seconds = (boost.ends_at - boost.starts_at).total_seconds()
    if total_seconds <= 0:
        return 0.3
    elapsed = (now - boost.starts_at).total_seconds()
    ratio = min(max(elapsed / total_seconds, 0), 1)
    return max(0.3, 1.0 - ratio * 0.7)


def compute_effective_bid(boost: Boost) -> float:
    return float(boost.bid_amount) * compute_decay_factor(boost)


async def run_auction(db: AsyncSession, boost_type: str) -> list[dict]:
    """
    Run Vickrey (second-price) auction for a boost slot type.
    Returns list of winning boosts with their actual cost.
    """
    now = datetime.now(timezone.utc)
    max_slots = BOOST_SLOTS.get(boost_type, 3)

    # Get active boosts of this type
    result = await db.execute(
        select(Boost).where(
            and_(
                Boost.boost_type == boost_type,
                Boost.status == "active",
                Boost.starts_at <= now,
                Boost.ends_at >= now,
            )
        )
    )
    active_boosts = result.scalars().all()

    # Filter by quality gate and compute effective bids
    candidates = []
    for boost in active_boosts:
        # Check product credibility
        prod_result = await db.execute(select(Product).where(Product.id == boost.product_id))
        product = prod_result.scalar_one_or_none()
        if not product or product.credibility_score < MIN_CREDIBILITY:
            continue

        # Check daily budget
        if boost.daily_budget and float(boost.total_spent) >= float(boost.daily_budget):
            continue

        effective = compute_effective_bid(boost)
        candidates.append({"boost": boost, "effective_bid": effective, "product": product})

    # Sort by effective bid descending
    candidates.sort(key=lambda c: c["effective_bid"], reverse=True)

    winners = []
    for i, candidate in enumerate(candidates[:max_slots]):
        # Vickrey: pay second-price + $0.01
        if i + 1 < len(candidates):
            actual_cost = candidates[i + 1]["effective_bid"] + 0.01
        else:
            actual_cost = candidate["effective_bid"] * 0.5  # floor if no competition

        actual_cost = round(actual_cost, 2)
        winners.append({
            "boost_id": candidate["boost"].id,
            "product_id": candidate["product"].id,
            "actual_cost": actual_cost,
            "effective_bid": candidate["effective_bid"],
        })

        # Deduct spend
        candidate["boost"].total_spent = float(candidate["boost"].total_spent) + actual_cost

    await db.commit()
    return winners


async def get_boosted_products_for_feed(
    db: AsyncSession,
    boost_type: str = "trending",
    category: str | None = None,
) -> list[dict]:
    """Get currently winning boosted products for feed injection."""
    now = datetime.now(timezone.utc)
    query = select(Boost).where(
        and_(
            Boost.boost_type == boost_type,
            Boost.status == "active",
            Boost.starts_at <= now,
            Boost.ends_at >= now,
        )
    )
    result = await db.execute(query)
    active_boosts = result.scalars().all()

    boosted = []
    for boost in active_boosts:
        prod_result = await db.execute(select(Product).where(Product.id == boost.product_id))
        product = prod_result.scalar_one_or_none()
        if not product or product.credibility_score < MIN_CREDIBILITY:
            continue
        if category and product.category != category:
            continue

        boosted.append({
            "product": product,
            "boost": boost,
            "effective_bid": compute_effective_bid(boost),
        })

    boosted.sort(key=lambda b: b["effective_bid"], reverse=True)
    return boosted


def inject_boosted_into_feed(organic: list, boosted: list, positions: list[int] | None = None) -> list:
    """Insert boosted products into organic feed at specific positions."""
    if positions is None:
        positions = [2, 6, 14]

    feed = list(organic)
    inserted = 0
    for pos, item in zip(positions, boosted):
        actual_pos = min(pos + inserted, len(feed))
        feed.insert(actual_pos, item)
        inserted += 1

    return feed


def compute_boost_stats(boost: Boost) -> dict:
    """Compute boost analytics for API response."""
    now = datetime.now(timezone.utc)
    days_remaining = max(0, ceil((boost.ends_at - now).total_seconds() / 86400))
    ctr = (boost.clicks / boost.impressions * 100) if boost.impressions > 0 else 0
    remaining_budget = (float(boost.daily_budget) - float(boost.total_spent)) if boost.daily_budget else None

    return {
        "ctr": round(ctr, 2),
        "remaining_budget": round(remaining_budget, 2) if remaining_budget is not None else None,
        "days_remaining": days_remaining,
    }
