# LaunchDeck — FINAL IMPLEMENTATION PLAN

> **Goal**: Enterprise-grade AI SaaS marketplace combining Product Hunt (launches), G2 (reviews/grids), Gartner (quadrants/credibility), and AppSumo (deals/commerce).
> **Benchmark**: Feature parity with competitors. Professional UI. Deployable product.

---

## GAP ANALYSIS: Current State vs. Competitors

| Feature Area | G2 | Product Hunt | AppSumo | Gartner | LaunchDeck Current | Gap |
|---|---|---|---|---|---|---|
| Product profiles (rich) | Full | Full | Full | Full | Basic | MAJOR |
| Media gallery (screenshots, video) | Yes | Yes (carousel) | Yes (GIF, video) | No | None | MAJOR |
| Review system (structured) | Pros/cons/use-case + dimensions | Star + comments | Star + taco + AI summary | 4-dimension sub-ratings | Basic rating+text | MAJOR |
| Review verification | LinkedIn + email | Account-based | Purchase-verified | Enterprise identity check | Simple heuristic | MAJOR |
| Category taxonomy (deep) | Parent/child + segments | Topics | Category + subcategory + filters | Domain/market hierarchy | Flat single field | MAJOR |
| Grid/Quadrant visualization | G2 Grid (interactive) | None | None | Magic Quadrant | Basic static chart | MODERATE |
| Comparison tool | Up to 4, feature matrix | None | None | Side-by-side 2-4 | Basic exists | MODERATE |
| Daily launch feed | None | Core feature | None | None | Basic list | MODERATE |
| Upvote + leaderboard | None | Core (daily/weekly/monthly/yearly) | Voting exists | None | Basic toggle | MODERATE |
| Deals/commerce | None | None | Full (tiers, lifetime, codes) | None | Basic deals | MAJOR |
| Deal tiers + pricing table | None | None | Multi-tier comparison matrix | None | None | MAJOR |
| Search (global, autocomplete) | Full | Full | Full + filters | Full | Stub page | MAJOR |
| Badges/awards | Seasonal (Leader, High Performer, etc.) | POTD/W/M/Y | Select, FiveTaco | Customers' Choice | None | MAJOR |
| User profiles (maker/buyer) | Reviewer profiles | Maker + Hunter | Founder profiles | Reviewer demographics | Minimal | MAJOR |
| Comments/discussions | None | Threaded + votable | Q&A tab | None | None | MAJOR |
| Collections/lists | None | User-curated | None | Shortlists | None | MODERATE |
| Newsletter/notifications | None | Daily digest | Deal alerts | None | None | LOW |
| Responsive enterprise UI | Yes | Yes | Yes | Yes | Basic | MAJOR |

---

## IMPLEMENTATION PHASES

### PHASE A — Enterprise UI Foundation + Navigation (Priority: CRITICAL)

**Goal**: Transform the UI from MVP to enterprise-grade. Dark theme, professional layout, global navigation.

#### A.1 — Design System Overhaul
- [ ] New color palette: dark mode primary (zinc-900/950 base), accent indigo/violet gradient
- [ ] Typography: Inter font, clear hierarchy (4xl headings, base body, xs captions)
- [ ] Component library rebuild:
  - `Button` (primary, secondary, ghost, danger — sizes sm/md/lg)
  - `Input`, `Select`, `Textarea` with consistent styling
  - `Modal` / `Dialog` component
  - `Tabs` component (underline style)
  - `Avatar` with size variants and online indicator
  - `Tooltip` component
  - `Dropdown` menu
  - `Skeleton` loading states for every card type
  - `Badge` variants (status, category, award, verified)
  - `Toast` notification system
  - `EmptyState` illustrations

#### A.2 — Global Layout + Navigation
- [ ] **Sidebar navigation** (collapsible, icon+label):
  - Home (feed)
  - Launches (daily feed, leaderboard)
  - Products (browse, categories)
  - Compare
  - Deals
  - Insights (quadrant, trends)
  - Discover (AI matchmaking)
- [ ] **Top bar**: Global search (with autocomplete), notifications bell, user avatar dropdown
- [ ] **Mobile**: Bottom tab bar navigation + hamburger for secondary nav
- [ ] **Breadcrumbs** on all inner pages
- [ ] **Footer**: Links, social, company info

#### A.3 — Global Search
- [ ] Search endpoint: `GET /api/search?q=&type=products|launches|deals|categories`
- [ ] PostgreSQL full-text search with `tsvector` + `ts_rank`
- [ ] Autocomplete dropdown with grouped results (Products, Categories, Deals)
- [ ] Search results page with tabs and filters
- [ ] Recent searches (localStorage)

---

### PHASE B — Rich Product Profiles (Priority: CRITICAL)

**Goal**: Product pages that match G2/AppSumo depth.

#### B.1 — Enhanced Product Model
- [ ] `pricing_tiers` (JSONB): `[{name, price, period, features: []}]`
- [ ] `media` (JSONB): `[{type: "image"|"video"|"gif", url, caption, order}]`
- [ ] `integrations` (JSONB): `["Slack", "Zapier", ...]`
- [ ] `alternatives` (JSONB): `["Competitor A", ...]`
- [ ] `best_for` (JSONB): `["Marketers", "Small teams", ...]`
- [ ] `deployment_model`: cloud | on-premise | hybrid
- [ ] `founded_year`, `team_size_band`, `hq_location` (from startup)

#### B.2 — Product Page Sections (Top to Bottom)
1. **Hero**: Logo, name, tagline, category badge, credibility score badge, CTA buttons (Visit Website, Write Review, Compare)
2. **Media Gallery**: Carousel with screenshots, embedded YouTube videos, GIFs. Lightbox on click.
3. **At a Glance Panel**: Best for tags, Alternative to, Integrations, Deployment, Pricing model
4. **Description**: Rich text with feature highlights
5. **Pricing Table**: Tier comparison matrix (like AppSumo)
6. **Rating Breakdown Widget**: Distribution bar chart (5→1 star), average rating (large), sub-ratings (ease of use, support, value, features)
7. **Reviews Section**: Filterable list with structured reviews
8. **Discussion/Q&A Tab**: Threaded comments (Product Hunt style)
9. **Alternatives**: Related products in same category
10. **Company Info**: Startup profile card (team size, founded, HQ, funding stage)

#### B.3 — API Endpoints
- [ ] `PUT /api/products/{id}` — full update with media, integrations, pricing tiers
- [ ] `GET /api/products/{slug}` — returns full profile with stats, reviews summary, alternatives
- [ ] `GET /api/products/{id}/alternatives` — products in same category, sorted by credibility

---

### PHASE C — Deep Category Taxonomy (Priority: CRITICAL)

**Goal**: Hierarchical categories with browse pages, like G2's category system.

#### C.1 — Category Model
```
categories:
  id, name, slug, description, icon
  parent_id (FK self — enables hierarchy)
  product_count (denormalized)
  created_at
```

#### C.2 — Category Hierarchy
```
Software (root)
├── DevTools
│   ├── Code Review
│   ├── CI/CD
│   ├── Testing
│   └── Documentation
├── Analytics
│   ├── Product Analytics
│   ├── Revenue Analytics
│   └── BI & Reporting
├── Security
│   ├── Cloud Security
│   ├── Identity & Access
│   └── Compliance
├── AI/ML
│   ├── ML Platforms
│   ├── NLP Tools
│   └── Computer Vision
├── Sales & Marketing
│   ├── CRM
│   ├── Email Marketing
│   ├── SEO Tools
│   └── Lead Generation
├── Infrastructure
│   ├── Cloud Hosting
│   ├── Kubernetes
│   └── Monitoring
├── Collaboration
│   ├── Project Management
│   ├── Communication
│   └── Knowledge Base
└── Finance
    ├── Billing & Invoicing
    ├── Expense Management
    └── Financial Planning
```

#### C.3 — Category Browse Page
- [ ] Grid of subcategories with icons and product counts
- [ ] Product listing with sidebar filters:
  - Company size (1-10, 11-50, 51-200, 200+)
  - Pricing model (free, freemium, paid, enterprise)
  - Deployment (cloud, on-premise, hybrid)
  - Rating threshold (4+, 3+)
  - Features (dynamic checkboxes from category)
- [ ] Sort: credibility score, rating, review count, newest, trending
- [ ] G2-style Grid visualization embedded on category page

#### C.4 — API
- [ ] `GET /api/categories` — tree structure
- [ ] `GET /api/categories/{slug}` — category detail + products
- [ ] `GET /api/categories/{slug}/grid` — quadrant data for category

---

### PHASE D — Structured Review System (Priority: CRITICAL)

**Goal**: G2/Gartner-grade reviews with verification, dimensions, and filtering.

#### D.1 — Enhanced Review Model
```
reviews:
  + sub_ratings (JSONB): {ease_of_use: 4, support: 3, value: 5, features: 4}
  + use_case (TEXT): "What problems does it solve?"
  + company_size (VARCHAR): reviewer's company size
  + industry (VARCHAR): reviewer's industry
  + job_role (VARCHAR): reviewer's role
  + usage_duration (VARCHAR): "< 6 months" | "6-12 months" | "1-2 years" | "2+ years"
  + would_recommend (BOOLEAN)
  + screenshots (JSONB): [{url, caption}]
  + vendor_response (TEXT)
  + vendor_responded_at (TIMESTAMPTZ)
  + helpful_count (INTEGER)
  + ai_summary (TEXT): AI-generated one-liner
```

#### D.2 — Review Submission Flow
1. Star rating (1-5) + sub-ratings (4 dimensions, 1-5 each)
2. "What do you like best?" (required, min 50 chars)
3. "What do you dislike?" (required, min 30 chars)
4. "What problems is it solving for you?" (optional)
5. Reviewer context: company size, industry, role, usage duration
6. Would you recommend? (yes/no)
7. Optional screenshot upload
8. AI processes: sentiment, verification score, summary generation

#### D.3 — Review Display
- [ ] Rating breakdown widget (distribution bar chart + average + sub-ratings radar)
- [ ] Filter sidebar: star rating, company size, industry, role, usage duration
- [ ] Sort: most recent, most helpful, highest, lowest
- [ ] Helpful/not helpful voting
- [ ] Vendor response (inline, visually distinct)
- [ ] AI-generated review summary at top ("Based on X reviews...")
- [ ] Verified badge for high-score reviews

#### D.4 — Review API
- [ ] `POST /api/products/{id}/reviews` — structured review with sub-ratings
- [ ] `GET /api/products/{id}/reviews?company_size=&industry=&sort=` — filtered reviews
- [ ] `POST /api/reviews/{id}/helpful` — vote helpful
- [ ] `POST /api/reviews/{id}/respond` — vendor response (owner only)
- [ ] `GET /api/products/{id}/reviews/summary` — AI summary + theme extraction

---

### PHASE E — Launch Feed + Leaderboard (Priority: HIGH)

**Goal**: Product Hunt-quality daily launch feed with upvotes, rankings, and awards.

#### E.1 — Launch Feed Redesign
- [ ] Date-grouped daily sections ("Today", "Yesterday", date headers)
- [ ] Launch cards: thumbnail, name, tagline, topic badges, upvote button (right), comment count
- [ ] Sort: Trending (default), Newest, Most Upvoted
- [ ] "Featured" curation flag (admin-set)
- [ ] Maker badges on launch cards

#### E.2 — Leaderboard System
- [ ] Daily / Weekly / Monthly / All-Time tabs
- [ ] Rank badges: #1 gold, #2 silver, #3 bronze, #4-5 numbered
- [ ] Awards:
  - Product of the Day (auto: #1 daily by trending score)
  - Product of the Week (auto: #1 weekly)
  - Product of the Month (auto: #1 monthly)
- [ ] Awards stored in `product_awards` table and displayed as badges on product profiles
- [ ] Leaderboard page with topic filtering

#### E.3 — Threaded Comments/Discussion
```
comments:
  id, post_id (launch_id or product_id), user_id
  parent_id (FK self — threading)
  body (TEXT)
  upvote_count (INT)
  is_maker (BOOLEAN)
  created_at
```
- [ ] Nested reply UI (max 3 levels deep)
- [ ] Upvotable comments
- [ ] Maker badge on maker comments
- [ ] Sort: newest, most upvoted

#### E.4 — API
- [ ] `GET /api/launches?date=2026-03-27&sort=trending` — daily feed
- [ ] `GET /api/leaderboard?period=daily|weekly|monthly|alltime&topic=`
- [ ] `POST /api/launches/{id}/comments` — add comment
- [ ] `GET /api/launches/{id}/comments` — threaded comments

---

### PHASE F — Deals & Commerce Overhaul (Priority: HIGH)

**Goal**: AppSumo-grade deal pages with pricing tiers, urgency, and purchase flow.

#### F.1 — Enhanced Deal Model
```
deals:
  + tiers (JSONB): [{name, price, original_price, features: [], is_recommended: bool, max_codes: int}]
  + guarantee_days (INT, default 60)
  + urgency_type: "ending_soon" | "price_increase" | "limited_stock" | null
  + urgency_deadline (TIMESTAMPTZ)
  + media (JSONB): [{type, url, caption}]
  + terms (TEXT): license terms
  + ai_summary (TEXT)
  + is_featured (BOOLEAN)
  + tags (JSONB): ["Lifetime", "Staff Pick"]
```

#### F.2 — Deal Page Redesign
1. **Hero**: Product name, tagline, rating stars + count, status badge
2. **Media**: Video embed + screenshot carousel
3. **TL;DR**: 3 bullet highlight summary
4. **At a Glance**: Best for, Alternative to, Integrations
5. **Pricing Tiers Table**: Side-by-side tier comparison (like AppSumo), "Recommended" badge
6. **Deal Terms**: Bulleted license terms
7. **Money-Back Guarantee Badge**: "60-Day Money-Back Guarantee"
8. **Company/Maker Section**: Logo, name, location, team size, founder info
9. **Q&A Tab**: Community questions
10. **Reviews Tab**: Deal-specific reviews with AI summary

#### F.3 — Deal Browse Page
- [ ] Grid of deal cards: image, logo, name, description, category badge, rating, price (deal vs original with strikethrough), urgency badge
- [ ] Filters: category, price range, deal type (lifetime/discount/pilot), status (active/ending soon)
- [ ] Sort: recommended, price low-high, rating, newest, ending soon
- [ ] "Ending Soon" section with countdown timers
- [ ] "Staff Picks" curated section

#### F.4 — Purchase Flow Enhancement
- [ ] Tier selector on deal page (radio buttons with feature comparison)
- [ ] "Buy Now" CTA → Stripe Checkout with selected tier
- [ ] Post-purchase: license key display, activation instructions
- [ ] Purchase history page with license management

---

### PHASE G — Badges & Awards System (Priority: HIGH)

**Goal**: G2-style seasonal badges + Product Hunt awards + AppSumo select badges.

#### G.1 — Badge Types
```
badges:
  id, name, slug, description, icon_url
  badge_type: "award" | "seasonal" | "quality" | "deal"
  criteria (JSONB): {min_rating: 4.0, min_reviews: 10, ...}
```

**Award Badges** (auto-computed):
- Product of the Day / Week / Month (from leaderboard)
- Category Leader (top credibility in category)
- High Performer (high satisfaction, lower market presence)
- Momentum Leader (fastest growing reviews/upvotes in 30d)
- Users Love It (avg rating >= 4.5, min 20 reviews)
- Best Value (highest value-for-money sub-rating)
- Easiest to Use (highest ease-of-use sub-rating)

**Quality Badges** (criteria-based):
- Verified (all reviews verified)
- Customers' Choice (G2/Gartner style: min 50 reviews, avg 4.0+)
- AI Credibility Score A/B/C/D tiers

**Deal Badges**:
- Staff Pick
- Best Seller (top 10% by redemptions)
- Limited Time

#### G.2 — Badge Display
- Product profile: badge row below name
- Search results + category listings: small badge icons on cards
- Dedicated badges page per product
- Badge earn notifications

---

### PHASE H — Enhanced Quadrant/Grid Visualization (Priority: MEDIUM)

**Goal**: Interactive G2 Grid + Gartner Magic Quadrant quality.

#### H.1 — Interactive Quadrant
- [ ] D3.js or Recharts scatter plot (replace basic static chart)
- [ ] X-axis: Completeness of Vision (features, roadmap, pricing breadth)
- [ ] Y-axis: Ability to Execute (credibility score, review volume, engagement)
- [ ] Dot size = review count
- [ ] Hover tooltip: product name, scores, rating
- [ ] Click → navigate to product profile
- [ ] Quadrant labels: Leaders, High Performers, Contenders, Niche Players
- [ ] Market segment toggle (All, Enterprise, SMB, Startup)
- [ ] Category selector dropdown

#### H.2 — Grid Report Page
- [ ] Per-category grid with product rankings table below
- [ ] Score breakdown table (satisfaction score, market presence score)
- [ ] Quarterly refresh indicator

---

### PHASE I — User Profiles & Social (Priority: MEDIUM)

#### I.1 — Enhanced User Profiles
```
users:
  + headline (VARCHAR 300): bio tagline
  + job_title (VARCHAR 100)
  + linkedin_url (VARCHAR 500)
  + twitter_handle (VARCHAR 100)
  + is_maker (BOOLEAN)
  + review_count (INT, denormalized)
  + follower_count (INT)
  + following_count (INT)
```

#### I.2 — Profile Pages
- [ ] Avatar, name, headline, company, social links
- [ ] Activity tabs: Reviews Written | Products Made | Upvotes | Collections
- [ ] Maker badge (prominent)
- [ ] Follow/unfollow button
- [ ] Contribution stats (reviews, upvotes, comments)

#### I.3 — Collections/Shortlists
```
collections:
  id, user_id, name, description, is_public
  product_ids (JSONB array)
  created_at
```
- [ ] Create/edit collections
- [ ] "Save to collection" button on product cards
- [ ] Public collection pages (shareable URL)
- [ ] "My Shortlist" quick-save feature

#### I.4 — Follow System
```
follows:
  id, follower_id, following_id
  follow_type: "user" | "category" | "collection"
  created_at
```

---

### PHASE J — Frontend Pages (Full Rebuild)

Every page rebuilt with enterprise UI:

| Page | Key Components |
|---|---|
| **Home** | Hero with search, trending launches (today), top products by category, featured deals, stats bar |
| **Launches** | Date-grouped feed, sort tabs, featured section, submit CTA |
| **Leaderboard** | Period tabs, ranked list with award badges, topic filter |
| **Products Browse** | Category sidebar, filter panel, product grid, grid visualization |
| **Product Detail** | Hero, media gallery, at-a-glance, pricing table, reviews, discussion, alternatives |
| **Categories** | Hierarchical grid of categories with icons and counts |
| **Category Detail** | Products list + filters + quadrant chart |
| **Compare** | Multi-product comparison table with feature matrix and radar chart |
| **Deals** | Deal grid, filters, ending soon section, featured deals |
| **Deal Detail** | Hero, media, TL;DR, pricing tiers, terms, guarantee, reviews, Q&A |
| **Discover** | AI matchmaking wizard with results |
| **Insights** | Interactive quadrant, market trends, category analytics |
| **Dashboard** | Founder: product stats, reviews, revenue, boosts. Buyer: shortlists, reviews written |
| **Profile** | User profile with activity tabs |
| **Search** | Tabbed results (products, launches, deals, categories) with filters |
| **Login/Register** | Clean auth pages (already done) |
| **Settings** | Profile edit, notification preferences |

---

## EXECUTION ORDER

```
PHASE A  →  UI foundation, navigation, search           (foundation)
PHASE B  →  Rich product profiles                        (core)
PHASE C  →  Category taxonomy                            (core)
PHASE D  →  Structured review system                     (core)
PHASE E  →  Launch feed + leaderboard + comments         (engagement)
PHASE F  →  Deals commerce overhaul                      (revenue)
PHASE G  →  Badges & awards                              (retention)
PHASE H  →  Enhanced quadrant                            (differentiation)
PHASE I  →  User profiles & social                       (community)
PHASE J  →  Full page rebuild                            (polish)
```

Phases A-D are **blockers** — nothing else looks right without them.
Phases E-G are **value drivers** — what makes users stay.
Phases H-J are **polish** — what makes VCs say yes.

---

## SUCCESS CRITERIA

- [ ] 30+ API endpoints, all authenticated
- [ ] 14+ frontend pages, all with loading states and error handling
- [ ] Interactive quadrant/grid with real data
- [ ] Structured reviews with sub-ratings, verification, filtering
- [ ] Deal pages with pricing tier comparison tables
- [ ] Badge system with auto-computed awards
- [ ] Global search with autocomplete
- [ ] Threaded comments with maker badges
- [ ] Dark-mode enterprise UI with consistent design system
- [ ] Full docker-compose deployment (one command)
