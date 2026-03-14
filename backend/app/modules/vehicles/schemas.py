"""
Schemas de Veículos — contratos de entrada e saída da API.

Separamos em três grupos:
- Request: dados recebidos na criação/atualização
- Response: dados retornados pela API
- Filter: parâmetros de busca e filtragem
"""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.modules.vehicles.enums import (
    AudienceMetricType,
    AudienceSource,
    CoverageScope,
    MediaSegment,
    VehicleStatus,
    VehicleType,
)


# =============================================================================
# Veículos
# =============================================================================

class VehicleCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=300)
    trade_name: str | None = Field(default=None, max_length=300)
    vehicle_type: VehicleType
    segment: MediaSegment = MediaSegment.GENERALISTA
    coverage_scope: CoverageScope = CoverageScope.NACIONAL
    coverage_states: list[str] | None = None
    description: str | None = None
    website_url: str | None = None
    logo_url: str | None = None
    parent_company: str | None = None
    founded_year: int | None = Field(default=None, ge=1800, le=2100)
    cnpj: str | None = None
    phone: str | None = None
    email: str | None = None
    extra_metadata: dict[str, Any] | None = None

    @field_validator("coverage_states")
    @classmethod
    def validate_states(cls, v: list[str] | None) -> list[str] | None:
        """Valida que os estados são UFs brasileiras válidas."""
        if v is None:
            return v
        valid_ufs = {
            "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
            "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
            "SP","SE","TO"
        }
        invalid = [uf for uf in v if uf.upper() not in valid_ufs]
        if invalid:
            raise ValueError(f"UFs inválidas: {invalid}")
        return [uf.upper() for uf in v]


class VehicleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=300)
    trade_name: str | None = None
    segment: MediaSegment | None = None
    status: VehicleStatus | None = None
    coverage_scope: CoverageScope | None = None
    coverage_states: list[str] | None = None
    description: str | None = None
    website_url: str | None = None
    logo_url: str | None = None
    parent_company: str | None = None
    founded_year: int | None = None
    cnpj: str | None = None
    phone: str | None = None
    email: str | None = None
    extra_metadata: dict[str, Any] | None = None


class VehicleResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    trade_name: str | None
    vehicle_type: VehicleType
    segment: MediaSegment
    status: VehicleStatus
    coverage_scope: CoverageScope
    coverage_states: list[str] | None
    coverage_cities: list[str] | None
    description: str | None
    website_url: str | None
    logo_url: str | None
    parent_company: str | None
    founded_year: int | None
    cnpj: str | None
    phone: str | None
    email: str | None
    extra_metadata: dict[str, Any] | None
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VehicleSummary(BaseModel):
    """Versão resumida para listagens e resultados de busca."""
    id: uuid.UUID
    name: str
    slug: str
    trade_name: str | None
    vehicle_type: VehicleType
    segment: MediaSegment
    status: VehicleStatus
    coverage_scope: CoverageScope
    coverage_states: list[str] | None
    coverage_cities: list[str] | None
    parent_company: str | None
    is_verified: bool
    extra_metadata: dict[str, Any] | None
    populacao_cobertura: int | None = None

    model_config = {"from_attributes": True}


# =============================================================================
# Filtros de busca
# =============================================================================

class VehicleFilterParams(BaseModel):
    """Parâmetros de filtro para busca de veículos."""
    q: str | None = Field(default=None, description="Busca por nome do veículo")
    vehicle_type: list[VehicleType] | None = Field(default=None, description="Filtrar por tipo(s)")
    segment: list[MediaSegment] | None = Field(default=None, description="Filtrar por segmento(s)")
    coverage_scope: CoverageScope | None = None
    state: str | None = Field(default=None, description="Filtrar por UF")
    city_ibge: str | None = Field(default=None, description="Filtrar por código IBGE do município coberto")
    min_coverage_km: float | None = Field(default=None, description="Raio mínimo de cobertura em km (rádio)")
    status: VehicleStatus = Field(default=VehicleStatus.ATIVO)
    parent_company: str | None = None
    is_verified: bool | None = None


# =============================================================================
# Audiência
# =============================================================================

class AudienceRecordCreateRequest(BaseModel):
    metric_type: AudienceMetricType
    source: AudienceSource
    reference_date: date
    period_type: str = Field(default="monthly", pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    value: float = Field(ge=0)
    universe: float | None = Field(default=None, ge=0)
    metrics: dict[str, Any] | None = None
    notes: str | None = None


class AudienceRecordResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    metric_type: AudienceMetricType
    source: AudienceSource
    reference_date: date
    period_type: str
    value: float
    universe: float | None
    metrics: dict[str, Any] | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
