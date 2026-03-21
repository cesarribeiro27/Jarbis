"""
Endpoints de Relatórios — criação, consulta e compartilhamento de relatórios.

POST   /reports                         — cria relatório
GET    /reports                         — lista relatórios do tenant
GET    /reports/{id}                    — detalhe do relatório
PUT    /reports/{id}                    — atualiza relatório
DELETE /reports/{id}                    — remove relatório
POST   /reports/{id}/share              — gera link de compartilhamento
GET    /reports/public/{token}          — acesso público via token
GET    /reports/data/{source}           — dados de uma fonte pré-definida (legado)

GET    /reports/datasets                — lista datasets do tenant
POST   /reports/datasets/upload         — upload CSV/Excel
POST   /reports/datasets/api            — cria dataset via API
POST   /reports/datasets/{id}/sync      — re-sincroniza dataset de API
DELETE /reports/datasets/{id}           — remove dataset
GET    /reports/datasets/{id}/query     — consulta dataset com agregação
"""

import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set, get_redis
from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user, get_effective_tenant_id
from app.modules.tenants.models import User

from app.modules.billing.guards import (
    check_ai_query_limit,
    check_alert_limit,
    check_dashboard_limit,
    check_dataset_limit,
    check_feature_allowed,
)
from app.modules.tenants.models import Tenant

from .dataset_models import ReportDataset
from .dataset_service import DatasetService
from .query_log_models import QueryLog
from .warp_cache import warp_get_rows, warp_set_rows, warp_invalidate, warp_status as _warp_status
from .schemas import (
    ReportCreate,
    ReportResponse,
    ReportSummary,
    ReportUpdate,
    ShareResponse,
)
from .service import ReportService


# ---------------------------------------------------------------------------
# Dataset schemas (inline para evitar arquivo extra)
# ---------------------------------------------------------------------------

class DatasetSummary(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    columns: list[str]
    row_count: int
    column_types: dict | None = None
    is_demo: bool = False
    api_url: str | None = None
    last_synced_at: str | None = None
    refresh_interval_minutes: int | None = None
    next_refresh_at: str | None = None
    computed_columns: list[dict] = []

    model_config = {"from_attributes": True}


class ComputedColumnCreate(BaseModel):
    name: str
    expression: str
    refs: list[str] = []


class ComputedColumnResponse(BaseModel):
    name: str
    expression: str
    refs: list[str] = []


class ApiDatasetCreate(BaseModel):
    name: str
    api_url: str
    method: str = "GET"
    headers: dict | None = None          # frontend envia como "headers"
    api_headers: dict | None = None      # alias de compatibilidade
    body: str | None = None
    api_data_path: str | None = None
    refresh_interval_minutes: int | None = None
    sync_mode: str = "replace"           # replace | append

    @property
    def resolved_headers(self) -> dict | None:
        return self.headers or self.api_headers


class DbDatasetCreate(BaseModel):
    name: str
    db_type: str  # postgresql | mysql
    host: str
    port: int = 5432
    database: str
    username: str
    password: str
    query: str

router = APIRouter(prefix="/reports", tags=["Reports"])

_CACHE_TTL = 300  # 5 minutos


def _make_cache_key(dataset_id: str, query_params: dict, version: str = "") -> str:
    """Gera chave MD5 determinística para cache de query de dataset.

    O campo `version` permite invalidar todo o cache de um dataset de uma vez:
    basta mudar a versão armazenada em Redis (chave jarbis:ds_version:{dataset_id}).
    """
    params_str = json.dumps(query_params, sort_keys=True, default=str)
    h = hashlib.md5(f"query:{dataset_id}:{version}:{params_str}".encode()).hexdigest()
    return f"jarbis:query:{h}"


async def _get_dataset_version(redis, dataset_id: str) -> str:
    """Retorna a versão atual do dataset (usada para invalidação de cache)."""
    key = f"jarbis:ds_version:{dataset_id}"
    version = await redis.get(key)
    return version or "0"


async def _bump_dataset_version(redis, dataset_id: str) -> None:
    """Incrementa a versão do dataset, invalidando todo o cache de queries associado."""
    key = f"jarbis:ds_version:{dataset_id}"
    await redis.incr(key)
    # Mantém a chave de versão por 24h para não acumular entradas obsoletas
    await redis.expire(key, 86400)


# ---------------------------------------------------------------------------
# Authenticated endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=ReportResponse,
    status_code=201,
    summary="Cria um novo relatório",
)
async def create_report(
    data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    await check_dashboard_limit(db, current_user.tenant_id, tenant.plan if tenant else "free", tenant.addon_packs if tenant else 0)
    service = ReportService(db)
    report = await service.create(current_user.tenant_id, data)
    return report


@router.get(
    "",
    response_model=list[ReportSummary],
    summary="Lista relatórios do tenant",
)
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ReportService(db)
    reports = await service.list(current_user.tenant_id)
    return [ReportSummary(**r) for r in reports]


@router.get(
    "/data/{source}",
    summary="Dados de uma fonte para widgets",
)
async def get_data_source(
    source: str,
    date_from: str | None = None,
    date_to: str | None = None,
    meio: str | None = None,
    anunciante: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna dados no formato [{label, value}] prontos para uso em widgets de gráfico.

    Fontes disponíveis: items_by_meio, investment_by_meio, investment_by_client,
    investment_by_month, top_vehicles, material_by_status, pi_by_status,
    items_by_uf, vehicles_by_type, vehicles_by_uf, vehicles_by_status,
    municipios_by_regiao.
    """
    filters = {}
    if date_from:
        filters["date_from"] = date_from
    if date_to:
        filters["date_to"] = date_to
    if meio:
        filters["meio"] = meio
    if anunciante:
        filters["anunciante"] = anunciante

    service = ReportService(db)
    items = await service.get_data_source(source, current_user.tenant_id, filters=filters)
    return items


# ---------------------------------------------------------------------------
# Public endpoint (no auth) — MUST come before /{report_id} to avoid capture
# ---------------------------------------------------------------------------


@router.get(
    "/public/{token}",
    response_model=ReportResponse,
    summary="Acesso público ao relatório via token (sem autenticação)",
)
async def get_public_report(token: str, db: AsyncSession = Depends(get_db)):
    """
    Endpoint público acessado pelo link compartilhado.
    Incrementa o contador de visualizações a cada acesso.
    """
    service = ReportService(db)
    report = await service.get_public(token)
    if not report:
        raise HTTPException(status_code=404, detail="Link inválido ou expirado")
    tenant = await db.scalar(select(Tenant).where(Tenant.id == report.tenant_id))
    check_feature_allowed("embed", tenant.plan if tenant else "free")
    return report


@router.get(
    "/public/{token}/datasets/{dataset_id}/query",
    summary="Query pública de dataset via share token (sem autenticação)",
)
async def public_query_dataset(
    token: str,
    dataset_id: uuid.UUID,
    label_col: str,
    value_col: str,
    agg: str = "sum",
    filter_col: str | None = None,
    filter_val: str | None = None,
    date_col: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Permite que páginas públicas (embed/share) consultem datasets sem JWT."""
    report_service = ReportService(db)
    report = await report_service.get_public_no_increment(token)
    if not report:
        raise HTTPException(status_code=404, detail="Link inválido ou expirado")

    query_params = {
        "label_col": label_col, "value_col": value_col, "agg": agg,
        "filter_col": filter_col, "filter_val": filter_val,
        "date_col": date_col, "date_from": date_from, "date_to": date_to,
        "tenant_id": str(report.tenant_id),
    }

    redis = get_redis()
    try:
        version = await _get_dataset_version(redis, str(dataset_id))
        cache_key = _make_cache_key(str(dataset_id), query_params, version)

        # 1. Check query cache (sem DB)
        cached = await cache_get(redis, cache_key)
        if cached is not None:
            return JSONResponse(content=cached, headers={"Cache-Control": f"public, max-age={_CACHE_TTL}"})

        # 2. Full DB load (popula Warp para próximas queries)
        dataset_service = DatasetService(db)
        ds = await dataset_service.get(dataset_id, report.tenant_id)
        if not ds:
            raise HTTPException(status_code=404, detail="Dataset não encontrado")

        from .dataset_service import _apply_computed_columns
        computed = getattr(ds, 'computed_columns', None) or []
        warp_rows = _apply_computed_columns(ds.rows or [], computed) if computed else (ds.rows or [])
        await warp_set_rows(redis, str(dataset_id), warp_rows)

        result = dataset_service.query(ds, label_col, value_col, agg, filter_col, filter_val, date_col, date_from, date_to)
        await cache_set(redis, cache_key, result, ttl=_CACHE_TTL)
        return JSONResponse(content=result, headers={"Cache-Control": f"public, max-age={_CACHE_TTL}"})
    finally:
        await redis.aclose()


# ---------------------------------------------------------------------------
# Query Logs
# ---------------------------------------------------------------------------


@router.get("/query-logs")
async def list_query_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(QueryLog)
        .where(QueryLog.tenant_id == user.tenant_id)
        .order_by(QueryLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "dataset_id": str(l.dataset_id) if l.dataset_id else None,
            "dataset_name": l.dataset_name,
            "query_type": l.query_type,
            "duration_ms": l.duration_ms,
            "rows_returned": l.rows_returned,
            "status": l.status,
            "error_msg": l.error_msg,
            "cached": l.cached,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


# ---------------------------------------------------------------------------
# Datasets — fontes de dados gerenciadas pelo usuário
# ---------------------------------------------------------------------------


@router.get(
    "/datasets",
    response_model=list[DatasetSummary],
    summary="Lista datasets do tenant",
)
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    effective_tenant_id: uuid.UUID = Depends(get_effective_tenant_id),
):
    service = DatasetService(db)
    # Se em contexto de sub-org, une datasets da sub-org + datasets do tenant raiz (compartilhados)
    if effective_tenant_id != current_user.tenant_id:
        suborg_datasets = await service.list(effective_tenant_id)
        root_datasets = await service.list(current_user.tenant_id)
        seen = set()
        datasets = []
        for ds in suborg_datasets + root_datasets:
            if ds.id not in seen:
                seen.add(ds.id)
                datasets.append(ds)
    else:
        datasets = await service.list(current_user.tenant_id)
    from .query_engine import detect_column_types
    return [
        DatasetSummary(
            id=ds.id,
            name=ds.name,
            type=ds.type,
            columns=ds.columns or [],
            row_count=ds.row_count,
            column_types=detect_column_types(ds.rows or [], sample_size=30) if ds.rows else {},
            is_demo=bool(ds.is_demo),
            api_url=ds.api_url,
            last_synced_at=ds.last_synced_at.isoformat() if ds.last_synced_at else None,
            refresh_interval_minutes=ds.refresh_interval_minutes,
            next_refresh_at=ds.next_refresh_at.isoformat() if ds.next_refresh_at else None,
            computed_columns=ds.computed_columns or [],
        )
        for ds in datasets
    ]


@router.get(
    "/onboarding-dataset",
    response_model=DatasetSummary,
    summary="Retorna (ou cria) o dataset de demonstração do tenant",
)
async def get_onboarding_dataset(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from .onboarding import ensure_onboarding_dataset
    from .query_engine import detect_column_types
    ds = await ensure_onboarding_dataset(current_user.tenant_id, db)
    return DatasetSummary(
        id=ds.id,
        name=ds.name,
        type=ds.type,
        columns=ds.columns or [],
        row_count=ds.row_count,
        column_types=detect_column_types(ds.rows or [], sample_size=30) if ds.rows else {},
        is_demo=True,
    )


@router.get(
    "/datasets/google-sheets-sheets",
    summary="Lista abas de uma planilha Google Sheets pública",
)
async def get_google_sheets_sheets(
    url: str = Query(..., description="URL pública do Google Sheets"),
    current_user: User = Depends(get_current_active_user),
):
    import re
    m = re.search(r"spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    if not m:
        raise HTTPException(status_code=400, detail="URL do Google Sheets inválida")
    spreadsheet_id = m.group(1)
    export_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=xlsx"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            resp = await client.get(export_url)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Não foi possível baixar a planilha. Verifique se está pública.")
        import io
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(resp.content), read_only=True)
        sheets = wb.sheetnames
        wb.close()
        return {"sheets": sheets}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler planilha: {e}")


@router.post(
    "/datasets/excel-sheets",
    summary="Lista abas de um arquivo Excel sem criar dataset",
)
async def get_excel_sheets(
    file: Annotated[UploadFile, File()],
    current_user: User = Depends(get_current_active_user),
):
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 20 MB)")
    try:
        import io
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
        sheets = wb.sheetnames
        wb.close()
        return {"sheets": sheets}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler arquivo: {e}")


@router.post(
    "/datasets/upload",
    response_model=DatasetSummary,
    status_code=201,
    summary="Upload CSV ou Excel para criar dataset",
)
async def upload_dataset(
    file: Annotated[UploadFile, File()],
    sheet_name: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    effective_tenant_id: uuid.UUID = Depends(get_effective_tenant_id),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    await check_dataset_limit(db, current_user.tenant_id, tenant.plan if tenant else "free", tenant.addon_packs if tenant else 0)
    filename = file.filename or "dataset"
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 20 MB)")
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    service = DatasetService(db)
    ds = await service.create_from_file(effective_tenant_id, name, filename, content, sheet_name=sheet_name)
    return DatasetSummary(
        id=ds.id, name=ds.name, type=ds.type,
        columns=ds.columns or [], row_count=ds.row_count,
    )


@router.post(
    "/datasets/api",
    response_model=DatasetSummary,
    status_code=201,
    summary="Cria dataset a partir de uma API externa",
)
async def create_api_dataset(
    body: ApiDatasetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    effective_tenant_id: uuid.UUID = Depends(get_effective_tenant_id),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    await check_dataset_limit(db, current_user.tenant_id, tenant.plan if tenant else "free", tenant.addon_packs if tenant else 0)
    service = DatasetService(db)
    try:
        ds = await service.create_from_api(
            effective_tenant_id,
            body.name,
            body.api_url,
            body.resolved_headers,
            body.api_data_path,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao buscar API: {e}")

    # Salva sync_mode e refresh schedule se informados
    ds.sync_mode = body.sync_mode or "replace"
    if body.refresh_interval_minutes:
        from datetime import timedelta
        ds.refresh_interval_minutes = body.refresh_interval_minutes
        ds.next_refresh_at = datetime.now(timezone.utc) + timedelta(minutes=body.refresh_interval_minutes)
    await db.commit()
    await db.refresh(ds)

    return DatasetSummary(
        id=ds.id, name=ds.name, type=ds.type,
        columns=ds.columns or [], row_count=ds.row_count,
        api_url=ds.api_url,
        last_synced_at=ds.last_synced_at.isoformat() if ds.last_synced_at else None,
        refresh_interval_minutes=ds.refresh_interval_minutes,
    )


@router.post(
    "/datasets/database/test",
    summary="Testa conexão com banco de dados externo",
)
async def test_db_connection(
    body: DbDatasetCreate,
    current_user=Depends(get_current_active_user),
):
    from .connectors.db_connector import test_connection
    result = await test_connection(body.db_type, body.host, body.port, body.database, body.username, body.password)
    return result


@router.post(
    "/datasets/database",
    status_code=201,
    summary="Cria dataset a partir de banco de dados externo (PostgreSQL/MySQL)",
)
async def create_db_dataset(
    body: DbDatasetCreate,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    await check_dataset_limit(db, current_user.tenant_id, tenant.plan if tenant else "free", tenant.addon_packs if tenant else 0)
    from .connectors.db_connector import encrypt_password, run_query
    rows = await run_query(body.db_type, body.host, body.port, body.database, body.username, body.password, body.query)

    from .dataset_service import _detect_columns, _coerce_row
    coerced = [_coerce_row(r) for r in rows]
    columns = _detect_columns(coerced)

    ds = ReportDataset(
        tenant_id=current_user.tenant_id,
        name=body.name,
        type="database",
        rows=coerced,
        columns=columns,
        row_count=len(coerced),
        db_type=body.db_type,
        db_host=body.host,
        db_port=body.port,
        db_name=body.database,
        db_username=body.username,
        db_password_enc=encrypt_password(body.password),
        db_query=body.query,
    )
    db.add(ds)
    await db.commit()
    await db.refresh(ds)
    return {"id": str(ds.id), "name": ds.name, "row_count": ds.row_count, "columns": ds.columns}


@router.post(
    "/datasets/{dataset_id}/database/sync",
    summary="Re-sincroniza dataset de banco de dados externo",
)
async def sync_db_dataset(
    dataset_id: uuid.UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm.attributes import flag_modified
    from .connectors.db_connector import decrypt_password, run_query
    from .dataset_service import _detect_columns, _coerce_row

    ds = await db.scalar(select(ReportDataset).where(
        ReportDataset.id == dataset_id, ReportDataset.tenant_id == current_user.tenant_id
    ))
    if not ds or ds.type != "database":
        raise HTTPException(status_code=404, detail="Dataset de banco não encontrado")

    password = decrypt_password(ds.db_password_enc)
    rows = await run_query(ds.db_type, ds.db_host, ds.db_port, ds.db_name, ds.db_username, password, ds.db_query)
    coerced = [_coerce_row(r) for r in rows]

    ds.rows = coerced
    ds.columns = _detect_columns(coerced)
    ds.row_count = len(coerced)
    flag_modified(ds, 'rows')
    flag_modified(ds, 'columns')
    await db.commit()

    # Invalida Warp + versão de cache após sincronização
    try:
        redis = get_redis()
        try:
            await warp_invalidate(redis, str(dataset_id))
            await _bump_dataset_version(redis, str(dataset_id))
        finally:
            await redis.aclose()
    except Exception:
        pass

    return {"ok": True, "row_count": ds.row_count}


@router.post(
    "/datasets/{dataset_id}/sync",
    response_model=DatasetSummary,
    summary="Re-sincroniza dataset de API",
)
async def sync_dataset(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DatasetService(db)
    try:
        ds = await service.sync_api(dataset_id, current_user.tenant_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao sincronizar: {e}")
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado ou não é do tipo API")

    # Invalida Warp + cache de queries deste dataset incrementando sua versão
    try:
        redis = get_redis()
        try:
            await warp_invalidate(redis, str(dataset_id))
            await _bump_dataset_version(redis, str(dataset_id))
        finally:
            await redis.aclose()
    except Exception:
        pass  # Falha no cache não deve bloquear a resposta

    return DatasetSummary(
        id=ds.id, name=ds.name, type=ds.type,
        columns=ds.columns or [], row_count=ds.row_count,
        api_url=ds.api_url,
        last_synced_at=ds.last_synced_at.isoformat() if ds.last_synced_at else None,
    )


class DatasetScheduleUpdate(BaseModel):
    refresh_interval_minutes: int | None  # None = disable


@router.patch("/datasets/{dataset_id}/schedule", summary="Configura refresh automático do dataset")
async def set_dataset_schedule(
    dataset_id: uuid.UUID,
    data: DatasetScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from datetime import datetime as _dt, timedelta as _td, timezone as _tz2
    svc = DatasetService(db)
    ds = await svc.get(dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    ds.refresh_interval_minutes = data.refresh_interval_minutes
    if data.refresh_interval_minutes:
        ds.next_refresh_at = _dt.now(_tz2.utc) + _td(minutes=data.refresh_interval_minutes)
    else:
        ds.next_refresh_at = None
    await db.commit()
    await db.refresh(ds)
    return {
        "id": str(ds.id),
        "refresh_interval_minutes": ds.refresh_interval_minutes,
        "next_refresh_at": ds.next_refresh_at.isoformat() if ds.next_refresh_at else None,
    }


@router.delete("/datasets/{dataset_id}", status_code=204, summary="Remove dataset")
async def delete_dataset(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DatasetService(db)
    deleted = await service.delete(dataset_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")


@router.get(
    "/datasets/{dataset_id}/query",
    summary="Consulta dataset com agregação — retorna [{label, value}]",
)
async def query_dataset(
    dataset_id: uuid.UUID,
    label_col: str,
    value_col: str,
    agg: str = "sum",
    filter_col: str | None = None,
    filter_val: str | None = None,
    date_col: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    effective_tenant_id: uuid.UUID = Depends(get_effective_tenant_id),
):
    query_params = {
        "label_col": label_col, "value_col": value_col, "agg": agg,
        "filter_col": filter_col, "filter_val": filter_val,
        "date_col": date_col, "date_from": date_from, "date_to": date_to,
        "tenant_id": str(effective_tenant_id),
    }

    redis = get_redis()
    try:
        version = await _get_dataset_version(redis, str(dataset_id))
        cache_key = _make_cache_key(str(dataset_id), query_params, version)

        # 1. Check query cache (sem DB)
        cached = await cache_get(redis, cache_key)
        if cached is not None:
            return cached

        # 2. Carrega dataset do DB (fallback para tenant raiz se suborg não tiver o dataset)
        service = DatasetService(db)
        ds = await service.get(dataset_id, effective_tenant_id)
        if not ds and effective_tenant_id != current_user.tenant_id:
            ds = await service.get(dataset_id, current_user.tenant_id)
        if not ds:
            raise HTTPException(status_code=404, detail="Dataset não encontrado")

        # 3. Popula Warp com rows pré-computadas (inclui computed_columns)
        from .dataset_service import _apply_computed_columns
        computed = getattr(ds, 'computed_columns', None) or []
        warp_rows = _apply_computed_columns(ds.rows or [], computed) if computed else (ds.rows or [])
        await warp_set_rows(redis, str(dataset_id), warp_rows)

        result = service.query(ds, label_col, value_col, agg, filter_col, filter_val, date_col, date_from, date_to)
        await cache_set(redis, cache_key, result, ttl=_CACHE_TTL)
        return result
    finally:
        await redis.aclose()


# ---------------------------------------------------------------------------
# Query Engine v2 — motor de query estruturado
# ---------------------------------------------------------------------------

from .query_engine import QueryRequest, QueryResult, detect_column_types


@router.post(
    "/datasets/{dataset_id}/query",
    response_model=QueryResult,
    summary="Consulta dataset com motor de query estruturado (v2)",
)
async def query_dataset_v2(
    dataset_id: uuid.UUID,
    req: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    effective_tenant_id: uuid.UUID = Depends(get_effective_tenant_id),
):
    """
    Motor de query v2. Aceita dimensões, métricas, filtros, date_range,
    ordenação e limite. Retorna dados normalizados para qualquer visualização.
    """
    from .query_engine import execute_query
    query_params = {**req.model_dump(), "tenant_id": str(effective_tenant_id)}

    redis = get_redis()
    try:
        version = await _get_dataset_version(redis, str(dataset_id))
        cache_key = _make_cache_key(str(dataset_id), query_params, version)

        # 1. Check query cache (sem DB)
        cached = await cache_get(redis, cache_key)
        if cached is not None:
            return cached

        # 2. Check Warp rows (evita ler JSONB pesado do DB)
        warp_rows = await warp_get_rows(redis, str(dataset_id))
        if warp_rows is not None:
            # Valida dataset sem carregar rows (lightweight); fallback para tenant raiz se suborg não tiver
            ds_exists = await db.scalar(
                select(ReportDataset.id).where(
                    ReportDataset.id == dataset_id,
                    ReportDataset.tenant_id.in_(
                        [effective_tenant_id, current_user.tenant_id]
                    ),
                )
            )
            if ds_exists:
                try:
                    result = execute_query(warp_rows, req)
                    result_dict = result.model_dump() if hasattr(result, "model_dump") else result
                    await cache_set(redis, cache_key, result_dict, ttl=_CACHE_TTL)
                    return result_dict
                except Exception as exc:
                    import logging
                    logging.getLogger(__name__).error("execute_query (warp) failed: %s", exc, exc_info=True)
                    return {"data": [], "total_rows": 0, "columns": [], "compare_data": None}

        # 3. Full DB load (popula Warp para próximas queries); fallback para tenant raiz
        service = DatasetService(db)
        ds = await service.get(dataset_id, effective_tenant_id)
        if not ds and effective_tenant_id != current_user.tenant_id:
            ds = await service.get(dataset_id, current_user.tenant_id)
        if not ds:
            raise HTTPException(status_code=404, detail="Dataset não encontrado")

        from .dataset_service import _apply_computed_columns
        computed = getattr(ds, 'computed_columns', None) or []
        rows = _apply_computed_columns(ds.rows or [], computed) if computed else (ds.rows or [])
        try:
            await warp_set_rows(redis, str(dataset_id), rows)
        except Exception:
            pass  # Cache failure não deve derrubar a query

        try:
            result = execute_query(rows, req)
            result_dict = result.model_dump() if hasattr(result, "model_dump") else result
            await cache_set(redis, cache_key, result_dict, ttl=_CACHE_TTL)
            return result_dict
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("execute_query failed: %s", exc, exc_info=True)
            return {"data": [], "total_rows": 0, "columns": [], "compare_data": None}
    finally:
        await redis.aclose()


@router.get(
    "/datasets/{dataset_id}/warp-status",
    summary="Status do cache Warp para o dataset",
)
async def get_warp_status(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DatasetService(db)
    ds = await service.get(dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    redis = get_redis()
    try:
        status = await _warp_status(redis, str(dataset_id))
        return status
    finally:
        await redis.aclose()


@router.post(
    "/public/{token}/datasets/{dataset_id}/query",
    response_model=QueryResult,
    summary="Query pública v2 via share token (sem autenticação)",
)
async def public_query_dataset_v2(
    token: str,
    dataset_id: uuid.UUID,
    req: QueryRequest,
    db: AsyncSession = Depends(get_db),
):
    from .query_engine import execute_query
    report_service = ReportService(db)
    report = await report_service.get_public_no_increment(token)
    if not report:
        raise HTTPException(status_code=404, detail="Link inválido ou expirado")

    query_params = {**req.model_dump(), "tenant_id": str(report.tenant_id)}

    redis = get_redis()
    try:
        version = await _get_dataset_version(redis, str(dataset_id))
        cache_key = _make_cache_key(str(dataset_id), query_params, version)

        # 1. Check query cache (sem DB)
        cached = await cache_get(redis, cache_key)
        if cached is not None:
            return JSONResponse(content=cached, headers={"Cache-Control": f"public, max-age={_CACHE_TTL}"})

        # 2. Check Warp rows (evita ler JSONB pesado do DB)
        warp_rows = await warp_get_rows(redis, str(dataset_id))
        if warp_rows is not None:
            # Valida dataset sem carregar rows (lightweight)
            ds_exists = await db.scalar(
                select(ReportDataset.id).where(
                    ReportDataset.id == dataset_id,
                    ReportDataset.tenant_id == report.tenant_id,
                )
            )
            if ds_exists:
                result = execute_query(warp_rows, req)
                result_dict = result.model_dump() if hasattr(result, "model_dump") else result
                await cache_set(redis, cache_key, result_dict, ttl=_CACHE_TTL)
                return JSONResponse(
                    content=result_dict,
                    headers={"Cache-Control": f"public, max-age={_CACHE_TTL}"},
                )

        # 3. Full DB load (popula Warp para próximas queries)
        dataset_service = DatasetService(db)
        ds = await dataset_service.get(dataset_id, report.tenant_id)
        if not ds:
            raise HTTPException(status_code=404, detail="Dataset não encontrado")

        from .dataset_service import _apply_computed_columns
        computed = getattr(ds, 'computed_columns', None) or []
        rows = _apply_computed_columns(ds.rows or [], computed) if computed else (ds.rows or [])
        await warp_set_rows(redis, str(dataset_id), rows)

        result = execute_query(rows, req)
        result_dict = result.model_dump() if hasattr(result, "model_dump") else result
        await cache_set(redis, cache_key, result_dict, ttl=_CACHE_TTL)
        return JSONResponse(
            content=result_dict,
            headers={"Cache-Control": f"public, max-age={_CACHE_TTL}"},
        )
    finally:
        await redis.aclose()


@router.get(
    "/datasets/{dataset_id}/columns",
    summary="Retorna colunas do dataset com tipos detectados automaticamente",
)
async def get_dataset_columns(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna lista de colunas com tipo detectado: text | number | date.
    Usado pelo frontend para montar o painel de configuração de blocos.
    """
    service = DatasetService(db)
    ds = await service.get(dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    types = detect_column_types(ds.rows or [])
    return {
        "dataset_id": str(dataset_id),
        "name": ds.name,
        "row_count": ds.row_count,
        "columns": [
            {"name": col, "type": types.get(col, "text")}
            for col in (ds.columns or [])
        ],
    }


# ---------------------------------------------------------------------------
# Dataset CRUD — rows, rename, delete column
# ---------------------------------------------------------------------------


class DatasetUpdateRequest(BaseModel):
    name: str


@router.get(
    "/datasets/{dataset_id}/rows",
    summary="Retorna linhas brutas do dataset com paginação",
)
async def get_dataset_rows(
    dataset_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DatasetService(db)
    ds = await service.get(dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    rows = ds.rows or []
    return {"rows": rows[offset:offset + limit], "total": len(rows)}


@router.patch(
    "/datasets/{dataset_id}",
    response_model=DatasetSummary,
    summary="Renomeia um dataset",
)
async def update_dataset(
    dataset_id: uuid.UUID,
    body: DatasetUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DatasetService(db)
    ds = await service.get(dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    ds.name = body.name.strip()
    await db.commit()
    await db.refresh(ds)
    return DatasetSummary(
        id=ds.id, name=ds.name, type=ds.type,
        columns=ds.columns or [], row_count=ds.row_count or 0,
        api_url=ds.api_url,
        last_synced_at=ds.last_synced_at.isoformat() if ds.last_synced_at else None,
    )


@router.delete(
    "/datasets/{dataset_id}/columns/{column_name}",
    summary="Remove uma coluna do dataset",
)
async def delete_dataset_column(
    dataset_id: uuid.UUID,
    column_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from sqlalchemy.orm.attributes import flag_modified
    service = DatasetService(db)
    ds = await service.get(dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    if not ds.columns or column_name not in ds.columns:
        raise HTTPException(status_code=404, detail="Coluna não encontrada")
    ds.rows = [{k: v for k, v in row.items() if k != column_name} for row in (ds.rows or [])]
    ds.columns = [c for c in (ds.columns or []) if c != column_name]
    ds.row_count = len(ds.rows)
    flag_modified(ds, "rows")
    flag_modified(ds, "columns")
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Computed Columns — colunas calculadas por expressão
# ---------------------------------------------------------------------------


@router.post(
    "/datasets/{dataset_id}/computed-columns",
    response_model=list[ComputedColumnResponse],
    summary="Adiciona ou atualiza uma coluna calculada no dataset",
)
async def add_computed_column(
    dataset_id: uuid.UUID,
    body: ComputedColumnCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DatasetService(db)
    ds = await service.add_computed_column(
        dataset_id,
        current_user.tenant_id,
        body.name.strip(),
        body.expression.strip(),
        body.refs,
    )
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    return [
        ComputedColumnResponse(**c)
        for c in (ds.computed_columns or [])
    ]


@router.delete(
    "/datasets/{dataset_id}/computed-columns/{col_name}",
    response_model=list[ComputedColumnResponse],
    summary="Remove uma coluna calculada do dataset",
)
async def remove_computed_column(
    dataset_id: uuid.UUID,
    col_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DatasetService(db)
    ds = await service.remove_computed_column(
        dataset_id,
        current_user.tenant_id,
        col_name,
    )
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    return [
        ComputedColumnResponse(**c)
        for c in (ds.computed_columns or [])
    ]


# ---------------------------------------------------------------------------
# AI — query em linguagem natural
# ---------------------------------------------------------------------------


def _suggest_chart(data: list[dict], question: str) -> dict:
    """Sugere tipo de gráfico baseado nos dados."""
    q_lower = question.lower()
    num_rows = len(data)

    # Detect column types
    cols = list(data[0].keys()) if data else []
    label_col = cols[0] if cols else None
    value_col = cols[1] if len(cols) > 1 else None

    chart_type = "bar"
    if any(w in q_lower for w in ["pizza", "pie", "percentual", "distribui"]):
        chart_type = "pie"
    elif any(w in q_lower for w in ["linha", "line", "tendência", "evolução", "histórico", "tempo"]):
        chart_type = "line"
    elif any(w in q_lower for w in ["funil", "funnel", "etapa", "conversão"]):
        chart_type = "funnel"
    elif any(w in q_lower for w in ["mapa", "estado", "região", "uf"]):
        chart_type = "map"
    elif num_rows <= 6:
        chart_type = "pie"

    return {
        "suggested_chart_type": chart_type,
        "suggested_title": question[:80],
        "suggested_config": {
            "label_col": label_col,
            "value_col": value_col,
            "chart_type": chart_type,
        },
    }


class AiQueryRequest(BaseModel):
    dataset_id: uuid.UUID
    question: str


_AI_MODEL = "claude-haiku-4-5-20251001"


@router.post("/ai-query", summary="Consulta dataset com linguagem natural via IA (Claude)")
async def ai_query_endpoint(
    data: AiQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    import json
    import os
    import re

    import anthropic as ant

    from .ai_usage_models import AIUsageLog

    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    plan = tenant.plan if tenant else "free"
    check_feature_allowed("ai", plan)
    await check_ai_query_limit(db, current_user.tenant_id, plan)

    svc = DatasetService(db)
    ds = await svc.get(data.dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_key_here":
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY não configurada. Adicione a chave no arquivo .env e reinicie o backend.")

    columns = ds.columns or []
    rows = ds.rows or []
    sample = rows[:5]

    # Inferir tipo de cada coluna a partir da amostra para melhorar a acurácia da IA
    col_types: dict[str, str] = {}
    if sample:
        for col in columns:
            vals = [r.get(col) for r in sample if r.get(col) is not None]
            if vals:
                try:
                    [float(str(v).replace(",", ".")) for v in vals]
                    col_types[col] = "número"
                except (ValueError, TypeError):
                    col_types[col] = "texto"
            else:
                col_types[col] = "texto"

    col_desc = ", ".join(f"{c} ({col_types.get(c, 'texto')})" for c in columns)
    schema_str = (
        f"Dataset: {ds.name}\n"
        f"Colunas e tipos: {col_desc}\n"
        f"Amostra ({len(sample)} linhas):\n{json.dumps(sample, ensure_ascii=False, default=str)}"
    )

    system_prompt = (
        "Você é um analista de dados especialista em BI. Dado o schema e amostra de um dataset, "
        "responda a pergunta do usuário retornando SOMENTE um JSON válido (sem markdown, sem texto fora do JSON) com os campos:\n"
        '{"label_col":"coluna para agrupar (deve ser do tipo texto/categoria)","value_col":"coluna numérica a agregar",'
        '"agg":"sum|count|avg|max|min","filter_col":null,"filter_val":null,'
        '"answer":"resposta em português claro explicando o que o gráfico vai mostrar"}\n'
        "Regras: use apenas nomes de colunas exatamente como aparecem no dataset. "
        "Prefira colunas do tipo 'número' para value_col e 'texto' para label_col."
    )

    client = ant.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=_AI_MODEL,
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": f"{schema_str}\n\nPergunta: {data.question}"}],
    )

    # Salvar log de uso (não bloqueia em caso de erro)
    try:
        usage = msg.usage
        log = AIUsageLog(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            dataset_id=data.dataset_id,
            model=_AI_MODEL,
            tokens_input=usage.input_tokens,
            tokens_output=usage.output_tokens,
            question=data.question[:500] if data.question else None,
        )
        db.add(log)
        await db.commit()
    except Exception:
        pass

    text = msg.content[0].text.strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            raise HTTPException(status_code=500, detail="IA não retornou JSON válido. Tente reformular a pergunta.")
        parsed = json.loads(m.group())

    label_col = parsed.get("label_col")
    value_col = parsed.get("value_col")
    agg = parsed.get("agg", "sum")
    filter_col = parsed.get("filter_col")
    filter_val = parsed.get("filter_val")
    answer = parsed.get("answer", "")

    query_data = svc.query(ds, label_col, value_col, agg, filter_col, filter_val)

    chart_suggestion = _suggest_chart(query_data, data.question)

    return {
        "data": query_data,
        "answer": answer,
        "query": {"label_col": label_col, "value_col": value_col, "agg": agg, "filter_col": filter_col, "filter_val": filter_val},
        **chart_suggestion,
    }


class GenerateDashboardRequest(BaseModel):
    dataset_id: uuid.UUID
    objetivo: str | None = None


@router.post("/generate-dashboard", summary="Gera blocos de dashboard automaticamente com IA")
async def generate_dashboard_endpoint(
    data: GenerateDashboardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    import json
    import os
    import re

    import anthropic as ant

    from .ai_usage_models import AIUsageLog

    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    plan = tenant.plan if tenant else "free"
    check_feature_allowed("ai", plan)
    await check_ai_query_limit(db, current_user.tenant_id, plan)

    svc = DatasetService(db)
    ds = await svc.get(data.dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_key_here":
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY não configurada.")

    columns = ds.columns or []
    rows = ds.rows or []
    sample = rows[:10]

    # Inferir tipo de cada coluna
    col_types: dict[str, str] = {}
    if sample:
        for col in columns:
            vals = [r.get(col) for r in sample if r.get(col) is not None]
            if vals:
                try:
                    [float(str(v).replace(",", ".")) for v in vals]
                    col_types[col] = "numero"
                except (ValueError, TypeError):
                    # Detectar datas
                    import re as _re
                    sample_val = str(vals[0])
                    if _re.match(r"\d{4}-\d{2}|\d{2}/\d{4}|\d{2}/\d{2}/\d{4}", sample_val):
                        col_types[col] = "data"
                    else:
                        col_types[col] = "texto"
            else:
                col_types[col] = "texto"

    num_cols = [c for c, t in col_types.items() if t == "numero"]
    txt_cols = [c for c, t in col_types.items() if t == "texto"]
    date_cols = [c for c, t in col_types.items() if t == "data"]

    col_desc = ", ".join(f"{c}({col_types.get(c,'texto')})" for c in columns)
    schema_str = (
        f"Dataset: {ds.name}\n"
        f"Colunas: {col_desc}\n"
        f"Amostra ({len(sample)} linhas):\n{json.dumps(sample[:5], ensure_ascii=False, default=str)}"
    )

    objetivo_str = f"\nObjetivo do usuário: {data.objetivo}" if data.objetivo else ""

    system_prompt = (
        "Você é um especialista em BI e visualização de dados. "
        "Dado o schema de um dataset, gere entre 4 e 8 blocos de dashboard que sejam informativos e variados.\n"
        "Retorne SOMENTE um JSON array válido (sem markdown, sem texto fora do JSON) no formato:\n"
        '[\n'
        '  {"type":"kpi","title":"Título do card","value_col":"coluna_numerica","agg":"sum","label_col":null},\n'
        '  {"type":"bar","title":"Título do gráfico","label_col":"coluna_texto","value_col":"coluna_numerica","agg":"sum"},\n'
        '  ...\n'
        ']\n'
        "Tipos disponíveis: kpi, bar, line, pie, area, table\n"
        "Regras:\n"
        "- kpi: use value_col=coluna numérica, label_col=null, agg=sum/avg/count\n"
        "- bar/line/area/pie: use label_col=coluna de texto/categoria, value_col=coluna numérica\n"
        "- table: use label_col=null, value_col=null (mostra todas as linhas)\n"
        "- Use nomes de colunas EXATAMENTE como no dataset\n"
        "- Gere blocos variados: pelo menos 1 kpi, 1 bar, 1 pie ou line\n"
        "- Títulos em português, curtos e descritivos\n"
        "- Se houver coluna de data, use em line/area para mostrar evolução temporal"
    )

    client = ant.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=_AI_MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": f"{schema_str}{objetivo_str}\n\nGere o dashboard:"}],
    )

    # Log de uso
    try:
        usage = msg.usage
        log = AIUsageLog(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            dataset_id=data.dataset_id,
            model=_AI_MODEL,
            tokens_input=usage.input_tokens,
            tokens_output=usage.output_tokens,
            question=f"[generate-dashboard] {data.objetivo or ''}",
        )
        db.add(log)
        await db.commit()
    except Exception:
        pass

    text = msg.content[0].text.strip()
    try:
        blocks = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\[.*\]", text, re.DOTALL)
        if not m:
            raise HTTPException(status_code=500, detail="IA não retornou JSON válido.")
        blocks = json.loads(m.group())

    if not isinstance(blocks, list):
        raise HTTPException(status_code=500, detail="IA retornou formato inválido.")

    # Injetar dataset_id em cada bloco
    for b in blocks:
        b["dataset_id"] = str(data.dataset_id)

    return {"blocks": blocks, "dataset_name": ds.name}


@router.get("/ai-usage", summary="Retorna cota mensal de IA do tenant")
async def get_ai_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    import uuid as _uuid
    from datetime import timezone
    from sqlalchemy import func as _func, select as _sel
    from app.modules.billing.plan_limits import PLANS
    from .ai_usage_models import AIUsageLog

    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    plan = tenant.plan if tenant else "free"
    limits = PLANS.get(plan, PLANS["free"])
    max_queries = limits.max_ai_queries_monthly

    now = __import__("datetime").datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # primeiro dia do próximo mês
    if now.month == 12:
        next_month = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        next_month = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    used = 0
    if limits.allow_ai:
        used = await db.scalar(
            _sel(_func.count()).select_from(AIUsageLog).where(
                AIUsageLog.tenant_id == current_user.tenant_id,
                AIUsageLog.created_at >= month_start,
            )
        ) or 0

    return {
        "used": used,
        "limit": max_queries,       # -1 = ilimitado
        "remaining": -1 if max_queries == -1 else max(0, max_queries - used),
        "reset_at": next_month.isoformat(),
        "plan": plan,
    }


# ---------------------------------------------------------------------------
# Alertas por threshold
# ---------------------------------------------------------------------------

from datetime import datetime, timezone as _tz

from sqlalchemy import select as _select

from .alert_models import ReportAlert


class AlertCreate(BaseModel):
    name: str
    dataset_id: uuid.UUID
    value_col: str
    agg: str = "sum"
    operator: str  # gt | lt | gte | lte | eq
    threshold: float
    filter_col: str | None = None
    filter_val: str | None = None
    notify_email: str | None = None
    notify_slack_url: str | None = None
    notify_sms: str | None = None


class AlertResponse(BaseModel):
    id: uuid.UUID
    name: str
    dataset_id: uuid.UUID
    value_col: str
    agg: str
    operator: str
    threshold: float
    filter_col: str | None
    filter_val: str | None
    is_active: bool
    last_value: float | None
    last_status: str | None
    checked_at: str | None
    created_at: str
    notify_email: str | None = None
    notify_slack_url: str | None = None
    notify_sms: str | None = None

    model_config = {"from_attributes": True}


async def _send_alert_notifications(alert: ReportAlert, value: float) -> None:
    """Envia notificações por email e/ou Slack quando alerta é disparado."""
    msg = f"Alerta '{alert.name}' disparado! Valor atual: {value:.2f} (threshold: {alert.threshold})"

    if alert.notify_email:
        try:
            from app.core.email import send_generic_email
            for email in alert.notify_email.split(","):
                email = email.strip()
                if email:
                    await send_generic_email(email, f"Alerta Jarbis: {alert.name}", msg)
        except Exception as e:
            print(f"[ALERT EMAIL] Falha: {e}")

    if alert.notify_slack_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(alert.notify_slack_url, json={"text": msg})
        except Exception as e:
            print(f"[ALERT SLACK] Falha: {e}")

    # SMS via Twilio
    if alert.notify_sms:
        try:
            import os
            from twilio.rest import Client as TwilioClient
            from app.config import settings as _settings
            twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
            twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
            twilio_from = os.environ.get("TWILIO_FROM_NUMBER")
            if twilio_sid and twilio_token and twilio_from:
                tw = TwilioClient(twilio_sid, twilio_token)
                sms_body = f"🚨 Alerta Jarbis: {alert.name}\nCondição atingida no dashboard.\nAcesse: {_settings.frontend_url}"
                for phone in (alert.notify_sms or "").split(","):
                    phone = phone.strip()
                    if phone:
                        tw.messages.create(body=sms_body, from_=twilio_from, to=phone)
        except Exception as e:
            print(f"[SMS] Erro: {e}")


def _eval_alert(alert: ReportAlert, current_value: float) -> str:
    op = alert.operator
    t = alert.threshold
    if op == "gt":   return "triggered" if current_value > t else "ok"
    if op == "lt":   return "triggered" if current_value < t else "ok"
    if op == "gte":  return "triggered" if current_value >= t else "ok"
    if op == "lte":  return "triggered" if current_value <= t else "ok"
    if op == "eq":   return "triggered" if current_value == t else "ok"
    return "ok"


@router.get("/alerts", response_model=list[AlertResponse], summary="Lista alertas do tenant")
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.scalars(
        _select(ReportAlert)
        .where(ReportAlert.tenant_id == current_user.tenant_id)
        .order_by(ReportAlert.created_at.desc())
    )
    alerts = result.all()
    return [AlertResponse(
        id=a.id, name=a.name, dataset_id=a.dataset_id, value_col=a.value_col,
        agg=a.agg, operator=a.operator, threshold=a.threshold,
        filter_col=a.filter_col, filter_val=a.filter_val, is_active=a.is_active,
        last_value=a.last_value, last_status=a.last_status,
        checked_at=a.checked_at.isoformat() if a.checked_at else None,
        created_at=a.created_at.isoformat(),
    ) for a in alerts]


@router.post("/alerts", response_model=AlertResponse, status_code=201, summary="Cria alerta")
async def create_alert(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    await check_alert_limit(db, current_user.tenant_id, tenant.plan if tenant else "free", tenant.addon_packs if tenant else 0)
    valid_ops = {"gt", "lt", "gte", "lte", "eq"}
    if data.operator not in valid_ops:
        raise HTTPException(status_code=422, detail=f"Operador inválido. Use: {', '.join(valid_ops)}")

    # Validate dataset belongs to tenant
    ds_svc = DatasetService(db)
    ds = await ds_svc.get(data.dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")

    alert = ReportAlert(
        tenant_id=current_user.tenant_id,
        dataset_id=data.dataset_id,
        name=data.name,
        value_col=data.value_col,
        agg=data.agg,
        operator=data.operator,
        threshold=data.threshold,
        filter_col=data.filter_col,
        filter_val=data.filter_val,
        notify_email=data.notify_email,
        notify_slack_url=data.notify_slack_url,
        notify_sms=data.notify_sms,
    )
    db.add(alert)
    await db.flush()
    return AlertResponse(
        id=alert.id, name=alert.name, dataset_id=alert.dataset_id, value_col=alert.value_col,
        agg=alert.agg, operator=alert.operator, threshold=alert.threshold,
        filter_col=alert.filter_col, filter_val=alert.filter_val, is_active=alert.is_active,
        last_value=None, last_status=None, checked_at=None,
        created_at=alert.created_at.isoformat(),
    )


@router.post("/alerts/{alert_id}/check", response_model=AlertResponse, summary="Avalia alerta agora")
async def check_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    alert = await db.scalar(
        _select(ReportAlert).where(
            ReportAlert.id == alert_id,
            ReportAlert.tenant_id == current_user.tenant_id,
        )
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    ds_svc = DatasetService(db)
    ds = await ds_svc.get(alert.dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")

    rows = ds_svc.query(ds, alert.value_col, alert.value_col, alert.agg, alert.filter_col, alert.filter_val)
    total = sum(r.get("value", 0) or 0 for r in rows)

    prev_status = alert.last_status
    new_status = _eval_alert(alert, total)
    alert.last_value = total
    alert.last_status = new_status
    alert.checked_at = datetime.now(_tz.utc)
    await db.commit()
    await db.refresh(alert)

    # Dispara notificações se passou para triggered
    if new_status == "triggered" and prev_status != "triggered":
        await _send_alert_notifications(alert, total)

    return AlertResponse(
        id=alert.id, name=alert.name, dataset_id=alert.dataset_id, value_col=alert.value_col,
        agg=alert.agg, operator=alert.operator, threshold=alert.threshold,
        filter_col=alert.filter_col, filter_val=alert.filter_val, is_active=alert.is_active,
        last_value=alert.last_value, last_status=alert.last_status,
        checked_at=alert.checked_at.isoformat() if alert.checked_at else None,
        created_at=alert.created_at.isoformat(),
        notify_email=alert.notify_email, notify_slack_url=alert.notify_slack_url,
    )


@router.patch("/alerts/{alert_id}", response_model=AlertResponse, summary="Ativa/desativa alerta")
async def toggle_alert(
    alert_id: uuid.UUID,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    alert = await db.scalar(
        _select(ReportAlert).where(
            ReportAlert.id == alert_id,
            ReportAlert.tenant_id == current_user.tenant_id,
        )
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    alert.is_active = is_active
    await db.commit()
    await db.refresh(alert)
    return AlertResponse(
        id=alert.id, name=alert.name, dataset_id=alert.dataset_id, value_col=alert.value_col,
        agg=alert.agg, operator=alert.operator, threshold=alert.threshold,
        filter_col=alert.filter_col, filter_val=alert.filter_val, is_active=alert.is_active,
        last_value=alert.last_value, last_status=alert.last_status,
        checked_at=alert.checked_at.isoformat() if alert.checked_at else None,
        created_at=alert.created_at.isoformat(),
    )


@router.delete("/alerts/{alert_id}", status_code=204, summary="Remove alerta")
async def delete_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    alert = await db.scalar(
        _select(ReportAlert).where(
            ReportAlert.id == alert_id,
            ReportAlert.tenant_id == current_user.tenant_id,
        )
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    await db.delete(alert)
    await db.commit()


# ---------------------------------------------------------------------------
# Collections (pastas de dashboards) — ANTES de /{report_id} para não ser capturado
# ---------------------------------------------------------------------------


class CollectionCreate(BaseModel):
    name: str
    description: str | None = None
    color: str = "#7c3aed"


class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    color: str | None
    is_pinned: bool
    created_at: datetime
    report_count: int = 0

    class Config:
        from_attributes = True


@router.get("/collections", response_model=list[CollectionResponse])
async def list_collections(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .collection_models import Collection, report_collection
    from sqlalchemy import func
    result = await db.execute(
        select(Collection, func.count(report_collection.c.report_id).label('cnt'))
        .outerjoin(report_collection, Collection.id == report_collection.c.collection_id)
        .where(Collection.tenant_id == current_user.tenant_id)
        .group_by(Collection.id)
        .order_by(Collection.is_pinned.desc(), Collection.created_at.desc())
    )
    rows = result.all()
    return [CollectionResponse(
        id=c.id, name=c.name, description=c.description, color=c.color,
        is_pinned=c.is_pinned, created_at=c.created_at, report_count=cnt
    ) for c, cnt in rows]


@router.post("/collections", response_model=CollectionResponse, status_code=201)
async def create_collection(
    body: CollectionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .collection_models import Collection
    col = Collection(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(col)
    await db.commit()
    await db.refresh(col)
    return CollectionResponse(
        **{k: getattr(col, k) for k in ['id', 'name', 'description', 'color', 'is_pinned', 'created_at']},
        report_count=0,
    )


@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .collection_models import Collection
    col = await db.scalar(
        select(Collection).where(Collection.id == collection_id, Collection.tenant_id == current_user.tenant_id)
    )
    if not col:
        raise HTTPException(status_code=404, detail="Coleção não encontrada")
    await db.delete(col)
    await db.commit()
    return {"ok": True}


@router.post("/collections/{collection_id}/reports/{report_id}")
async def add_report_to_collection(
    collection_id: uuid.UUID,
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .collection_models import report_collection
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    await db.execute(
        pg_insert(report_collection)
        .values(report_id=report_id, collection_id=collection_id)
        .on_conflict_do_nothing()
    )
    await db.commit()
    return {"ok": True}


@router.delete("/collections/{collection_id}/reports/{report_id}")
async def remove_report_from_collection(
    collection_id: uuid.UUID,
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .collection_models import report_collection
    await db.execute(
        report_collection.delete().where(
            report_collection.c.collection_id == collection_id,
            report_collection.c.report_id == report_id,
        )
    )
    await db.commit()
    return {"ok": True}


@router.get("/collections/{collection_id}/reports")
async def list_collection_reports(
    collection_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .collection_models import Collection, report_collection
    from .models import Report
    col = await db.scalar(
        select(Collection).where(Collection.id == collection_id, Collection.tenant_id == current_user.tenant_id)
    )
    if not col:
        raise HTTPException(status_code=404, detail="Coleção não encontrada")
    result = await db.execute(
        select(Report)
        .join(report_collection, Report.id == report_collection.c.report_id)
        .where(
            report_collection.c.collection_id == collection_id,
            Report.tenant_id == current_user.tenant_id,
        )
        .order_by(Report.updated_at.desc())
    )
    reports = result.scalars().all()
    return [{"id": str(r.id), "title": r.title, "cover_image": getattr(r, 'cover_image', None)} for r in reports]


# ---------------------------------------------------------------------------
# Clone — deve ficar ANTES de /{report_id} para não ser capturado
# ---------------------------------------------------------------------------


@router.post(
    "/{report_id}/clone",
    response_model=ReportResponse,
    status_code=201,
    summary="Clona um relatório existente",
)
async def clone_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    await check_dashboard_limit(db, current_user.tenant_id, tenant.plan if tenant else "free", tenant.addon_packs if tenant else 0)
    service = ReportService(db)
    return await service.clone(report_id, current_user.tenant_id)


# ---------------------------------------------------------------------------
# Phase 8 — Notificações in-app
# ---------------------------------------------------------------------------

from app.modules.admin.models import UserNotification, TenantWebhook, ApiKey  # noqa: E402


@router.get("/notifications", summary="Listar notificações do usuário")
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(UserNotification).where(
        UserNotification.user_id == current_user.id,
        UserNotification.tenant_id == current_user.tenant_id,
    )
    if unread_only:
        q = q.where(UserNotification.read_at.is_(None))
    q = q.order_by(UserNotification.created_at.desc()).limit(limit)
    rows = await db.scalars(q)
    items = rows.all()
    return {
        "items": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "link": n.link,
                "read": n.read_at is not None,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
        "unread_count": sum(1 for n in items if n.read_at is None),
    }


@router.post("/notifications/read-all", summary="Marcar todas as notificações como lidas")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(UserNotification)
        .where(
            UserNotification.user_id == current_user.id,
            UserNotification.read_at.is_(None),
        )
        .values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"ok": True}


@router.post("/notifications/{notification_id}/read", summary="Marcar notificação como lida")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    n = await db.scalar(
        select(UserNotification).where(
            UserNotification.id == notification_id,
            UserNotification.user_id == current_user.id,
        )
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")
    if not n.read_at:
        n.read_at = datetime.now(timezone.utc)
        await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Phase 8 — Webhooks outbound
# ---------------------------------------------------------------------------


class WebhookCreateInput(BaseModel):
    url: str
    events: str = "alert.triggered"


class WebhookUpdateInput(BaseModel):
    url: str | None = None
    events: str | None = None
    is_active: bool | None = None


@router.get("/tenant/webhooks", summary="Listar webhooks do tenant")
async def list_webhooks(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(TenantWebhook)
        .where(TenantWebhook.tenant_id == current_user.tenant_id)
        .order_by(TenantWebhook.created_at.desc())
    )
    items = rows.all()
    return {
        "items": [
            {
                "id": str(w.id),
                "url": w.url,
                "events": w.events,
                "is_active": w.is_active,
                "last_triggered_at": w.last_triggered_at.isoformat() if w.last_triggered_at else None,
                "last_status_code": w.last_status_code,
                "created_by": w.created_by,
                "created_at": w.created_at.isoformat(),
            }
            for w in items
        ]
    }


@router.post("/tenant/webhooks", status_code=201, summary="Criar webhook")
async def create_webhook(
    data: WebhookCreateInput,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    if tenant and tenant.plan not in ("ilimitado", "enterprise"):
        raise HTTPException(status_code=403, detail="Webhooks disponíveis apenas no plano Ilimitado.")
    secret = secrets.token_hex(32)
    webhook = TenantWebhook(
        tenant_id=current_user.tenant_id,
        url=data.url,
        events=data.events,
        secret=secret,
        is_active=True,
        created_by=current_user.email,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return {"id": str(webhook.id), "secret": secret}


@router.patch("/tenant/webhooks/{webhook_id}", summary="Atualizar webhook")
async def update_webhook(
    webhook_id: uuid.UUID,
    data: WebhookUpdateInput,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    w = await db.scalar(
        select(TenantWebhook).where(
            TenantWebhook.id == webhook_id,
            TenantWebhook.tenant_id == current_user.tenant_id,
        )
    )
    if not w:
        raise HTTPException(status_code=404, detail="Webhook não encontrado.")
    if data.url is not None:
        w.url = data.url
    if data.events is not None:
        w.events = data.events
    if data.is_active is not None:
        w.is_active = data.is_active
    await db.commit()
    return {"ok": True}


@router.delete("/tenant/webhooks/{webhook_id}", summary="Deletar webhook")
async def delete_webhook(
    webhook_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    w = await db.scalar(
        select(TenantWebhook).where(
            TenantWebhook.id == webhook_id,
            TenantWebhook.tenant_id == current_user.tenant_id,
        )
    )
    if not w:
        raise HTTPException(status_code=404, detail="Webhook não encontrado.")
    await db.delete(w)
    await db.commit()
    return {"ok": True}


@router.post("/tenant/webhooks/{webhook_id}/test", summary="Testar webhook")
async def test_webhook(
    webhook_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    w = await db.scalar(
        select(TenantWebhook).where(
            TenantWebhook.id == webhook_id,
            TenantWebhook.tenant_id == current_user.tenant_id,
        )
    )
    if not w:
        raise HTTPException(status_code=404, detail="Webhook não encontrado.")
    payload = {
        "event": "webhook.test",
        "tenant_id": str(current_user.tenant_id),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    body = json.dumps(payload).encode()
    sig = hmac.new(w.secret.encode(), body, hashlib.sha256).hexdigest()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                w.url,
                content=body,
                headers={"Content-Type": "application/json", "X-Jarbis-Signature": f"sha256={sig}"},
            )
        w.last_triggered_at = datetime.now(timezone.utc)
        w.last_status_code = resp.status_code
        await db.commit()
        return {"ok": True, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Phase 8 — White-label / Customização
# ---------------------------------------------------------------------------


class CustomizationUpdateInput(BaseModel):
    custom_logo_url: str | None = None
    primary_color: str | None = None


@router.get("/tenant/customization", summary="Configurações de personalização")
async def get_customization(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")
    return {
        "custom_logo_url": tenant.custom_logo_url,
        "primary_color": tenant.primary_color,
        "plan": tenant.plan,
        "white_label_enabled": tenant.plan in ("ilimitado", "enterprise"),
    }


@router.patch("/tenant/customization", summary="Atualizar personalização (white-label)")
async def update_customization(
    data: CustomizationUpdateInput,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")
    if tenant.plan not in ("ilimitado", "enterprise"):
        raise HTTPException(status_code=403, detail="White-label disponível apenas no plano Ilimitado.")
    if data.custom_logo_url is not None:
        tenant.custom_logo_url = data.custom_logo_url
    if data.primary_color is not None:
        if data.primary_color and not (len(data.primary_color) == 7 and data.primary_color.startswith("#")):
            raise HTTPException(status_code=400, detail="Cor deve ser no formato #RRGGBB.")
        tenant.primary_color = data.primary_color
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Phase 8 — Templates de dashboard
# ---------------------------------------------------------------------------

DASHBOARD_TEMPLATES = [
    {
        "id": "sales-overview",
        "name": "Visão Geral de Vendas",
        "description": "KPIs de faturamento, pedidos e ticket médio com gráfico de evolução.",
        "category": "vendas",
        "preview_color": "#7c3aed",
        "pages": [{"id": "p1", "title": "Vendas", "blocks": [
            {"id": "b1", "type": "metric", "x": 0, "y": 0, "w": 3, "h": 2, "config": {"title": "Faturamento", "format": "currency"}},
            {"id": "b2", "type": "metric", "x": 3, "y": 0, "w": 3, "h": 2, "config": {"title": "Pedidos", "format": "number"}},
            {"id": "b3", "type": "metric", "x": 6, "y": 0, "w": 3, "h": 2, "config": {"title": "Ticket Médio", "format": "currency"}},
            {"id": "b4", "type": "bar", "x": 0, "y": 2, "w": 12, "h": 4, "config": {"title": "Faturamento por Período", "x_field": "data", "y_field": "valor"}},
        ]}],
    },
    {
        "id": "marketing-analytics",
        "name": "Analytics de Marketing",
        "description": "Funil de conversão, canais de aquisição e performance de campanhas.",
        "category": "marketing",
        "preview_color": "#0891b2",
        "pages": [{"id": "p1", "title": "Marketing", "blocks": [
            {"id": "b1", "type": "pie", "x": 0, "y": 0, "w": 6, "h": 4, "config": {"title": "Canais de Aquisição", "field": "canal"}},
            {"id": "b2", "type": "bar", "x": 6, "y": 0, "w": 6, "h": 4, "config": {"title": "Conversões por Campanha", "x_field": "campanha", "y_field": "conversoes"}},
        ]}],
    },
    {
        "id": "financial-dashboard",
        "name": "Dashboard Financeiro",
        "description": "Receitas, despesas, margem e fluxo de caixa em um só lugar.",
        "category": "financeiro",
        "preview_color": "#059669",
        "pages": [{"id": "p1", "title": "Financeiro", "blocks": [
            {"id": "b1", "type": "metric", "x": 0, "y": 0, "w": 4, "h": 2, "config": {"title": "Receita Bruta", "format": "currency"}},
            {"id": "b2", "type": "metric", "x": 4, "y": 0, "w": 4, "h": 2, "config": {"title": "Despesas", "format": "currency"}},
            {"id": "b3", "type": "metric", "x": 8, "y": 0, "w": 4, "h": 2, "config": {"title": "Margem Líquida", "format": "percent"}},
            {"id": "b4", "type": "line", "x": 0, "y": 2, "w": 12, "h": 4, "config": {"title": "Evolução Financeira", "x_field": "mes", "y_field": "valor"}},
        ]}],
    },
    {
        "id": "operations-kpi",
        "name": "KPIs Operacionais",
        "description": "Indicadores operacionais: SLA, satisfação, volume de atendimentos.",
        "category": "operacoes",
        "preview_color": "#d97706",
        "pages": [{"id": "p1", "title": "Operações", "blocks": [
            {"id": "b1", "type": "metric", "x": 0, "y": 0, "w": 3, "h": 2, "config": {"title": "Atendimentos", "format": "number"}},
            {"id": "b2", "type": "metric", "x": 3, "y": 0, "w": 3, "h": 2, "config": {"title": "SLA Cumprido", "format": "percent"}},
            {"id": "b3", "type": "metric", "x": 6, "y": 0, "w": 3, "h": 2, "config": {"title": "Satisfação (NPS)", "format": "number"}},
            {"id": "b4", "type": "table", "x": 0, "y": 2, "w": 12, "h": 5, "config": {"title": "Detalhamento por Equipe"}},
        ]}],
    },
]


@router.get("/templates", summary="Listar templates de dashboard")
async def list_templates(
    current_user: User = Depends(get_current_active_user),
):
    return {"items": DASHBOARD_TEMPLATES}


@router.post("/from-template/{template_id}", status_code=201, summary="Criar dashboard a partir de template")
async def create_from_template(
    template_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    template = next((t for t in DASHBOARD_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    await check_dashboard_limit(db, current_user.tenant_id, tenant.plan if tenant else "free", tenant.addon_packs if tenant else 0)
    service = ReportService(db)
    report = await service.create(
        current_user.tenant_id,
        ReportCreate(title=template["name"], description=template["description"]),
    )
    report.pages = template["pages"]
    await db.commit()
    await db.refresh(report)
    return {"id": str(report.id), "title": report.title}


# ---------------------------------------------------------------------------
# API Keys — tenant-facing (self-service)
# ---------------------------------------------------------------------------


class ApiKeyCreate(BaseModel):
    name: str
    scopes: str = "read"
    expires_in_days: int | None = None


@router.get("/api-keys", summary="Lista API Keys do tenant")
async def list_api_keys(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(ApiKey)
        .where(ApiKey.tenant_id == current_user.tenant_id)
        .order_by(ApiKey.created_at.desc())
    )
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "key_prefix": k.key_prefix,
            "scopes": k.scopes,
            "is_active": k.is_active,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "expires_at": k.expires_at.isoformat() if k.expires_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        }
        for k in rows.all()
    ]


@router.post("/api-keys", summary="Cria nova API Key para o tenant", status_code=201)
async def create_api_key(
    data: ApiKeyCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    raw_key = f"jrb_live_{secrets.token_hex(20)}"
    hashed = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:12]
    expires_at = None
    if data.expires_in_days:
        from datetime import timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)
    key = ApiKey(
        tenant_id=current_user.tenant_id,
        name=data.name,
        key_prefix=prefix,
        hashed_key=hashed,
        scopes=data.scopes,
        expires_at=expires_at,
        created_by=current_user.email,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return {
        "id": str(key.id),
        "name": key.name,
        "key": raw_key,
        "key_prefix": key.key_prefix,
        "scopes": key.scopes,
        "expires_at": key.expires_at.isoformat() if key.expires_at else None,
        "created_at": key.created_at.isoformat() if key.created_at else None,
    }


@router.delete("/api-keys/{key_id}", summary="Revoga (desativa) uma API Key", status_code=204)
async def revoke_api_key(
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    key = await db.scalar(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.tenant_id == current_user.tenant_id)
    )
    if not key:
        raise HTTPException(status_code=404, detail="Chave não encontrada.")
    key.is_active = False
    await db.commit()


# ---------------------------------------------------------------------------
# Embed RLS tokens — geração e decodificação de tokens com filtros por usuário
# ---------------------------------------------------------------------------


class EmbedTokenCreate(BaseModel):
    dashboard_id: uuid.UUID
    user_ref: str  # external user identifier
    filters: list[dict] = []  # [{col: str, value: str}]
    expires_in_hours: int = 4


class EmbedTokenResponse(BaseModel):
    token: str
    dashboard_id: uuid.UUID
    expires_at: str
    embed_url: str


@router.post("/embed-tokens", response_model=EmbedTokenResponse)
async def create_embed_token(
    body: EmbedTokenCreate,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria token embed com filtros RLS por usuário final."""
    import jwt as pyjwt
    from datetime import timedelta
    from app.config import settings

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=body.expires_in_hours)

    payload = {
        "sub": str(body.dashboard_id),
        "tenant_id": str(current_user.tenant_id),
        "user_ref": body.user_ref,
        "filters": body.filters,
        "exp": expires_at,
        "iat": now,
        "type": "embed",
    }

    secret = getattr(settings, "secret_key", "jarbis-secret")
    token = pyjwt.encode(payload, secret, algorithm="HS256")

    return EmbedTokenResponse(
        token=token,
        dashboard_id=body.dashboard_id,
        expires_at=expires_at.isoformat(),
        embed_url=f"https://app.jarbis.cc/embed/{token}",
    )


@router.get("/embed/{token}")
async def decode_embed_token(token: str):
    """Decodifica token embed e retorna dados do dashboard com filtros."""
    import jwt as pyjwt
    from app.config import settings

    try:
        secret = getattr(settings, "secret_key", "jarbis-secret")
        payload = pyjwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("type") != "embed":
            raise HTTPException(status_code=400, detail="Token inválido.")
        return {
            "dashboard_id": payload["sub"],
            "tenant_id": payload["tenant_id"],
            "user_ref": payload.get("user_ref"),
            "filters": payload.get("filters", []),
        }
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado.")
    except Exception:
        raise HTTPException(status_code=400, detail="Token inválido.")


# ---------------------------------------------------------------------------
# N30 — Google Analytics Connector
# ---------------------------------------------------------------------------

from app.modules.reports.connectors.ga_connector import fetch_ga_report


class GADatasetCreate(BaseModel):
    name: str
    property_id: str
    api_key: str
    dimensions: list[str] = ["date", "sessionDefaultChannelGrouping"]
    metrics: list[str] = ["sessions", "activeUsers", "bounceRate"]
    date_range_days: int = 30


@router.post("/datasets/google-analytics", status_code=201)
async def create_ga_dataset(
    body: GADatasetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """Create a dataset from Google Analytics Data API."""
    try:
        rows = await fetch_ga_report(
            property_id=body.property_id,
            api_secret=body.api_key,
            dimensions=body.dimensions,
            metrics=body.metrics,
            date_range_days=body.date_range_days,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao buscar dados do GA: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="Nenhum dado retornado. Verifique Property ID e API Key.")

    columns = list(rows[0].keys()) if rows else []
    dataset = ReportDataset(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        name=body.name,
        type="api",
        api_url=f"https://analyticsdata.googleapis.com/v1beta/properties/{body.property_id}:runReport",
        rows=rows,
        columns=columns,
        row_count=len(rows),
        sync_mode="replace",
    )
    db.add(dataset)
    await db.commit()
    return {"id": str(dataset.id), "name": dataset.name, "row_count": len(rows), "columns": columns}


# ---------------------------------------------------------------------------
# G2 — Relatórios Agendados
# ---------------------------------------------------------------------------

from .models import Report
from .scheduled_models import ScheduledReport
from .scheduled_service import ScheduledReportService


# ---------------------------------------------------------------------------
# N7 — Version History for dashboards
# ---------------------------------------------------------------------------


class VersionResponse(BaseModel):
    id: uuid.UUID
    report_id: uuid.UUID
    title: str
    label: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/{report_id}/versions", response_model=list[VersionResponse])
async def list_versions(
    report_id: uuid.UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .version_models import ReportVersion
    result = await db.execute(
        select(ReportVersion)
        .where(ReportVersion.report_id == report_id, ReportVersion.tenant_id == current_user.tenant_id)
        .order_by(ReportVersion.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()


@router.post("/{report_id}/versions")
async def save_version(
    report_id: uuid.UUID,
    label: str | None = Query(None),
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .version_models import ReportVersion
    # Get current report pages
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.tenant_id == current_user.tenant_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado.")

    version = ReportVersion(
        report_id=report_id,
        tenant_id=current_user.tenant_id,
        pages=report.pages or [],
        title=report.title,
        label=label,
    )
    db.add(version)

    # Keep only last 20 versions
    old = await db.execute(
        select(ReportVersion)
        .where(ReportVersion.report_id == report_id, ReportVersion.tenant_id == current_user.tenant_id)
        .order_by(ReportVersion.created_at.desc())
        .offset(20)
    )
    for v in old.scalars().all():
        await db.delete(v)

    await db.commit()
    await db.refresh(version)
    return {"id": str(version.id), "created_at": version.created_at.isoformat()}


@router.post("/{report_id}/versions/{version_id}/restore")
async def restore_version(
    report_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from .version_models import ReportVersion
    from sqlalchemy.orm.attributes import flag_modified

    version = await db.scalar(
        select(ReportVersion).where(
            ReportVersion.id == version_id,
            ReportVersion.report_id == report_id,
            ReportVersion.tenant_id == current_user.tenant_id,
        )
    )
    if not version:
        raise HTTPException(status_code=404, detail="Versão não encontrada.")

    report = await db.scalar(
        select(Report).where(Report.id == report_id, Report.tenant_id == current_user.tenant_id)
    )
    if not report:
        raise HTTPException(status_code=404)

    report.pages = version.pages
    flag_modified(report, 'pages')
    await db.commit()
    return {"ok": True}


class ScheduledReportCreate(BaseModel):
    report_id: uuid.UUID
    report_name: str
    frequency: str  # daily | weekly | monthly
    emails: list[str]


class ScheduledReportUpdate(BaseModel):
    frequency: str | None = None
    emails: list[str] | None = None
    is_active: bool | None = None


class ScheduledReportResponse(BaseModel):
    id: uuid.UUID
    report_id: uuid.UUID
    report_name: str
    frequency: str
    emails: list[str]
    is_active: bool
    next_run: str
    last_run: str | None
    created_at: str

    model_config = {"from_attributes": True}


def _sr_to_response(sr: ScheduledReport) -> ScheduledReportResponse:
    return ScheduledReportResponse(
        id=sr.id,
        report_id=sr.report_id,
        report_name=sr.report_name,
        frequency=sr.frequency,
        emails=sr.emails or [],
        is_active=sr.is_active,
        next_run=sr.next_run.isoformat(),
        last_run=sr.last_run.isoformat() if sr.last_run else None,
        created_at=sr.created_at.isoformat(),
    )


@router.get(
    "/scheduled",
    response_model=list[ScheduledReportResponse],
    summary="Lista relatórios agendados do tenant",
)
async def list_scheduled_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    svc = ScheduledReportService(db)
    items = await svc.list(current_user.tenant_id)
    return [_sr_to_response(sr) for sr in items]


@router.post(
    "/scheduled",
    response_model=ScheduledReportResponse,
    status_code=201,
    summary="Cria agendamento de relatório",
)
async def create_scheduled_report(
    data: ScheduledReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    valid_frequencies = {"daily", "weekly", "monthly"}
    if data.frequency not in valid_frequencies:
        raise HTTPException(
            status_code=422,
            detail=f"Frequência inválida. Use: {', '.join(valid_frequencies)}",
        )
    if not data.emails:
        raise HTTPException(status_code=422, detail="Informe pelo menos um email destinatário.")
    svc = ScheduledReportService(db)
    sr = await svc.create(
        tenant_id=current_user.tenant_id,
        report_id=data.report_id,
        report_name=data.report_name,
        frequency=data.frequency,
        emails=data.emails,
    )
    return _sr_to_response(sr)


@router.post(
    "/scheduled/run-due",
    summary="Dispara envio dos relatórios agendados com next_run vencido (para testes / cron externo)",
)
async def run_due_scheduled_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Busca todos os agendamentos ativos com next_run <= agora, envia email
    para cada destinatário e atualiza last_run / next_run.
    Em produção, este endpoint deve ser chamado por um cron job externo (Railway Cron / Celery Beat).
    """
    from app.core.email import send_admin_email

    svc = ScheduledReportService(db)
    due = await svc.get_due()
    sent_count = 0
    errors: list[str] = []

    for sr in due:
        dashboard_url = f"https://app.jarbis.cc/dashboards/{sr.report_id}"
        subject = f"Relatório agendado: {sr.report_name}"
        html_body = (
            "<!DOCTYPE html>"
            '<html lang="pt-BR"><head><meta charset="utf-8">'
            f"<title>{subject}</title></head>"
            '<body style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;'
            'background:#f1f5f9;margin:0;padding:40px 20px;">'
            '<div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;'
            'overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">'
            '<div style="background:linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%);padding:28px 32px;text-align:center;">'
            '<span style="color:white;font-weight:800;font-size:20px;">jarbis</span></div>'
            '<div style="padding:40px 32px 32px;">'
            '<h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 12px;">'
            f"Seu relatório <b>{sr.report_name}</b> está pronto</h2>"
            '<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">'
            f"Este é um envio automático agendado ({sr.frequency})."
            " Clique abaixo para visualizar o dashboard atualizado.</p>"
            '<div style="text-align:center;margin-bottom:28px;">'
            f'<a href="{dashboard_url}" style="display:inline-block;'
            "background:linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%);"
            'color:white;font-size:15px;font-weight:700;padding:16px 32px;'
            'border-radius:12px;text-decoration:none;">'
            "Ver Dashboard &rarr;</a></div></div>"
            '<div style="border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;background:#f8fafc;">'
            '<p style="color:#94a3b8;font-size:12px;margin:0;">'
            '<a href="https://jarbis.cc" style="color:#94a3b8;text-decoration:none;">jarbis.cc</a>'
            " &nbsp;&middot;&nbsp; &copy; 2026 Jarbis</p></div></div></body></html>"
        )
        for email in sr.emails:
            try:
                await send_admin_email(email, subject, html_body)
                sent_count += 1
            except Exception as exc:
                errors.append(f"{email}: {exc}")
        await svc.mark_sent(sr)

    return {
        "processed": len(due),
        "emails_sent": sent_count,
        "errors": errors,
    }


@router.put(
    "/scheduled/{schedule_id}",
    response_model=ScheduledReportResponse,
    summary="Atualiza agendamento de relatório",
)
async def update_scheduled_report(
    schedule_id: uuid.UUID,
    data: ScheduledReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if data.frequency is not None and data.frequency not in {"daily", "weekly", "monthly"}:
        raise HTTPException(status_code=422, detail="Frequência inválida. Use: daily, weekly, monthly")
    svc = ScheduledReportService(db)
    sr = await svc.update(
        schedule_id=schedule_id,
        tenant_id=current_user.tenant_id,
        frequency=data.frequency,
        emails=data.emails,
        is_active=data.is_active,
    )
    if not sr:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    return _sr_to_response(sr)


@router.delete(
    "/scheduled/{schedule_id}",
    status_code=204,
    summary="Remove agendamento de relatório",
)
async def delete_scheduled_report(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    svc = ScheduledReportService(db)
    deleted = await svc.delete(schedule_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")


# ---------------------------------------------------------------------------
# Report CRUD — parametrizado /{report_id} deve ficar por ÚLTIMO para não
# capturar rotas fixas como /datasets, /public, /alerts, /ai-query, /data
# ---------------------------------------------------------------------------


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Detalhe do relatório",
)
async def get_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ReportService(db)
    report = await service.get(report_id, current_user.tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    return report


@router.put(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Atualiza título, descrição ou blocos do relatório",
)
async def update_report(
    report_id: uuid.UUID,
    data: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ReportService(db)
    report = await service.update(report_id, current_user.tenant_id, data)
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    return report


@router.delete(
    "/{report_id}",
    status_code=204,
    summary="Remove o relatório",
)
async def delete_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ReportService(db)
    deleted = await service.delete(report_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")


@router.post(
    "/{report_id}/share",
    response_model=ShareResponse,
    summary="Gera link público de compartilhamento",
)
async def create_share_link(
    report_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Cria (ou retorna) um link público para o relatório ser visualizado sem login.
    A URL do frontend é gerada substituindo a porta 8000 pela 3000 e usando
    o caminho /r/{token}.
    """
    base_url = str(request.base_url).rstrip("/")
    service = ReportService(db)
    result = await service.get_or_create_share(report_id, current_user.tenant_id, base_url)
    if not result:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    return ShareResponse(**result)
