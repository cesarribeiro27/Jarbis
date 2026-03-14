from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .service import SocialService

router = APIRouter(prefix="/social", tags=["Redes Sociais"])


@router.post("/sync/{vehicle_id}", summary="Sincronizar métricas de redes sociais")
async def sync_vehicle(
    vehicle_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Busca métricas atualizadas de Instagram, YouTube e TikTok
    para o veículo informado e salva como AudienceRecord.
    """
    try:
        return await SocialService(db).sync_vehicle(vehicle_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
