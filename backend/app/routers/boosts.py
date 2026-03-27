import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.boost import Boost
from app.models.payment import Payment
from app.models.product import Product
from app.models.user import User
from app.schemas.boost import BoostCreate, BoostOut
from app.schemas.payment import CheckoutResponse
from app.services.boost_engine import MIN_CREDIBILITY, compute_boost_stats
from app.services.stripe_service import create_checkout_session, generate_idempotency_key

router = APIRouter(prefix="/api/boosts", tags=["boosts"])


@router.post("", response_model=CheckoutResponse)
async def create_boost(
    body: BoostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate product ownership
    result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not the product owner")
    if product.credibility_score < MIN_CREDIBILITY:
        raise HTTPException(status_code=400, detail=f"Product credibility must be >= {MIN_CREDIBILITY}")

    if body.boost_type not in ("featured", "trending", "category"):
        raise HTTPException(status_code=400, detail="Invalid boost type")

    boost = Boost(
        product_id=body.product_id,
        boost_type=body.boost_type,
        bid_amount=body.bid_amount,
        daily_budget=body.daily_budget,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(boost)
    await db.flush()  # get boost.id before creating payment

    # Estimate total cost for checkout
    days = max(1, (body.ends_at - body.starts_at).days)
    estimated_total = body.bid_amount * days
    idempotency_key = generate_idempotency_key(str(user.id), str(boost.id))

    payment = Payment(
        user_id=user.id,
        boost_id=boost.id,
        amount=estimated_total,
        payment_type="boost",
        idempotency_key=idempotency_key,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    checkout_url = await create_checkout_session(
        amount_cents=int(estimated_total * 100),
        product_name=f"Boost: {product.name} ({body.boost_type})",
        payment_id=str(payment.id),
        metadata={"boost_id": str(boost.id), "user_id": str(user.id)},
    )

    return CheckoutResponse(checkout_url=checkout_url, payment_id=payment.id)


@router.get("", response_model=list[BoostOut])
async def list_boosts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    product_id: uuid.UUID | None = None,
    status: str | None = None,
):
    query = select(Boost).join(Product).where(Product.user_id == user.id)
    if product_id:
        query = query.where(Boost.product_id == product_id)
    if status:
        query = query.where(Boost.status == status)
    query = query.order_by(Boost.created_at.desc())

    result = await db.execute(query)
    boosts = result.scalars().all()

    out = []
    for boost in boosts:
        stats = compute_boost_stats(boost)
        boost_dict = BoostOut.model_validate(boost).model_dump()
        boost_dict.update(stats)
        out.append(BoostOut(**boost_dict))
    return out


@router.get("/{boost_id}", response_model=BoostOut)
async def get_boost(
    boost_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Boost).where(Boost.id == boost_id))
    boost = result.scalar_one_or_none()
    if not boost:
        raise HTTPException(status_code=404, detail="Boost not found")

    # Verify ownership
    prod_result = await db.execute(select(Product).where(Product.id == boost.product_id))
    product = prod_result.scalar_one_or_none()
    if product and product.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    stats = compute_boost_stats(boost)
    boost_dict = BoostOut.model_validate(boost).model_dump()
    boost_dict.update(stats)
    return BoostOut(**boost_dict)


@router.put("/{boost_id}/pause")
async def pause_boost(
    boost_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Boost).where(Boost.id == boost_id))
    boost = result.scalar_one_or_none()
    if not boost:
        raise HTTPException(status_code=404, detail="Boost not found")

    prod_result = await db.execute(select(Product).where(Product.id == boost.product_id))
    product = prod_result.scalar_one_or_none()
    if product and product.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    if boost.status != "active":
        raise HTTPException(status_code=400, detail="Boost is not active")

    boost.status = "paused"
    await db.commit()
    return {"status": "paused", "boost_id": str(boost_id)}


@router.put("/{boost_id}/resume")
async def resume_boost(
    boost_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Boost).where(Boost.id == boost_id))
    boost = result.scalar_one_or_none()
    if not boost:
        raise HTTPException(status_code=404, detail="Boost not found")

    prod_result = await db.execute(select(Product).where(Product.id == boost.product_id))
    product = prod_result.scalar_one_or_none()
    if product and product.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    if boost.status != "paused":
        raise HTTPException(status_code=400, detail="Boost is not paused")

    boost.status = "active"
    await db.commit()
    return {"status": "active", "boost_id": str(boost_id)}
