"""
Endpoints de Veículos de Mídia.

GET    /vehicles              — Lista e busca veículos com filtros
POST   /vehicles              — Cria novo veículo
GET    /vehicles/{id}         — Detalhes de um veículo
PUT    /vehicles/{id}         — Atualiza um veículo
GET    /vehicles/{id}/audience           — Lista registros de audiência
POST   /vehicles/{id}/audience           — Adiciona registro de audiência
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse, PaginationParams
from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User
from app.modules.vehicles.enums import CoverageScope, MediaSegment, VehicleStatus, VehicleType
from app.modules.vehicles.schemas import (
    AudienceRecordCreateRequest,
    AudienceRecordResponse,
    VehicleCreateRequest,
    VehicleFilterParams,
    VehicleResponse,
    VehicleSummary,
    VehicleUpdateRequest,
)
from app.modules.vehicles.service import VehicleService
from app.modules.vehicles.enrichment import enrich_vehicle

router = APIRouter(prefix="/vehicles", tags=["Veículos"])


@router.get("", response_model=PaginatedResponse[VehicleSummary])
async def search_vehicles(
    # Parâmetros de busca
    q: str | None = Query(default=None, description="Busca por nome do veículo"),
    vehicle_type: list[VehicleType] | None = Query(default=None, description="Filtrar por tipo(s)"),
    segment: list[MediaSegment] | None = Query(default=None, description="Filtrar por segmento(s)"),
    coverage_scope: CoverageScope | None = Query(default=None),
    state: str | None = Query(default=None, description="Filtrar por UF (ex: SP, RJ)"),
    city_ibge: str | None = Query(default=None, description="Código IBGE do município coberto"),
    min_coverage_km: float | None = Query(default=None, description="Raio mínimo de cobertura em km"),
    status: VehicleStatus = Query(default=VehicleStatus.ATIVO),
    parent_company: str | None = Query(default=None),
    is_verified: bool | None = Query(default=None),
    # Paginação
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=1000),
    # Auth
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Busca veículos de comunicação com filtros combinados.

    Exemplos de uso:
    - `?q=globo` — busca por nome
    - `?vehicle_type=TV_ABERTA&vehicle_type=TV_PAGA` — múltiplos tipos
    - `?state=SP&segment=JORNALISMO` — veículos jornalísticos em SP
    """
    filters = VehicleFilterParams(
        q=q,
        vehicle_type=vehicle_type,
        segment=segment,
        coverage_scope=coverage_scope,
        state=state,
        city_ibge=city_ibge,
        min_coverage_km=min_coverage_km,
        status=status,
        parent_company=parent_company,
        is_verified=is_verified,
    )
    pagination = PaginationParams(page=page, page_size=page_size)
    service = VehicleService(db)
    return await service.search(filters, pagination)


@router.post("", response_model=VehicleResponse, status_code=201)
async def create_vehicle(
    data: VehicleCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cria um novo veículo de comunicação na base de dados Lumetra."""
    service = VehicleService(db)
    return await service.create(data)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna os detalhes completos de um veículo."""
    service = VehicleService(db)
    return await service.get_by_id(vehicle_id)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: uuid.UUID,
    data: VehicleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Atualiza os dados de um veículo."""
    service = VehicleService(db)
    return await service.update(vehicle_id, data)


@router.post("/{vehicle_id}/enrich", response_model=dict)
async def enrich_vehicle_from_cnpj(
    vehicle_id: uuid.UUID,
    overwrite: bool = Query(default=False, description="Sobrescreve dados existentes"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Enriquece os dados do veículo consultando a Brasil API com o CNPJ cadastrado.
    Preenche automaticamente telefone, e-mail e nome fantasia.
    """
    return await enrich_vehicle(vehicle_id, db, overwrite=overwrite)


@router.get("/{vehicle_id}/audience", response_model=list[AudienceRecordResponse])
async def get_vehicle_audience(
    vehicle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna todos os registros de audiência de um veículo, ordenados por data."""
    service = VehicleService(db)
    return await service.get_audience_records(vehicle_id)


@router.post("/{vehicle_id}/audience", response_model=AudienceRecordResponse, status_code=201)
async def add_audience_record(
    vehicle_id: uuid.UUID,
    data: AudienceRecordCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Adiciona um novo registro de audiência a um veículo."""
    service = VehicleService(db)
    return await service.add_audience_record(vehicle_id, data)
