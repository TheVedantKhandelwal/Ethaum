import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.boost import Boost
from app.models.deal import Deal
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import CheckoutResponse, PaymentOut
from app.services.stripe_service import (
    create_checkout_session,
    generate_idempotency_key,
    verify_webhook_signature,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/deals/{deal_id}/purchase", response_model=CheckoutResponse)
async def purchase_deal(
    deal_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if deal.current_redemptions >= deal.max_redemptions:
        raise HTTPException(status_code=410, detail="Deal sold out")

    idempotency_key = generate_idempotency_key(str(user.id), str(deal.id))

    # Check for existing pending payment with same idempotency key
    existing = await db.execute(
        select(Payment).where(Payment.idempotency_key == idempotency_key)
    )
    existing_payment = existing.scalar_one_or_none()
    if existing_payment and existing_payment.status == "completed":
        raise HTTPException(status_code=409, detail="Already purchased")

    if existing_payment and existing_payment.status == "pending":
        # Return existing checkout — don't create duplicate
        checkout_url = await create_checkout_session(
            amount_cents=int(deal.deal_price * 100),
            product_name=deal.title,
            payment_id=str(existing_payment.id),
            metadata={"deal_id": str(deal.id), "user_id": str(user.id)},
        )
        return CheckoutResponse(checkout_url=checkout_url, payment_id=existing_payment.id)

    payment = Payment(
        user_id=user.id,
        deal_id=deal.id,
        amount=deal.deal_price,
        payment_type="deal",
        idempotency_key=idempotency_key,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    checkout_url = await create_checkout_session(
        amount_cents=int(deal.deal_price * 100),
        product_name=deal.title,
        payment_id=str(payment.id),
        metadata={"deal_id": str(deal.id), "user_id": str(user.id)},
    )

    return CheckoutResponse(checkout_url=checkout_url, payment_id=payment.id)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = verify_webhook_signature(payload, sig)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    session = event["data"]["object"]

    if event_type == "checkout.session.completed":
        payment_id = session.get("client_reference_id")
        if not payment_id:
            return {"received": True}

        result = await db.execute(select(Payment).where(Payment.id == uuid.UUID(payment_id)))
        payment = result.scalar_one_or_none()
        if not payment or payment.status == "completed":
            return {"received": True}

        payment.status = "completed"
        payment.stripe_session_id = session["id"]
        payment.stripe_payment_id = session.get("payment_intent")

        # Fulfill based on payment type
        if payment.payment_type == "deal" and payment.deal_id:
            deal_result = await db.execute(select(Deal).where(Deal.id == payment.deal_id))
            deal = deal_result.scalar_one_or_none()
            if deal:
                deal.current_redemptions += 1
                if deal.current_redemptions >= deal.max_redemptions:
                    deal.status = "sold_out"

        elif payment.payment_type == "boost" and payment.boost_id:
            boost_result = await db.execute(select(Boost).where(Boost.id == payment.boost_id))
            boost = boost_result.scalar_one_or_none()
            if boost:
                boost.status = "active"

        await db.commit()

    elif event_type == "checkout.session.expired":
        payment_id = session.get("client_reference_id")
        if payment_id:
            result = await db.execute(select(Payment).where(Payment.id == uuid.UUID(payment_id)))
            payment = result.scalar_one_or_none()
            if payment and payment.status == "pending":
                payment.status = "failed"
                await db.commit()

    return {"received": True}


@router.get("", response_model=list[PaymentOut])
async def list_payments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    query = (
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return payment
