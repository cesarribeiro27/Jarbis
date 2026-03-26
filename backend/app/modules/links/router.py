"""
Router do módulo links.

Endpoints públicos:
  GET  /l/{slug}                          - Redirect + registra clique

Endpoints autenticados:
  POST /links/campaigns                   - Criar campanha
  GET  /links/campaigns                   - Listar campanhas
  POST /links/campaigns/{id}/links        - Criar link na campanha
  GET  /links/campaigns/{id}/links        - Listar links da campanha
  GET  /links/campaigns/{id}/analytics    - Analytics da campanha
  GET  /links/{link_id}/analytics         - Analytics de um link
"""

import asyncio
import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User
from app.modules.links import service
from app.modules.links.schemas import (
    CampaignAnalytics,
    CampaignCreate,
    CampaignResponse,
    LinkAnalytics,
    ShortLinkCreate,
    ShortLinkUpdate,
    ShortLinkResponse,
)

router = APIRouter()

# ── Redirect público ───────────────────────────────────────────────────────

@router.get("/l/{slug}", include_in_schema=False)
async def redirect_link(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    link = await service.resolve_slug(db, slug)
    if not link:
        return RedirectResponse(url="/", status_code=302)

    ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")

    # Registra clique sem bloquear o redirect
    asyncio.create_task(
        asyncio.to_thread(
            service.record_click,
            str(link.tenant_id),
            str(link.id),
            slug,
            ip,
            user_agent,
            referrer,
        )
    )

    return RedirectResponse(url=link.original_url, status_code=302)


# ── Campanhas ──────────────────────────────────────────────────────────────

@router.post("/links/campaigns", response_model=CampaignResponse, tags=["Links"])
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    return await service.create_campaign(db, user.tenant_id, data)


@router.get("/links/campaigns", response_model=list[CampaignResponse], tags=["Links"])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    return await service.list_campaigns(db, user.tenant_id)


# ── Links de uma campanha ──────────────────────────────────────────────────

@router.post(
    "/links/campaigns/{campaign_id}/links",
    response_model=ShortLinkResponse,
    tags=["Links"],
)
async def create_link(
    campaign_id: uuid.UUID,
    data: ShortLinkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    return await service.create_link(db, user.tenant_id, campaign_id, data)


@router.get(
    "/links/campaigns/{campaign_id}/links",
    response_model=list[ShortLinkResponse],
    tags=["Links"],
)
async def list_links(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    return await service.list_links(db, user.tenant_id, campaign_id)


# ── Editar link ───────────────────────────────────────────────────────────

@router.patch("/links/{link_id}", response_model=ShortLinkResponse, tags=["Links"])
async def update_link(
    link_id: uuid.UUID,
    data: ShortLinkUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    from sqlalchemy import select
    from app.modules.links.models import ShortLink
    from app.config import settings as _settings

    link = await db.scalar(
        select(ShortLink).where(ShortLink.id == link_id, ShortLink.tenant_id == user.tenant_id)
    )
    if not link:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("link", str(link_id))
    link.name = data.name.strip()
    await db.flush()
    await db.refresh(link)
    return ShortLinkResponse(
        id=link.id,
        campaign_id=link.campaign_id,
        slug=link.slug,
        original_url=link.original_url,
        name=link.name,
        clicks_cached=link.clicks_cached,
        is_active=link.is_active,
        created_at=link.created_at,
        short_url=f"{_settings.frontend_url}/l/{link.slug}",
    )


# ── Analytics ──────────────────────────────────────────────────────────────

@router.get(
    "/links/{link_id}/analytics",
    response_model=LinkAnalytics,
    tags=["Links"],
)
async def link_analytics(
    link_id: uuid.UUID,
    days: int = 30,
    user: User = Depends(get_current_active_user),
):
    result = await asyncio.to_thread(
        service.get_link_analytics, str(link_id), days
    )
    return result


@router.get(
    "/links/campaigns/{campaign_id}/analytics",
    response_model=CampaignAnalytics,
    tags=["Links"],
)
async def campaign_analytics(
    campaign_id: uuid.UUID,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    links = await service.list_links(db, user.tenant_id, campaign_id)
    link_ids = [str(lnk.id) for lnk in links]
    result = await asyncio.to_thread(
        service.get_campaign_analytics, str(campaign_id), link_ids, days
    )
    return result
