import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Boost, Deal, Launch, Payment, Product, Review, User
from app.services.event_service import get_realtime_counters

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{user_id}")
async def get_dashboard(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Users can only view their own dashboard unless admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get vendor's products
    result = await db.execute(select(Product).where(Product.user_id == user_id))
    products = result.scalars().all()

    product_stats = []
    all_reviews = []
    total_upvotes_all = 0

    for product in products:
        stats = await db.execute(
            select(func.avg(Review.rating), func.count(Review.id))
            .where(Review.product_id == product.id)
        )
        avg_rating, review_count = stats.one()

        # Get launch upvotes
        launch_stats = await db.execute(
            select(func.sum(Launch.upvote_count))
            .where(Launch.product_id == product.id)
        )
        total_upvotes = launch_stats.scalar() or 0
        total_upvotes_all += total_upvotes

        # Real-time counters
        try:
            counters = await get_realtime_counters(str(product.id))
        except Exception:
            counters = {"views_24h": 0, "clicks_24h": 0}

        # Get recent reviews
        reviews_result = await db.execute(
            select(Review)
            .where(Review.product_id == product.id)
            .order_by(Review.created_at.desc())
            .limit(5)
        )
        reviews = reviews_result.scalars().all()
        all_reviews.extend(reviews)

        product_stats.append({
            "id": str(product.id),
            "name": product.name,
            "slug": product.slug,
            "credibility_score": product.credibility_score,
            "avg_rating": round(float(avg_rating), 2) if avg_rating else None,
            "review_count": review_count or 0,
            "upvotes": total_upvotes,
            "views_24h": counters["views_24h"],
            "clicks_24h": counters["clicks_24h"],
        })

    # Sentiment distribution
    positive = sum(1 for r in all_reviews if r.sentiment_score > 0.2)
    neutral = sum(1 for r in all_reviews if -0.2 <= r.sentiment_score <= 0.2)
    negative = sum(1 for r in all_reviews if r.sentiment_score < -0.2)
    total_reviews = len(all_reviews)

    recent_snippets = [
        {
            "title": r.title,
            "rating": r.rating,
            "sentiment_score": r.sentiment_score,
            "content": (r.content or "")[:120],
        }
        for r in sorted(all_reviews, key=lambda x: x.created_at, reverse=True)[:5]
    ]

    # Deals
    product_ids = [p.id for p in products]
    deals_result = await db.execute(
        select(Deal).where(Deal.product_id.in_(product_ids)) if product_ids else select(Deal).where(False)
    )
    deals = deals_result.scalars().all()
    deal_revenue = 0
    deal_data = []
    for d in deals:
        # Calculate revenue from completed payments
        rev_result = await db.execute(
            select(func.sum(Payment.amount))
            .where(Payment.deal_id == d.id, Payment.status == "completed")
        )
        revenue = rev_result.scalar() or 0
        deal_revenue += float(revenue)

        deal_data.append({
            "id": str(d.id),
            "title": d.title,
            "deal_type": d.deal_type,
            "max_redemptions": d.max_redemptions,
            "current_redemptions": d.current_redemptions,
            "revenue": float(revenue),
            "expires_at": d.expires_at.isoformat() if d.expires_at else None,
        })

    # Boost stats
    boost_result = await db.execute(
        select(
            func.sum(Boost.impressions),
            func.sum(Boost.clicks),
            func.sum(Boost.total_spent),
        )
        .where(Boost.product_id.in_(product_ids))
    ) if product_ids else None

    boost_stats = {"impressions": 0, "clicks": 0, "spend": 0, "ctr": 0}
    if boost_result:
        row = boost_result.one()
        impressions = row[0] or 0
        clicks = row[1] or 0
        spend = float(row[2] or 0)
        boost_stats = {
            "impressions": impressions,
            "clicks": clicks,
            "spend": round(spend, 2),
            "ctr": round(clicks / impressions * 100, 2) if impressions > 0 else 0,
        }

    return {
        "user": {"name": user.name, "company": user.company, "role": user.role},
        "summary": {
            "product_count": len(products),
            "total_reviews": total_reviews,
            "total_upvotes": total_upvotes_all,
            "deal_revenue": round(deal_revenue, 2),
        },
        "product_stats": product_stats,
        "sentiment": {
            "positive": positive,
            "neutral": neutral,
            "negative": negative,
            "total": total_reviews,
        },
        "recent_reviews": recent_snippets,
        "deals": deal_data,
        "boost_stats": boost_stats,
    }
