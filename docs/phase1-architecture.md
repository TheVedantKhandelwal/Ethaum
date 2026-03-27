# LaunchDeck — PHASE 1: Executive Summary + Core Architecture

---

## 1. Executive Summary

LaunchDeck is an AI-powered SaaS marketplace that unifies product discovery (Product Hunt), peer reviews (G2), analyst-grade scoring (Gartner), and deal commerce (AppSumo) into a single platform.

**Value proposition:**
- **Founders** launch products, gain credibility, and sell deals — one platform replaces four.
- **Buyers** discover vetted SaaS tools with AI-summarized reviews and credibility scores.
- **Enterprise** gets matchmaking recommendations powered by local LLM inference (Ollama).

**Revenue model:** Paid product listings, boost campaigns, deal transaction fees, and enterprise matchmaking subscriptions.

**Technical moat:** On-prem AI via Ollama — no per-inference API costs at scale, full data privacy, graceful heuristic fallbacks.

---

## 2. High-Level Backend Architecture

### Service Map

| Service | Responsibility |
|---|---|
| **Auth** | Registration, login (JWT), OAuth, role management (buyer/founder/admin) |
| **Launch** | Product submission, scheduled launches, upvoting, trending lifecycle |
| **Reviews & Credibility** | Review CRUD, verification, AI summarization, credibility score computation |
| **Marketplace & Deals** | Deal creation, redemption codes, inventory, purchase flow |
| **Payments** | Stripe integration, checkout sessions, webhooks, refunds, payouts |
| **Boosts** | Featured/trending/category boost campaigns, bid management, time decay |
| **Analytics** | Event ingestion, dashboards (founder/enterprise/platform), funnel tracking |
| **AI (Ollama)** | Prompt pipelines, caching, async job queue for scoring/matching/summarization |

### Data Flow

```
User Request
    │
    ▼
┌─────────┐    JWT validation    ┌──────────┐
│  API GW  │ ──────────────────► │   Auth   │
└────┬─────┘                     └──────────┘
     │
     ├──► Launch Service ──► Events ──► Analytics
     │         │
     │         ├──► AI Service (async) ──► Redis Cache
     │         │
     ├──► Reviews Service ──► AI Service (summarize/score)
     │
     ├──► Marketplace ──► Payments (Stripe)
     │
     └──► Boosts ──► Payments (Stripe)
```

### Event-Driven Components

| Event | Producer | Consumers |
|---|---|---|
| `product.launched` | Launch | Analytics, AI (generate credibility baseline) |
| `product.upvoted` | Launch | Analytics, Ranking (recalc trending) |
| `review.submitted` | Reviews | AI (summarize, rescore credibility), Analytics |
| `deal.purchased` | Marketplace | Payments (fulfill), Analytics (GMV) |
| `boost.activated` | Boosts | Ranking (apply boost weight), Analytics |
| `match.requested` | Matchmaking | AI (run matching pipeline), Analytics |
| `payment.confirmed` | Payments | Marketplace/Boosts (activate), Analytics |

Events flow through an internal async queue (Redis Streams or in-process background tasks for MVP, upgradeable to Kafka).

---

## 3. Core Entities

| Entity | Purpose |
|---|---|
| **Users** | Buyers, founders, admins — multi-role |
| **Startups** | Company/org that owns products |
| **Products** | SaaS tools listed on the platform |
| **Launches** | Time-bound launch events for products |
| **Reviews** | User reviews with ratings and verification status |
| **Deals** | Limited-time offers with codes/inventory |
| **Payments** | Transaction records (Stripe-backed) |
| **Boosts** | Paid promotion campaigns (featured/trending/category) |
| **Matchmaking** | AI-driven buyer↔product recommendation sessions |

Additionally: **Upvotes**, **Credibility Scores**, **Analytics Events**, and **AI Job Logs** as supporting entities.
