# LaunchDeck Security Assessment Report

**Date:** 2026-03-27
**Scope:** Full-stack security review of FastAPI backend + Next.js frontend + Docker infrastructure
**Methodology:** OWASP Top 10 (2021) + code-level static analysis

---

## Executive Summary

This assessment identified **42 security findings** across the LaunchDeck codebase. The most critical issues involve **missing authentication on state-changing endpoints**, **hardcoded secrets**, **user ID spoofing via request bodies**, and **open CORS + missing security headers**. Several endpoints allow any anonymous user to create products, launches, reviews, deals, and comments by simply providing an arbitrary `user_id` in the request body -- effectively bypassing the entire authentication system.

| Severity | Count |
|----------|-------|
| CRITICAL | 8     |
| HIGH     | 14    |
| MEDIUM   | 14    |
| LOW      | 6     |

---

## CRITICAL Findings

### C1. Product Creation Has No Authentication -- Anyone Can Create Products as Any User

- **Severity:** CRITICAL
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/products.py`, lines 60-84
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/product.py`, line 17

**Description:** The `POST /api/products` endpoint has no authentication dependency (`get_current_user`). It accepts a `user_id` field directly from the request body. Any anonymous attacker can create products impersonating any user.

```python
# products.py line 60-61 -- no auth dependency
@router.post("", response_model=ProductOut, status_code=201)
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db)):
    # ...
    product = Product(
        user_id=body.user_id,  # Attacker controls this
        # ...
    )
```

**Exploitation:** `curl -X POST /api/products -d '{"name":"Malicious","user_id":"<victim-uuid>"}'` -- creates a product attributed to any user.

**Recommended Fix:**
```python
@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    body: ProductCreate,
    user: User = Depends(get_current_user),  # ADD THIS
    db: AsyncSession = Depends(get_db),
):
    product = Product(
        user_id=user.id,  # Use authenticated user, not body.user_id
        # ...
    )
```
Remove `user_id` from `ProductCreate` schema.

---

### C2. Review Creation Has No Authentication -- Anyone Can Post Reviews as Any User

- **Severity:** CRITICAL
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/reviews.py`, lines 17-68
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/review.py`, line 9

**Description:** The `POST /api/reviews` endpoint has no authentication. The `user_id` is taken directly from the request body. An attacker can forge reviews as any user, manipulate product ratings, and game the credibility scoring system.

```python
# reviews.py line 17-18 -- no auth dependency
@router.post("/reviews", response_model=ReviewOut, status_code=201)
async def create_review(body: ReviewCreate, db: AsyncSession = Depends(get_db)):
    # ...
    review = Review(
        user_id=body.user_id,  # Attacker controls this
    )
```

**Exploitation:** An attacker can flood any product with fake 5-star or 1-star reviews, directly manipulating `credibility_score` which drives marketplace rankings and is used as a gating mechanism for boosts (line 34 of `boosts.py`).

**Recommended Fix:** Add `user: User = Depends(get_current_user)` and use `user.id` instead of `body.user_id`. Remove `user_id` from `ReviewCreate`.

---

### C3. Launch Creation and Wizard Have No Authentication -- User ID Spoofing

- **Severity:** CRITICAL
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/launches.py`, lines 74-102 and 116-157
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/launch.py`, line 57

**Description:** Both `POST /api/launches` and `POST /api/launches/wizard` have no authentication. The wizard endpoint accepts `user_id` in the body and creates both a product and launch attributed to any user.

```python
# launches.py line 74-75 -- no auth dependency
@router.post("", response_model=LaunchOut, status_code=201)
async def create_launch(body: LaunchCreate, db: AsyncSession = Depends(get_db)):

# launches.py line 116-117 -- no auth dependency
@router.post("/wizard", response_model=LaunchOut, status_code=201)
async def create_wizard(body: WizardCreate, db: AsyncSession = Depends(get_db)):
    product = Product(
        user_id=body.user_id,  # Attacker controls this
    )
```

**Exploitation:** Attacker creates products and launches impersonating legitimate vendors, damaging their reputation or flooding the marketplace.

**Recommended Fix:** Add authentication dependency to both endpoints. Derive `user_id` from the authenticated user. Remove `user_id` from `WizardCreate` and `LaunchCreate` schemas.

---

### C4. Deal Creation Has No Authentication or Authorization

- **Severity:** CRITICAL
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/deals.py`, lines 37-60

**Description:** The `POST /api/deals` endpoint has no authentication. Anyone can create deals for any product. There is no ownership check -- the endpoint does not verify that the requester owns the product.

```python
# deals.py line 37-38 -- no auth dependency
@router.post("", response_model=DealOut, status_code=201)
async def create_deal(body: DealCreate, db: AsyncSession = Depends(get_db)):
```

**Exploitation:** An attacker can create fraudulent deals (e.g., "free lifetime access") for products they do not own, potentially tricking users into making purchases or providing email addresses via referrals.

**Recommended Fix:** Add `get_current_user` dependency. Verify that the authenticated user owns the product (`product.user_id == user.id`).

---

### C5. Comment Creation Has No Authentication -- User ID Spoofing

- **Severity:** CRITICAL
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/comments.py`, lines 54-96
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/comment.py`, line 10

**Description:** The `POST /api/launches/{launch_id}/comments` endpoint has no authentication. The `user_id` is accepted from the request body, allowing anyone to post comments impersonating any user. The `is_maker` flag is automatically set based on product ownership, so an attacker spoofing a vendor's `user_id` gets their comment flagged as an official "maker" response.

```python
# comments.py line 54-58 -- no auth
@router.post("/launches/{launch_id}/comments", response_model=CommentOut, status_code=201)
async def create_launch_comment(
    launch_id: uuid.UUID,
    body: CommentCreate,  # body.user_id is attacker-controlled
    db: AsyncSession = Depends(get_db),
):
```

**Exploitation:** Impersonate the product maker to post misleading "official" responses. Conduct social engineering attacks appearing as trusted users.

**Recommended Fix:** Add `get_current_user`. Use `user.id` instead of `body.user_id`. Remove `user_id` from `CommentCreate`.

---

### C6. Upvote Endpoint Accepts User ID as Query Parameter -- Vote Manipulation

- **Severity:** CRITICAL
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/launches.py`, lines 160-187

**Description:** The `POST /api/launches/{launch_id}/upvote` endpoint takes `user_id` as a query parameter with no authentication. An attacker can upvote any launch as any user, directly manipulating the leaderboard and trending scores.

```python
# launches.py line 160-161
@router.post("/{launch_id}/upvote")
async def toggle_upvote(launch_id: uuid.UUID, user_id: uuid.UUID, db: ...):
```

**Exploitation:** Script automated upvotes from multiple user IDs to push a launch to the top of the leaderboard. This directly affects `trending_score` which controls the default sort order for the entire marketplace.

**Recommended Fix:** Replace `user_id: uuid.UUID` parameter with `user: User = Depends(get_current_user)` and use `user.id`.

---

### C7. Hardcoded JWT Secret in Configuration Default

- **Severity:** CRITICAL
- **OWASP Category:** Cryptographic Failures (A02:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/config.py`, line 13

**Description:** The JWT signing secret has a hardcoded default value `"launchdeck-dev-secret-change-in-production"`. If no `.env` file overrides this (and no `.env` file currently exists in the repo), this secret ships to production. Anyone who reads the source code can forge valid JWT tokens for any user, including admin users.

```python
JWT_SECRET: str = "launchdeck-dev-secret-change-in-production"
```

**Exploitation:** `jwt.encode({"sub": "<any-user-id>", "type": "access", "exp": ...}, "launchdeck-dev-secret-change-in-production", algorithm="HS256")` produces a valid token.

**Recommended Fix:**
1. Remove the default value: `JWT_SECRET: str` (force it to be set via environment).
2. Add startup validation that raises an error if `JWT_SECRET` is the default or under 32 characters.
3. Generate a cryptographically random secret for each deployment.

---

### C8. Hardcoded Database Credentials in Config and Docker Compose

- **Severity:** CRITICAL
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/config.py`, lines 5-6
- **File:** `/home/GHOST/dev/LaunchDeck/docker-compose.yml`, lines 5-7, 50-51

**Description:** Database username (`launchdeck`) and password (`launchdeck_dev`) are hardcoded in both the config defaults and docker-compose.yml. The PostgreSQL port is also exposed to the host (`5432:5432`), making the database accessible from outside Docker.

```yaml
# docker-compose.yml
environment:
  POSTGRES_PASSWORD: launchdeck_dev
ports:
  - "5432:5432"  # Exposed to host/network
```

**Exploitation:** If deployed as-is, anyone on the network can connect to PostgreSQL with `psql -h <host> -U launchdeck -d launchdeck` using the known password.

**Recommended Fix:**
1. Use Docker secrets or environment variables from a `.env` file (not committed to git).
2. Remove port mappings in production (or bind to `127.0.0.1:5432:5432`).
3. Use different credentials per environment.

---

## HIGH Findings

### H1. Vendor Dashboard IDOR -- Any User Can View Any Vendor's Dashboard

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021) / IDOR
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/dashboard.py`, lines 15-19

**Description:** The `GET /api/dashboard/{user_id}` endpoint has no authentication at all. Anyone can fetch any vendor's complete dashboard including revenue figures, deal redemption data, boost spend, and review sentiment analysis.

```python
# dashboard.py line 15-19 -- no auth dependency
@router.get("/{user_id}")
async def get_dashboard(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
```

**Exploitation:** Enumerate vendor dashboards to extract competitive intelligence: revenue, deal performance, boost spend, review counts.

**Recommended Fix:** Add `user: User = Depends(get_current_user)` and verify `user.id == user_id or user.role == "admin"`.

---

### H2. Product Analytics IDOR -- No Ownership Check

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021) / IDOR
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/events.py`, lines 33-39

**Description:** The `GET /api/analytics/product/{product_id}` endpoint requires authentication but does not check that the authenticated user owns the product. Any authenticated user can view any product's real-time analytics (views, clicks).

```python
# events.py line 33-39
@router.get("/analytics/product/{product_id}")
async def product_analytics(
    product_id: str,
    user: User = Depends(get_current_user),  # auth present but no ownership check
):
    counters = await get_realtime_counters(product_id)
    return counters
```

**Recommended Fix:** Look up the product, verify `product.user_id == user.id or user.role == "admin"`.

---

### H3. Referral Creation Has No Authentication -- Email Harvesting Vector

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/deals.py`, lines 63-72
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/deal.py`, line 51

**Description:** The `POST /api/deals/referrals` endpoint has no authentication. It accepts `referrer_id`, `referred_email`, and `deal_id` from the body. An attacker can create referrals impersonating any user, potentially sending spam or phishing emails if a referral email notification system is later added.

```python
# deals.py line 63-64 -- no auth
@router.post("/referrals", status_code=201)
async def create_referral(body: ReferralCreate, db: AsyncSession = Depends(get_db)):
```

**Recommended Fix:** Add `get_current_user` and use `user.id` as the referrer.

---

### H4. Comment Upvote Has No Authentication and No Toggle Logic

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/comments.py`, lines 120-135

**Description:** The `POST /api/comments/{comment_id}/upvote` endpoint has no authentication and unconditionally increments `upvote_count` on every request. The `user_id` is accepted as a query parameter but is not used at all -- the count simply increments every time.

```python
# comments.py line 120-135 -- no auth, no dedup
@router.post("/comments/{comment_id}/upvote")
async def upvote_comment(
    comment_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    comment = await db.get(Comment, comment_id)
    # ...
    comment.upvote_count += 1  # Always increments, never checks user_id
    await db.commit()
```

**Exploitation:** A simple loop: `for i in range(10000): POST /api/comments/{id}/upvote?user_id=<anything>` inflates any comment's upvote count without limit.

**Recommended Fix:** Add authentication. Track upvotes in a join table to prevent duplicates. Implement toggle logic (as done for launch upvotes).

---

### H5. Category Creation Has No Authentication -- Should Be Admin-Only

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/categories.py`, lines 107-131

**Description:** The `POST /api/categories` endpoint has no authentication despite the code comment saying "admin only in production." Any anonymous user can create categories, polluting the category taxonomy.

```python
# categories.py line 107-109
@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(body: CategoryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new category (admin only in production)."""  # <-- comment but no guard
```

**Recommended Fix:** Add `user: User = Depends(require_role("admin"))`.

---

### H6. Insights Report Generation Has No Authentication

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/insights.py`, lines 90-97

**Description:** The `POST /api/insights/report/{product_id}` endpoint has no authentication. AI report generation is likely a computationally expensive operation (calls Ollama). An attacker can abuse this for denial-of-service by hammering this endpoint.

```python
# insights.py line 90-91 -- no auth
@router.post("/report/{product_id}", response_model=ValidationReport)
async def create_report(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
```

**Recommended Fix:** Add `user: User = Depends(get_current_user)`.

---

### H7. Matchmaking Endpoint Has No Authentication

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/matchmaking.py`, lines 11-15

**Description:** The `POST /api/matchmaking` endpoint has no authentication and accepts `buyer_id` from the request body. Any unauthenticated user can trigger AI matchmaking as any buyer.

```python
# matchmaking.py line 11-12 -- no auth
@router.post("/matchmaking", response_model=list[MatchOut])
async def matchmake(body: MatchRequest, db: AsyncSession = Depends(get_db)):
```

**Recommended Fix:** Add `get_current_user` and use `user.id` instead of `body.buyer_id`.

---

### H8. No Password Complexity Requirements

- **Severity:** HIGH
- **OWASP Category:** Identification and Authentication Failures (A07:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/auth.py`, line 9

**Description:** The `RegisterRequest` schema accepts any string as a password with no minimum length, complexity, or entropy requirements. A user can register with a single-character password.

```python
class RegisterRequest(BaseModel):
    password: str  # No validation at all
```

**Recommended Fix:**
```python
from pydantic import Field
password: str = Field(min_length=8, max_length=128)
```
Consider adding a password strength check (e.g., reject common passwords from a wordlist).

---

### H9. No Account Lockout or Brute-Force Protection on Login

- **Severity:** HIGH
- **OWASP Category:** Identification and Authentication Failures (A07:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/auth.py`, lines 48-59

**Description:** The login endpoint has no per-account rate limiting. The global rate limiter (100 req/60s per IP) is not sufficient -- an attacker can distribute attempts across IPs or simply try 100 passwords per minute from a single IP.

**Exploitation:** Automated credential stuffing or brute-force attacks against user accounts. With the weak password requirements (H8), many accounts will have guessable passwords.

**Recommended Fix:** Implement per-account lockout after N failed attempts (e.g., 5 failures triggers a 15-minute lockout or exponential backoff). Log failed login attempts.

---

### H10. No Token Revocation or Rotation Mechanism

- **Severity:** HIGH
- **OWASP Category:** Identification and Authentication Failures (A07:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/services/auth_service.py`, lines 28-34
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/auth.py`, lines 62-77

**Description:** Refresh tokens cannot be revoked. There is no token blacklist or one-time-use tracking. A stolen refresh token remains valid for 7 days and can be used to generate unlimited access tokens. The `POST /api/auth/refresh` endpoint also issues a new refresh token on each call, but does not invalidate the old one, so token theft goes undetected.

**Recommended Fix:**
1. Store refresh tokens (or their hashes) in the database.
2. Invalidate the old refresh token on each refresh (one-time use).
3. Provide a logout endpoint that revokes the refresh token.
4. Consider storing a token version counter on the user that invalidates all tokens when incremented.

---

### H11. `update_me` Endpoint Vulnerable to Mass Assignment via `setattr`

- **Severity:** HIGH
- **OWASP Category:** Broken Access Control (A01:2021) / Mass Assignment
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/auth.py`, lines 85-95

**Description:** The `PUT /api/auth/me` endpoint uses `setattr` to apply all fields from `body.model_dump(exclude_unset=True)`. While the `UserUpdate` schema currently limits fields to `name`, `company`, `bio`, and `avatar_url`, this pattern is fragile. If a developer adds a field like `role` or `is_verified` to `UserUpdate` in the future, users could self-promote to admin. The same `setattr` pattern is used in `startups.py` line 66.

```python
# auth.py line 91
for field, value in body.model_dump(exclude_unset=True).items():
    setattr(user, field, value)
```

**Recommended Fix:** Explicitly assign allowed fields rather than using a generic `setattr` loop:
```python
if body.name is not None:
    user.name = body.name
if body.company is not None:
    user.company = body.company
# ...
```

---

### H12. Seed Script Uses Shared Default Password for All Users

- **Severity:** HIGH
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/seed.py`, line 15

**Description:** All 20 seed users share the password `demo1234`. If the seed is run in any non-local environment, all accounts are trivially compromisable. The password is hardcoded at module level and hashed once.

```python
DEFAULT_PASSWORD = hash_password("demo1234")
```

**Recommended Fix:** Add a guard that prevents the seed script from running if `ENVIRONMENT != "development"`. Consider using unique random passwords per seed user. Add a clear warning banner.

---

### H13. Redis and Ollama Ports Exposed Without Authentication

- **Severity:** HIGH
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/docker-compose.yml`, lines 19-20, 31-32

**Description:** Redis (`6379`) and Ollama (`11434`) ports are exposed to the host with no authentication. Redis has no password configured. If deployed on a publicly accessible machine, Redis can be used to read/write cached data or execute commands, and Ollama can be used as a free AI inference endpoint.

```yaml
redis:
  ports:
    - "6379:6379"  # No password

ollama:
  ports:
    - "11434:11434"  # Open API
```

**Recommended Fix:**
1. Remove port mappings for Redis and Ollama in production (they should only be accessible within the Docker network).
2. Configure Redis with `--requirepass`.
3. Use separate docker-compose profiles or override files for dev vs. production.

---

### H14. `python-jose` Has Known Vulnerabilities

- **Severity:** HIGH
- **OWASP Category:** Vulnerable and Outdated Components (A06:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/requirements.txt`, line 13

**Description:** `python-jose==3.3.0` is the latest version but the library is unmaintained (last commit 2022) and has known security advisories (CVE-2024-33663, CVE-2024-33664) related to algorithm confusion attacks with ECDSA keys. While the current config uses HS256, the library's maintenance status is a concern.

**Recommended Fix:** Migrate to `PyJWT` (`pip install PyJWT[crypto]`) which is actively maintained and has a comparable API:
```python
import jwt
# encode: jwt.encode(payload, secret, algorithm="HS256")
# decode: jwt.decode(token, secret, algorithms=["HS256"])
```

---

## MEDIUM Findings

### M1. CORS Allows Credentials with Wildcard Methods and Headers

- **Severity:** MEDIUM
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/main.py`, lines 54-60

**Description:** CORS is configured with `allow_credentials=True` combined with `allow_methods=["*"]` and `allow_headers=["*"]`. While `allow_origins` is correctly limited to `["http://localhost:3000"]`, this configuration is risky if the origins list is ever broadened. The wildcard methods/headers increase attack surface unnecessarily.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Recommended Fix:** Restrict `allow_methods` to `["GET", "POST", "PUT", "DELETE", "OPTIONS"]` and `allow_headers` to `["Authorization", "Content-Type"]`.

---

### M2. Rate Limiter Is Per-IP Only and In-Memory -- Easily Bypassed

- **Severity:** MEDIUM
- **OWASP Category:** Broken Access Control (A01:2021) / Rate Limiting
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/middleware.py`, lines 13-36

**Description:** The rate limiter is: (1) per-IP only -- no per-user or per-endpoint granularity; (2) in-memory -- resets on every server restart and does not work across multiple backend instances; (3) trivially bypassed with a rotating proxy; (4) uses an unbounded dict that can cause a memory leak if many unique IPs are seen.

```python
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 100  # Too high for sensitive endpoints like login
```

**Recommended Fix:**
1. Move to Redis-based rate limiting for persistence across restarts and instances.
2. Add per-endpoint rate limits (e.g., 5 req/min for `/api/auth/login`).
3. Add per-user rate limiting for authenticated endpoints.
4. Add periodic cleanup of the `_rate_store` dict to prevent memory exhaustion.

---

### M3. Rate Limiter Memory Leak -- Unbounded Dictionary Growth

- **Severity:** MEDIUM
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/middleware.py`, lines 14, 24-26

**Description:** The `_rate_store` dictionary grows unboundedly. While old timestamps within an IP's list are cleaned, the IP keys themselves are never removed. Over time, a large number of unique IPs (from bots, scanners, legitimate users) will cause memory exhaustion -- a denial-of-service vector.

**Recommended Fix:** Add periodic cleanup that removes keys with no recent timestamps, or limit the dict size with an LRU eviction policy, or migrate to Redis with TTL-based keys.

---

### M4. Swagger/OpenAPI Documentation Exposed in Production

- **Severity:** MEDIUM
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/main.py`, lines 44-49

**Description:** FastAPI's auto-generated Swagger UI (`/docs`) and ReDoc (`/redoc`) are enabled by default with no environment gating. In production, this exposes the entire API surface, schema details, and parameter descriptions to attackers.

```python
app = FastAPI(
    title="LaunchDeck API",
    # No docs_url=None or redoc_url=None for production
)
```

**Recommended Fix:**
```python
import os
docs_url = "/docs" if os.getenv("ENVIRONMENT", "dev") == "dev" else None
app = FastAPI(title="LaunchDeck API", docs_url=docs_url, redoc_url=docs_url and "/redoc")
```

---

### M5. No HTTPS Enforcement

- **Severity:** MEDIUM
- **OWASP Category:** Cryptographic Failures (A02:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/config.py`, lines 22-23
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/main.py`

**Description:** There are no mechanisms to enforce HTTPS: no `Strict-Transport-Security` header, no redirect from HTTP to HTTPS, and Stripe callback URLs are hardcoded to `http://localhost:3000`. The JWT tokens and passwords are transmitted in plaintext if HTTP is used.

```python
STRIPE_SUCCESS_URL: str = "http://localhost:3000/payments/success?session_id={CHECKOUT_SESSION_ID}"
```

**Recommended Fix:**
1. Add HSTS header middleware.
2. In production, update all URLs to use `https://`.
3. Consider adding `TrustedHostMiddleware` from Starlette.

---

### M6. JWT Algorithm Not Validated on Decode Side

- **Severity:** MEDIUM
- **OWASP Category:** Cryptographic Failures (A02:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/services/auth_service.py`, line 39

**Description:** While the `decode_token` function does pass `algorithms=[settings.JWT_ALGORITHM]`, the algorithm is configurable via environment variable. If `JWT_ALGORITHM` is changed to `"none"` in the environment, token verification is bypassed. The algorithm should be hardcoded to the expected value or at minimum validated against an allowlist.

```python
def decode_token(token: str) -> dict | None:
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
```

**Recommended Fix:** Hardcode the algorithm in the decode function: `algorithms=["HS256"]`. If algorithm flexibility is needed, validate against an allowlist excluding `"none"`.

---

### M7. No Security Headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)

- **Severity:** MEDIUM
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/main.py`

**Description:** The API responses include no security headers. Missing headers include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

**Recommended Fix:** Add a middleware that sets security headers on all responses:
```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
```

---

### M8. Frontend Stores JWT Tokens in localStorage -- Vulnerable to XSS Theft

- **Severity:** MEDIUM
- **OWASP Category:** Identification and Authentication Failures (A07:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/frontend/src/lib/auth.ts`, lines 1-27

**Description:** Access and refresh tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page. If an XSS vulnerability is found, an attacker can steal both tokens. HttpOnly cookies would prevent this.

```typescript
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
```

**Recommended Fix:** Store tokens in HttpOnly, Secure, SameSite cookies set by the backend, rather than in localStorage. The backend should set these cookies on login/refresh responses.

---

### M9. User ID Passed in URL Query String -- Logged and Cached

- **Severity:** MEDIUM
- **OWASP Category:** Sensitive Data Exposure (A02:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/frontend/src/lib/api.ts`, line 62

**Description:** The `toggleUpvote` function passes `user_id` as a URL query parameter, which gets logged in server access logs, browser history, CDN/proxy caches, and the request logging middleware.

```typescript
export const toggleUpvote = (launchId: string, userId: string) =>
  fetchAPI<any>(`/api/launches/${launchId}/upvote?user_id=${userId}`, { method: "POST" });
```

**Recommended Fix:** After fixing the backend to use token-based auth, remove the `user_id` from the URL entirely.

---

### M10. No CSRF Protection for State-Changing Operations

- **Severity:** MEDIUM
- **OWASP Category:** CSRF
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/main.py`

**Description:** The application uses Bearer token authentication sent via the `Authorization` header, which provides some CSRF protection since browsers do not automatically send custom headers in cross-origin requests. However, if tokens are ever moved to cookies (per recommendation M8), CSRF tokens will become mandatory. Currently, there is no CSRF middleware or token mechanism in place.

**Recommended Fix:** If/when tokens are moved to cookies, implement a CSRF token mechanism (e.g., double-submit cookie pattern or Synchronizer Token pattern). This is a pre-emptive finding.

---

### M11. Docker Containers Run as Root

- **Severity:** MEDIUM
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/Dockerfile`
- **File:** `/home/GHOST/dev/LaunchDeck/frontend/Dockerfile`

**Description:** Neither Dockerfile specifies a non-root user. All application processes run as `root` inside the container. If an attacker achieves code execution (e.g., via a dependency vulnerability), they have root privileges within the container, which increases the blast radius and makes container escapes more feasible.

```dockerfile
# No USER directive in either Dockerfile
```

**Recommended Fix:**
```dockerfile
# Backend Dockerfile
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Frontend Dockerfile
RUN adduser -D appuser
USER appuser
```

---

### M12. `--reload` Flag Enabled in Production Docker Command

- **Severity:** MEDIUM
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/Dockerfile`, line 14

**Description:** The uvicorn command includes `--reload`, which watches for file changes and reloads the server. In production, this adds overhead, may expose timing information, and could be exploited if an attacker can write files to the mounted volume (the `./backend:/app` volume mount makes this more likely).

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Recommended Fix:** Use environment-specific commands. For production, remove `--reload` and the source volume mount. Use a multi-stage build.

---

### M13. Source Code Volume-Mounted into Containers

- **Severity:** MEDIUM
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/docker-compose.yml`, lines 48, 67

**Description:** The backend source code is volume-mounted into the container (`./backend:/app`). Combined with the `--reload` flag, this means any file written to the host's `backend/` directory will be executed by the server. In production, container images should be self-contained.

**Recommended Fix:** Remove volume mounts in production docker-compose. Use separate `docker-compose.override.yml` for development.

---

### M14. No Input Length Limits on Several Text Fields

- **Severity:** MEDIUM
- **OWASP Category:** Injection (A03:2021) / Denial of Service
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/comment.py`, line 8
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/review.py`, lines 11-14
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/deal.py`, lines 9-10
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/schemas/launch.py`, lines 9-12

**Description:** Multiple schema fields accept unbounded strings with no `max_length` constraint. An attacker can submit megabytes of text in a single request, consuming database storage, network bandwidth, and AI processing time (review text is passed to the AI sentiment analyzer).

```python
# comment.py
class CommentCreate(BaseModel):
    body: str  # No max_length

# review.py
class ReviewCreate(BaseModel):
    title: str  # No max_length
    content: str | None = None  # No max_length
```

**Recommended Fix:** Add `Field(max_length=...)` to all text fields:
```python
body: str = Field(max_length=5000)
title: str = Field(max_length=200)
content: str = Field(max_length=10000)
```

---

## LOW Findings

### L1. No `.gitignore` File -- Risk of Committing Secrets

- **Severity:** LOW
- **OWASP Category:** Sensitive Data Exposure (A02:2021)

**Description:** No `.gitignore` file was found in the repository. This increases the risk of accidentally committing `.env` files, `__pycache__`, `node_modules`, `.next` build artifacts, and other sensitive or unnecessary files.

**Recommended Fix:** Create a `.gitignore` with standard exclusions for Python, Node.js, and Docker.

---

### L2. Refresh Token Endpoint Does Not Validate User Is Active

- **Severity:** LOW
- **OWASP Category:** Identification and Authentication Failures (A07:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/auth.py`, lines 62-77

**Description:** The refresh endpoint checks that the user exists but does not check for account status (e.g., banned, deactivated). A deactivated user with a valid refresh token can continue generating access tokens.

**Recommended Fix:** Add a check for user account status (e.g., `if user.is_banned: raise HTTPException(403)`).

---

### L3. No Pagination Limit Enforcement on Some Endpoints

- **Severity:** LOW
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/payments.py`, lines 134-149
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/startups.py`, lines 73-86

**Description:** The `limit` parameter on `GET /api/payments` and `GET /api/startups` has no upper bound (`le` constraint). An attacker can set `limit=1000000` to force the database to return massive result sets, causing performance degradation.

```python
# payments.py line 138-139
limit: int = 20,  # No Query(le=...) constraint
offset: int = 0,
```

**Recommended Fix:** Add `limit: int = Query(default=20, le=100)` on all list endpoints.

---

### L4. Error Handler Middleware Logs Exception Message to Server Logs

- **Severity:** LOW
- **OWASP Category:** Sensitive Data Exposure (A02:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/middleware.py`, line 62

**Description:** The `ErrorHandlerMiddleware` logs the full exception message including `str(e)`. While it correctly returns a generic "Internal server error" to the client, exception messages in logs may contain sensitive data (database errors with query content, connection strings, etc.).

**Recommended Fix:** Ensure log aggregation systems have appropriate access controls. Consider sanitizing exception messages before logging. The client-facing response is already properly generic.

---

### L5. Registration Allows Arbitrary Role Selection

- **Severity:** LOW
- **OWASP Category:** Broken Access Control (A01:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/routers/auth.py`, lines 33-34

**Description:** While registration is restricted to `"buyer"` or `"vendor"` roles, this check is done at the router level rather than the schema level. The schema default is `"buyer"` which is safe, but the validation should be in the schema for defense in depth. Additionally, if `"admin"` is ever added to the allowed list by mistake, privilege escalation would be possible.

```python
if body.role not in ("buyer", "vendor"):
    raise HTTPException(status_code=400, detail="Role must be 'buyer' or 'vendor'")
```

**Recommended Fix:** Use a Pydantic `Literal` type in the schema:
```python
from typing import Literal
role: Literal["buyer", "vendor"] = "buyer"
```

---

### L6. No Request Body Size Limits

- **Severity:** LOW
- **OWASP Category:** Security Misconfiguration (A05:2021)
- **File:** `/home/GHOST/dev/LaunchDeck/backend/app/main.py`

**Description:** There are no explicit request body size limits configured. While uvicorn has a default limit, it should be explicitly set and enforced at the application level to prevent large payload attacks.

**Recommended Fix:** Configure uvicorn with `--limit-max-header-size` and `--limit-concurrency`. Add middleware or dependency to reject request bodies over a reasonable limit (e.g., 1MB for API endpoints).

---

## Summary of Affected Endpoints

### Endpoints Missing Authentication Entirely (Anonymous Access to State-Changing Operations)

| Endpoint | Method | File | Line |
|----------|--------|------|------|
| `/api/products` | POST | products.py | 60 |
| `/api/reviews` | POST | reviews.py | 17 |
| `/api/launches` | POST | launches.py | 74 |
| `/api/launches/wizard` | POST | launches.py | 116 |
| `/api/launches/preview` | POST | launches.py | 105 |
| `/api/launches/{id}/upvote` | POST | launches.py | 160 |
| `/api/deals` | POST | deals.py | 37 |
| `/api/deals/referrals` | POST | deals.py | 63 |
| `/api/categories` | POST | categories.py | 107 |
| `/api/launches/{id}/comments` | POST | comments.py | 54 |
| `/api/comments/{id}/upvote` | POST | comments.py | 120 |
| `/api/insights/report/{id}` | POST | insights.py | 90 |
| `/api/matchmaking` | POST | matchmaking.py | 11 |
| `/api/dashboard/{user_id}` | GET | dashboard.py | 15 |

### Endpoints with Authentication but Missing Authorization (IDOR)

| Endpoint | Method | File | Issue |
|----------|--------|------|-------|
| `/api/analytics/product/{id}` | GET | events.py | No ownership check |

### Endpoints with Proper Auth + Authorization

| Endpoint | Method | File |
|----------|--------|------|
| `/api/boosts` | POST | boosts.py (ownership check present) |
| `/api/boosts/{id}` | GET | boosts.py (ownership check present) |
| `/api/boosts/{id}/pause` | PUT | boosts.py (ownership check present) |
| `/api/boosts/{id}/resume` | PUT | boosts.py (ownership check present) |
| `/api/payments/{id}` | GET | payments.py (ownership check present) |
| `/api/payments` | GET | payments.py (user-scoped) |
| `/api/startups` | POST | startups.py (role check present) |
| `/api/startups/{id}` | PUT | startups.py (ownership check present) |
| `/api/analytics/platform` | GET | events.py (admin role required) |
| `/api/analytics/ai` | GET | events.py (admin role required) |

---

## Prioritized Remediation Plan

### Immediate (Week 1) -- CRITICAL
1. **Add authentication to all 14 unprotected endpoints** (C1-C6, H1, H3-H7)
2. **Remove `user_id` from all request schemas** where it should be derived from the token
3. **Replace hardcoded JWT secret** with environment-only configuration (C7)
4. **Remove exposed database/Redis ports** in docker-compose (C8, H13)

### Short-Term (Week 2-3) -- HIGH
5. Add password complexity requirements (H8)
6. Implement per-account login rate limiting / lockout (H9)
7. Add token revocation mechanism (H10)
8. Replace `python-jose` with `PyJWT` (H14)
9. Fix mass assignment patterns (H11)
10. Guard seed script with environment check (H12)

### Medium-Term (Month 2) -- MEDIUM
11. Migrate rate limiter to Redis (M2)
12. Add security headers middleware (M7)
13. Move tokens to HttpOnly cookies (M8)
14. Add input length limits to all schemas (M14)
15. Run containers as non-root (M11)
16. Disable Swagger in production (M4)
17. Enforce HTTPS (M5)
18. Remove --reload and volume mounts for production (M12, M13)

### Ongoing
19. Set up dependency vulnerability scanning (Dependabot, Snyk)
20. Implement structured security logging and alerting
21. Conduct periodic penetration testing
