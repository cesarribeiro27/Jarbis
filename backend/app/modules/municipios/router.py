from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User
from app.core.pagination import PaginatedResponse, PaginationParams

from .models import Municipio
from .schemas import MunicipioResponse

router = APIRouter(prefix="/municipios", tags=["Municípios"])


@router.get("", response_model=PaginatedResponse[MunicipioResponse])
async def search_municipios(
    q: str | None = Query(default=None, description="Busca por nome"),
    uf: str | None = Query(default=None, description="Filtrar por UF"),
    regiao: str | None = Query(default=None, description="Filtrar por região"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Busca municípios brasileiros com dados populacionais do IBGE.
    Útil para calcular o universo de audiência de uma praça.
    """
    stmt = select(Municipio)

    if q:
        stmt = stmt.where(Municipio.nome.ilike(f"%{q}%"))
    if uf:
        stmt = stmt.where(Municipio.uf == uf.upper())
    if regiao:
        stmt = stmt.where(Municipio.regiao.ilike(f"%{regiao}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt)

    pagination = PaginationParams(page=page, page_size=page_size)
    stmt = stmt.order_by(Municipio.uf, Municipio.nome)
    stmt = stmt.offset(pagination.offset).limit(pagination.limit)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return PaginatedResponse.create(
        items=[MunicipioResponse.model_validate(m) for m in items],
        total=total or 0,
        params=pagination,
    )


@router.get("/bulk", response_model=list[MunicipioResponse])
async def get_municipios_bulk(
    codes: str = Query(description="Códigos IBGE separados por vírgula, ex: 3550308,3304557"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna múltiplos municípios por lista de códigos IBGE (máx 200)."""
    codigo_list = [c.strip() for c in codes.split(",") if c.strip()][:200]
    if not codigo_list:
        return []
    result = await db.execute(
        select(Municipio).where(Municipio.codigo_ibge.in_(codigo_list))
    )
    return [MunicipioResponse.model_validate(m) for m in result.scalars().all()]


@router.get("/{codigo_ibge}", response_model=MunicipioResponse)
async def get_municipio(
    codigo_ibge: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna um município pelo código IBGE de 7 dígitos."""
    result = await db.execute(
        select(Municipio).where(Municipio.codigo_ibge == codigo_ibge)
    )
    municipio = result.scalar_one_or_none()
    if not municipio:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Município", codigo_ibge)
    return MunicipioResponse.model_validate(municipio)
