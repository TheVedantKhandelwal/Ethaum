# LaunchDeck — AI-Powered SaaS Marketplace

LaunchDeck combines the best of Product Hunt (launches/upvotes), G2 (reviews/comparisons), Gartner (insights/quadrants), and AppSumo (deals/matchmaking) into a single AI-powered platform for SaaS discovery.

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | Next.js 14 (App Router), Tailwind CSS   |
| Backend        | FastAPI, SQLAlchemy, Alembic            |
| Database       | PostgreSQL 16                           |
| AI             | Ollama (qwen2.5 / gemma2)              |
| Cache          | Redis                                   |
| Containerization | Docker, docker-compose                |

## Quick Start

```bash
# 1. Clone and start all services
docker-compose up --build

# 2. Seed the database with sample data (in another terminal)
docker-compose exec backend python -m app.seed

# 3. (Optional) Pull an Ollama model for AI features
docker-compose exec ollama ollama pull qwen2.5
```

**Access points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs
- Ollama: http://localhost:11434

## Features

### Launches (Product Hunt layer)
- Submit product launches with AI-generated taglines and descriptions
- Upvote/downvote with real-time counts
- Trending, recent, and top sorting
- Daily/weekly leaderboards

### Reviews (G2 layer)
- Submit reviews with star ratings, pros, and cons
- AI-powered review verification (spam/authenticity scoring)
- AI sentiment analysis
- Product comparison (side-by-side for 2-4 products)

### Insights (Gartner layer)
- Interactive quadrant chart per category
- Products plotted by "completeness of vision" vs "ability to execute"
- Trending products and categories
- AI-generated validation reports per product

### Deals (AppSumo layer)
- Create discount, pilot, and lifetime deals
- Deal marketplace with filtering
- AI-powered buyer-startup matchmaking
- Referral system

### AI Features (Ollama)
All AI features gracefully degrade to heuristic fallbacks when Ollama is unavailable:
1. Launch content generation
2. Review verification
3. Sentiment analysis
4. Credibility scoring
5. Buyer-startup matching
6. Trend detection
7. Report generation

## API Endpoints

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | /api/products                     | List/search products           |
| GET    | /api/products/{slug}              | Product detail                 |
| POST   | /api/products                     | Create product                 |
| GET    | /api/launches                     | List launches (sort: trending/recent/top) |
| GET    | /api/launches/leaderboard         | Daily/weekly leaderboard       |
| POST   | /api/launches                     | Create launch (triggers AI)    |
| POST   | /api/launches/{id}/upvote         | Toggle upvote                  |
| GET    | /api/reviews?product_id=X         | Get reviews for product        |
| POST   | /api/reviews                      | Create review (triggers AI)    |
| GET    | /api/compare?products=id1,id2     | Compare products               |
| GET    | /api/insights/quadrant?category=X | Quadrant data                  |
| GET    | /api/insights/trends              | Trending products/categories   |
| POST   | /api/insights/report/{product_id} | Generate AI validation report  |
| GET    | /api/deals                        | List active deals              |
| POST   | /api/deals                        | Create deal                    |
| POST   | /api/matchmaking                  | AI buyer-startup matching      |
| POST   | /api/deals/referrals              | Create referral                |
| GET    | /api/health                       | Health check                   |

## Project Structure

```
launchdeck/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── database.py          # DB connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API routes
│   │   ├── services/            # AI + business logic
│   │   └── seed.py              # Sample data seeder
│   └── alembic/                 # Migrations
├── frontend/
│   └── src/
│       ├── app/                 # Next.js pages
│       ├── components/          # React components
│       └── lib/                 # API client + utils
```

## Configuration

Environment variables (set in docker-compose.yml or .env):

| Variable         | Default                     | Description              |
|------------------|-----------------------------|--------------------------|
| DATABASE_URL     | postgresql+asyncpg://...    | Async database URL       |
| DATABASE_URL_SYNC| postgresql://...            | Sync URL (for Alembic)   |
| REDIS_URL        | redis://localhost:6379/0    | Redis connection URL     |
| OLLAMA_BASE_URL  | http://ollama:11434         | Ollama API URL           |
| OLLAMA_MODEL     | qwen2.5                     | Ollama model to use      |
| CORS_ORIGINS     | ["http://localhost:3000"]   | Allowed CORS origins     |

## Development

```bash
# Run backend only
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Run frontend only
cd frontend && npm install && npm run dev

# Run migrations
cd backend && alembic upgrade head
```
