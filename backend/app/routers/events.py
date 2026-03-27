from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user, require_role
from app.models.ai_job_log import AIJobLog
from app.models.analytics_event import AnalyticsEvent
from app.models.payment import Payment
from app.models.user import User
from app.schemas.event import EventBatch
from app.services.event_service import get_platform_gmv, get_realtime_counters, ingest_events

router = APIRouter(prefix="/api", tags=["analytics"])


@router.post("/events")
async def batch_events(body: EventBatch, user: User | None = Depends(get_optional_user)):
    if len(body.events) > 25:
        raise HTTPException(status_code=400, detail="Max 25 events per batch")

    events = []
    for e in body.events:
        event_dict = e.model_dump()
        if user:
            event_dict["user_id"] = str(user.id)
        events.append(event_dict)

    count = await ingest_events(events)
    return {"ingested": count}


@router.get("/analytics/product/{product_id}")
async def product_analytics(
    product_id: str,
    user: User = Depends(get_current_user),
):
    counters = await get_realtime_counters(product_id)
    return counters


@router.get("/analytics/platform")
async def platform_analytics(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    # GMV
    gmv_result = await db.execute(
        select(func.sum(Payment.amount))
        .where(Payment.status == "completed")
    )
    total_gmv = gmv_result.scalar() or 0

    # Total users
    user_count = await db.execute(select(func.count(User.id)))
    total_users = user_count.scalar() or 0

    # Daily GMV from Redis
    daily_gmv = await get_platform_gmv()

    return {
        "total_gmv": float(total_gmv),
        "daily_gmv": daily_gmv,
        "total_users": total_users,
    }


@router.get("/analytics/ai")
async def ai_analytics(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """AI performance dashboard."""
    # Total inferences
    total = await db.execute(select(func.count(AIJobLog.id)))
    total_inferences = total.scalar() or 0

    # Cache hit rate
    cache_hits = await db.execute(
        select(func.count(AIJobLog.id)).where(AIJobLog.cache_hit.is_(True))
    )
    cache_hit_count = cache_hits.scalar() or 0
    cache_hit_rate = cache_hit_count / total_inferences if total_inferences > 0 else 0

    # Fallback rate
    fallbacks = await db.execute(
        select(func.count(AIJobLog.id)).where(AIJobLog.fallback_used.is_(True))
    )
    fallback_count = fallbacks.scalar() or 0
    fallback_rate = fallback_count / total_inferences if total_inferences > 0 else 0

    # Avg + p95 latency (approximate p95 via ordering)
    latency_stats = await db.execute(
        select(func.avg(AIJobLog.latency_ms))
        .where(AIJobLog.cache_hit.is_(False))
    )
    avg_latency = latency_stats.scalar() or 0

    # Error rate
    errors = await db.execute(
        select(func.count(AIJobLog.id)).where(AIJobLog.status == "error")
    )
    error_count = errors.scalar() or 0
    error_rate = error_count / total_inferences if total_inferences > 0 else 0

    # By type breakdown
    type_stats = await db.execute(
        select(
            AIJobLog.job_type,
            func.count(AIJobLog.id),
            func.avg(AIJobLog.latency_ms),
        )
        .group_by(AIJobLog.job_type)
    )
    by_type = {
        row[0]: {"count": row[1], "avg_ms": round(float(row[2] or 0))}
        for row in type_stats.all()
    }

    return {
        "total_inferences": total_inferences,
        "cache_hit_rate": round(cache_hit_rate, 2),
        "fallback_rate": round(fallback_rate, 2),
        "avg_latency_ms": round(float(avg_latency)),
        "error_rate": round(error_rate, 3),
        "by_type": by_type,
        "cost_estimate": "$0.00 (local Ollama)",
    }
