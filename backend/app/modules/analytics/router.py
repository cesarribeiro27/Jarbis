from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .schemas import DashboardResponse
from .service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna métricas agregadas do tenant do usuário autenticado.
    """
    service = AnalyticsService(db)
    return await service.get_dashboard(current_user.tenant_id)
