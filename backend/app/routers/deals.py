from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import Deal, Product, Referral, User
from app.schemas.deal import DealCreate, DealOut, ReferralCreate

router = APIRouter(prefix="/api/deals", tags=["deals"])


@router.get("", response_model=list[DealOut])
async def list_deals(
    deal_type: str | None = None,
    limit: int = Query(default=30, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Deal).join(Product)
    if deal_type:
        stmt = stmt.where(Deal.deal_type == deal_type)
    stmt = stmt.order_by(Deal.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    deals = result.scalars().all()

    out = []
    for d in deals:
        product = await db.get(Product, d.product_id)
        deal_out = DealOut.model_validate(d)
        deal_out.product_name = product.name if product else None
        deal_out.product_slug = product.slug if product else None
        out.append(deal_out)
    return out


@router.post("", response_model=DealOut, status_code=201)
async def create_deal(
    body: DealCreate,
    user: User = Depends(require_role("vendor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, body.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Verify the authenticated user owns the product
    if product.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You do not own this product")

    deal = Deal(
        product_id=body.product_id,
        title=body.title,
        description=body.description,
        deal_type=body.deal_type,
        original_price=body.original_price,
        deal_price=body.deal_price,
        max_redemptions=body.max_redemptions,
        expires_at=body.expires_at,
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)

    deal_out = DealOut.model_validate(deal)
    deal_out.product_name = product.name
    deal_out.product_slug = product.slug
    return deal_out


@router.post("/referrals", status_code=201)
async def create_referral(body: ReferralCreate, db: AsyncSession = Depends(get_db)):
    referral = Referral(
        referrer_id=body.referrer_id,
        referred_email=body.referred_email,
        deal_id=body.deal_id,
    )
    db.add(referral)
    await db.commit()
    return {"id": str(referral.id), "status": "pending"}
