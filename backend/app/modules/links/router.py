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
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select as _select
from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User, Tenant as TenantModel
from app.modules.billing.guards import check_link_campaign_limit, check_link_per_campaign_limit
from app.modules.billing.plan_limits import PLANS
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

# ── Helpers de redirect ────────────────────────────────────────────────────

def _is_whatsapp_url(url: str) -> bool:
    """Retorna True se o destino é um link do WhatsApp (wa.me, api.whatsapp.com, whatsapp://)."""
    from urllib.parse import urlparse
    try:
        p = urlparse(url)
        host = p.netloc.lower().lstrip("www.")
        return p.scheme == "whatsapp" or host in ("wa.me", "api.whatsapp.com", "web.whatsapp.com")
    except Exception:
        return False


def _whatsapp_landing_html(dest_url: str, slug: str = "") -> str:
    """
    Página intermediária para links WhatsApp.

    In-app browsers (Instagram, Facebook, TikTok…) bloqueiam redirects 302
    para deep links de apps externos. Um clique humano num botão <a href> é
    permitido. Esta página tenta auto-redirect via JS e exibe o botão como
    fallback garantido.
    """
    import html as _html, json as _json
    safe_attr = _html.escape(dest_url, quote=True)
    safe_js   = _json.dumps(dest_url)          # URL entre aspas, caracteres escapados
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Abrindo WhatsApp...</title>
  <style>
    *{{margin:0;padding:0;box-sizing:border-box}}
    body{{min-height:100dvh;display:flex;align-items:center;justify-content:center;
         background:#0B0A1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px}}
    .card{{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
           border-radius:20px;padding:40px 32px;text-align:center;max-width:360px;width:100%}}
    .ico{{width:64px;height:64px;background:#25D366;border-radius:50%;
          display:flex;align-items:center;justify-content:center;margin:0 auto 20px}}
    h1{{color:#fff;font-size:20px;font-weight:700;margin-bottom:8px}}
    p{{color:rgba(255,255,255,.5);font-size:14px;line-height:1.55;margin-bottom:28px}}
    a{{display:block;background:#25D366;color:#fff;text-decoration:none;
       font-weight:700;font-size:16px;padding:16px;border-radius:12px;
       -webkit-tap-highlight-color:transparent}}
    a:active{{opacity:.85}}
  </style>
</head>
<body>
  <div class="card">
    <div class="ico">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </div>
    <h1>Abrindo WhatsApp...</h1>
    <p>Você está sendo redirecionado.<br>Se não abrir automaticamente, toque no botão abaixo.</p>
    <a href="{safe_attr}" id="btn" onclick="trackAndOpen(event)">Abrir WhatsApp</a>
  </div>
  <script>
    var dest={safe_js};
    function trackAndOpen(e){{
      e.preventDefault();
      fetch('/l/{slug}/wa-open',{{method:'POST',keepalive:true}}).catch(function(){{}});
      setTimeout(function(){{window.location.href=dest;}},80);
    }}
    window.location.href=dest;
  </script>
</body>
</html>"""


# ── Redirect público ───────────────────────────────────────────────────────

@router.get("/l/{slug}", include_in_schema=False)
async def redirect_link(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    link = await service.resolve_slug(db, slug)
    if not link:
        return RedirectResponse(url="/", status_code=302)

    # X-Forwarded-For contém o IP real quando há proxy (Railway, Cloudflare, etc.)
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    user_agent = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")

    # Incrementa contador no Postgres
    link.clicks_cached = (link.clicks_cached or 0) + 1
    await db.commit()

    # Registra clique sem bloquear o redirect
    async def _record():
        try:
            await asyncio.to_thread(
                service.record_click,
                str(link.tenant_id),
                str(link.id),
                slug,
                ip,
                user_agent,
                referrer,
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("[ClickHouse] Task falhou para slug=%s: %s", slug, exc, exc_info=True)

    asyncio.create_task(_record())

    if _is_whatsapp_url(link.original_url):
        return HTMLResponse(content=_whatsapp_landing_html(link.original_url, slug))

    return RedirectResponse(url=link.original_url, status_code=302)


@router.post("/l/{slug}/wa-open", include_in_schema=False)
async def whatsapp_button_click(slug: str, db: AsyncSession = Depends(get_db)):
    """Registra clique manual no botão 'Abrir WhatsApp' da landing page intermediária."""
    from app.modules.links.models import ShortLink
    link = await db.scalar(_select(ShortLink).where(ShortLink.slug == slug))
    if link:
        link.whatsapp_button_clicks = (link.whatsapp_button_clicks or 0) + 1
        await db.commit()
    return {"ok": True}


# ── Campanhas ──────────────────────────────────────────────────────────────

@router.post("/links/campaigns", response_model=CampaignResponse, tags=["Links"])
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    tenant = await db.scalar(_select(TenantModel).where(TenantModel.id == user.tenant_id))
    await check_link_campaign_limit(db, user.tenant_id, tenant.plan or "free")
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
    tenant = await db.scalar(_select(TenantModel).where(TenantModel.id == user.tenant_id))
    await check_link_per_campaign_limit(db, user.tenant_id, campaign_id, tenant.plan or "free")
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
    if data.name is not None:
        link.name = data.name.strip()
    if data.original_url is not None:
        link.original_url = data.original_url.strip()
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
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    tenant = await db.scalar(_select(TenantModel).where(TenantModel.id == user.tenant_id))
    limits = PLANS.get(tenant.plan or "free", PLANS["free"])
    if not limits.allow_link_analytics:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Analytics de links disponível apenas em planos pagos.")
    from app.modules.links.models import ShortLink
    link = await db.scalar(_select(ShortLink).where(ShortLink.id == link_id, ShortLink.tenant_id == user.tenant_id))
    result = await asyncio.to_thread(
        service.get_link_analytics, str(link_id), days
    )
    result.whatsapp_button_clicks = (link.whatsapp_button_clicks or 0) if link else 0
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
    tenant = await db.scalar(_select(TenantModel).where(TenantModel.id == user.tenant_id))
    limits = PLANS.get(tenant.plan or "free", PLANS["free"])
    if not limits.allow_link_analytics:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Analytics de links disponível apenas em planos pagos.")
    links = await service.list_links(db, user.tenant_id, campaign_id)
    link_ids = [str(lnk.id) for lnk in links]
    result = await asyncio.to_thread(
        service.get_campaign_analytics, str(campaign_id), link_ids, days
    )
    result.whatsapp_button_clicks = sum(lnk.whatsapp_button_clicks or 0 for lnk in links)
    return result
