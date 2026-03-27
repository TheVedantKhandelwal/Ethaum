# LaunchDeck — Implementation Plan

> **Status**: MVP → Production-Ready
> **Architecture**: Phase 1-5 design docs (`docs/phase*.md`)
> **Current State**: 75% MVP — core models, routes, AI service, full frontend

---

## Executive Summary

LaunchDeck's MVP demonstrates core marketplace mechanics — launches, reviews, AI scoring, deals, matchmaking, and insights. This plan bridges the gap from demo to investor-ready product across **6 sprints** (3 weeks), adding authentication, payments, boosts, analytics, caching, and production hardening.

**Key Outcomes:**
- Fully authenticated multi-tenant platform
- Live Stripe payment flow (test mode)
- Boost campaign system with auction mechanics
- Real-time analytics dashboards
- Production-grade AI pipeline with Redis caching
- Comprehensive test coverage

---

## Current State vs. Target

| Component | Current | Target |
|---|---|---|
| Auth | Hardcoded demo users | JWT + OAuth (Google/GitHub) |
| Data Model | 8 tables | 13 tables (+ startups, payments, boosts, analytics, ai_logs) |
| Payments | None | Stripe Checkout + webhooks |
| Boosts | None | Featured/trending/category campaigns |
| Analytics | None | Event pipeline + dashboards |
| Caching | Redis imported, unused | Full AI + query caching |
| AI Pipeline | Inline calls | Async job queue via Redis Streams |
| Tests | 0% coverage | Core service + route coverage |
| Docker | No Ollama | Full stack including Ollama |

---

## Sprint Breakdown

### SPRINT 1 — Foundation & Auth (Days 1-3)
**Goal**: Secure the platform, add multi-tenancy

#### S1.1 — Database Expansion
- [ ] Add `startups` table (owner_id FK → users)
- [ ] Add `stripe_customer_id` to users
- [ ] Add `startup_id` FK to products (replace direct user_id)
- [ ] Add `password_hash` field to users
- [ ] Add `payments` table
- [ ] Add `boosts` table
- [ ] Add `analytics_events` table
- [ ] Add `ai_job_logs` table
- [ ] Generate Alembic migration `002_production_expansion.py`

#### S1.2 — Auth System
- [ ] `POST /api/auth/register` — bcrypt password, create user
- [ ] `POST /api/auth/login` — JWT access (1h) + refresh (7d)
- [ ] `POST /api/auth/refresh` — rotate tokens
- [ ] `GET /api/auth/me` — current user profile
- [ ] `PUT /api/auth/me` — update profile
- [ ] Auth dependency: `get_current_user()` middleware
- [ ] Role-based guards: `require_role("founder")`, `require_role("admin")`
- [ ] Apply auth to all existing routes

#### S1.3 — Startup Entity
- [ ] `POST /api/startups` — create startup (founder only)
- [ ] `GET /api/startups/{slug}` — public profile
- [ ] `PUT /api/startups/{id}` — update (owner only)
- [ ] Link products to startups instead of users

**Deliverable**: Authenticated platform with startup profiles

---

### SPRINT 2 — Payments & Stripe (Days 4-6)
**Goal**: Monetize listings, deals, and boosts

#### S2.1 — Stripe Integration
- [ ] `backend/app/services/stripe_service.py`
- [ ] Create Stripe Customer on first paid action
- [ ] Checkout session creation (deal purchase + boost purchase + listing tier)
- [ ] Webhook handler with signature verification
- [ ] Idempotency keys: `{user_id}:{entity_id}:{5min_bucket}`
- [ ] Failure handling (expired sessions, failed charges, refunds)

#### S2.2 — Deal Purchase Flow
- [ ] `POST /api/deals/{id}/purchase` → Stripe Checkout URL
- [ ] Inventory validation (atomic: `current_redemptions < max_redemptions`)
- [ ] Webhook fulfillment: increment redemptions, create payment record
- [ ] `GET /api/payments` — user payment history
- [ ] `GET /api/payments/{id}` — payment detail

#### S2.3 — Listing Tiers
- [ ] Free / Launch ($29) / Pro ($79/mo) / Enterprise ($299/mo)
- [ ] `POST /api/payments/subscribe` — Stripe subscription checkout
- [ ] Tier feature gating (launch slots, analytics access, deal creation)
- [ ] Downgrade on cancellation

**Deliverable**: Working payment flow with Stripe test mode

---

### SPRINT 3 — Boost System (Days 7-9)
**Goal**: Paid promotion engine with fair auction mechanics

#### S3.1 — Boost CRUD
- [ ] `POST /api/boosts` — create campaign + Stripe checkout
- [ ] `GET /api/boosts` — list campaigns (owner filtered)
- [ ] `GET /api/boosts/{id}` — campaign detail with stats
- [ ] `PUT /api/boosts/{id}/pause` and `/resume`
- [ ] Quality gate: credibility_score >= 20

#### S3.2 — Auction Engine
- [ ] Vickrey (second-price) auction per slot type
- [ ] Time decay: `bid * max(0.3, 1.0 - (elapsed/duration) * 0.7)`
- [ ] Hourly cron: run auction, deduct spend, pause exhausted budgets
- [ ] Daily cron: end expired boosts

#### S3.3 — Feed Integration
- [ ] Inject boosted products at positions [2, 6, 14] in feeds
- [ ] `is_boosted: true` flag in API responses
- [ ] Boost dampener: max 15% rank influence
- [ ] Track impressions + clicks on boosted items

**Deliverable**: Full boost campaign lifecycle with auction pricing

---

### SPRINT 4 — Analytics Pipeline (Days 10-12)
**Goal**: Event tracking, dashboards, platform metrics

#### S4.1 — Event Ingestion
- [ ] `POST /api/events` — batch event endpoint (max 25)
- [ ] Event enrichment (timestamp, user-agent, geo stub)
- [ ] Redis Stream `stream:events` for async processing
- [ ] Background worker: write to `analytics_events` table
- [ ] Real-time counters in Redis (views, clicks, GMV)

#### S4.2 — Dashboard APIs
- [ ] Enhance `GET /api/dashboard/{user_id}` (founder dashboard)
  - Views, unique visitors, upvotes, deal revenue, boost stats
  - Views over time, top referrers, credibility delta
- [ ] `GET /api/analytics/enterprise` — tools evaluated, spend, categories
- [ ] `GET /api/analytics/platform` (admin) — GMV, take rate, DAU/MAU, K-factor

#### S4.3 — Frontend Dashboards
- [ ] Enhanced founder dashboard with charts (Recharts)
- [ ] Admin metrics page (platform health)

**Deliverable**: Full analytics pipeline with actionable dashboards

---

### SPRINT 5 — AI Production Hardening (Days 13-15)
**Goal**: Async AI jobs, caching, performance tracking

#### S5.1 — Async Job Queue
- [ ] Redis Streams consumer: `stream:ai_jobs`
- [ ] Job types: credibility, summarize, matchmaking, launch_gen
- [ ] Events → job dispatch (review.submitted → rescore credibility)
- [ ] Retry logic with exponential backoff (max 3 attempts)

#### S5.2 — AI Response Caching
- [ ] Cache key: `ai:{job_type}:{entity_id}:{content_hash}`
- [ ] TTL: credibility 1h, summaries 2h, matchmaking 30min
- [ ] Cache invalidation on review/upvote mutations
- [ ] Cache hit rate tracking

#### S5.3 — AI Performance Logging
- [ ] `ai_job_logs` table: job_type, model, tokens, latency, cache_hit, fallback
- [ ] `GET /api/analytics/ai` — admin dashboard
  - Inferences/24h, cache hit rate, fallback rate, p95 latency
  - Breakdown by job type
- [ ] Alerting thresholds (fallback > 10%, p95 > 8s, errors > 5%)

#### S5.4 — Ollama in Docker
- [ ] Add ollama service to docker-compose.yml
- [ ] Auto-pull qwen2.5 on first start
- [ ] GPU passthrough (optional, CPU fallback)

**Deliverable**: Production AI pipeline with observability

---

### SPRINT 6 — Hardening & Launch Prep (Days 16-18)
**Goal**: Tests, security, polish

#### S6.1 — Backend Tests
- [ ] `tests/conftest.py` — async test fixtures, test DB
- [ ] `tests/test_auth.py` — register, login, refresh, guards
- [ ] `tests/test_products.py` — CRUD + search
- [ ] `tests/test_launches.py` — create, upvote, trending
- [ ] `tests/test_reviews.py` — create, credibility recompute
- [ ] `tests/test_deals.py` — create, purchase flow
- [ ] `tests/test_ai_service.py` — AI calls + fallback paths
- [ ] `tests/test_scoring.py` — trending + credibility algorithms

#### S6.2 — Security & Middleware
- [ ] Rate limiting middleware (IP-based, per-user)
- [ ] Request validation tightening
- [ ] CORS production configuration
- [ ] Structured logging (JSON format)
- [ ] Error handling middleware (consistent error responses)

#### S6.3 — Frontend Polish
- [ ] Auth flow UI (login/register pages)
- [ ] Protected route wrappers
- [ ] Loading states and error boundaries
- [ ] Search page completion (full-text search)

**Deliverable**: Production-hardened, tested platform

---

## Architecture Diagram (Target State)

```
                    ┌─────────────────────┐
                    │     Frontend         │
                    │   Next.js 14 + TW    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   FastAPI Gateway    │
                    │  JWT Auth Middleware │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
    ┌─────▼─────┐     ┌───────▼───────┐    ┌───────▼───────┐
    │  Routers   │     │   Services     │    │  Stripe API   │
    │ 10 modules │     │  AI, Scoring   │    │  Webhooks     │
    └─────┬─────┘     │  Matching      │    └───────────────┘
          │           └───────┬───────┘
          │                   │
    ┌─────▼─────────────────▼─────┐
    │        PostgreSQL 16          │
    │   13 tables, RLS, indexes     │
    └───────────────────────────────┘
          │
    ┌─────▼─────┐     ┌─────────────┐
    │   Redis    │◄───►│   Ollama     │
    │  Cache +   │     │  qwen2.5     │
    │  Streams   │     │  (local LLM) │
    └────────────┘     └─────────────┘
```

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Ollama latency spikes | Async queue + heuristic fallbacks + caching |
| Stripe webhook failures | Idempotency keys + retry queue + manual reconciliation endpoint |
| Boost gaming | Quality gate (credibility >= 20) + organic rank dominance (85%) |
| Data loss | Alembic migrations + pg_dump cron + Redis persistence |
| Scope creep | Each sprint has a hard deliverable — ship vertical slices |

---

## Success Metrics (Post-Launch)

| Metric | Target (Month 1) |
|---|---|
| Products listed | 50+ |
| Active launches | 10/week |
| Review submissions | 100+ |
| Deal purchases | 25+ |
| AI cache hit rate | > 60% |
| API p95 latency | < 500ms |
| Uptime | 99.5% |

---

## File Structure (Target)

```
backend/app/
├── main.py
├── config.py
├── database.py
├── seed.py
├── dependencies.py          ← NEW (auth guards)
├── models/
│   ├── user.py              (enhanced)
│   ├── startup.py           ← NEW
│   ├── product.py           (enhanced: startup_id)
│   ├── launch.py
│   ├── upvote.py
│   ├── review.py
│   ├── deal.py
│   ├── match.py
│   ├── payment.py           ← NEW
│   ├── boost.py             ← NEW
│   ├── analytics_event.py   ← NEW
│   └── ai_job_log.py        ← NEW
├── routers/
│   ├── auth.py              ← NEW
│   ├── startups.py          ← NEW
│   ├── products.py          (auth-guarded)
│   ├── launches.py          (auth-guarded)
│   ├── reviews.py           (auth-guarded)
│   ├── deals.py             (enhanced: purchase flow)
│   ├── payments.py          ← NEW
│   ├── boosts.py            ← NEW
│   ├── events.py            ← NEW
│   ├── insights.py
│   ├── matchmaking.py
│   └── dashboard.py         (enhanced)
├── schemas/
│   ├── auth.py              ← NEW
│   ├── startup.py           ← NEW
│   ├── payment.py           ← NEW
│   ├── boost.py             ← NEW
│   ├── event.py             ← NEW
│   └── (existing schemas)
├── services/
│   ├── ai_service.py        (enhanced: caching + async)
│   ├── scoring.py           (enhanced: boost influence)
│   ├── matching.py
│   ├── report.py
│   ├── stripe_service.py    ← NEW
│   ├── auth_service.py      ← NEW
│   ├── event_service.py     ← NEW
│   └── boost_engine.py      ← NEW
└── workers/
    ├── ai_worker.py         ← NEW
    └── event_worker.py      ← NEW
```
