"""Report generation service — wraps AI service with DB queries."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product, Review
from app.services import ai_service


async def generate_validation_report(db: AsyncSession, product_id: uuid.UUID) -> dict:
    """Generate an AI-powered validation report for a product."""
    product = await db.get(Product, product_id)
    if not product:
        return {"error": "Product not found"}

    result = await db.execute(
        select(Review).where(Review.product_id == product_id).order_by(Review.created_at.desc()).limit(20)
    )
    reviews = result.scalars().all()

    product_dict = {
        "name": product.name,
        "category": product.category,
        "stage": product.stage,
        "credibility_score": product.credibility_score,
        "features": product.features,
    }
    review_dicts = [
        {"rating": r.rating, "title": r.title, "content": r.content, "sentiment_score": r.sentiment_score}
        for r in reviews
    ]

    report = await ai_service.generate_report(product_dict, review_dicts)
    return {
        "product_name": product.name,
        "overall_score": report.get("overall_score", 0),
        "sections": report.get("sections", []),
    }
