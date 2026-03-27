import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Category, Product
from app.schemas.category import CategoryCreate, CategoryOut, CategoryTree, CategoryWithProducts
from app.schemas.product import ProductOut

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _to_dict(cat) -> dict:
    """Convert a Category ORM object to a plain dict."""
    return {
        "id": cat.id, "name": cat.name, "slug": cat.slug,
        "description": cat.description, "icon": cat.icon,
        "parent_id": cat.parent_id, "product_count": cat.product_count,
        "created_at": cat.created_at, "children": [],
    }


def _build_tree(categories: list, parent_id: uuid.UUID | None = None) -> list[dict]:
    """Recursively build nested category tree from ORM objects."""
    tree = []
    for cat in categories:
        if cat.parent_id == parent_id:
            node = _to_dict(cat)
            node["children"] = _build_tree(categories, cat.id)
            tree.append(node)
    return tree


@router.get("")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Return all categories as a tree structure."""
    result = await db.execute(
        select(Category).order_by(Category.name)
    )
    all_categories = result.scalars().all()
    return _build_tree(all_categories, parent_id=None)


@router.get("/{slug}")
async def get_category(
    slug: str,
    company_size: str | None = None,
    pricing_model: str | None = None,
    deployment_model: str | None = None,
    min_rating: float | None = None,
    sort: str = Query(default="credibility", pattern="^(credibility|rating|recent|name)$"),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Return a category with its products (paginated, filterable)."""
    # Get the category
    result = await db.execute(select(Category).where(Category.slug == slug))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Get children
    children_result = await db.execute(
        select(Category).where(Category.parent_id == category.id).order_by(Category.name)
    )
    children = children_result.scalars().all()

    # Build product query — match by category name or any child category name
    category_names = [category.name] + [c.name for c in children]
    stmt = select(Product).where(Product.category.in_(category_names))

    # Apply filters
    if pricing_model:
        stmt = stmt.where(Product.pricing_model == pricing_model)
    if deployment_model:
        stmt = stmt.where(Product.deployment_model == deployment_model)
    if min_rating:
        stmt = stmt.where(Product.avg_rating >= min_rating)

    # Apply sort
    if sort == "credibility":
        stmt = stmt.order_by(Product.credibility_score.desc())
    elif sort == "rating":
        stmt = stmt.order_by(Product.avg_rating.desc())
    elif sort == "recent":
        stmt = stmt.order_by(Product.created_at.desc())
    elif sort == "name":
        stmt = stmt.order_by(Product.name.asc())

    stmt = stmt.offset(offset).limit(limit)
    products_result = await db.execute(stmt)
    products = products_result.scalars().all()

    cat_dict = _to_dict(category)
    cat_dict["children"] = [_to_dict(c) for c in children]

    return {
        "category": cat_dict,
        "products": [ProductOut.model_validate(p) for p in products],
        "total": len(products),
    }


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(body: CategoryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new category (admin only in production)."""
    # Check slug uniqueness
    existing = await db.execute(select(Category).where(Category.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Category slug already exists")

    # Validate parent if provided
    if body.parent_id:
        parent = await db.get(Category, body.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")

    category = Category(
        name=body.name,
        slug=body.slug,
        description=body.description,
        icon=body.icon,
        parent_id=body.parent_id,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category
