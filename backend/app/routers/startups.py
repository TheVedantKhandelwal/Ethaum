from fastapi import APIRouter, Depends, HTTPException
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.startup import Startup
from app.models.user import User
from app.schemas.startup import StartupCreate, StartupOut, StartupUpdate

router = APIRouter(prefix="/api/startups", tags=["startups"])


@router.post("", response_model=StartupOut)
async def create_startup(
    body: StartupCreate,
    user: User = Depends(require_role("vendor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    slug = slugify(body.name)
    # Ensure unique slug
    existing = await db.execute(select(Startup).where(Startup.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{str(user.id)[:8]}"

    startup = Startup(
        owner_id=user.id,
        name=body.name,
        slug=slug,
        description=body.description,
        website=body.website,
        logo_url=body.logo_url,
        founded_year=body.founded_year,
        team_size=body.team_size,
    )
    db.add(startup)
    await db.commit()
    await db.refresh(startup)
    return startup


@router.get("/{slug}", response_model=StartupOut)
async def get_startup(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Startup).where(Startup.slug == slug))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    return startup


@router.put("/{startup_id}", response_model=StartupOut)
async def update_startup(
    startup_id: str,
    body: StartupUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    if startup.owner_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not the owner of this startup")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(startup, field, value)
    await db.commit()
    await db.refresh(startup)
    return startup


@router.get("", response_model=list[StartupOut])
async def list_startups(
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    result = await db.execute(
        select(Startup)
        .where(Startup.status == "active")
        .order_by(Startup.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()
