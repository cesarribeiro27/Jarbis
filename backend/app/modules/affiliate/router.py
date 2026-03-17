"""
Portal do Afiliado — autenticação e endpoints próprios.
Auth separada do sistema admin (JWT com type='affiliate').
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.modules.admin.models import Affiliate, AffiliatePayment
from app.modules.affiliate.dependencies import get_current_affiliate
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/affiliate", tags=["Portal do Afiliado"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class AffiliateLoginRequest(BaseModel):
    email: str
    password: str


class AffiliateSetPasswordRequest(BaseModel):
    token: str
    password: str


class AffiliateTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    affiliate_id: str
    name: str
    email: str


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=AffiliateTokenResponse)
async def affiliate_login(
    body: AffiliateLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login do afiliado com email e senha própria."""
    affiliate = await db.scalar(
        select(Affiliate).where(
            func.lower(Affiliate.email) == body.email.lower().strip(),
            Affiliate.is_active == True,
        )
    )
    if not affiliate or not affiliate.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )
    if not verify_password(body.password, affiliate.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )

    affiliate.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token(
        data={
            "sub": str(affiliate.id),
            "type": "affiliate",
            "email": affiliate.email,
        },
        expires_delta=timedelta(hours=24),
    )
    return AffiliateTokenResponse(
        access_token=token,
        affiliate_id=str(affiliate.id),
        name=affiliate.name,
        email=affiliate.email,
    )


@router.post("/auth/set-password", response_model=AffiliateTokenResponse)
async def affiliate_set_password(
    body: AffiliateSetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Primeiro acesso: define a senha via invite token enviado por email."""
    affiliate = await db.scalar(
        select(Affiliate).where(Affiliate.invite_token == body.token)
    )
    if not affiliate:
        raise HTTPException(status_code=400, detail="Token inválido")
    if affiliate.invite_expires_at and affiliate.invite_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")

    affiliate.hashed_password = hash_password(body.password)
    affiliate.invite_token = None
    affiliate.invite_expires_at = None
    affiliate.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token(
        data={
            "sub": str(affiliate.id),
            "type": "affiliate",
            "email": affiliate.email,
        },
        expires_delta=timedelta(hours=24),
    )
    return AffiliateTokenResponse(
        access_token=token,
        affiliate_id=str(affiliate.id),
        name=affiliate.name,
        email=affiliate.email,
    )


# ── Dados do afiliado logado ──────────────────────────────────────────────────

@router.get("/me")
async def get_affiliate_me(
    affiliate: Affiliate = Depends(get_current_affiliate),
):
    """Dados básicos do afiliado autenticado."""
    return {
        "id": str(affiliate.id),
        "name": affiliate.name,
        "email": affiliate.email,
        "code": affiliate.code,
        "commission_percent": float(affiliate.commission_percent),
        "is_active": affiliate.is_active,
        "last_login_at": affiliate.last_login_at.isoformat() if affiliate.last_login_at else None,
        "created_at": affiliate.created_at.isoformat(),
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_affiliate_dashboard(
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """
    KPIs do afiliado: indicações, pagantes, comissão estimada, pago.
    """
    # Todos os tenants com este código de afiliado
    tenants_result = await db.scalars(
        select(Tenant).where(Tenant.affiliate_code == affiliate.code)
    )
    tenants = tenants_result.all()

    total_referrals = len(tenants)
    paying = [t for t in tenants if t.subscription_status == "active" and t.plan not in ("free", "trial")]
    paying_count = len(paying)
    churned = [t for t in tenants if t.canceled_at is not None]
    churned_count = len(churned)

    # MRR estimado dos referrals pagantes (usando planos conhecidos)
    PLAN_MRR = {"starter": 97.0, "professional": 197.0, "enterprise": 397.0}
    mrr_referrals = sum(PLAN_MRR.get(t.plan, 0) for t in paying)
    commission_estimated = mrr_referrals * float(affiliate.commission_percent) / 100

    # Total já pago
    paid_result = await db.scalars(
        select(AffiliatePayment).where(AffiliatePayment.affiliate_id == affiliate.id)
    )
    payments = paid_result.all()
    total_paid = sum(float(p.amount) for p in payments)

    # Link de referência
    referral_link = f"https://jarbis.cc/signup?ref={affiliate.code}"

    return {
        "referral_link": referral_link,
        "referral_code": affiliate.code,
        "commission_percent": float(affiliate.commission_percent),
        "total_referrals": total_referrals,
        "paying_referrals": paying_count,
        "churned_referrals": churned_count,
        "mrr_referrals": round(mrr_referrals, 2),
        "commission_estimated_monthly": round(commission_estimated, 2),
        "total_paid": round(total_paid, 2),
        "balance_pending": round(commission_estimated - total_paid, 2),
    }


# ── Referrals ─────────────────────────────────────────────────────────────────

@router.get("/referrals")
async def get_affiliate_referrals(
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """Lista de tenants indicados com status e comissão estimada."""
    tenants_result = await db.scalars(
        select(Tenant).where(Tenant.affiliate_code == affiliate.code)
    )
    tenants = tenants_result.all()

    PLAN_MRR = {"starter": 97.0, "professional": 197.0, "enterprise": 397.0}
    commission_pct = float(affiliate.commission_percent) / 100

    referrals = []
    for t in tenants:
        plan_mrr = PLAN_MRR.get(t.plan, 0)
        commission = plan_mrr * commission_pct

        status_label = "trial"
        if t.canceled_at:
            status_label = "cancelado"
        elif t.subscription_status == "active" and t.plan not in ("free", "trial"):
            status_label = "pagante"
        elif t.plan == "free":
            status_label = "free"

        referrals.append({
            "tenant_id": str(t.id),
            "name": t.name,
            "plan": t.plan,
            "status": status_label,
            "subscription_status": t.subscription_status,
            "commission_monthly": round(commission, 2),
            "joined_at": t.created_at.isoformat(),
            "canceled_at": t.canceled_at.isoformat() if t.canceled_at else None,
        })

    # Ordena: pagantes primeiro, depois trial, free, cancelados
    order = {"pagante": 0, "trial": 1, "free": 2, "cancelado": 3}
    referrals.sort(key=lambda x: order.get(x["status"], 9))

    return {"referrals": referrals, "total": len(referrals)}


# ── Pagamentos ────────────────────────────────────────────────────────────────

@router.get("/payments")
async def get_affiliate_payments(
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """Histórico de pagamentos de comissão recebidos."""
    payments_result = await db.scalars(
        select(AffiliatePayment)
        .where(AffiliatePayment.affiliate_id == affiliate.id)
        .order_by(AffiliatePayment.created_at.desc())
    )
    payments = payments_result.all()

    total_received = sum(float(p.amount) for p in payments)

    return {
        "payments": [
            {
                "id": str(p.id),
                "amount": float(p.amount),
                "period_description": p.period_description,
                "note": p.note,
                "created_at": p.created_at.isoformat(),
            }
            for p in payments
        ],
        "total_received": round(total_received, 2),
    }
