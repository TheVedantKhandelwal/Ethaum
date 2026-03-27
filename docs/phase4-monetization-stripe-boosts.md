# LaunchDeck — PHASE 4: Monetization + Stripe + Boost System

---

## 1. Stripe TEST Integration

### Environment Setup

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://launchdeck.app/payments/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://launchdeck.app/payments/cancel
```

### Checkout Session Flow

```
Client                    Server                        Stripe
  │                         │                              │
  ├─ POST /deals/{id}/purchase ─►│                         │
  │                         ├─ validate inventory          │
  │                         ├─ generate idempotency_key    │
  │                         ├─ create payment (pending)    │
  │                         ├─ POST /v1/checkout/sessions ─────►│
  │                         │◄── session {id, url} ────────────┤
  │◄── {checkout_url} ─────┤                              │
  ├─ redirect to Stripe ──────────────────────────────────►│
  │                         │                              │
  │                         │◄── webhook: checkout.session.completed
  │                         ├─ verify signature (whsec_)   │
  │                         ├─ lookup payment by session_id│
  │                         ├─ update payment → completed  │
  │                         ├─ fulfill (increment redemptions / activate boost)
  │                         ├─ emit event                  │
  │                         ├── 200 OK ───────────────────►│
```

### Webhook Handler

Subscribed events:
- `checkout.session.completed` → fulfill order
- `checkout.session.expired` → mark payment failed
- `charge.refunded` → mark payment refunded, reverse fulfillment

```python
@router.post("/payments/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)

    match event["type"]:
        case "checkout.session.completed":
            session = event["data"]["object"]
            payment = await get_payment_by_session(session["id"])
            payment.status = "completed"
            payment.stripe_payment_id = session["payment_intent"]
            await fulfill_order(payment)
        case "checkout.session.expired":
            await mark_payment_failed(session["id"])
        case "charge.refunded":
            await handle_refund(event["data"]["object"])

    return {"received": True}
```

### Idempotency Strategy

- Every payment record gets a `idempotency_key = f"{user_id}:{deal_id|boost_id}:{timestamp_bucket}"`
- Timestamp bucket = 5-minute window to prevent rapid duplicate purchases
- Stripe Checkout Session created with `client_reference_id = payment.id`
- Webhook deduplication: check `payment.status != 'completed'` before fulfilling

### Failure Handling

| Scenario | Action |
|---|---|
| Webhook signature invalid | Return 400, log alert |
| Payment not found for session | Log error, return 200 (don't retry) |
| Fulfillment fails | Keep payment completed, queue retry job, alert |
| Checkout expires (30 min) | Webhook marks payment failed, release inventory hold |
| Network timeout to Stripe | Retry with exponential backoff (3 attempts) |

---

## 2. Paid Publishing System

### Listing Tiers

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0 | 1 product, basic listing, no launch slot |
| **Launch** | $29 one-time | Launch day slot, basic analytics, 1 deal |
| **Pro** | $79/mo | Unlimited launches, full analytics, priority support, deals |
| **Enterprise** | $299/mo | All Pro + matchmaking placement, API access, custom branding |

### Publishing Flow

```
1. Founder creates product (draft, always free)
2. To publish / launch:
   a. Free tier → publish immediately, no launch slot
   b. Paid tier → POST /api/payments/subscribe {tier}
      → Stripe Checkout (mode: subscription for Pro/Enterprise, payment for Launch)
      → Webhook confirms → unlock tier features
3. Product.status → 'published'
4. Launch slot granted based on tier
```

### Subscription Management

- Stripe Customer created on first paid action
- `users.stripe_customer_id` stored for recurring billing
- Cancellation: downgrade to Free at period end, revoke tier features

---

## 3. Boost System

### Boost Types

| Type | Placement | Pricing | Max Duration |
|---|---|---|---|
| **Featured** | Homepage hero carousel (top 5 slots) | $50/day base bid | 7 days |
| **Trending** | Injected into trending feed (position 3, 7, 15) | $25/day base bid | 14 days |
| **Category** | Top of category listing page | $15/day base bid | 30 days |

### Ranking Impact Formula

```
effective_rank = organic_rank * (1 - boost_dampener) + boost_score

where:
  organic_rank = f(upvotes, recency, credibility_score)
  boost_score  = bid_amount / max_bid_in_slot * BOOST_WEIGHT
  boost_dampener = 0.15  (boosts shift rank by max 15%)
  BOOST_WEIGHT = 30      (out of 100-point scale)
```

This ensures organic quality still dominates — boosts can't override bad products.

### Time Decay

```
boost_effective_bid = bid_amount * decay_factor

decay_factor = max(0.3, 1.0 - (days_elapsed / total_duration) * 0.7)
```

- Day 1: 100% bid strength
- Midpoint: ~65% bid strength
- Final day: 30% floor (never fully invisible while paid)

### Auction Logic

```
For each boost slot (e.g., 5 featured slots):
1. Collect all active boosts of that type
2. Compute effective_bid = bid_amount * decay_factor
3. Filter: only products with credibility_score >= 20 (quality gate)
4. Sort by effective_bid DESC
5. Top N win the slots
6. Charge: actual_cost = second_price + $0.01 (Vickrey auction)
7. Deduct from daily_budget, increment total_spent
```

### Boost Purchase Flow

```
1. Founder POST /api/boosts {product_id, type, bid, budget, dates}
2. Validate: product is published, founder is owner, tier allows boosts
3. Calculate estimated cost = bid * days
4. Create boost (pending) + payment record
5. Stripe Checkout → return URL
6. Webhook confirms → boost.status = 'active'
7. Cron job (hourly): run auction, deduct spend, pause if budget exhausted
8. Cron job (daily): end expired boosts
```

### Boost Analytics (returned on GET /api/boosts/{id})

```json
{
  "impressions": 12400,
  "clicks": 342,
  "ctr": 2.76,
  "total_spent": 127.50,
  "avg_cost_per_click": 0.37,
  "remaining_budget": 72.50,
  "days_remaining": 3
}
```
