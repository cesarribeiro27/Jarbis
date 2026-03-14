"""
Serviço de Veículos.

Contém toda a lógica de negócio: criação, atualização, busca com filtros
e paginação. Separado do router para facilitar testes unitários.
"""

import uuid

from slugify import slugify
from sqlalchemy import Float, cast, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.municipios.models import Municipio
from app.core.pagination import PaginatedResponse, PaginationParams
from app.modules.vehicles.enums import VehicleStatus
from app.modules.vehicles.models import AudienceRecord, Vehicle
from app.modules.vehicles.schemas import (
    AudienceRecordCreateRequest,
    AudienceRecordResponse,
    VehicleCreateRequest,
    VehicleFilterParams,
    VehicleResponse,
    VehicleSummary,
    VehicleUpdateRequest,
)


class VehicleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: VehicleCreateRequest) -> VehicleResponse:
        """Cria um novo veículo de comunicação."""
        slug = await self._generate_unique_slug(data.name)

        vehicle = Vehicle(
            name=data.name,
            slug=slug,
            trade_name=data.trade_name,
            vehicle_type=data.vehicle_type,
            segment=data.segment,
            coverage_scope=data.coverage_scope,
            coverage_states=data.coverage_states,
            description=data.description,
            website_url=str(data.website_url) if data.website_url else None,
            logo_url=str(data.logo_url) if data.logo_url else None,
            parent_company=data.parent_company,
            founded_year=data.founded_year,
            cnpj=data.cnpj,
            phone=data.phone,
            email=data.email,
            extra_metadata=data.extra_metadata,
        )
        self.db.add(vehicle)
        await self.db.flush()
        await self.db.refresh(vehicle)
        return VehicleResponse.model_validate(vehicle)

    async def get_by_id(self, vehicle_id: uuid.UUID) -> VehicleResponse:
        """Retorna um veículo pelo ID."""
        vehicle = await self.db.get(Vehicle, vehicle_id)
        if not vehicle:
            raise NotFoundError("Veículo", str(vehicle_id))
        return VehicleResponse.model_validate(vehicle)

    async def get_by_slug(self, slug: str) -> VehicleResponse:
        """Retorna um veículo pelo slug (URL amigável)."""
        vehicle = await self.db.scalar(select(Vehicle).where(Vehicle.slug == slug))
        if not vehicle:
            raise NotFoundError("Veículo", slug)
        return VehicleResponse.model_validate(vehicle)

    async def update(self, vehicle_id: uuid.UUID, data: VehicleUpdateRequest) -> VehicleResponse:
        """Atualiza os dados de um veículo."""
        vehicle = await self.db.get(Vehicle, vehicle_id)
        if not vehicle:
            raise NotFoundError("Veículo", str(vehicle_id))

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(vehicle, field, value)

        await self.db.flush()
        await self.db.refresh(vehicle)
        return VehicleResponse.model_validate(vehicle)

    async def search(
        self,
        filters: VehicleFilterParams,
        pagination: PaginationParams,
    ) -> PaginatedResponse[VehicleSummary]:
        """
        Busca veículos com filtros e paginação.

        Suporta:
        - Busca textual por nome (ilike)
        - Filtro por tipo(s) de mídia
        - Filtro por segmento editorial
        - Filtro por cobertura geográfica
        - Filtro por UF
        - Filtro por status
        """
        query = select(Vehicle)

        # Busca textual
        if filters.q:
            search_term = f"%{filters.q}%"
            query = query.where(
                or_(
                    Vehicle.name.ilike(search_term),
                    Vehicle.trade_name.ilike(search_term),
                    Vehicle.parent_company.ilike(search_term),
                )
            )

        # Filtros por enums
        if filters.vehicle_type:
            query = query.where(Vehicle.vehicle_type.in_(filters.vehicle_type))
        if filters.segment:
            query = query.where(Vehicle.segment.in_(filters.segment))
        if filters.coverage_scope:
            query = query.where(Vehicle.coverage_scope == filters.coverage_scope)
        if filters.status:
            query = query.where(Vehicle.status == filters.status)
        if filters.parent_company:
            query = query.where(Vehicle.parent_company.ilike(f"%{filters.parent_company}%"))
        if filters.is_verified is not None:
            query = query.where(Vehicle.is_verified == filters.is_verified)

        # Filtro por UF (busca dentro do array JSONB)
        if filters.state:
            query = query.where(
                Vehicle.coverage_states.contains([filters.state.upper()])
            )

        # Filtro por município (código IBGE no array coverage_cities)
        if filters.city_ibge:
            query = query.where(
                Vehicle.coverage_cities.contains([filters.city_ibge])
            )

        # Filtro por raio mínimo de cobertura em km (campo hci_km no metadata JSONB)
        if filters.min_coverage_km is not None:
            query = query.where(
                cast(Vehicle.extra_metadata["hci_km"].astext, Float) >= filters.min_coverage_km
            )

        # Conta total antes de paginar
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Aplica ordenação e paginação
        query = (
            query
            .order_by(Vehicle.name)
            .offset(pagination.offset)
            .limit(pagination.limit)
        )
        result = await self.db.execute(query)
        vehicles = result.scalars().all()

        # Calcula população coberta em bulk: busca municípios de todas as vehicles de uma vez
        all_codes: set[str] = set()
        for v in vehicles:
            if v.coverage_cities:
                all_codes.update(v.coverage_cities)

        pop_by_code: dict[str, int] = {}
        if all_codes:
            pop_rows = await self.db.execute(
                select(Municipio.codigo_ibge, Municipio.populacao_2022)
                .where(Municipio.codigo_ibge.in_(all_codes))
            )
            for codigo, pop in pop_rows:
                if pop:
                    pop_by_code[codigo] = pop

        items = []
        for v in vehicles:
            summary = VehicleSummary.model_validate(v)
            if v.coverage_cities:
                summary.populacao_cobertura = sum(
                    pop_by_code.get(c, 0) for c in v.coverage_cities
                )
            items.append(summary)

        return PaginatedResponse.create(items=items, total=total or 0, params=pagination)

    # -------------------------------------------------------------------------
    # Audiência
    # -------------------------------------------------------------------------

    async def add_audience_record(
        self,
        vehicle_id: uuid.UUID,
        data: AudienceRecordCreateRequest,
    ) -> AudienceRecordResponse:
        """Adiciona um registro de audiência a um veículo."""
        vehicle = await self.db.get(Vehicle, vehicle_id)
        if not vehicle:
            raise NotFoundError("Veículo", str(vehicle_id))

        record = AudienceRecord(
            vehicle_id=vehicle_id,
            metric_type=data.metric_type,
            source=data.source,
            reference_date=data.reference_date,
            period_type=data.period_type,
            value=data.value,
            universe=data.universe,
            metrics=data.metrics,
            notes=data.notes,
        )
        self.db.add(record)
        await self.db.flush()
        await self.db.refresh(record)
        return AudienceRecordResponse.model_validate(record)

    async def get_audience_records(
        self,
        vehicle_id: uuid.UUID,
    ) -> list[AudienceRecordResponse]:
        """Retorna todos os registros de audiência de um veículo."""
        vehicle = await self.db.get(Vehicle, vehicle_id)
        if not vehicle:
            raise NotFoundError("Veículo", str(vehicle_id))

        result = await self.db.execute(
            select(AudienceRecord)
            .where(AudienceRecord.vehicle_id == vehicle_id)
            .order_by(AudienceRecord.reference_date.desc())
        )
        records = result.scalars().all()
        return [AudienceRecordResponse.model_validate(r) for r in records]

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    async def _generate_unique_slug(self, name: str) -> str:
        """Gera um slug único, adicionando sufixo numérico se necessário."""
        base_slug = slugify(name)
        slug = base_slug
        counter = 1

        while await self.db.scalar(select(Vehicle).where(Vehicle.slug == slug)):
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug
