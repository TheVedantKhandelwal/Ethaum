import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from slugify import slugify
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Product, Review, User
from app.schemas.product import ProductCreate, ProductDetail, ProductOut
from app.services.badge_service import get_product_badges

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    category: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Product)
    if category:
        stmt = stmt.where(Product.category == category)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(pattern),
                Product.tagline.ilike(pattern),
                Product.description.ilike(pattern),
            )
        )
    stmt = stmt.order_by(Product.credibility_score.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{slug}", response_model=ProductDetail)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Compute review stats
    stats = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.product_id == product.id)
    )
    avg_rating, review_count = stats.one()

    data = ProductDetail.model_validate(product)
    data.avg_rating = round(float(avg_rating), 2) if avg_rating else None
    data.review_count = review_count or 0

    # Include badges
    data.badges = await get_product_badges(db, product.id)
    return data


@router.get("/{slug}/badges")
async def get_product_badges_endpoint(slug: str, db: AsyncSession = Depends(get_db)):
    """Return all badges awarded to a product."""
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    badges = await get_product_badges(db, product.id)
    return {"product_id": str(product.id), "slug": product.slug, "badges": badges}


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    body: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slug = slugify(body.name)
    # Ensure unique slug
    existing = await db.execute(select(Product).where(Product.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    product = Product(
        user_id=user.id,
        name=body.name,
        slug=slug,
        tagline=body.tagline,
        description=body.description,
        website=body.website,
        logo_url=body.logo_url,
        category=body.category,
        stage=body.stage,
        arr_range=body.arr_range,
        features=body.features or {},
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product
