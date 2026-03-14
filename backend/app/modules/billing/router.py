"""
Endpoints de cobrança — Stripe checkout, portal e webhook.

POST /billing/checkout   — cria sessão de checkout (auth obrigatório)
POST /billing/portal     — acessa portal do cliente (auth obrigatório)
POST /billing/webhook    — recebe eventos Stripe (sem auth JWT)
GET  /billing/status     — retorna plano, limites e uso atual (auth obrigatório)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.billing.service import BillingService
from app.modules.tenants.models import User

router = APIRouter(prefix="/billing", tags=["Billing"])


class CheckoutRequest(BaseModel):
    price_id: str


@router.post("/checkout", summary="Cria sessão de checkout Stripe")
async def create_checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados. Entre em contato com o suporte.")

    valid_prices = {
        settings.stripe_price_starter,
        settings.stripe_price_pro,
        settings.stripe_price_enterprise,
    } - {""}
    if data.price_id not in valid_prices:
        raise HTTPException(status_code=400, detail="Plano inválido.")

    try:
        svc = BillingService(db)
        url = await svc.create_checkout_session(current_user.tenant_id, current_user.email, data.price_id)
        return {"checkout_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/portal", summary="Acessa portal do cliente Stripe")
async def create_portal(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados.")
    try:
        svc = BillingService(db)
        url = await svc.create_portal_session(current_user.tenant_id)
        return {"portal_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Recebe eventos do Stripe. Sem autenticação JWT — validado via assinatura."""
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        svc = BillingService(db)
        await svc.handle_webhook(payload, signature)
        return {"received": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status", summary="Retorna plano, limites e uso atual")
async def billing_status(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = BillingService(db)
    return await svc.get_billing_status(current_user.tenant_id)
