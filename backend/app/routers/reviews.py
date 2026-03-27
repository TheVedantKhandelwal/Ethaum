import uuid
import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Product, Review, User
from app.schemas.review import CompareResult, ReviewCreate, ReviewOut
from app.services import ai_service
from app.services.scoring import compute_credibility_score

router = APIRouter(prefix="/api", tags=["reviews"])


async def _resolve_product(identifier: str, db: AsyncSession) -> Product | None:
    """Resolve a product by UUID or slug."""
    # Try UUID first
    try:
        product_uuid = uuid.UUID(identifier)
        product = await db.get(Product, product_uuid)
        if product:
            return product
    except ValueError:
        pass
    # Fall back to slug lookup
    result = await db.execute(select(Product).where(Product.slug == identifier))
    return result.scalar_one_or_none()


@router.post("/reviews", response_model=ReviewOut, status_code=201)
async def create_review(
    body: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, body.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    review_text = f"{body.title}. {body.content or ''}"

    # AI verification + sentiment (run concurrently in practice, sequential here for simplicity)
    verification_score = await ai_service.verify_review(review_text)
    sentiment_score = await ai_service.analyze_sentiment(review_text)

    review = Review(
        product_id=body.product_id,
        user_id=user.id,
        rating=body.rating,
        title=body.title,
        content=body.content,
        pros=body.pros or [],
        cons=body.cons or [],
        sub_ratings=body.sub_ratings,
        company_size=body.company_size,
        industry=body.industry,
        job_role=body.job_role,
        would_recommend=body.would_recommend,
        verification_score=verification_score,
        sentiment_score=sentiment_score,
        is_verified=verification_score >= 0.6,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    # Recompute product credibility score
    stats = await db.execute(
        select(
            func.avg(Review.rating),
            func.count(Review.id),
            func.avg(Review.verification_score),
        ).where(Review.product_id == body.product_id)
    )
    avg_rating, review_count, verification_avg = stats.one()
    engagement = min(math.log(review_count + 1) / math.log(51), 1.0)
    product.credibility_score = compute_credibility_score(
        avg_rating=float(avg_rating or 0),
        review_count=int(review_count or 0),
        verification_avg=float(verification_avg or 0),
        engagement=engagement,
        consistency=0.5,  # Simplified: would compare rating distribution variance
    )
    await db.commit()

    # Load user name
    review_author = await db.get(User, review.user_id)
    out = ReviewOut.model_validate(review)
    out.user_name = review_author.name if review_author else None
    return out


@router.get("/reviews", response_model=list[ReviewOut])
async def list_reviews(
    product_id: uuid.UUID,
    limit: int = Query(default=20, le=50),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Review)
        .where(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    reviews = result.scalars().all()
    return [ReviewOut.model_validate(r) for r in reviews]


@router.get("/compare/summary")
async def compare_summary(
    products: str = Query(description="Comma-separated product slugs or UUIDs"),
    db: AsyncSession = Depends(get_db),
):
    """AI-generated comparison verdict."""
    identifiers = [p.strip() for p in products.split(",")]
    product_data = []
    for identifier in identifiers[:4]:
        product = await _resolve_product(identifier, db)
        if not product:
            continue
        stats = await db.execute(
            select(func.avg(Review.rating), func.count(Review.id))
            .where(Review.product_id == product.id)
        )
        avg_rating, review_count = stats.one()
        product_data.append({
            "name": product.name,
            "category": product.category,
            "stage": product.stage,
            "features": product.features or {},
            "credibility_score": product.credibility_score,
            "avg_rating": round(float(avg_rating), 2) if avg_rating else None,
            "review_count": review_count or 0,
        })

    summary = await ai_service.generate_comparison_summary(product_data)
    return summary


@router.get("/compare", response_model=CompareResult)
async def compare_products(
    products: str = Query(description="Comma-separated product slugs or UUIDs"),
    db: AsyncSession = Depends(get_db),
):
    identifiers = [p.strip() for p in products.split(",")]
    if len(identifiers) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 products to compare")

    comparison = []
    for identifier in identifiers[:4]:  # Cap at 4
        product = await _resolve_product(identifier, db)
        if not product:
            continue

        stats = await db.execute(
            select(func.avg(Review.rating), func.count(Review.id))
            .where(Review.product_id == product.id)
        )
        avg_rating, review_count = stats.one()

        comparison.append({
            "id": str(product.id),
            "name": product.name,
            "slug": product.slug,
            "tagline": product.tagline,
            "category": product.category,
            "stage": product.stage,
            "features": product.features,
            "credibility_score": product.credibility_score,
            "avg_rating": round(float(avg_rating), 2) if avg_rating else None,
            "review_count": review_count or 0,
        })

    return CompareResult(products=comparison)
