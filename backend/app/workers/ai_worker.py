"""
Async AI job worker — consumes from Redis Stream 'stream:ai_jobs'.
Processes credibility scoring, review summarization, and matchmaking.
Logs results to ai_job_logs table.
"""

import asyncio
import json
import logging
import time
import uuid

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.models.ai_job_log import AIJobLog
from app.models.product import Product
from app.models.review import Review
from app.services import ai_service
from app.services.scoring import compute_credibility_score

logger = logging.getLogger(__name__)

CACHE_TTLS = {
    "credibility": 3600,    # 1h
    "summarize": 7200,      # 2h
    "matchmaking": 1800,    # 30min
    "launch_gen": 3600,     # 1h
}


async def get_redis():
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_cached(r, cache_key: str) -> dict | None:
    data = await r.get(cache_key)
    if data:
        return json.loads(data)
    return None


async def set_cached(r, cache_key: str, data: dict, job_type: str):
    ttl = CACHE_TTLS.get(job_type, 3600)
    await r.setex(cache_key, ttl, json.dumps(data))


async def log_job(
    db: AsyncSession,
    job_type: str,
    product_id: str | None,
    latency_ms: int,
    cache_hit: bool = False,
    fallback_used: bool = False,
    status: str = "success",
    error_message: str | None = None,
):
    log = AIJobLog(
        job_type=job_type,
        product_id=uuid.UUID(product_id) if product_id else None,
        model_used=settings.OLLAMA_MODEL,
        latency_ms=latency_ms,
        cache_hit=cache_hit,
        fallback_used=fallback_used,
        status=status,
        error_message=error_message,
    )
    db.add(log)
    await db.commit()


async def process_credibility(product_id: str):
    """Recompute credibility score for a product."""
    r = await get_redis()
    cache_key = f"ai:credibility:{product_id}"
    start = time.monotonic()

    async with async_session() as db:
        try:
            # Check cache
            cached = await get_cached(r, cache_key)
            if cached:
                await log_job(db, "credibility", product_id, 0, cache_hit=True)
                return cached

            # Fetch product + reviews
            result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
            product = result.scalar_one_or_none()
            if not product:
                return

            reviews_result = await db.execute(
                select(Review).where(Review.product_id == product.id)
            )
            reviews = reviews_result.scalars().all()

            # Compute score using existing scoring service
            score = compute_credibility_score(product, reviews)
            product.credibility_score = score
            await db.commit()

            latency = int((time.monotonic() - start) * 1000)
            result_data = {"score": score, "product_id": product_id}
            await set_cached(r, cache_key, result_data, "credibility")
            await log_job(db, "credibility", product_id, latency)
            return result_data

        except Exception as e:
            latency = int((time.monotonic() - start) * 1000)
            await log_job(db, "credibility", product_id, latency, status="error", error_message=str(e))
            logger.error("Credibility job failed for %s: %s", product_id, e)


async def process_review_summary(product_id: str):
    """Generate AI review summary for a product."""
    r = await get_redis()
    cache_key = f"ai:summary:{product_id}"
    start = time.monotonic()

    async with async_session() as db:
        try:
            cached = await get_cached(r, cache_key)
            if cached:
                await log_job(db, "summarize", product_id, 0, cache_hit=True)
                return cached

            result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
            product = result.scalar_one_or_none()
            if not product:
                return

            reviews_result = await db.execute(
                select(Review).where(Review.product_id == product.id)
            )
            reviews = reviews_result.scalars().all()

            if not reviews:
                return

            reviews_text = "\n".join(
                f"Rating: {r.rating}/5 - {r.title}: {(r.content or '')[:200]}" for r in reviews
            )

            # Use AI to generate summary
            from app.services.ai_service import _generate
            prompt = (
                f"Summarize these {len(reviews)} reviews for \"{product.name}\":\n"
                f"{reviews_text}\n\n"
                "Return JSON: {\"summary\": \"...\", \"pros_themes\": [\"...\"], "
                "\"cons_themes\": [\"...\"], \"sentiment\": \"positive|mixed|negative\"}"
            )
            ai_result = await _generate(prompt, system="You are a review analyst. Respond with valid JSON only.")
            fallback_used = False

            if ai_result:
                try:
                    summary_data = json.loads(ai_result)
                except json.JSONDecodeError:
                    fallback_used = True
                    summary_data = None
            else:
                fallback_used = True
                summary_data = None

            if not summary_data:
                # Heuristic fallback
                avg_rating = sum(r.rating for r in reviews) / len(reviews)
                sentiment = "positive" if avg_rating >= 3.5 else "mixed" if avg_rating >= 2.5 else "negative"
                summary_data = {
                    "summary": f"Based on {len(reviews)} reviews with an average of {avg_rating:.1f}/5.",
                    "pros_themes": ["Core functionality", "Ease of use"],
                    "cons_themes": ["Documentation", "Pricing"],
                    "sentiment": sentiment,
                }

            latency = int((time.monotonic() - start) * 1000)
            await set_cached(r, cache_key, summary_data, "summarize")
            await log_job(db, "summarize", product_id, latency, fallback_used=fallback_used)
            return summary_data

        except Exception as e:
            latency = int((time.monotonic() - start) * 1000)
            await log_job(db, "summarize", product_id, latency, status="error", error_message=str(e))
            logger.error("Summary job failed for %s: %s", product_id, e)


async def dispatch_job(job_type: str, **kwargs):
    """Push a job to the Redis AI job stream."""
    r = await get_redis()
    payload = {"type": job_type, **{k: str(v) for k, v in kwargs.items()}}
    await r.xadd("stream:ai_jobs", {"data": json.dumps(payload)})


async def worker_loop():
    """Main worker loop — consumes from stream:ai_jobs."""
    r = await get_redis()
    logger.info("AI worker started, consuming from stream:ai_jobs")

    last_id = "$"
    while True:
        try:
            results = await r.xread({"stream:ai_jobs": last_id}, block=5000, count=10)
            for stream_name, messages in results:
                for msg_id, data in messages:
                    last_id = msg_id
                    try:
                        job = json.loads(data.get("data", "{}"))
                        job_type = job.get("type")

                        if job_type == "credibility":
                            await process_credibility(job["product_id"])
                        elif job_type == "summarize":
                            await process_review_summary(job["product_id"])
                        else:
                            logger.warning("Unknown job type: %s", job_type)

                    except Exception as e:
                        logger.error("Job processing error: %s", e)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Worker loop error: %s", e)
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(worker_loop())
