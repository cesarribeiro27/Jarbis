from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .schemas import RankingResponse, VehicleAudienceHistory
from .service import AudienceService

router = APIRouter(prefix="/audience", tags=["Audiência"])


@router.get("/ranking", response_model=RankingResponse)
async def get_ranking(
    vehicle_type: str | None = Query(None, description="Filtrar por tipo: TV, RADIO, JORNAL, DIGITAL..."),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Ranking de veículos pelo valor médio de audiência."""
    return await AudienceService(db).get_ranking(vehicle_type=vehicle_type, limit=limit)


@router.get("/compare", response_model=list[VehicleAudienceHistory])
async def compare_vehicles(
    ids: list[UUID] = Query(..., description="IDs dos veículos a comparar (máx 10)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Histórico de audiência de múltiplos veículos para comparação."""
    return await AudienceService(db).compare_vehicles(ids[:10])
