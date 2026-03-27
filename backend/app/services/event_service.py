import json
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis

from app.config import settings
from app.models.analytics_event import AnalyticsEvent

_redis = None

VALID_EVENT_TYPES = {
    "page_view", "upvote", "purchase", "search", "click",
    "boost_impression", "review_submit", "deal_view", "matchmaking",
}


async def get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def ingest_events(events: list[dict]) -> int:
    """Push events to Redis stream for async processing. Returns count ingested."""
    r = await get_redis()
    count = 0
    for event in events:
        if event.get("event_type") not in VALID_EVENT_TYPES:
            continue
        event["id"] = str(uuid.uuid4())
        event["timestamp"] = datetime.now(timezone.utc).isoformat()
        await r.xadd("stream:events", {"data": json.dumps(event)})
        count += 1

        # Update real-time counters
        product_id = event.get("product_id")
        if product_id:
            if event["event_type"] == "page_view":
                await r.incr(f"product:{product_id}:views")
                await r.expire(f"product:{product_id}:views", 86400)
            elif event["event_type"] == "click":
                await r.incr(f"product:{product_id}:clicks")
                await r.expire(f"product:{product_id}:clicks", 86400)

        if event["event_type"] == "purchase":
            amount = (event.get("metadata") or {}).get("amount", 0)
            if amount:
                await r.incrbyfloat("daily:gmv", float(amount))
                await r.expire("daily:gmv", 86400)

    return count


async def get_realtime_counters(product_id: str) -> dict:
    """Get real-time view/click counters for a product."""
    r = await get_redis()
    views = await r.get(f"product:{product_id}:views") or 0
    clicks = await r.get(f"product:{product_id}:clicks") or 0
    return {"views_24h": int(views), "clicks_24h": int(clicks)}


async def get_platform_gmv() -> float:
    r = await get_redis()
    gmv = await r.get("daily:gmv")
    return float(gmv) if gmv else 0.0
