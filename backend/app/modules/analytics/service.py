import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ooh.models import OohCampaign, OohPanel
from app.modules.reports.models import Report
from app.modules.tenants.models import User
from app.modules.vehicles.models import Vehicle

from .schemas import DashboardResponse


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard(self, tenant_id: uuid.UUID) -> DashboardResponse:
        # Veículos são compartilhados — sem filtro de tenant
        total_veiculos = (await self.db.execute(select(func.count(Vehicle.id)))).scalar_one()

        total_campanhas_ooh = (await self.db.execute(
            select(func.count(OohCampaign.id)).where(OohCampaign.tenant_id == tenant_id)
        )).scalar_one()

        total_paineis_ooh = (await self.db.execute(
            select(func.count(OohPanel.id)).where(OohPanel.tenant_id == tenant_id)
        )).scalar_one()

        paineis_geocodificados = (await self.db.execute(
            select(func.count(OohPanel.id)).where(
                OohPanel.tenant_id == tenant_id,
                OohPanel.geocode_status == "OK",
            )
        )).scalar_one()

        alcance_raw = (await self.db.execute(
            select(func.sum(OohPanel.alcance_estimado)).where(OohPanel.tenant_id == tenant_id)
        )).scalar_one()

        total_relatorios = (await self.db.execute(
            select(func.count(Report.id)).where(Report.tenant_id == tenant_id)
        )).scalar_one()

        total_usuarios = (await self.db.execute(
            select(func.count(User.id)).where(User.tenant_id == tenant_id)
        )).scalar_one()

        return DashboardResponse(
            total_veiculos=total_veiculos,
            total_campanhas_ooh=total_campanhas_ooh,
            total_paineis_ooh=total_paineis_ooh,
            total_relatorios=total_relatorios,
            total_usuarios=total_usuarios,
            paineis_geocodificados=paineis_geocodificados,
            alcance_total_estimado=alcance_raw or 0,
        )
