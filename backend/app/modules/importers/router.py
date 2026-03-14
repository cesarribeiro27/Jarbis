"""
Endpoints de importação de dados externos.
"""

import json
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File
from redis.asyncio import Redis

from app.database import AsyncSessionLocal, get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .anatel.service import AnatelImporter
from .ibge.service import IbgeImporter
from .digital.service import DigitalPortalsImporter
from .digital.audience_csv import import_audience_csv
from app.modules.vehicles.enrichment import enrich_all_vehicles

router = APIRouter(prefix="/importers", tags=["Importadores"])


def _redis_client() -> Redis:
    from app.config import settings
    return Redis.from_url(settings.redis_url, decode_responses=True)


# =============================================================================
# Helpers genéricos de background
# =============================================================================

async def _run_import(redis_key: str, job_started_at: str, importer_coro) -> None:
    redis = _redis_client()
    try:
        await redis.set(redis_key, json.dumps({"status": "running", "started_at": job_started_at}))

        async with AsyncSessionLocal() as db:
            stats = await importer_coro(db)

        await redis.set(
            redis_key,
            json.dumps({
                "status": "completed",
                "started_at": job_started_at,
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "stats": stats,
            }),
            ex=86400,
        )
    except Exception as exc:
        tb = traceback.format_exc()
        print(f"[IMPORT ERROR {redis_key}]\n{tb}")
        await redis.set(
            redis_key,
            json.dumps({
                "status": "error",
                "started_at": job_started_at,
                "error": str(exc),
                "traceback": tb[-2000:],
            }),
            ex=3600,
        )
    finally:
        await redis.aclose()


async def _check_and_start(redis_key: str, background_tasks: BackgroundTasks, coro_factory) -> dict:
    redis = _redis_client()
    current = await redis.get(redis_key)
    await redis.aclose()

    if current:
        data = json.loads(current)
        if data.get("status") == "running":
            return {"status": "already_running", "detail": "Importação já em andamento."}

    started_at = datetime.now(timezone.utc).isoformat()
    background_tasks.add_task(_run_import, redis_key, started_at, coro_factory)
    return {"status": "started", "started_at": started_at}


async def _get_status(redis_key: str) -> dict:
    redis = _redis_client()
    current = await redis.get(redis_key)
    await redis.aclose()
    if not current:
        return {"status": "idle", "detail": "Nenhuma importação executada ainda."}
    return json.loads(current)


# =============================================================================
# ANATEL — Estações de rádio e TV
# =============================================================================

ANATEL_KEY = "lumetra:import:anatel"


@router.post("/anatel", summary="Importar estações de rádio e TV da ANATEL")
async def trigger_anatel_import(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
):
    """
    Baixa o dataset de radiodifusão da ANATEL (~23k estações),
    normaliza e faz upsert na tabela de veículos.
    """
    async def _run(db):
        return await AnatelImporter().run(db)

    return await _check_and_start(ANATEL_KEY, background_tasks, _run)


@router.get("/anatel/status", summary="Status da última importação ANATEL")
async def anatel_import_status(current_user: User = Depends(get_current_active_user)):
    return await _get_status(ANATEL_KEY)


# =============================================================================
# IBGE — Municípios e população (Censo 2022)
# =============================================================================

IBGE_KEY = "lumetra:import:ibge"


@router.post("/ibge", summary="Importar municípios e população do IBGE")
async def trigger_ibge_import(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
):
    """
    Importa os 5.571 municípios brasileiros com dados populacionais do Censo 2022.
    Após importar, atualiza os veículos da ANATEL com os códigos IBGE corretos.
    """
    async def _run(db):
        return await IbgeImporter().run(db)

    return await _check_and_start(IBGE_KEY, background_tasks, _run)


@router.get("/ibge/status", summary="Status da última importação IBGE")
async def ibge_import_status(current_user: User = Depends(get_current_active_user)):
    return await _get_status(IBGE_KEY)


# =============================================================================
# CNPJ Enrichment — telefone e e-mail via Brasil API
# =============================================================================

CNPJ_ENRICH_KEY = "lumetra:import:cnpj_enrich"


@router.post("/cnpj-enrich", summary="Enriquecer veículos com dados do CNPJ (Brasil API)")
async def trigger_cnpj_enrich(
    background_tasks: BackgroundTasks,
    overwrite: bool = False,
    current_user: User = Depends(get_current_active_user),
):
    """
    Consulta a Brasil API para todos os veículos com CNPJ cadastrado e
    preenche automaticamente telefone, e-mail e nome fantasia.

    Respeita o rate limit da Brasil API (~3 req/s).
    O processo roda em background — use /cnpj-enrich/status para acompanhar.
    """
    async def _run(db):
        return await enrich_all_vehicles(db, overwrite=overwrite)

    return await _check_and_start(CNPJ_ENRICH_KEY, background_tasks, _run)


@router.get("/cnpj-enrich/status", summary="Status do enriquecimento CNPJ")
async def cnpj_enrich_status(current_user: User = Depends(get_current_active_user)):
    return await _get_status(CNPJ_ENRICH_KEY)


# =============================================================================
# Digital Portals — Portais digitais brasileiros (lista curada)
# =============================================================================

DIGITAL_KEY = "lumetra:import:digital_portals"


@router.post("/digital-portals", summary="Importar portais digitais brasileiros (lista curada)")
async def trigger_digital_portals_import(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
):
    """
    Faz upsert dos ~80 principais portais digitais brasileiros a partir da lista
    curada da Lumetra (baseada em SimilarWeb, Secom e levantamento editorial).

    Cria veículos do tipo DIGITAL com segmento, grupo, escopo e URL.
    Para atualizar dados de audiência (pageviews, visitantes únicos) use
    POST /vehicles/{id}/audience com metric_type=PAGE_VIEWS ou UNIQUE_VISITORS.
    """
    async def _run(db):
        return await DigitalPortalsImporter().run(db)

    return await _check_and_start(DIGITAL_KEY, background_tasks, _run)


@router.get("/digital-portals/status", summary="Status da última importação de portais digitais")
async def digital_portals_import_status(current_user: User = Depends(get_current_active_user)):
    return await _get_status(DIGITAL_KEY)


# =============================================================================
# Audiência Digital — import bulk via CSV (atualização mensal)
# =============================================================================

@router.post(
    "/digital-audience-csv",
    summary="Importar audiência mensal de portais digitais via CSV",
)
async def import_digital_audience_csv(
    file: UploadFile = File(..., description="CSV com colunas: domain,month,pageviews,unique_visitors"),
    db=Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Importa dados mensais de audiência (pageviews e visitantes únicos) de portais digitais.

    **Formato do CSV** (vírgula ou ponto-e-vírgula como separador):
    ```
    domain,month,pageviews,unique_visitors
    g1.globo.com,2024-01,280000000,55000000
    uol.com.br,2024-01,190000000,42000000
    ```

    - `domain`: domínio exato conforme cadastrado (ex: `g1.globo.com`)
    - `month`: mês no formato `YYYY-MM`
    - `pageviews`: total de visualizações de página (pode omitir)
    - `unique_visitors`: visitantes únicos (pode omitir)

    Dados são upsertados — enviar o mesmo mês duas vezes substitui os valores.
    """
    content = (await file.read()).decode("utf-8-sig")
    stats = await import_audience_csv(content, db)
    return stats
