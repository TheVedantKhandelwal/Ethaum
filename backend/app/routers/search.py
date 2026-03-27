from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models import Category, Deal, Launch, Product
from app.schemas.search import (
    SearchCategoryHit,
    SearchDealHit,
    SearchLaunchHit,
    SearchProductHit,
    SearchResults,
)

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResults)
async def search(
    q: str = Query(min_length=1, description="Search query"),
    type: str = Query(default="all", pattern="^(all|products|launches|deals|categories)$"),
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Search across products, launches, deals, and categories using PostgreSQL ilike."""
    pattern = f"%{q}%"
    results = SearchResults()

    # Search products
    if type in ("all", "products"):
        stmt = (
            select(Product)
            .where(
                or_(
                    Product.name.ilike(pattern),
                    Product.tagline.ilike(pattern),
                    Product.description.ilike(pattern),
                )
            )
            .order_by(Product.credibility_score.desc())
            .limit(limit)
        )
        product_rows = await db.execute(stmt)
        products = product_rows.scalars().all()
        results.products = [
            SearchProductHit(
                id=p.id,
                name=p.name,
                slug=p.slug,
                tagline=p.tagline,
                logo_url=p.logo_url,
                category=p.category,
                avg_rating=float(p.avg_rating) if p.avg_rating else 0.0,
                review_count=p.review_count,
            )
            for p in products
        ]

    # Search launches
    if type in ("all", "launches"):
        stmt = (
            select(Launch)
            .options(joinedload(Launch.product))
            .where(
                or_(
                    Launch.title.ilike(pattern),
                    Launch.tagline.ilike(pattern),
                )
            )
            .order_by(Launch.trending_score.desc())
            .limit(limit)
        )
        launch_rows = await db.execute(stmt)
        launches = launch_rows.unique().scalars().all()
        results.launches = [
            SearchLaunchHit(
                id=l.id,
                title=l.title,
                tagline=l.tagline,
                upvote_count=l.upvote_count,
                product_name=l.product.name if l.product else None,
                product_slug=l.product.slug if l.product else None,
            )
            for l in launches
        ]

    # Search deals
    if type in ("all", "deals"):
        stmt = (
            select(Deal)
            .options(joinedload(Deal.product))
            .where(Deal.title.ilike(pattern))
            .limit(limit)
        )
        deal_rows = await db.execute(stmt)
        deals = deal_rows.unique().scalars().all()
        results.deals = [
            SearchDealHit(
                id=d.id,
                title=d.title,
                deal_type=d.deal_type,
                original_price=d.original_price,
                deal_price=d.deal_price,
                product_name=d.product.name if d.product else None,
                product_slug=d.product.slug if d.product else None,
            )
            for d in deals
        ]

    # Search categories
    if type in ("all", "categories"):
        stmt = (
            select(Category)
            .where(
                or_(
                    Category.name.ilike(pattern),
                    Category.description.ilike(pattern),
                )
            )
            .order_by(Category.name)
            .limit(limit)
        )
        cat_rows = await db.execute(stmt)
        categories = cat_rows.scalars().all()
        results.categories = [
            SearchCategoryHit(
                id=c.id,
                name=c.name,
                slug=c.slug,
                description=c.description,
                icon=c.icon,
                product_count=c.product_count,
            )
            for c in categories
        ]

    results.total = (
        len(results.products)
        + len(results.launches)
        + len(results.deals)
        + len(results.categories)
    )
    return results
