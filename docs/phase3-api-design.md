# LaunchDeck — PHASE 3: API Design + Core Workflows

---

## 1. Auth API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, full_name, role}` | `{user, access_token}` | Public |
| POST | `/api/auth/login` | `{email, password}` | `{access_token, refresh_token}` | Public |
| POST | `/api/auth/oauth/{provider}` | `{code, redirect_uri}` | `{user, access_token}` | Public |
| POST | `/api/auth/refresh` | `{refresh_token}` | `{access_token}` | Public |
| GET | `/api/auth/me` | — | `{user}` | Any |
| PUT | `/api/auth/me` | `{full_name?, avatar_url?}` | `{user}` | Any |

JWT in `Authorization: Bearer <token>`. Tokens expire in 1h, refresh in 7d.

---

## 2. Products API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/products` | `{startup_id, name, tagline, description, category, pricing_model}` | `{product}` | Founder |
| GET | `/api/products` | Query: `?category=&sort=&page=&limit=` | `{products[], total, page}` | Public |
| GET | `/api/products/{slug}` | — | `{product, credibility, recent_reviews}` | Public |
| PUT | `/api/products/{id}` | `{name?, tagline?, description?}` | `{product}` | Owner |
| DELETE | `/api/products/{id}` | — | `{ok: true}` | Owner/Admin |

---

## 3. Launches API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/launches` | `{product_id, title, description, scheduled_at?}` | `{launch}` | Owner |
| GET | `/api/launches` | Query: `?status=live&date=today&sort=trending` | `{launches[], total}` | Public |
| GET | `/api/launches/{id}` | — | `{launch, product, upvote_count}` | Public |
| POST | `/api/launches/{id}/upvote` | — | `{upvoted: true, count}` | Buyer/Founder |
| DELETE | `/api/launches/{id}/upvote` | — | `{upvoted: false, count}` | Buyer/Founder |

---

## 4. Reviews API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/products/{id}/reviews` | `{rating, title, body, pros?, cons?}` | `{review}` | Buyer |
| GET | `/api/products/{id}/reviews` | Query: `?sort=recent&page=&limit=` | `{reviews[], avg_rating, total}` | Public |
| PUT | `/api/reviews/{id}` | `{rating?, title?, body?}` | `{review}` | Author |
| DELETE | `/api/reviews/{id}` | — | `{ok: true}` | Author/Admin |
| GET | `/api/products/{id}/reviews/summary` | — | `{ai_summary, pros_themes, cons_themes}` | Public |

---

## 5. Deals API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/deals` | `{product_id, title, original_price, deal_price, max_redemptions, starts_at, expires_at}` | `{deal}` | Owner |
| GET | `/api/deals` | Query: `?category=&active=true&sort=discount` | `{deals[], total}` | Public |
| GET | `/api/deals/{id}` | — | `{deal, product}` | Public |
| POST | `/api/deals/{id}/purchase` | — | `{stripe_checkout_url}` | Buyer |
| PUT | `/api/deals/{id}` | `{title?, deal_price?, expires_at?}` | `{deal}` | Owner |

---

## 6. Payments API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| GET | `/api/payments` | Query: `?status=&type=&page=` | `{payments[]}` | Self/Admin |
| GET | `/api/payments/{id}` | — | `{payment, deal?, boost?}` | Self/Admin |
| POST | `/api/payments/webhook` | Stripe event payload | `200 OK` | Stripe signature |

---

## 7. Boosts API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/boosts` | `{product_id, boost_type, bid_amount, daily_budget, starts_at, ends_at}` | `{boost, stripe_checkout_url}` | Owner |
| GET | `/api/boosts` | Query: `?product_id=&status=` | `{boosts[]}` | Owner |
| GET | `/api/boosts/{id}` | — | `{boost, impressions, clicks, spend}` | Owner |
| PUT | `/api/boosts/{id}/pause` | — | `{boost}` | Owner |
| PUT | `/api/boosts/{id}/resume` | — | `{boost}` | Owner |

---

## 8. Matchmaking API

| Method | Route | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/matchmaking` | `{query_text?, preferences: {budget, category, team_size}}` | `{session_id, results: [{product, score, reason}]}` | Any |
| GET | `/api/matchmaking/{session_id}` | — | `{session, results}` | Self |

---

## 9. Core Workflows

### Product Launch Flow

```
1. Founder POST /api/products         → product (draft)
2. Founder POST /api/launches          → launch (scheduled)
3. System triggers at scheduled_at     → launch.status = 'live'
4. Emit event: product.launched
5. AI service → compute baseline credibility (async)
6. Buyers POST /launches/{id}/upvote   → increment count
7. Each upvote emits product.upvoted   → ranking recalc
8. End of day: launch.status = 'ended', snapshot rank_position
```

### Review Submission Flow

```
1. Buyer POST /api/products/{id}/reviews  → review created
2. Emit event: review.submitted
3. AI service (async):
   a. Summarize new review
   b. Regenerate product review summary
   c. Recompute credibility_score
4. Update products.avg_rating, review_count
```

### Deal Purchase Flow

```
1. Buyer POST /api/deals/{id}/purchase
2. Server checks inventory (current_redemptions < max_redemptions)
3. Create payment record (status: pending, idempotency_key generated)
4. Create Stripe Checkout Session → return URL
5. Buyer completes Stripe Checkout
6. Stripe webhook → POST /api/payments/webhook
7. Verify signature, update payment.status = completed
8. Increment deal.current_redemptions
9. Emit deal.purchased → analytics
```

### Matchmaking Trigger Flow

```
1. User POST /api/matchmaking with preferences
2. Server builds prompt from preferences + top products in category
3. Dispatch to AI service (Ollama)
4. AI returns ranked product list with reasons
5. Cache results in matchmaking_sessions
6. Return results to user
7. Log latency + model used for performance tracking
```
