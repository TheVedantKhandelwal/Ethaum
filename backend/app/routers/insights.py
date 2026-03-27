import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Launch, Product, Review
from app.schemas.insight import QuadrantData, QuadrantProduct, TrendItem, TrendsData, ValidationReport
from app.services.report import generate_validation_report

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/quadrant", response_model=QuadrantData)
async def get_quadrant(
    category: str = Query(description="Product category to generate quadrant for"),
    db: AsyncSession = Depends(get_db),
):
    """Generate Gartner-style quadrant data for a category."""
    stmt = select(Product).where(Product.category == category)
    result = await db.execute(stmt)
    products = result.scalars().all()

    quadrant_products = []
    for p in products:
        # X axis: "completeness of vision" — based on features count + stage
        stage_scores = {"seed": 0.2, "A": 0.4, "B": 0.6, "C": 0.8, "D": 0.95}
        feature_count = len((p.features or {}).get("list", []))
        x = min((feature_count / 10) * 0.5 + stage_scores.get(p.stage or "", 0.3) * 0.5, 1.0)

        # Y axis: "ability to execute" — credibility score
        y = p.credibility_score

        quadrant_products.append(QuadrantProduct(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            x=round(x, 3),
            y=round(y, 3),
            category=p.category,
            stage=p.stage,
        ))

    return QuadrantData(category=category, products=quadrant_products)


@router.get("/trends", response_model=TrendsData)
async def get_trends(db: AsyncSession = Depends(get_db)):
    """Get trending products and categories."""
    # Trending products by trending_score from launches
    stmt = (
        select(Launch, Product)
        .join(Product)
        .where(Launch.status == "live")
        .order_by(Launch.trending_score.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    rows = result.all()

    trending_products = [
        TrendItem(
            name=product.name,
            slug=product.slug,
            score=round(launch.trending_score, 2),
            change=round(launch.upvote_count * 2.5, 1),  # Simplified change metric
        )
        for launch, product in rows
    ]

    # Trending categories by review volume
    cat_stmt = (
        select(Product.category, func.count(Review.id).label("cnt"))
        .join(Review, Review.product_id == Product.id)
        .where(Product.category.isnot(None))
        .group_by(Product.category)
        .order_by(func.count(Review.id).desc())
        .limit(8)
    )
    cat_result = await db.execute(cat_stmt)
    trending_categories = [
        TrendItem(name=row.category, score=float(row.cnt), change=0.0)
        for row in cat_result.all()
    ]

    return TrendsData(trending_products=trending_products, trending_categories=trending_categories)


@router.post("/report/{product_id}", response_model=ValidationReport)
async def create_report(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Generate an AI-powered validation report for a product."""
    report = await generate_validation_report(db, product_id)
    if "error" in report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=report["error"])
    return report
