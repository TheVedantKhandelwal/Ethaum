# LaunchDeck — PHASE 5: Analytics + AI (Ollama) + Ranking

---

## 1. Analytics System

### Event Schema

```sql
-- All events follow a unified shape
{
  event_type: string,     -- page_view | upvote | purchase | search | click | boost_impression | review_submit
  user_id:    UUID | null,
  product_id: UUID | null,
  metadata: {
    source:      "web" | "api",
    referrer:    string | null,
    session_id:  string,
    device:      "desktop" | "mobile",
    -- event-specific fields:
    search_query:  string,       -- for search events
    deal_id:       UUID,         -- for purchase events
    amount:        number,       -- for purchase events
    boost_type:    string,       -- for boost_impression events
    position:      number        -- for click events (rank position clicked)
  }
}
```

### Tracking Pipeline

```
Client (browser/API)
    │
    ├─ POST /api/events (batch, max 25 per request)
    │
    ▼
Event Ingestion API
    │
    ├─ Validate + enrich (add timestamp, IP-geo, user-agent parse)
    ├─ Push to Redis Stream: stream:events
    │
    ▼
Background Worker (async consumer)
    │
    ├─ Write to analytics_events table (partitioned by month)
    ├─ Update real-time counters in Redis:
    │     product:{id}:views (INCR, TTL 24h)
    │     product:{id}:clicks (INCR, TTL 24h)
    │     daily:gmv (INCRBYFLOAT)
    │
    └─ Trigger aggregation jobs (hourly rollups)
```

### Founder Dashboard (`GET /api/analytics/founder?product_id=&range=7d`)

```json
{
  "views": 4820,
  "unique_visitors": 3105,
  "upvotes": 187,
  "reviews": 12,
  "avg_rating": 4.3,
  "deal_purchases": 34,
  "deal_revenue": 1394.00,
  "credibility_score": 72.5,
  "credibility_delta": +3.2,
  "boost_stats": { "impressions": 8400, "clicks": 231, "ctr": 2.75, "spend": 87.50 },
  "top_referrers": ["google", "twitter", "direct"],
  "views_over_time": [{ "date": "2026-03-20", "count": 712 }]
}
```

### Enterprise Dashboard (`GET /api/analytics/enterprise`)

```json
{
  "tools_evaluated": 24,
  "matchmaking_sessions": 8,
  "shortlisted_products": 6,
  "avg_credibility_of_shortlist": 78.3,
  "spend_on_deals": 2450.00,
  "category_breakdown": { "CRM": 8, "Analytics": 6, "DevTools": 10 }
}
```

### Platform Metrics (Admin: `GET /api/analytics/platform`)

| Metric | Computation |
|---|---|
| **GMV** | SUM(payments.amount) WHERE status=completed, grouped by period |
| **Take Rate** | Platform fees / GMV (target: 15-20%) |
| **CAC** | Marketing spend / new registered users (per cohort) |
| **K-factor** | Avg invites sent * conversion rate of invites |
| **DAU/MAU** | Distinct user_ids in analytics_events per day/month |
| **Listing conversion** | Products published / products created (draft→live rate) |
| **Deal sell-through** | current_redemptions / max_redemptions per deal |

---

## 2. Ranking Algorithms

### Trending Score (recomputed hourly)

```python
def trending_score(launch):
    age_hours = (now() - launch.launched_at).total_seconds() / 3600
    gravity = 1.8  # decay exponent

    upvote_velocity = recent_upvotes(launch.id, window_hours=6)
    base = launch.upvote_count + (upvote_velocity * 3)  # velocity bonus

    score = base / ((age_hours + 2) ** gravity)
    return score
```

Applied to `GET /api/launches?sort=trending`. Recalculated via cron, cached in Redis sorted set `ranking:trending`.

### Credibility Leaderboard

```python
def credibility_score(product):
    review_component  = normalized(product.avg_rating * log(product.review_count + 1))  # 0-40
    verification_bonus = verified_review_pct(product.id) * 10                           # 0-10
    usage_component   = normalized(monthly_active_signals(product.id))                  # 0-20
    team_component    = startup_completeness(product.startup_id)                         # 0-15
    age_component     = min(months_since_launch(product.id), 12) / 12 * 15              # 0-15

    total = review_component + verification_bonus + usage_component + team_component + age_component
    return round(total, 2)  # 0-100 scale
```

Stored in `credibility_scores` table. Recomputed on `review.submitted` event and via nightly batch.

### Boost Influence on Feed

```python
def ranked_feed(category=None, page=1):
    organic = get_products_by_score(category, limit=20, offset=(page-1)*20)
    active_boosts = get_active_boosts(type="trending", category=category)

    # Inject boosted products at fixed positions
    inject_positions = [2, 6, 14]  # 0-indexed
    feed = list(organic)

    for pos, boost in zip(inject_positions, active_boosts):
        if boost.product.credibility_score >= 20:  # quality gate
            feed.insert(pos, mark_as_sponsored(boost.product))

    return feed
```

Sponsored items tagged with `is_boosted: true` in API response for frontend labeling.

---

## 3. Ollama AI Layer

### Infrastructure

```yaml
# docker-compose addition
ollama:
  image: ollama/ollama
  volumes:
    - ollama_data:/root/.ollama
  deploy:
    resources:
      reservations:
        devices:
          - capabilities: [gpu]  # optional, CPU fallback supported

redis:
  image: redis:7-alpine
  # used for AI response caching + job queue
```

### Prompt Pipelines

#### 3a. Credibility Scoring

```python
CREDIBILITY_PROMPT = """
Analyze this SaaS product and rate its credibility (0-100).
Product: {name}
Category: {category}
Reviews ({count}): {review_summaries}
Team size: {team_size}, Founded: {founded_year}
Pricing: {pricing_model}

Return JSON: {"score": int, "confidence": float, "reasoning": string}
"""

async def ai_credibility_score(product, reviews):
    cache_key = f"ai:credibility:{product.id}:{hash(reviews)}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    result = await ollama_generate(CREDIBILITY_PROMPT.format(...), model="qwen2.5")
    parsed = parse_json_response(result)

    await redis.setex(cache_key, 3600, json.dumps(parsed))  # 1h cache
    return parsed
```

#### 3b. Matchmaking

```python
MATCHMAKING_PROMPT = """
Given these buyer preferences:
- Budget: {budget}
- Category: {category}
- Team size: {team_size}
- Key needs: {query_text}

And these candidate products:
{product_list_json}

Rank the top 5 products. For each, return:
{"product_id": str, "score": 0-100, "reason": str}
"""
```

#### 3c. Review Summarization

```python
REVIEW_SUMMARY_PROMPT = """
Summarize these {count} reviews for "{product_name}":
{reviews_text}

Return JSON:
{"summary": str, "pros_themes": [str], "cons_themes": [str], "sentiment": "positive"|"mixed"|"negative"}
"""
```

#### 3d. Launch Description Generation

```python
LAUNCH_GEN_PROMPT = """
Generate a compelling launch description for:
Product: {name}
Tagline: {tagline}
Category: {category}
Key features: {features}

Return a 2-3 paragraph launch description optimized for discovery.
"""
```

### Heuristic Fallbacks (when Ollama unavailable)

```python
async def credibility_with_fallback(product, reviews):
    try:
        return await ai_credibility_score(product, reviews)
    except (ConnectionError, TimeoutError):
        # Heuristic fallback
        score = (
            min(product.avg_rating * 8, 40) +
            min(len(reviews) * 2, 20) +
            (15 if product.startup.team_size != "1-10" else 5) +
            min(product.upvote_count * 0.1, 15) +
            10  # base
        )
        return {"score": round(score, 2), "confidence": 0.3, "reasoning": "heuristic"}
```

### Async Job Queue

```python
# Background worker using Redis streams
async def ai_worker():
    while True:
        jobs = await redis.xread({"stream:ai_jobs": "$"}, block=5000, count=10)
        for job in jobs:
            match job["type"]:
                case "credibility":
                    await process_credibility(job["product_id"])
                case "summarize":
                    await process_review_summary(job["product_id"])
                case "matchmaking":
                    await process_matchmaking(job["session_id"])
```

Events like `review.submitted` push to `stream:ai_jobs` instead of calling Ollama inline — keeps API response times fast.

---

## 4. AI Performance Tracking

```sql
ai_job_logs (
  id              UUID PRIMARY KEY,
  job_type        VARCHAR(30) NOT NULL,  -- credibility | summarize | matchmaking | launch_gen
  product_id      UUID REFERENCES products(id),
  model_used      VARCHAR(50) NOT NULL,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  latency_ms      INTEGER NOT NULL,
  cache_hit       BOOLEAN DEFAULT FALSE,
  fallback_used   BOOLEAN DEFAULT FALSE,
  status          VARCHAR(20),  -- success | error | timeout
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
INDEX: idx_ai_logs_type_date (job_type, created_at DESC)
```

### Performance Dashboard (Admin: `GET /api/analytics/ai`)

```json
{
  "total_inferences_24h": 342,
  "cache_hit_rate": 0.64,
  "fallback_rate": 0.03,
  "avg_latency_ms": 1840,
  "p95_latency_ms": 4200,
  "error_rate": 0.01,
  "by_type": {
    "credibility":  { "count": 145, "avg_ms": 2100 },
    "summarize":    { "count": 89,  "avg_ms": 1600 },
    "matchmaking":  { "count": 67,  "avg_ms": 2800 },
    "launch_gen":   { "count": 41,  "avg_ms": 1200 }
  },
  "cost_estimate_24h": "$0.00 (local Ollama)"
}
```

### Alerting Thresholds

| Metric | Threshold | Action |
|---|---|---|
| Fallback rate > 10% | Ollama likely down | Alert, check container health |
| P95 latency > 8s | Model overloaded | Scale worker, consider smaller model |
| Error rate > 5% | Prompt/parse failures | Review logs, update prompt templates |
| Cache hit rate < 30% | Cache TTL too short or high cardinality | Tune TTL, review cache keys |
