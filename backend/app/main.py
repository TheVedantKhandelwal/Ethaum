import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.middleware import ErrorHandlerMiddleware, RateLimitMiddleware, RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.models import *  # noqa: F401,F403 — ensure all models registered with Base
from app.routers import (
    auth,
    boosts,
    categories,
    comments,
    dashboard,
    deals,
    events,
    insights,
    launches,
    matchmaking,
    payments,
    products,
    reviews,
    search,
    startups,
)

# Structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (dev convenience; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="LaunchDeck API",
    description="AI-powered SaaS marketplace — launches, reviews, insights, deals, matchmaking & payments",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth & core
app.include_router(auth.router)
app.include_router(startups.router)
app.include_router(products.router)
app.include_router(launches.router)
app.include_router(reviews.router)
app.include_router(deals.router)
app.include_router(categories.router)
app.include_router(comments.router)
app.include_router(search.router)

# Monetization
app.include_router(payments.router)
app.include_router(boosts.router)

# Intelligence
app.include_router(insights.router)
app.include_router(matchmaking.router)
app.include_router(dashboard.router)
app.include_router(events.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "launchdeck-api", "version": "0.2.0"}
