from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.deal import MatchOut, MatchRequest
from app.services.matching import run_matchmaking

router = APIRouter(prefix="/api", tags=["matchmaking"])


@router.post("/matchmaking", response_model=list[MatchOut])
async def matchmake(body: MatchRequest, db: AsyncSession = Depends(get_db)):
    """AI-powered buyer-to-startup matchmaking."""
    results = await run_matchmaking(db, body.buyer_id, body.requirements)
    return results
