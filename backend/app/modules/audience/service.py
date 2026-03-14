import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.vehicles.models import AudienceRecord, Vehicle

from .schemas import (
    AudiencePoint,
    RankingResponse,
    VehicleAudienceHistory,
    VehicleRankingItem,
)


class AudienceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_ranking(
        self,
        vehicle_type: str | None = None,
        limit: int = 20,
    ) -> RankingResponse:
        """Ranking de veículos pelo valor médio de audiência (decrescente)."""
        query = (
            select(
                Vehicle.id,
                Vehicle.name,
                Vehicle.vehicle_type,
                Vehicle.coverage_states,
                AudienceRecord.metric_type,
                func.avg(AudienceRecord.value).label("avg_value"),
                func.count(AudienceRecord.id).label("record_count"),
            )
            .join(AudienceRecord, AudienceRecord.vehicle_id == Vehicle.id)
            .group_by(
                Vehicle.id,
                Vehicle.name,
                Vehicle.vehicle_type,
                Vehicle.coverage_states,
                AudienceRecord.metric_type,
            )
            .order_by(func.avg(AudienceRecord.value).desc())
            .limit(limit)
        )

        if vehicle_type:
            query = query.where(Vehicle.vehicle_type == vehicle_type)

        rows = (await self.db.execute(query)).all()

        items = [
            VehicleRankingItem(
                id=row.id,
                name=row.name,
                vehicle_type=row.vehicle_type.value if hasattr(row.vehicle_type, "value") else str(row.vehicle_type),
                coverage_states=row.coverage_states,
                metric_type=row.metric_type.value if hasattr(row.metric_type, "value") else str(row.metric_type),
                avg_value=round(row.avg_value, 4),
                record_count=row.record_count,
            )
            for row in rows
        ]

        return RankingResponse(items=items, total=len(items))

    async def compare_vehicles(
        self, vehicle_ids: list[uuid.UUID]
    ) -> list[VehicleAudienceHistory]:
        """Retorna o histórico de audiência de cada veículo solicitado."""
        vehicles_result = await self.db.execute(
            select(Vehicle.id, Vehicle.name, Vehicle.vehicle_type).where(
                Vehicle.id.in_(vehicle_ids)
            )
        )
        vehicles = {row.id: row for row in vehicles_result.all()}

        records_result = await self.db.execute(
            select(
                AudienceRecord.vehicle_id,
                AudienceRecord.reference_date,
                AudienceRecord.value,
                AudienceRecord.metric_type,
                AudienceRecord.source,
            )
            .where(AudienceRecord.vehicle_id.in_(vehicle_ids))
            .order_by(AudienceRecord.vehicle_id, AudienceRecord.reference_date)
        )

        # Agrupa por veículo
        history: dict[uuid.UUID, list[AudiencePoint]] = {vid: [] for vid in vehicle_ids}
        for row in records_result.all():
            history[row.vehicle_id].append(
                AudiencePoint(
                    reference_date=row.reference_date,
                    value=row.value,
                    metric_type=row.metric_type.value if hasattr(row.metric_type, "value") else str(row.metric_type),
                    source=row.source.value if hasattr(row.source, "value") else str(row.source),
                )
            )

        return [
            VehicleAudienceHistory(
                vehicle_id=vid,
                name=vehicles[vid].name if vid in vehicles else str(vid),
                vehicle_type=(
                    vehicles[vid].vehicle_type.value
                    if vid in vehicles and hasattr(vehicles[vid].vehicle_type, "value")
                    else str(vehicles.get(vid, {}).get("vehicle_type", ""))
                ),
                records=history[vid],
            )
            for vid in vehicle_ids
        ]
