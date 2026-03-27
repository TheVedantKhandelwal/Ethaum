import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from slugify import slugify
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Launch, Product, Upvote, User
from app.schemas.launch import LaunchCreate, LaunchOut, LaunchPreviewRequest, LaunchPreviewResponse, WizardCreate
from app.services import ai_service
from app.services.scoring import compute_trending_score

router = APIRouter(prefix="/api/launches", tags=["launches"])


def _launch_to_out(launch: Launch) -> LaunchOut:
    return LaunchOut(
        id=launch.id,
        product_id=launch.product_id,
        title=launch.title,
        tagline=launch.tagline,
        ai_tagline=launch.ai_tagline,
        description=launch.description,
        ai_description=launch.ai_description,
        status=launch.status,
        launch_date=launch.launch_date,
        upvote_count=launch.upvote_count,
        trending_score=launch.trending_score,
        created_at=launch.created_at,
        product_name=launch.product.name if launch.product else None,
        product_slug=launch.product.slug if launch.product else None,
        product_logo=launch.product.logo_url if launch.product else None,
    )


@router.get("", response_model=list[LaunchOut])
async def list_launches(
    sort: str = Query(default="trending", pattern="^(trending|recent|top)$"),
    status: str = "live",
    limit: int = Query(default=30, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Launch).options(joinedload(Launch.product)).where(Launch.status == status)
    if sort == "trending":
        stmt = stmt.order_by(Launch.trending_score.desc())
    elif sort == "recent":
        stmt = stmt.order_by(Launch.created_at.desc())
    else:
        stmt = stmt.order_by(Launch.upvote_count.desc())
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    launches = result.unique().scalars().all()
    return [_launch_to_out(l) for l in launches]


@router.get("/leaderboard", response_model=list[LaunchOut])
async def leaderboard(
    period: str = Query(default="daily", pattern="^(daily|weekly)$"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Launch).options(joinedload(Launch.product)).where(Launch.status == "live")
    if period == "daily":
        stmt = stmt.where(Launch.launch_date == date.today())
    stmt = stmt.order_by(Launch.upvote_count.desc()).limit(20)
    result = await db.execute(stmt)
    launches = result.unique().scalars().all()
    return [_launch_to_out(l) for l in launches]


@router.post("", response_model=LaunchOut, status_code=201)
async def create_launch(
    body: LaunchCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify product exists and get its info for AI content generation
    product = await db.get(Product, body.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Generate AI content
    ai_content = await ai_service.generate_launch_content(product.name, product.features)

    launch = Launch(
        product_id=body.product_id,
        title=body.title,
        tagline=body.tagline,
        ai_tagline=ai_content.get("tagline"),
        description=body.description,
        ai_description=ai_content.get("description"),
        launch_date=body.launch_date or date.today(),
    )
    db.add(launch)
    await db.commit()
    await db.refresh(launch)

    # Load the product relationship
    result = await db.execute(
        select(Launch).options(joinedload(Launch.product)).where(Launch.id == launch.id)
    )
    launch = result.unique().scalar_one()
    return _launch_to_out(launch)


@router.post("/preview", response_model=LaunchPreviewResponse)
async def preview_launch(
    body: LaunchPreviewRequest,
    user: User = Depends(get_current_user),
):
    """Stateless AI preview — generate tagline + description from product info."""
    features_dict = {"list": body.features} if body.features else None
    ai_content = await ai_service.generate_launch_content(body.product_name, features_dict)
    return LaunchPreviewResponse(
        ai_tagline=ai_content.get("tagline", ""),
        ai_description=ai_content.get("description", ""),
    )


@router.post("/wizard", response_model=LaunchOut, status_code=201)
async def create_wizard(
    body: WizardCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atomic product + launch creation from the wizard flow."""
    # Create product
    slug = slugify(body.product_name)
    existing = await db.execute(select(Product).where(Product.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    product = Product(
        user_id=user.id,
        name=body.product_name,
        slug=slug,
        category=body.category,
        stage=body.stage,
        website=body.website,
        features={"list": body.features} if body.features else {},
    )
    db.add(product)
    await db.flush()

    # Generate AI content
    ai_content = await ai_service.generate_launch_content(product.name, product.features)

    launch = Launch(
        product_id=product.id,
        title=body.title,
        tagline=body.tagline,
        ai_tagline=ai_content.get("tagline"),
        description=body.description,
        ai_description=ai_content.get("description"),
        launch_date=body.launch_date or date.today(),
    )
    db.add(launch)
    await db.commit()

    # Load relationships
    result = await db.execute(
        select(Launch).options(joinedload(Launch.product)).where(Launch.id == launch.id)
    )
    launch = result.unique().scalar_one()
    return _launch_to_out(launch)


@router.post("/{launch_id}/upvote")
async def toggle_upvote(
    launch_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    launch = await db.get(Launch, launch_id)
    if not launch:
        raise HTTPException(status_code=404, detail="Launch not found")

    # Check if already upvoted
    existing = await db.execute(
        select(Upvote).where(Upvote.launch_id == launch_id, Upvote.user_id == user.id)
    )
    upvote = existing.scalar_one_or_none()

    if upvote:
        # Remove upvote
        await db.execute(delete(Upvote).where(Upvote.id == upvote.id))
        launch.upvote_count = max(0, launch.upvote_count - 1)
        action = "removed"
    else:
        # Add upvote
        db.add(Upvote(launch_id=launch_id, user_id=user.id))
        launch.upvote_count += 1
        action = "added"

    # Recompute trending score
    launch.trending_score = compute_trending_score(launch.upvote_count, launch.created_at)
    await db.commit()

    return {"action": action, "upvote_count": launch.upvote_count}
