"""
OAuth flows para redes sociais.

Fluxo:
  1. Usuário acessa GET /social/oauth/{platform}/authorize
  2. É redirecionado para a plataforma
  3. Plataforma redireciona de volta para GET /social/oauth/{platform}/callback?code=...
  4. Backend troca o code por access_token e salva em SocialToken
"""

import os
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .models import SocialToken

router = APIRouter(prefix="/social/oauth", tags=["OAuth Social"])

BASE_URL           = os.getenv("BASE_URL", "http://localhost:8000")
META_APP_ID        = os.getenv("META_APP_ID", "")
META_APP_SECRET    = os.getenv("META_APP_SECRET", "")
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "")
LINKEDIN_SECRET    = os.getenv("LINKEDIN_CLIENT_SECRET", "")
TIKTOK_CLIENT_KEY  = os.getenv("TIKTOK_CLIENT_KEY", "")
TIKTOK_CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "")


async def _upsert_token(
    db: AsyncSession,
    vehicle_id: uuid.UUID,
    tenant_id: uuid.UUID,
    platform: str,
    access_token: str,
    refresh_token: str | None = None,
    expires_in: int | None = None,
    platform_user_id: str | None = None,
    platform_username: str | None = None,
    scope: str | None = None,
) -> None:
    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        if expires_in else None
    )
    stmt = (
        pg_insert(SocialToken)
        .values(
            id=uuid.uuid4(),
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            platform=platform,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=expires_at,
            platform_user_id=platform_user_id,
            platform_username=platform_username,
            scope=scope,
            is_active=True,
        )
        .on_conflict_do_update(
            constraint="uq_social_token_vehicle_platform",
            set_={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": expires_at,
                "platform_user_id": platform_user_id,
                "platform_username": platform_username,
                "scope": scope,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc),
            },
        )
    )
    await db.execute(stmt)
    await db.commit()


# ---------------------------------------------------------------------------
# Meta (Instagram + Facebook)
# ---------------------------------------------------------------------------

@router.get("/meta/authorize")
async def meta_authorize(
    vehicle_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_active_user),
):
    """Redireciona para autorização Meta (Instagram + Facebook Pages)."""
    callback = f"{BASE_URL}/social/oauth/meta/callback"
    scope = "pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights,instagram_manage_comments"
    url = (
        f"https://www.facebook.com/v19.0/dialog/oauth"
        f"?client_id={META_APP_ID}"
        f"&redirect_uri={callback}"
        f"&scope={scope}"
        f"&state={vehicle_id}"
    )
    return RedirectResponse(url=url)


@router.get("/meta/callback")
async def meta_callback(
    code: str = Query(...),
    state: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Recebe o code Meta, troca por token e salva."""
    callback = f"{BASE_URL}/social/oauth/meta/callback"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            data={
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "redirect_uri": callback,
                "code": code,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(400, f"Erro Meta OAuth: {resp.text}")
        data = resp.json()

    vehicle_id = uuid.UUID(state)
    await _upsert_token(
        db, vehicle_id, current_user.tenant_id,
        platform="meta",
        access_token=data["access_token"],
        expires_in=data.get("expires_in"),
    )
    return {"status": "conectado", "platform": "meta", "vehicle_id": str(vehicle_id)}


# ---------------------------------------------------------------------------
# LinkedIn
# ---------------------------------------------------------------------------

@router.get("/linkedin/authorize")
async def linkedin_authorize(
    vehicle_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_active_user),
):
    """Redireciona para autorização LinkedIn."""
    callback = f"{BASE_URL}/social/oauth/linkedin/callback"
    scope = "r_organization_followers r_organization_social"
    url = (
        f"https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={callback}"
        f"&scope={scope}"
        f"&state={vehicle_id}"
    )
    return RedirectResponse(url=url)


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Recebe o code LinkedIn, troca por token e salva."""
    callback = f"{BASE_URL}/social/oauth/linkedin/callback"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": callback,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code != 200:
            raise HTTPException(400, f"Erro LinkedIn OAuth: {resp.text}")
        data = resp.json()

    vehicle_id = uuid.UUID(state)
    await _upsert_token(
        db, vehicle_id, current_user.tenant_id,
        platform="linkedin",
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        expires_in=data.get("expires_in"),
    )
    return {"status": "conectado", "platform": "linkedin", "vehicle_id": str(vehicle_id)}


# ---------------------------------------------------------------------------
# TikTok
# ---------------------------------------------------------------------------

@router.get("/tiktok/authorize")
async def tiktok_authorize(
    vehicle_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_active_user),
):
    """Redireciona para autorização TikTok."""
    callback = f"{BASE_URL}/social/oauth/tiktok/callback"
    url = (
        f"https://www.tiktok.com/v2/auth/authorize/"
        f"?client_key={TIKTOK_CLIENT_KEY}"
        f"&response_type=code"
        f"&scope=user.info.basic,user.info.stats"
        f"&redirect_uri={callback}"
        f"&state={vehicle_id}"
    )
    return RedirectResponse(url=url)


@router.get("/tiktok/callback")
async def tiktok_callback(
    code: str = Query(...),
    state: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Recebe o code TikTok, troca por token e salva."""
    callback = f"{BASE_URL}/social/oauth/tiktok/callback"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            data={
                "client_key": TIKTOK_CLIENT_KEY,
                "client_secret": TIKTOK_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": callback,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code != 200:
            raise HTTPException(400, f"Erro TikTok OAuth: {resp.text}")
        data = resp.json().get("data", resp.json())

    vehicle_id = uuid.UUID(state)
    await _upsert_token(
        db, vehicle_id, current_user.tenant_id,
        platform="tiktok",
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        expires_in=data.get("expires_in"),
        platform_user_id=data.get("open_id"),
    )
    return {"status": "conectado", "platform": "tiktok", "vehicle_id": str(vehicle_id)}
