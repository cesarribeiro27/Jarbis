"""
Endpoints OOH — campanhas e painéis de mídia exterior.

POST /ooh/campaigns/upload    — Upload CSV → cria campanha + painéis
GET  /ooh/campaigns           — Lista campanhas do tenant
GET  /ooh/campaigns/{id}      — Detalhes com painéis e mapa
GET  /ooh/template.csv        — Download do template CSV
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Request, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .schemas import (
    CsvUploadResult, OohCampaignResponse, OohCampaignSummary,
    PublicCampaignResponse, ShareLinkResponse,
)
from .service import OohService

router = APIRouter(prefix="/ooh", tags=["OOH"])

CSV_TEMPLATE = (
    "nome,endereco,cidade,uf,formato,largura_m,altura_m,digital,iluminado,"
    "operadora,fluxo_diario,ots_mensal,valor_periodo\n"
    "Painel Paulista,Av. Paulista 1578,São Paulo,SP,OUTDOOR,9,3,Não,Sim,"
    "Eletromidia,50000,,15000\n"
    "Painel Ipanema,R. Visconde de Pirajá 250,Rio de Janeiro,RJ,BACKLIGHT,4,3,Não,Sim,"
    "JCDecaux,30000,,8000\n"
    "Painel Digital Centro,Praça da Sé s/n,São Paulo,SP,DIGITAL,6,4,Sim,Sim,"
    "Eletromidia,80000,2400000,25000\n"
)


async def _run_geocoding(campaign_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        service = OohService(db)
        await service.geocode_campaign(campaign_id)


@router.get("/template.csv", summary="Download do template CSV para upload de painéis OOH")
async def download_template():
    return Response(
        content=CSV_TEMPLATE.encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=lumetra_ooh_template.csv"},
    )


@router.post(
    "/campaigns/upload",
    response_model=CsvUploadResult,
    summary="Upload CSV de painéis OOH → cria campanha",
    status_code=201,
)
async def upload_ooh_csv(
    background_tasks: BackgroundTasks,
    campaign_name: Annotated[str, Form()],
    file: Annotated[UploadFile, File(description="CSV com os painéis da campanha")],
    advertiser: Annotated[str | None, Form()] = None,
    data_inicio: Annotated[str | None, Form()] = None,
    data_fim: Annotated[str | None, Form()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Importa painéis OOH via CSV.

    Após a criação, inicia geocodificação automática em background
    (1 painel/segundo via Nominatim/OpenStreetMap).

    Use GET /ooh/template.csv para baixar o modelo de CSV.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 5 MB)")

    service = OohService(db)
    result = await service.upload_csv(
        tenant_id=current_user.tenant_id,
        campaign_name=campaign_name,
        advertiser=advertiser,
        data_inicio=data_inicio,
        data_fim=data_fim,
        csv_content=content,
    )

    if result.paineis_importados > 0:
        background_tasks.add_task(_run_geocoding, result.campaign_id)

    return result


@router.get(
    "/campaigns",
    response_model=list[OohCampaignSummary],
    summary="Lista campanhas OOH do tenant",
)
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OohService(db)
    campaigns = await service.list_campaigns(current_user.tenant_id)
    return [OohCampaignSummary(**c) for c in campaigns]


@router.post(
    "/campaigns/{campaign_id}/share",
    response_model=ShareLinkResponse,
    summary="Gera link público de compartilhamento",
)
async def create_share_link(
    campaign_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Cria (ou retorna) um link público para o cliente visualizar a campanha
    sem precisar de login. O link é único por campanha e pode ser revogado.
    """
    service = OohService(db)
    share = await service.get_or_create_share(campaign_id, current_user.tenant_id)
    if not share:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")

    base_url = str(request.base_url).rstrip("/")
    return ShareLinkResponse(
        token=share.token,
        share_url=f"{base_url}/ooh/share/{share.token}",
        is_active=share.is_active,
        view_count=share.view_count,
        created_at=share.created_at,
    )


@router.delete(
    "/campaigns/{campaign_id}/share",
    summary="Revoga o link público de compartilhamento",
)
async def revoke_share_link(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OohService(db)
    revoked = await service.revoke_share(campaign_id, current_user.tenant_id)
    if not revoked:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    return {"status": "revoked"}


@router.get(
    "/share/{token}",
    response_model=PublicCampaignResponse,
    summary="View pública da campanha (sem autenticação)",
)
async def get_public_campaign(token: str, db: AsyncSession = Depends(get_db)):
    """
    Endpoint público acessado pelo link compartilhado.
    Não requer autenticação — retorna dados seguros para exibição ao cliente.
    """
    service = OohService(db)
    campaign = await service.get_public_campaign(token)
    if not campaign:
        raise HTTPException(status_code=404, detail="Link inválido ou expirado")

    panels = campaign.panels or []
    geocoded = [p for p in panels if p.geocode_status == "OK"]
    alcance = sum(p.alcance_estimado or 0 for p in panels) or None
    fluxo = sum(p.fluxo_diario or 0 for p in panels) or None
    invest = sum(p.valor_periodo or 0 for p in panels) or None

    return PublicCampaignResponse(
        id=campaign.id,
        name=campaign.name,
        advertiser=campaign.advertiser,
        data_inicio=campaign.data_inicio,
        data_fim=campaign.data_fim,
        status=campaign.status,
        notes=campaign.notes,
        panels=panels,
        total_paineis=len(panels),
        paineis_geocodificados=len(geocoded),
        alcance_total_estimado=alcance,
        fluxo_total_diario=fluxo,
        investimento_total=invest,
    )


@router.get(
    "/campaigns/{campaign_id}",
    response_model=OohCampaignResponse,
    summary="Detalhes da campanha com todos os painéis",
)
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OohService(db)
    campaign = await service.get_campaign(campaign_id, current_user.tenant_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")

    panels = campaign.panels
    geocoded = [p for p in panels if p.geocode_status == "OK"]
    alcance = sum(p.alcance_estimado or 0 for p in panels) or None
    fluxo = sum(p.fluxo_diario or 0 for p in panels) or None
    invest = sum(p.valor_periodo or 0 for p in panels) or None

    return OohCampaignResponse(
        id=campaign.id,
        tenant_id=campaign.tenant_id,
        name=campaign.name,
        advertiser=campaign.advertiser,
        data_inicio=campaign.data_inicio,
        data_fim=campaign.data_fim,
        status=campaign.status,
        notes=campaign.notes,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        panels=panels,
        total_paineis=len(panels),
        paineis_geocodificados=len(geocoded),
        alcance_total_estimado=alcance,
        fluxo_total_diario=fluxo,
        investimento_total=invest,
    )
