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

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .dataset_models import ReportDataset
from .dataset_service import DatasetService
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
    api_url: str | None = None
    last_synced_at: str | None = None
    refresh_interval_minutes: int | None = None
    next_refresh_at: str | None = None

    model_config = {"from_attributes": True}


class ApiDatasetCreate(BaseModel):
    name: str
    api_url: str
    api_headers: dict | None = None
    api_data_path: str | None = None

router = APIRouter(prefix="/reports", tags=["Reports"])


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


# ---------------------------------------------------------------------------
# Public endpoint (no auth)
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

    dataset_service = DatasetService(db)
    ds = await dataset_service.get(dataset_id, report.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")

    return dataset_service.query(ds, label_col, value_col, agg, filter_col, filter_val, date_col, date_from, date_to)


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
):
    service = DatasetService(db)
    datasets = await service.list(current_user.tenant_id)
    return [
        DatasetSummary(
            id=ds.id,
            name=ds.name,
            type=ds.type,
            columns=ds.columns or [],
            row_count=ds.row_count,
            api_url=ds.api_url,
            last_synced_at=ds.last_synced_at.isoformat() if ds.last_synced_at else None,
            refresh_interval_minutes=ds.refresh_interval_minutes,
            next_refresh_at=ds.next_refresh_at.isoformat() if ds.next_refresh_at else None,
        )
        for ds in datasets
    ]


@router.post(
    "/datasets/upload",
    response_model=DatasetSummary,
    status_code=201,
    summary="Upload CSV ou Excel para criar dataset",
)
async def upload_dataset(
    file: Annotated[UploadFile, File()],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    filename = file.filename or "dataset"
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 20 MB)")
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    service = DatasetService(db)
    ds = await service.create_from_file(current_user.tenant_id, name, filename, content)
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
):
    service = DatasetService(db)
    try:
        ds = await service.create_from_api(
            current_user.tenant_id,
            body.name,
            body.api_url,
            body.api_headers,
            body.api_data_path,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao buscar API: {e}")
    return DatasetSummary(
        id=ds.id, name=ds.name, type=ds.type,
        columns=ds.columns or [], row_count=ds.row_count,
        api_url=ds.api_url,
        last_synced_at=ds.last_synced_at.isoformat() if ds.last_synced_at else None,
    )


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
):
    service = DatasetService(db)
    ds = await service.get(dataset_id, current_user.tenant_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset não encontrado")
    return service.query(ds, label_col, value_col, agg, filter_col, filter_val, date_col, date_from, date_to)


# ---------------------------------------------------------------------------
# AI — query em linguagem natural
# ---------------------------------------------------------------------------

class AiQueryRequest(BaseModel):
    dataset_id: uuid.UUID
    question: str


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

    schema_str = (
        f"Dataset: {ds.name}\n"
        f"Colunas: {', '.join(columns)}\n"
        f"Amostra ({len(sample)} linhas):\n{json.dumps(sample, ensure_ascii=False, default=str)}"
    )

    system_prompt = (
        "Você é um analista de dados. Dado o schema e amostra de um dataset, responda a pergunta do usuário "
        "retornando SOMENTE um JSON válido (sem markdown, sem texto fora do JSON) com os campos:\n"
        '{"label_col":"coluna para agrupar","value_col":"coluna numérica a agregar","agg":"sum|count|avg|max|min",'
        '"filter_col":null,"filter_val":null,"answer":"resposta em português explicando o que o resultado vai mostrar"}\n'
        "Use apenas nomes de colunas exatamente como aparecem no dataset."
    )

    client = ant.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": f"{schema_str}\n\nPergunta: {data.question}"}],
    )

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

    return {
        "data": query_data,
        "answer": answer,
        "query": {"label_col": label_col, "value_col": value_col, "agg": agg, "filter_col": filter_col, "filter_val": filter_val},
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

    model_config = {"from_attributes": True}


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

    alert.last_value = total
    alert.last_status = _eval_alert(alert, total)
    alert.checked_at = datetime.now(_tz.utc)
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
