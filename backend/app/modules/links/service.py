"""
Serviço do módulo links.

Responsabilidades:
- Criar e listar campanhas e links (PostgreSQL)
- Registrar cliques no ClickHouse (async, não bloqueia o redirect)
- Consultar analytics do ClickHouse
"""

import asyncio
import random
import string
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clickhouse import get_clickhouse
from app.core.exceptions import NotFoundError
from app.modules.links.models import LinkCampaign, ShortLink
from app.modules.links.schemas import (
    CampaignAnalytics,
    CampaignCreate,
    CampaignResponse,
    ClicksByBrowser,
    ClicksByCity,
    ClicksByCountry,
    ClicksByDay,
    ClicksByDevice,
    ClicksByHour,
    ClicksByOS,
    ClicksByReferrer,
    ClicksByWeekday,
    LinkAnalytics,
    ShortLinkCreate,
    ShortLinkResponse,
)


def _build_short_url(slug: str) -> str:
    return f"{settings.frontend_url}/l/{slug}"


def _generate_slug(length: int = 8) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))


def _parse_user_agent(user_agent: str) -> tuple[str, str]:
    """Retorna (device_type, browser) a partir do user agent."""
    ua = user_agent.lower()

    if any(x in ua for x in ("mobi", "android", "iphone", "ipad")):
        device = "mobile"
    elif "tablet" in ua:
        device = "tablet"
    else:
        device = "desktop"

    if "chrome" in ua and "edg" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "edg" in ua:
        browser = "Edge"
    else:
        browser = "Outro"

    return device, browser


def _parse_os(user_agent: str) -> str:
    ua = user_agent.lower()
    if "windows" in ua:
        return "Windows"
    if "mac os" in ua or "macos" in ua:
        return "macOS"
    if "android" in ua:
        return "Android"
    if "iphone" in ua or "ipad" in ua:
        return "iOS"
    if "linux" in ua:
        return "Linux"
    return "Outro"


# ── Campaigns ──────────────────────────────────────────────────────────────

async def create_campaign(
    db: AsyncSession, tenant_id: uuid.UUID, data: CampaignCreate
) -> CampaignResponse:
    campaign = LinkCampaign(
        tenant_id=tenant_id,
        name=data.name,
        description=data.description,
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        description=campaign.description,
        created_at=campaign.created_at,
        links_count=0,
    )


async def list_campaigns(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[CampaignResponse]:
    result = await db.execute(
        select(
            LinkCampaign,
            func.count(ShortLink.id).label("links_count"),
        )
        .outerjoin(ShortLink, ShortLink.campaign_id == LinkCampaign.id)
        .where(LinkCampaign.tenant_id == tenant_id)
        .group_by(LinkCampaign.id)
        .order_by(LinkCampaign.created_at.desc())
    )
    rows = result.all()
    return [
        CampaignResponse(
            id=row.LinkCampaign.id,
            name=row.LinkCampaign.name,
            description=row.LinkCampaign.description,
            created_at=row.LinkCampaign.created_at,
            links_count=row.links_count,
        )
        for row in rows
    ]


async def get_campaign(
    db: AsyncSession, tenant_id: uuid.UUID, campaign_id: uuid.UUID
) -> LinkCampaign:
    campaign = await db.scalar(
        select(LinkCampaign).where(
            LinkCampaign.id == campaign_id,
            LinkCampaign.tenant_id == tenant_id,
        )
    )
    if not campaign:
        raise NotFoundError("campanha", str(campaign_id))
    return campaign


# ── Short Links ────────────────────────────────────────────────────────────

async def create_link(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: ShortLinkCreate,
) -> ShortLinkResponse:
    await get_campaign(db, tenant_id, campaign_id)

    # Slug: personalizado ou gerado automaticamente
    if data.custom_slug:
        existing = await db.scalar(select(ShortLink).where(ShortLink.slug == data.custom_slug))
        if existing:
            from app.core.exceptions import ConflictError
            raise ConflictError(f"O slug '{data.custom_slug}' já está em uso. Escolha outro.")
        slug = data.custom_slug
    else:
        for _ in range(10):
            slug = _generate_slug()
            existing = await db.scalar(select(ShortLink).where(ShortLink.slug == slug))
            if not existing:
                break

    link = ShortLink(
        tenant_id=tenant_id,
        campaign_id=campaign_id,
        slug=slug,
        original_url=data.original_url,
        name=data.name,
    )
    db.add(link)
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
        short_url=_build_short_url(link.slug),
    )


async def list_links(
    db: AsyncSession, tenant_id: uuid.UUID, campaign_id: uuid.UUID
) -> list[ShortLinkResponse]:
    await get_campaign(db, tenant_id, campaign_id)
    result = await db.scalars(
        select(ShortLink)
        .where(
            ShortLink.tenant_id == tenant_id,
            ShortLink.campaign_id == campaign_id,
        )
        .order_by(ShortLink.created_at.desc())
    )
    links = result.all()
    return [
        ShortLinkResponse(
            id=lnk.id,
            campaign_id=lnk.campaign_id,
            slug=lnk.slug,
            original_url=lnk.original_url,
            name=lnk.name,
            clicks_cached=lnk.clicks_cached,
            is_active=lnk.is_active,
            created_at=lnk.created_at,
            short_url=_build_short_url(lnk.slug),
        )
        for lnk in links
    ]


async def resolve_slug(db: AsyncSession, slug: str) -> ShortLink | None:
    """Resolve slug para o link original. Retorna None se não existir."""
    return await db.scalar(
        select(ShortLink).where(ShortLink.slug == slug, ShortLink.is_active == True)  # noqa: E712
    )


# ── Click tracking (ClickHouse) ────────────────────────────────────────────

def record_click(
    tenant_id: str,
    link_id: str,
    slug: str,
    ip_address: str,
    user_agent: str,
    referrer: str,
) -> None:
    """
    Registra clique no ClickHouse de forma síncrona.
    Deve ser chamado via asyncio.to_thread para não bloquear o event loop.
    """
    if not settings.clickhouse_host:
        return

    device_type, browser = _parse_user_agent(user_agent)
    os_name = _parse_os(user_agent)

    from app.core.geoip import lookup as _geoip_lookup
    country, city = _geoip_lookup(ip_address)

    client = get_clickhouse()
    client.insert(
        "link_events",
        [[
            str(uuid.uuid4()),
            tenant_id,
            link_id,
            slug,
            datetime.now(timezone.utc),
            ip_address,
            country,
            city,
            device_type,
            browser,
            os_name,
            referrer,
            user_agent,
        ]],
        column_names=[
            "event_id", "tenant_id", "link_id", "slug", "clicked_at",
            "ip_address", "country", "city", "device_type", "browser",
            "os", "referrer", "user_agent",
        ],
    )


# ── Analytics ──────────────────────────────────────────────────────────────

def _ch_query(sql: str) -> list:
    if not settings.clickhouse_host:
        return []
    return get_clickhouse().query(sql).result_rows


_WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

_REFERRER_CASE = """multiIf(
    referrer = '', 'Direto',
    referrer LIKE '%google%', 'Google',
    referrer LIKE '%instagram%', 'Instagram',
    referrer LIKE '%facebook%' OR referrer LIKE '%fb.com%', 'Facebook',
    referrer LIKE '%whatsapp%' OR referrer LIKE '%wa.me%', 'WhatsApp',
    referrer LIKE '%t.co%' OR referrer LIKE '%twitter%' OR referrer LIKE '%x.com%', 'Twitter / X',
    referrer LIKE '%linkedin%', 'LinkedIn',
    referrer LIKE '%tiktok%', 'TikTok',
    referrer LIKE '%youtube%' OR referrer LIKE '%youtu.be%', 'YouTube',
    'Outro'
)"""


def get_link_analytics(link_id: str, days: int = 30) -> LinkAnalytics:
    base = f"FROM link_events WHERE link_id = '{link_id}' AND clicked_at >= now() - INTERVAL {days} DAY"

    totals = _ch_query(f"SELECT count(), uniq(ip_address) {base}")
    total_clicks = totals[0][0] if totals else 0
    unique_clicks = totals[0][1] if totals else 0

    countries = _ch_query(
        f"SELECT country, count() as c {base} AND country != '' GROUP BY country ORDER BY c DESC LIMIT 20"
    )
    unique_countries = len(countries)

    by_day = _ch_query(
        f"SELECT formatDateTime(clicked_at, '%Y-%m-%d') as d, count() as c {base} GROUP BY d ORDER BY d"
    )
    by_country = _ch_query(
        f"SELECT country, count() as c {base} GROUP BY country ORDER BY c DESC LIMIT 20"
    )
    by_device = _ch_query(
        f"SELECT device_type, count() as c {base} GROUP BY device_type ORDER BY c DESC"
    )
    by_hour = _ch_query(
        f"SELECT toHour(clicked_at) as h, count() as c {base} GROUP BY h ORDER BY h"
    )
    by_browser = _ch_query(
        f"SELECT browser, count() as c {base} AND browser != '' GROUP BY browser ORDER BY c DESC LIMIT 10"
    )
    by_os = _ch_query(
        f"SELECT os, count() as c {base} AND os != '' GROUP BY os ORDER BY c DESC LIMIT 10"
    )
    by_weekday = _ch_query(
        f"SELECT toDayOfWeek(clicked_at) as dow, count() as c {base} GROUP BY dow ORDER BY dow"
    )
    by_referrer = _ch_query(
        f"SELECT {_REFERRER_CASE} as source, count() as c {base} GROUP BY source ORDER BY c DESC LIMIT 10"
    )
    by_city = _ch_query(
        f"SELECT city, country, count() as c {base} AND city != '' GROUP BY city, country ORDER BY c DESC LIMIT 20"
    )

    return LinkAnalytics(
        link_id=link_id,
        total_clicks=total_clicks,
        unique_clicks=unique_clicks,
        unique_countries=unique_countries,
        by_day=[ClicksByDay(date=r[0], clicks=r[1]) for r in by_day],
        by_country=[ClicksByCountry(country=r[0] or "Desconhecido", clicks=r[1]) for r in by_country],
        by_device=[ClicksByDevice(device_type=r[0] or "Desconhecido", clicks=r[1]) for r in by_device],
        by_hour=[ClicksByHour(hour=r[0], clicks=r[1]) for r in by_hour],
        by_browser=[ClicksByBrowser(browser=r[0] or "Outro", clicks=r[1]) for r in by_browser],
        by_os=[ClicksByOS(os=r[0] or "Outro", clicks=r[1]) for r in by_os],
        by_weekday=[ClicksByWeekday(weekday=_WEEKDAY_NAMES[(r[0] - 1) % 7], clicks=r[1]) for r in by_weekday],
        by_referrer=[ClicksByReferrer(source=r[0], clicks=r[1]) for r in by_referrer],
        by_city=[ClicksByCity(city=r[0], country=r[1], clicks=r[2]) for r in by_city],
    )


def get_campaign_analytics(campaign_id: str, link_ids: list[str], days: int = 30) -> CampaignAnalytics:
    if not link_ids:
        return CampaignAnalytics(
            campaign_id=campaign_id,
            total_clicks=0,
            links=[],
            by_day=[],
            by_country=[],
            by_device=[],
        )

    ids_str = ", ".join(f"'{lid}'" for lid in link_ids)
    base = f"FROM link_events WHERE link_id IN ({ids_str}) AND clicked_at >= now() - INTERVAL {days} DAY"

    totals = _ch_query(f"SELECT count(), uniq(ip_address) {base}")
    total_clicks = totals[0][0] if totals else 0
    unique_clicks = totals[0][1] if totals else 0

    per_link = _ch_query(
        f"SELECT link_id, count() as c {base} GROUP BY link_id ORDER BY c DESC"
    )
    by_day = _ch_query(
        f"SELECT formatDateTime(clicked_at, '%Y-%m-%d') as d, count() as c {base} GROUP BY d ORDER BY d"
    )
    by_country = _ch_query(
        f"SELECT country, count() as c {base} GROUP BY country ORDER BY c DESC LIMIT 20"
    )
    by_device = _ch_query(
        f"SELECT device_type, count() as c {base} GROUP BY device_type ORDER BY c DESC"
    )
    by_hour = _ch_query(
        f"SELECT toHour(clicked_at) as h, count() as c {base} GROUP BY h ORDER BY h"
    )
    by_browser = _ch_query(
        f"SELECT browser, count() as c {base} AND browser != '' GROUP BY browser ORDER BY c DESC LIMIT 10"
    )
    by_os = _ch_query(
        f"SELECT os, count() as c {base} AND os != '' GROUP BY os ORDER BY c DESC LIMIT 10"
    )
    by_weekday = _ch_query(
        f"SELECT toDayOfWeek(clicked_at) as dow, count() as c {base} GROUP BY dow ORDER BY dow"
    )
    by_referrer = _ch_query(
        f"SELECT {_REFERRER_CASE} as source, count() as c {base} GROUP BY source ORDER BY c DESC LIMIT 10"
    )
    by_city = _ch_query(
        f"SELECT city, country, count() as c {base} AND city != '' GROUP BY city, country ORDER BY c DESC LIMIT 20"
    )

    return CampaignAnalytics(
        campaign_id=campaign_id,
        total_clicks=total_clicks,
        unique_clicks=unique_clicks,
        links=[{"link_id": r[0], "clicks": r[1]} for r in per_link],
        by_day=[ClicksByDay(date=r[0], clicks=r[1]) for r in by_day],
        by_country=[ClicksByCountry(country=r[0] or "Desconhecido", clicks=r[1]) for r in by_country],
        by_device=[ClicksByDevice(device_type=r[0] or "Desconhecido", clicks=r[1]) for r in by_device],
        by_hour=[ClicksByHour(hour=r[0], clicks=r[1]) for r in by_hour],
        by_browser=[ClicksByBrowser(browser=r[0] or "Outro", clicks=r[1]) for r in by_browser],
        by_os=[ClicksByOS(os=r[0] or "Outro", clicks=r[1]) for r in by_os],
        by_weekday=[ClicksByWeekday(weekday=_WEEKDAY_NAMES[(r[0] - 1) % 7], clicks=r[1]) for r in by_weekday],
        by_referrer=[ClicksByReferrer(source=r[0], clicks=r[1]) for r in by_referrer],
        by_city=[ClicksByCity(city=r[0], country=r[1], clicks=r[2]) for r in by_city],
    )
