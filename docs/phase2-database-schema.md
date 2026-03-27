# LaunchDeck — PHASE 2: Database Schema + Relationships

---

## 1. Users

```sql
users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),
  full_name       VARCHAR(150) NOT NULL,
  avatar_url      TEXT,
  role            VARCHAR(20) NOT NULL DEFAULT 'buyer',  -- buyer | founder | admin
  oauth_provider  VARCHAR(20),       -- google | github | null
  oauth_id        VARCHAR(255),
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_users_email (email), idx_users_role (role)
```

## 2. Startups

```sql
startups (
  id              UUID PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES users(id),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(200) UNIQUE NOT NULL,
  description     TEXT,
  website         VARCHAR(500),
  logo_url        TEXT,
  founded_year    SMALLINT,
  team_size       VARCHAR(20),       -- 1-10 | 11-50 | 51-200 | 200+
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_startups_owner (owner_id), idx_startups_slug (slug)
```

## 3. Products

```sql
products (
  id              UUID PRIMARY KEY,
  startup_id      UUID NOT NULL REFERENCES startups(id),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(200) UNIQUE NOT NULL,
  tagline         VARCHAR(300),
  description     TEXT,
  category        VARCHAR(100) NOT NULL,
  subcategory     VARCHAR(100),
  logo_url        TEXT,
  website_url     VARCHAR(500),
  pricing_model   VARCHAR(30),       -- free | freemium | paid | enterprise
  status          VARCHAR(20) DEFAULT 'draft',  -- draft | published | archived
  credibility_score NUMERIC(5,2) DEFAULT 0,
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  upvote_count    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_products_startup (startup_id), idx_products_category (category),
       idx_products_slug (slug), idx_products_credibility (credibility_score DESC)
```

## 4. Launches

```sql
launches (
  id              UUID PRIMARY KEY,
  product_id      UUID NOT NULL REFERENCES products(id),
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  scheduled_at    TIMESTAMPTZ,
  launched_at     TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'scheduled',  -- scheduled | live | ended
  upvote_count    INTEGER DEFAULT 0,
  rank_position   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_launches_product (product_id), idx_launches_status_date (status, launched_at DESC)
```

## 5. Upvotes

```sql
upvotes (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id),
  launch_id       UUID NOT NULL REFERENCES launches(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, launch_id)
)
INDEX: idx_upvotes_launch (launch_id), idx_upvotes_user (user_id)
```

## 6. Reviews

```sql
reviews (
  id              UUID PRIMARY KEY,
  product_id      UUID NOT NULL REFERENCES products(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           VARCHAR(300),
  body            TEXT NOT NULL,
  pros            TEXT,
  cons            TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  ai_summary      TEXT,
  status          VARCHAR(20) DEFAULT 'published',  -- published | flagged | removed
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_reviews_product (product_id), idx_reviews_user (user_id),
       idx_reviews_rating (product_id, rating)
```

## 7. Credibility Scores

```sql
credibility_scores (
  id              UUID PRIMARY KEY,
  product_id      UUID UNIQUE NOT NULL REFERENCES products(id),
  overall_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  review_score    NUMERIC(5,2) DEFAULT 0,
  usage_score     NUMERIC(5,2) DEFAULT 0,
  team_score      NUMERIC(5,2) DEFAULT 0,
  ai_confidence   NUMERIC(3,2) DEFAULT 0,
  computed_at     TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_credibility_product (product_id), idx_credibility_overall (overall_score DESC)
```

## 8. Deals

```sql
deals (
  id              UUID PRIMARY KEY,
  product_id      UUID NOT NULL REFERENCES products(id),
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  original_price  NUMERIC(10,2) NOT NULL,
  deal_price      NUMERIC(10,2) NOT NULL,
  discount_pct    SMALLINT,
  coupon_code     VARCHAR(50),
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  status          VARCHAR(20) DEFAULT 'active',  -- active | expired | sold_out
  created_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_deals_product (product_id), idx_deals_status_expires (status, expires_at)
```

## 9. Payments

```sql
payments (
  id                  UUID PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id),
  deal_id             UUID REFERENCES deals(id),
  boost_id            UUID REFERENCES boosts(id),
  stripe_session_id   VARCHAR(255) UNIQUE,
  stripe_payment_id   VARCHAR(255),
  amount              NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(3) DEFAULT 'usd',
  status              VARCHAR(20) DEFAULT 'pending',  -- pending | completed | failed | refunded
  payment_type        VARCHAR(20) NOT NULL,  -- deal | boost | listing
  idempotency_key     VARCHAR(255) UNIQUE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_payments_user (user_id), idx_payments_stripe (stripe_session_id),
       idx_payments_status (status), idx_payments_idempotency (idempotency_key)
```

## 10. Boosts

```sql
boosts (
  id              UUID PRIMARY KEY,
  product_id      UUID NOT NULL REFERENCES products(id),
  boost_type      VARCHAR(20) NOT NULL,  -- featured | trending | category
  bid_amount      NUMERIC(10,2) NOT NULL,
  daily_budget    NUMERIC(10,2),
  total_spent     NUMERIC(10,2) DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',  -- pending | active | paused | ended
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_boosts_product (product_id), idx_boosts_type_status (boost_type, status),
       idx_boosts_active_window (starts_at, ends_at)
```

## 11. Matchmaking

```sql
matchmaking_sessions (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id),
  query_text      TEXT,
  preferences     JSONB,            -- {budget, category, team_size, integrations}
  results         JSONB,            -- [{product_id, score, reason}]
  ai_model_used   VARCHAR(50),
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_matchmaking_user (user_id), idx_matchmaking_date (created_at DESC)
```

## 12. Analytics Events

```sql
analytics_events (
  id              UUID PRIMARY KEY,
  event_type      VARCHAR(50) NOT NULL,  -- page_view | upvote | purchase | search | click
  user_id         UUID REFERENCES users(id),
  product_id      UUID REFERENCES products(id),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
)
-- Partition by month on created_at for scale
INDEX: idx_events_type_date (event_type, created_at DESC),
       idx_events_product (product_id), idx_events_user (user_id)
```

## Relationship Summary

```
users 1──N startups 1──N products 1──N launches 1──N upvotes N──1 users
products 1──N reviews N──1 users
products 1──1 credibility_scores
products 1──N deals 1──N payments N──1 users
products 1──N boosts 1──N payments
users 1──N matchmaking_sessions
users 1──N analytics_events
```

## Multi-Tenant Strategy

- All queries scoped by `startup_id` or `user_id` — no global row access
- Row-level security (RLS) policies on `products`, `deals`, `boosts` keyed to `startup.owner_id`
- Admin role bypasses RLS for moderation
