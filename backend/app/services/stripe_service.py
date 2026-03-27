import hashlib
import time

import stripe

from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def generate_idempotency_key(user_id: str, entity_id: str) -> str:
    """5-minute bucket idempotency key."""
    bucket = int(time.time()) // 300
    raw = f"{user_id}:{entity_id}:{bucket}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def create_checkout_session(
    amount_cents: int,
    product_name: str,
    payment_id: str,
    mode: str = "payment",  # payment | subscription
    metadata: dict | None = None,
) -> str:
    """Create a Stripe Checkout Session and return the URL."""
    if not settings.STRIPE_SECRET_KEY:
        # Dev mode: return a fake URL when Stripe isn't configured
        return f"http://localhost:3000/payments/dev-mock?payment_id={payment_id}"

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": product_name},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        mode=mode,
        success_url=settings.STRIPE_SUCCESS_URL,
        cancel_url=settings.STRIPE_CANCEL_URL,
        client_reference_id=payment_id,
        metadata=metadata or {},
    )
    return session.url


def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """Verify Stripe webhook signature and return the event."""
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
    )
