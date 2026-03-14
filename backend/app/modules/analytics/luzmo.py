"""
Luzmo Embedded Analytics — Geração de tokens de embed

Gera tokens de autorização para embutir dashboards interativos do Luzmo
diretamente na interface do Lumetra.

Docs: https://developer.luzmo.com/api/createAuthorization
"""

import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

LUZMO_API_KEY   = os.getenv("LUZMO_API_KEY", "")
LUZMO_API_TOKEN = os.getenv("LUZMO_API_TOKEN", "")
LUZMO_API_SERVER = os.getenv("LUZMO_API_SERVER", "https://api.us.luzmo.com")

router = APIRouter(prefix="/analytics/luzmo", tags=["Luzmo"])


class EmbedTokenRequest(BaseModel):
    dashboard_id: str


@router.post("/embed-token")
async def get_embed_token(
    body: EmbedTokenRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Gera um token de embed Luzmo para o dashboard especificado.
    O token é scoped ao usuário autenticado e expira em 1 hora.
    """
    if not LUZMO_API_KEY or not LUZMO_API_TOKEN:
        raise HTTPException(status_code=503, detail="Luzmo não configurado.")

    payload = {
        "action": "embed",
        "version": "0.1.0",
        "key": LUZMO_API_KEY,
        "token": LUZMO_API_TOKEN,
        "payload": {
            "dashboards": [{"id": body.dashboard_id}],
            "user": {
                "username": str(current_user.id),
                "name": current_user.full_name,
                "email": current_user.email,
            },
        },
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            response = await client.post(
                f"{LUZMO_API_SERVER}/0.1.0/authorization",
                headers={"Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Erro na API do Luzmo: {e.response.status_code}",
            )
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Falha ao conectar ao Luzmo: {e}")

    data = response.json()
    return JSONResponse(content={"token": data["token"], "key": data["key"]})
