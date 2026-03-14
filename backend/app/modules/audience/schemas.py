from datetime import date
from uuid import UUID

from pydantic import BaseModel


class VehicleRankingItem(BaseModel):
    id: UUID
    name: str
    vehicle_type: str
    coverage_states: list[str] | None
    metric_type: str
    avg_value: float
    record_count: int


class RankingResponse(BaseModel):
    items: list[VehicleRankingItem]
    total: int


class AudiencePoint(BaseModel):
    reference_date: date
    value: float
    metric_type: str
    source: str


class VehicleAudienceHistory(BaseModel):
    vehicle_id: UUID
    name: str
    vehicle_type: str
    records: list[AudiencePoint]
