"""Buyer-startup matching service — wraps AI service with DB queries."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Match, Product
from app.services import ai_service


async def run_matchmaking(
    db: AsyncSession,
    buyer_id: uuid.UUID,
    requirements: dict,
) -> list[dict]:
    """Match buyer requirements to products and persist results."""
    stmt = select(Product)

    # Filter by category if specified
    if requirements.get("category"):
        stmt = stmt.where(Product.category == requirements["category"])

    result = await db.execute(stmt)
    products = result.scalars().all()

    if not products:
        return []

    product_dicts = [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "category": p.category,
            "stage": p.stage,
            "features": p.features or {},
            "credibility_score": p.credibility_score,
        }
        for p in products
    ]

    matches = await ai_service.match_buyer_to_products(requirements, product_dicts)

    # Persist match results
    results = []
    for m in matches:
        if m["score"] < 0.1:
            continue
        match_record = Match(
            buyer_id=buyer_id,
            product_id=uuid.UUID(m["product_id"]),
            match_score=m["score"],
            match_reasons=m.get("reasons", {}),
        )
        db.add(match_record)
        # Find product name/slug
        prod = next((p for p in products if str(p.id) == m["product_id"]), None)
        results.append({
            "product_id": m["product_id"],
            "product_name": prod.name if prod else "",
            "product_slug": prod.slug if prod else "",
            "match_score": m["score"],
            "match_reasons": m.get("reasons", {}),
        })

    await db.commit()
    return results
