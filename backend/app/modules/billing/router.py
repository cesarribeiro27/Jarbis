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


class CheckoutByPlanRequest(BaseModel):
    plan: str  # essential | pro | business | (legados: solo | equipe | ilimitado)


@router.post("/checkout/plan", summary="Cria sessão de checkout por nome do plano")
async def create_checkout_by_plan(
    data: CheckoutByPlanRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados. Entre em contato com o suporte.")

    plan_map = {
        # novas chaves (apontam para os mesmos Stripe price IDs)
        "essential":    settings.stripe_price_solo,
        "pro":          settings.stripe_price_equipe,
        "business":     settings.stripe_price_ilimitado,
        # legadas
        "solo":         settings.stripe_price_solo,
        "equipe":       settings.stripe_price_equipe,
        "ilimitado":    settings.stripe_price_ilimitado,
        "starter":      settings.stripe_price_starter,
        "professional": settings.stripe_price_pro,
    }
    price_id = plan_map.get(data.plan, "")
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Plano '{data.plan}' não configurado. Verifique as variáveis de ambiente do Stripe.")

    try:
        svc = BillingService(db)
        url = await svc.create_checkout_session(current_user.tenant_id, current_user.email, price_id)
        return {"checkout_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/checkout", summary="Cria sessão de checkout Stripe")
async def create_checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados. Entre em contato com o suporte.")

    valid_prices = {
        settings.stripe_price_solo,
        settings.stripe_price_equipe,
        settings.stripe_price_ilimitado,
        # legados
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


@router.post("/addon/checkout", summary="Cria sessão de checkout para pack de expansão")
async def create_addon_checkout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados.")
    try:
        svc = BillingService(db)
        url = await svc.create_addon_checkout_session(current_user.tenant_id, current_user.email)
        return {"checkout_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/addon/dashboard/checkout", summary="Cria checkout para pack de dashboards")
async def create_addon_dash_checkout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados.")
    try:
        svc = BillingService(db)
        url = await svc.create_addon_dash_checkout_session(current_user.tenant_id, current_user.email)
        return {"checkout_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/addon/dataset/checkout", summary="Cria checkout para pack de datasets")
async def create_addon_dataset_checkout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados.")
    try:
        svc = BillingService(db)
        url = await svc.create_addon_dataset_checkout_session(current_user.tenant_id, current_user.email)
        return {"checkout_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/addon/ai/checkout", summary="Cria checkout para pack de IA (+50 perguntas/mês)")
async def create_addon_ai_checkout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados.")
    try:
        svc = BillingService(db)
        url = await svc.create_addon_ai_checkout_session(current_user.tenant_id, current_user.email)
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


@router.post("/admin/set-plan", include_in_schema=False)
async def admin_set_plan(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint de admin para forçar plano — apenas owner."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Proibido.")
    body = await request.json()
    plan = body.get("plan", "professional")
    from sqlalchemy import select
    from app.modules.tenants.models import Tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")
    tenant.plan = plan
    tenant.trial_ends_at = None
    tenant.subscription_status = "active"
    await db.commit()
    return {"ok": True, "plan": plan}
