"""
Rotas administrativas — acesso restrito à equipe interna.

Sistema de roles:
  full        → acesso total (CEO/fundadores via ADMIN_EMAILS_CSV + admin_users role=full)
  vendas      → tenants R/W, cupons, trials, mudança de plano, afiliados
  financeiro  → faturas, export CSV, métricas financeiras
  marketing   → afiliados R/W, cupons (leitura), dashboard de aquisição
  suporte     → tenants (leitura), extensão de trial

Prioridade de autenticação:
  1. Email em settings.admin_emails → role "full" automaticamente
  2. Email em tabela admin_users (is_active=true) → role definida na tabela
"""

import csv
import hashlib
import io
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import Date, cast, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

import asyncio
import json

import httpx
from fastapi.responses import StreamingResponse

from app.config import settings
from app.core.email import send_admin_email, send_admin_invite_email, _HEADER_HTML, _FOOTER_HTML, _TAGLINE
from app.core.security import create_access_token
from app.database import get_db, AsyncSessionLocal
from app.modules.admin.models import (
    Affiliate, AdminUser, AdminAuditLog, AffiliatePayment, ApiKey, Coupon,
    LifecycleEmailLog, MrrSnapshot, NfeDocument, NpsSurvey,
    SupportTicket, SupportTicketComment, TenantNote,
    UserNotification, UserSession,
)
from app.modules.auth.dependencies import get_current_active_user
from app.modules.billing.plan_limits import PLAN_NAMES, PLAN_PRICES, PLANS, get_effective_limits
from app.modules.reports.dataset_models import ReportDataset
from app.modules.reports.models import Report
from app.modules.tenants.models import Tenant, User

router = APIRouter(tags=["admin"])

ADMIN_ROLES = {"full", "vendas", "financeiro", "marketing", "suporte"}

# ─── Auth helpers ─────────────────────────────────────────────────────────────

async def _get_admin_role(email: str, db: AsyncSession) -> str:
    """Retorna o role do admin ou lança 403."""
    if email.lower() in [e.lower() for e in settings.admin_emails]:
        return "full"
    admin = await db.scalar(
        select(AdminUser).where(
            AdminUser.email == email.lower(),
            AdminUser.is_active == True,  # noqa: E712
        )
    )
    if not admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return admin.role


async def get_admin_user(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, str]:
    """Retorna (user, role). Qualquer role de admin é aceita."""
    role = await _get_admin_role(current_user.email, db)
    return current_user, role


async def get_superadmin(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verifica acesso full (CEO/fundadores + admin_users com role=full)."""
    role = await _get_admin_role(current_user.email, db)
    if role != "full":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return current_user


def _check_roles(role: str, allowed: set[str]) -> None:
    if role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Seu perfil ({role}) não tem permissão para esta ação."
        )


# ─── Schemas ──────────────────────────────────────────────────────────────────

class TenantUpdateInput(BaseModel):
    plan: str | None = None
    is_active: bool | None = None
    addon_packs: int | None = None
    extend_trial_days: int | None = None
    crm_stage: str | None = None
    custom_logo_url: str | None = None
    primary_color: str | None = None


class BulkExtendTrialInput(BaseModel):
    tenant_ids: list[uuid.UUID]
    days: int


class CampaignEmailInput(BaseModel):
    subject: str
    body_html: str
    raw_html: bool = False                   # True = envia body_html como HTML completo, sem wrapper
    segment_plan: str | None = None          # ex: "starter" — None = todos
    segment_status: str | None = None        # ex: "trial" — None = todos
    segment_trial_days_max: int | None = None  # só tenants com trial ≤ N dias
    send_to_tenant_id: uuid.UUID | None = None  # envio individual


class AffiliateCreateInput(BaseModel):
    name: str
    email: str
    code: str
    commission_percent: Decimal = Decimal("0.00")
    notes: str = ""


class AffiliateUpdateInput(BaseModel):
    name: str | None = None
    email: str | None = None
    commission_percent: Decimal | None = None
    is_active: bool | None = None
    notes: str | None = None


class AdminUserCreateInput(BaseModel):
    email: str
    role: str
    notes: str = ""


class AdminUserUpdateInput(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class CouponCreateInput(BaseModel):
    code: str
    description: str = ""
    discount_type: str = "percent"  # percent | fixed
    discount_value: Decimal
    applicable_plans: str = "all"
    max_uses: int | None = None
    valid_until: datetime | None = None


class CouponUpdateInput(BaseModel):
    description: str | None = None
    discount_value: Decimal | None = None
    max_uses: int | None = None
    valid_until: datetime | None = None
    is_active: bool | None = None
    applicable_plans: str | None = None


class TenantNoteCreateInput(BaseModel):
    content: str


class TenantFiscalUpdateInput(BaseModel):
    cnpj: str | None = None
    razao_social: str | None = None
    inscricao_estadual: str | None = None
    cep: str | None = None
    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None


class AffiliatePaymentCreateInput(BaseModel):
    amount: Decimal
    period_description: str = ""
    note: str = ""


# ─── Audit log helper ─────────────────────────────────────────────────────────

async def _audit(
    db: AsyncSession,
    admin_email: str,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    entity_name: str | None = None,
    description: str = "",
) -> None:
    """Registra uma ação administrativa no audit log."""
    log = AdminAuditLog(
        admin_email=admin_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        description=description,
    )
    db.add(log)
    # Não faz commit aqui — commit é feito pelo caller


# ─── /admin/me ────────────────────────────────────────────────────────────────

@router.get("/me", summary="Confirma acesso e retorna role")
async def admin_me(
    admin_data: tuple = Depends(get_admin_user),
):
    user, role = admin_data
    return {"email": user.email, "is_superadmin": role == "full", "role": role}


# ─── /admin/metrics ───────────────────────────────────────────────────────────

@router.get("/metrics", summary="Métricas globais do produto")
async def admin_metrics(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.reports.models import Report
    from app.modules.reports.dataset_models import ReportDataset

    _, role = admin_data
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    total_tenants = await db.scalar(select(func.count()).select_from(Tenant))
    total_users = await db.scalar(select(func.count()).select_from(User))
    total_dashboards = await db.scalar(select(func.count()).select_from(Report))
    total_datasets = await db.scalar(select(func.count()).select_from(ReportDataset))

    active_tenants = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.is_active == True,  # noqa: E712
            Tenant.subscription_status != "past_due",
        )
    )
    trial_tenants = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.trial_ends_at.isnot(None),
            Tenant.trial_ends_at > now,
        )
    )
    past_due_tenants = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.subscription_status == "past_due"
        )
    )
    inactive_tenants = await db.scalar(
        select(func.count()).select_from(Tenant).where(Tenant.is_active == False)  # noqa: E712
    )

    signups_today = await db.scalar(
        select(func.count()).select_from(Tenant).where(Tenant.created_at >= today_start)
    )
    signups_7d = await db.scalar(
        select(func.count()).select_from(Tenant).where(Tenant.created_at >= week_start)
    )
    signups_30d = await db.scalar(
        select(func.count()).select_from(Tenant).where(Tenant.created_at >= month_start)
    )

    plan_rows = await db.execute(
        select(Tenant.plan, func.count().label("count"))
        .where(Tenant.is_active == True)  # noqa: E712
        .group_by(Tenant.plan)
    )
    by_plan = {row.plan: row.count for row in plan_rows}

    PLAN_MRR = {
        "solo": 79.90, "starter": 79.90,
        "equipe": 189.90, "professional": 189.90,
        "ilimitado": 599.90,
    }
    paid_rows = await db.execute(
        select(Tenant.plan, Tenant.addon_packs, func.count().label("count"))
        .where(
            Tenant.is_active == True,  # noqa: E712
            Tenant.subscription_status == "active",
            Tenant.plan.in_(list(PLAN_MRR.keys())),
        )
        .group_by(Tenant.plan, Tenant.addon_packs)
    )
    mrr = sum(
        row.count * (PLAN_MRR[row.plan] + row.addon_packs * 49.90)
        for row in paid_rows
    )

    cutoff = today_start - timedelta(days=13)
    day_rows = await db.execute(
        select(cast(Tenant.created_at, Date).label("day"), func.count().label("count"))
        .where(Tenant.created_at >= cutoff)
        .group_by(cast(Tenant.created_at, Date))
        .order_by(cast(Tenant.created_at, Date))
    )
    day_map = {str(r.day): r.count for r in day_rows}
    signups_by_day = [
        {"date": str((today_start - timedelta(days=i)).date()),
         "count": day_map.get(str((today_start - timedelta(days=i)).date()), 0)}
        for i in range(13, -1, -1)
    ]

    trial_expiring_soon = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.trial_ends_at.isnot(None),
            Tenant.trial_ends_at > now,
            Tenant.trial_ends_at <= now + timedelta(days=7),
        )
    ) or 0

    recent_rows = await db.execute(
        select(Tenant).order_by(Tenant.created_at.desc()).limit(5)
    )
    recent_tenants_list = []
    for t in recent_rows.scalars():
        owner = await db.scalar(
            select(User).where(User.tenant_id == t.id, User.role == "owner")
        )
        recent_tenants_list.append({
            "id": str(t.id),
            "name": t.name,
            "plan": t.plan,
            "subscription_status": t.subscription_status,
            "owner_email": owner.email if owner else "",
            "created_at": t.created_at.isoformat(),
        })

    paid_count = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.is_active == True,  # noqa: E712
            Tenant.subscription_status == "active",
            Tenant.plan.notin_(["free", "internal"]),
        )
    ) or 0
    conversion_base = paid_count + (trial_tenants or 0)
    conversion_rate = round(paid_count / conversion_base * 100, 1) if conversion_base > 0 else 0.0

    return {
        "totals": {
            "tenants": total_tenants,
            "users": total_users,
            "dashboards": total_dashboards,
            "datasets": total_datasets,
        },
        "tenants_by_status": {
            "active": active_tenants,
            "trial": trial_tenants,
            "past_due": past_due_tenants,
            "inactive": inactive_tenants,
        },
        "signups": {
            "today": signups_today,
            "last_7d": signups_7d,
            "last_30d": signups_30d,
        },
        "by_plan": by_plan,
        "mrr_estimated": round(mrr, 2),
        "signups_by_day": signups_by_day,
        "recent_tenants": recent_tenants_list,
        "trial_expiring_soon": trial_expiring_soon,
        "conversion_rate": conversion_rate,
    }


# ─── /admin/metrics/churn-ltv ─────────────────────────────────────────────────

@router.get("/metrics/churn-ltv", summary="Churn rate e LTV estimado")
async def admin_churn_ltv(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    PLAN_MRR = {"solo": 79.90, "starter": 79.90, "equipe": 189.90, "professional": 189.90, "ilimitado": 599.90}
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Pagantes ativos
    paying = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.is_active == True,  # noqa: E712
            Tenant.subscription_status == "active",
            Tenant.plan.in_(list(PLAN_MRR.keys())),
        )
    ) or 0

    # Cancelamentos no mês atual
    churned_month = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.canceled_at >= month_start,
        )
    ) or 0

    # Churn rate mensal = cancelamentos / base inicio do mês
    paying_start = paying + churned_month  # aproximação
    churn_rate = (churned_month / paying_start * 100) if paying_start > 0 else 0.0

    # MRR atual
    paid_rows = await db.execute(
        select(Tenant.plan, func.count().label("count"))
        .where(
            Tenant.is_active == True,  # noqa: E712
            Tenant.subscription_status == "active",
            Tenant.plan.in_(list(PLAN_MRR.keys())),
        )
        .group_by(Tenant.plan)
    )
    mrr = sum(PLAN_MRR.get(row.plan, 0) * row.count for row in paid_rows)

    # ARPU = MRR / paying
    arpu = (mrr / paying) if paying > 0 else 0.0

    # LTV = ARPU / churn_rate_mensal (em meses)
    churn_decimal = churn_rate / 100
    ltv = (arpu / churn_decimal) if churn_decimal > 0 else 0.0

    # Histórico de churn dos últimos 6 meses via MrrSnapshot
    six_months_ago = now - timedelta(days=180)
    churn_history_rows = await db.execute(
        select(MrrSnapshot.snapshot_date, MrrSnapshot.churned_tenants, MrrSnapshot.paying_tenants)
        .where(MrrSnapshot.created_at >= six_months_ago)
        .order_by(MrrSnapshot.snapshot_date)
    )
    churn_history = [
        {
            "date": r.snapshot_date.isoformat() if hasattr(r.snapshot_date, "isoformat") else str(r.snapshot_date),
            "churned": r.churned_tenants,
            "paying": r.paying_tenants,
            "churn_rate": round(r.churned_tenants / r.paying_tenants * 100, 2) if r.paying_tenants > 0 else 0.0,
        }
        for r in churn_history_rows
    ]

    return {
        "mrr": round(mrr, 2),
        "arpu": round(arpu, 2),
        "ltv": round(ltv, 2),
        "churn_rate_monthly_pct": round(churn_rate, 2),
        "paying_tenants": paying,
        "churned_this_month": churned_month,
        "churn_history": churn_history,
    }


# ─── Health Score helper ───────────────────────────────────────────────────────

async def _compute_health_score(tenant_id: uuid.UUID, db: AsyncSession) -> dict:
    """
    Calcula health score 0-100 para um tenant com base em:
    - Último login (0-40 pts)
    - Frequência de sessões nos últimos 30 dias (0-30 pts)
    - Features usadas: dashboards, datasets, alertas, AI (0-20 pts)
    - Status do plano (0-10 pts)
    """
    from app.modules.reports.models import Report
    from app.modules.reports.dataset_models import ReportDataset
    from app.modules.reports.alert_models import ReportAlert
    from app.modules.reports.ai_usage_models import AIUsageLog

    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        return {"score": 0, "tier": "crítico", "details": {}}

    # Último login do owner
    owner = await db.scalar(
        select(User).where(User.tenant_id == tenant_id, User.role == "owner")
    )
    last_login = owner.last_login_at if owner else None
    days_since_login = (now - last_login).days if last_login else 999

    if days_since_login <= 7:
        login_pts = 40
    elif days_since_login <= 14:
        login_pts = 30
    elif days_since_login <= 30:
        login_pts = 15
    else:
        login_pts = 0

    # Frequência de sessões últimos 30 dias
    session_count = await db.scalar(
        select(func.count()).select_from(UserSession).where(
            UserSession.tenant_id == tenant_id,
            UserSession.created_at >= month_ago,
        )
    ) or 0

    if session_count >= 20:
        session_pts = 30
    elif session_count >= 10:
        session_pts = 20
    elif session_count >= 5:
        session_pts = 10
    elif session_count >= 1:
        session_pts = 5
    else:
        session_pts = 0

    # Features usadas
    has_dashboards = (await db.scalar(select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)) or 0) > 0
    has_datasets = (await db.scalar(select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tenant_id)) or 0) > 0
    has_alerts = (await db.scalar(select(func.count()).select_from(ReportAlert).where(ReportAlert.tenant_id == tenant_id)) or 0) > 0
    has_ai = (await db.scalar(
        select(func.count()).select_from(AIUsageLog).where(
            AIUsageLog.tenant_id == tenant_id,
            AIUsageLog.created_at >= month_ago,
        )
    ) or 0) > 0

    feature_pts = (5 if has_dashboards else 0) + (5 if has_datasets else 0) + (5 if has_alerts else 0) + (5 if has_ai else 0)

    # Status do plano
    if tenant.subscription_status == "active" and tenant.plan not in ("free", None):
        plan_pts = 10
    elif tenant.trial_ends_at and tenant.trial_ends_at > now:
        plan_pts = 5
    elif tenant.plan == "free":
        plan_pts = 3
    else:
        plan_pts = 0

    score = login_pts + session_pts + feature_pts + plan_pts

    if score >= 70:
        tier = "saudável"
    elif score >= 40:
        tier = "em_risco"
    else:
        tier = "crítico"

    return {
        "score": score,
        "tier": tier,
        "details": {
            "login_pts": login_pts,
            "session_pts": session_pts,
            "feature_pts": feature_pts,
            "plan_pts": plan_pts,
            "days_since_login": days_since_login if days_since_login < 999 else None,
            "sessions_last_30d": session_count,
            "has_dashboards": has_dashboards,
            "has_datasets": has_datasets,
            "has_alerts": has_alerts,
            "has_ai": has_ai,
        },
    }


@router.get("/tenants/{tenant_id}/health-score", summary="Health score de um tenant")
async def admin_tenant_health_score(
    tenant_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await _compute_health_score(tenant_id, db)


# ─── /admin/tenants ───────────────────────────────────────────────────────────

@router.get("/tenants", summary="Listar todos os tenants")
async def admin_list_tenants(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    search: str = Query(default=""),
    plan: str = Query(default=""),
    status: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    q = select(Tenant).order_by(Tenant.created_at.desc())

    if plan:
        q = q.where(Tenant.plan == plan)
    if status == "active":
        q = q.where(Tenant.is_active == True, Tenant.subscription_status == "active")  # noqa: E712
    elif status == "trial":
        now = datetime.now(timezone.utc)
        q = q.where(Tenant.trial_ends_at.isnot(None), Tenant.trial_ends_at > now)
    elif status == "past_due":
        q = q.where(Tenant.subscription_status == "past_due")
    elif status == "inactive":
        q = q.where(Tenant.is_active == False)  # noqa: E712

    if search:
        q = q.where(Tenant.name.ilike(f"%{search}%") | Tenant.slug.ilike(f"%{search}%"))

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    tenants = await db.scalars(q.offset((page - 1) * page_size).limit(page_size))

    items = []
    for t in tenants:
        user_count = await db.scalar(
            select(func.count()).select_from(User).where(User.tenant_id == t.id)
        )
        owner = await db.scalar(
            select(User).where(User.tenant_id == t.id, User.role == "owner")
        )
        items.append({
            "id": str(t.id),
            "name": t.name,
            "slug": t.slug,
            "plan": t.plan,
            "plan_name": PLAN_NAMES.get(t.plan, t.plan),
            "is_active": t.is_active,
            "subscription_status": t.subscription_status,
            "trial_days_remaining": t.trial_days_remaining,
            "addon_packs": t.addon_packs,
            "affiliate_code": t.affiliate_code,
            "user_count": user_count,
            "owner_email": owner.email if owner else None,
            "created_at": t.created_at.isoformat(),
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/tenants/{tenant_id}", summary="Detalhe de um tenant")
async def admin_get_tenant(
    tenant_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.reports.models import Report
    from app.modules.reports.dataset_models import ReportDataset
    from app.modules.reports.alert_models import ReportAlert

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    users = await db.scalars(select(User).where(User.tenant_id == tenant_id))
    users_list = [
        {"id": str(u.id), "email": u.email, "full_name": u.full_name,
         "role": u.role, "is_active": u.is_active, "created_at": u.created_at.isoformat(),
         "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None}
        for u in users
    ]

    limits = get_effective_limits(tenant.plan, tenant.addon_packs)
    usage = {
        "dashboards": await db.scalar(select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)) or 0,
        "datasets": await db.scalar(select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tenant_id, ReportDataset.is_demo.is_(False))) or 0,
        "alerts": await db.scalar(select(func.count()).select_from(ReportAlert).where(ReportAlert.tenant_id == tenant_id)) or 0,
    }

    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug,
        "plan": tenant.plan,
        "plan_name": PLAN_NAMES.get(tenant.plan, tenant.plan),
        "is_active": tenant.is_active,
        "subscription_status": tenant.subscription_status,
        "trial_ends_at": tenant.trial_ends_at.isoformat() if tenant.trial_ends_at else None,
        "trial_days_remaining": tenant.trial_days_remaining,
        "stripe_customer_id": tenant.stripe_customer_id,
        "stripe_subscription_id": tenant.stripe_subscription_id,
        "addon_packs": tenant.addon_packs,
        "affiliate_code": tenant.affiliate_code,
        "created_at": tenant.created_at.isoformat(),
        "limits": limits,
        "usage": usage,
        "users": users_list,
    }


@router.patch("/tenants/{tenant_id}", summary="Atualizar tenant (plano, status, trial)")
async def admin_update_tenant(
    tenant_id: uuid.UUID,
    data: TenantUpdateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "suporte"})

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    # Suporte só pode estender trial — não muda plano ou addon_packs
    if role == "suporte":
        if data.plan is not None or data.is_active is not None or data.addon_packs is not None:
            raise HTTPException(
                status_code=403,
                detail="Suporte pode apenas estender o período de trial."
            )

    if data.plan is not None:
        if data.plan not in PLANS:
            raise HTTPException(status_code=400, detail=f"Plano '{data.plan}' inválido.")
        tenant.plan = data.plan

    if data.is_active is not None:
        tenant.is_active = data.is_active

    if data.addon_packs is not None:
        tenant.addon_packs = max(0, data.addon_packs)

    if data.extend_trial_days is not None and data.extend_trial_days > 0:
        base = tenant.trial_ends_at or datetime.now(timezone.utc)
        tenant.trial_ends_at = base + timedelta(days=data.extend_trial_days)

    if data.crm_stage is not None:
        valid_stages = {"novo", "contato", "demo_agendada", "proposta", "cliente", "perdido"}
        if data.crm_stage not in valid_stages:
            raise HTTPException(status_code=400, detail=f"Estágio CRM inválido: {data.crm_stage}")
        tenant.crm_stage = data.crm_stage

    if data.custom_logo_url is not None:
        tenant.custom_logo_url = data.custom_logo_url or None
    if data.primary_color is not None:
        tenant.primary_color = data.primary_color or None

    user, _ = admin_data
    desc_parts = []
    if data.plan is not None:
        desc_parts.append(f"plano→{data.plan}")
    if data.is_active is not None:
        desc_parts.append(f"ativo→{data.is_active}")
    if data.addon_packs is not None:
        desc_parts.append(f"packs→{data.addon_packs}")
    if data.extend_trial_days:
        desc_parts.append(f"trial+{data.extend_trial_days}d")
    if data.crm_stage:
        desc_parts.append(f"crm→{data.crm_stage}")
    await _audit(db, user.email, "tenant_update", "tenant",
                 str(tenant_id), tenant.name, "; ".join(desc_parts))

    await db.commit()
    return {"ok": True, "tenant_id": str(tenant_id)}


@router.delete("/tenants/{tenant_id}", summary="Deletar tenant (apenas full)")
async def admin_delete_tenant(
    tenant_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.reports.models import Report
    from app.modules.reports.dataset_models import ReportDataset
    from app.modules.reports.alert_models import ReportAlert

    _, role = admin_data
    _check_roles(role, {"full"})

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    # Cascata manual: remove tudo vinculado ao tenant
    await db.execute(delete(ReportAlert).where(ReportAlert.tenant_id == tenant_id))
    await db.execute(delete(ReportDataset).where(ReportDataset.tenant_id == tenant_id))
    await db.execute(delete(Report).where(Report.tenant_id == tenant_id))
    await db.execute(delete(User).where(User.tenant_id == tenant_id))
    await db.delete(tenant)
    await db.commit()

    return {"ok": True, "deleted_tenant_id": str(tenant_id)}


# ─── /admin/tenants/{tenant_id}/notes ─────────────────────────────────────────

@router.get("/tenants/{tenant_id}/notes", summary="Listar notas internas de um tenant")
async def admin_list_tenant_notes(
    tenant_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    notes = await db.scalars(
        select(TenantNote)
        .where(TenantNote.tenant_id == tenant_id)
        .order_by(TenantNote.created_at.desc())
    )
    return [
        {
            "id": str(n.id),
            "admin_email": n.admin_email,
            "content": n.content,
            "created_at": n.created_at.isoformat(),
        }
        for n in notes
    ]


@router.post("/tenants/{tenant_id}/notes", summary="Adicionar nota interna a um tenant")
async def admin_create_tenant_note(
    tenant_id: uuid.UUID,
    data: TenantNoteCreateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = admin_data
    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Conteúdo da nota não pode estar vazio.")

    note = TenantNote(
        tenant_id=tenant_id,
        admin_email=user.email,
        content=data.content.strip(),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return {
        "id": str(note.id),
        "admin_email": note.admin_email,
        "content": note.content,
        "created_at": note.created_at.isoformat(),
    }


@router.delete("/tenants/{tenant_id}/notes/{note_id}", summary="Deletar nota interna")
async def admin_delete_tenant_note(
    tenant_id: uuid.UUID,
    note_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = admin_data
    note = await db.scalar(
        select(TenantNote).where(
            TenantNote.id == note_id,
            TenantNote.tenant_id == tenant_id,
        )
    )
    if not note:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    # Só quem criou ou full pode deletar
    if role != "full" and note.admin_email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Você só pode deletar suas próprias notas.")

    await db.delete(note)
    await db.commit()
    return {"ok": True}


@router.post("/tenants/{tenant_id}/users/{user_id}/reset-password", summary="Enviar reset de senha para usuário")
async def admin_reset_user_password(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Envia email de reset de senha para o usuário. Roles: full, vendas, suporte."""
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "suporte"})

    user = await db.scalar(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    from app.modules.auth.service import AuthService
    service = AuthService(db)
    await service.forgot_password(user.email, settings.frontend_url)
    await db.commit()
    return {"ok": True}


@router.post("/tenants/{tenant_id}/users/{user_id}/revoke-sessions", summary="Revogar todas as sessões do usuário")
async def admin_revoke_user_sessions(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Invalida todas as sessões ativas do usuário. Role: full."""
    _, role = admin_data
    _check_roles(role, {"full"})

    user = await db.scalar(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    user.session_revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


# ─── /admin/affiliates ────────────────────────────────────────────────────────

@router.get("/affiliates", summary="Listar afiliados")
async def admin_list_affiliates(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "marketing"})

    affiliates = await db.scalars(select(Affiliate).order_by(Affiliate.created_at.desc()))

    result = []
    for a in affiliates:
        referral_count = await db.scalar(
            select(func.count()).select_from(Tenant).where(Tenant.affiliate_code == a.code)
        )
        result.append({
            "id": str(a.id),
            "name": a.name,
            "email": a.email,
            "code": a.code,
            "commission_percent": float(a.commission_percent),
            "is_active": a.is_active,
            "notes": a.notes,
            "referral_count": referral_count,
            "created_at": a.created_at.isoformat(),
        })

    return {"items": result}


@router.post("/affiliates", summary="Criar afiliado")
async def admin_create_affiliate(
    data: AffiliateCreateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "marketing"})

    existing = await db.scalar(select(Affiliate).where(Affiliate.code == data.code.upper()))
    if existing:
        raise HTTPException(status_code=409, detail=f"Código '{data.code}' já existe.")

    affiliate = Affiliate(
        name=data.name,
        email=data.email,
        code=data.code.upper(),
        commission_percent=data.commission_percent,
        notes=data.notes,
    )
    db.add(affiliate)
    await db.commit()
    await db.refresh(affiliate)

    return {"id": str(affiliate.id), "code": affiliate.code}


@router.get("/affiliates/{affiliate_id}", summary="Detalhe de um afiliado + referrals")
async def admin_get_affiliate(
    affiliate_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "marketing"})

    affiliate = await db.scalar(select(Affiliate).where(Affiliate.id == affiliate_id))
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado.")

    referrals_rows = await db.scalars(
        select(Tenant).where(Tenant.affiliate_code == affiliate.code)
        .order_by(Tenant.created_at.desc())
    )
    referrals = []
    PLAN_MRR = {
        "solo": 79.90, "starter": 79.90,
        "equipe": 189.90, "professional": 189.90,
        "ilimitado": 599.90,
    }
    total_commission = 0.0

    for t in referrals_rows:
        plan_price = PLAN_MRR.get(t.plan, 0.0)
        commission = plan_price * float(affiliate.commission_percent) / 100
        total_commission += commission
        referrals.append({
            "tenant_id": str(t.id),
            "name": t.name,
            "plan": t.plan,
            "plan_name": PLAN_NAMES.get(t.plan, t.plan),
            "subscription_status": t.subscription_status,
            "plan_price": plan_price,
            "commission": round(commission, 2),
            "created_at": t.created_at.isoformat(),
        })

    return {
        "id": str(affiliate.id),
        "name": affiliate.name,
        "email": affiliate.email,
        "code": affiliate.code,
        "commission_percent": float(affiliate.commission_percent),
        "is_active": affiliate.is_active,
        "notes": affiliate.notes,
        "referral_link": f"{settings.frontend_url}/signup?ref={affiliate.code}",
        "referrals": referrals,
        "total_commission_estimated": round(total_commission, 2),
        "created_at": affiliate.created_at.isoformat(),
    }


@router.patch("/affiliates/{affiliate_id}", summary="Atualizar afiliado")
async def admin_update_affiliate(
    affiliate_id: uuid.UUID,
    data: AffiliateUpdateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "marketing"})

    affiliate = await db.scalar(select(Affiliate).where(Affiliate.id == affiliate_id))
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado.")

    if data.name is not None:
        affiliate.name = data.name
    if data.email is not None:
        affiliate.email = data.email
    if data.commission_percent is not None:
        affiliate.commission_percent = data.commission_percent
    if data.is_active is not None:
        affiliate.is_active = data.is_active
    if data.notes is not None:
        affiliate.notes = data.notes

    await db.commit()
    return {"ok": True}


@router.delete("/affiliates/{affiliate_id}", summary="Excluir afiliado")
async def admin_delete_affiliate(
    affiliate_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full"})

    affiliate = await db.scalar(select(Affiliate).where(Affiliate.id == affiliate_id))
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado.")

    await db.delete(affiliate)
    await db.commit()
    return {"ok": True}


# ─── /admin/coupons ───────────────────────────────────────────────────────────

@router.get("/coupons", summary="Listar cupons")
async def admin_list_coupons(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(default=False),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "marketing"})

    q = select(Coupon).order_by(Coupon.created_at.desc())
    if active_only:
        q = q.where(Coupon.is_active == True)  # noqa: E712

    coupons = await db.scalars(q)
    now = datetime.now(timezone.utc)

    result = []
    for c in coupons:
        expired = c.valid_until is not None and c.valid_until < now
        exhausted = c.max_uses is not None and c.used_count >= c.max_uses
        result.append({
            "id": str(c.id),
            "code": c.code,
            "description": c.description,
            "discount_type": c.discount_type,
            "discount_value": float(c.discount_value),
            "discount_label": f"{c.discount_value}%" if c.discount_type == "percent" else f"R${c.discount_value}",
            "applicable_plans": c.applicable_plans,
            "max_uses": c.max_uses,
            "used_count": c.used_count,
            "valid_until": c.valid_until.isoformat() if c.valid_until else None,
            "is_active": c.is_active,
            "is_expired": expired,
            "is_exhausted": exhausted,
            "stripe_coupon_id": c.stripe_coupon_id,
            "created_by": c.created_by,
            "created_at": c.created_at.isoformat(),
        })

    return {"items": result}


@router.post("/coupons", summary="Criar cupom")
async def admin_create_coupon(
    data: CouponCreateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = admin_data
    _check_roles(role, {"full", "vendas"})

    code = data.code.upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Código do cupom não pode estar vazio.")

    if data.discount_type not in ("percent", "fixed"):
        raise HTTPException(status_code=400, detail="discount_type deve ser 'percent' ou 'fixed'.")

    if data.discount_value <= 0:
        raise HTTPException(status_code=400, detail="Valor do desconto deve ser positivo.")

    if data.discount_type == "percent" and data.discount_value > 100:
        raise HTTPException(status_code=400, detail="Desconto percentual não pode ser maior que 100%.")

    existing = await db.scalar(select(Coupon).where(Coupon.code == code))
    if existing:
        raise HTTPException(status_code=409, detail=f"Cupom '{code}' já existe.")

    coupon = Coupon(
        code=code,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        applicable_plans=data.applicable_plans,
        max_uses=data.max_uses,
        valid_until=data.valid_until,
        created_by=user.email,
    )
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)

    return {"id": str(coupon.id), "code": coupon.code}


@router.get("/coupons/{coupon_id}", summary="Detalhe de um cupom")
async def admin_get_coupon(
    coupon_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "marketing"})

    coupon = await db.scalar(select(Coupon).where(Coupon.id == coupon_id))
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado.")

    now = datetime.now(timezone.utc)
    return {
        "id": str(coupon.id),
        "code": coupon.code,
        "description": coupon.description,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value),
        "applicable_plans": coupon.applicable_plans,
        "max_uses": coupon.max_uses,
        "used_count": coupon.used_count,
        "valid_until": coupon.valid_until.isoformat() if coupon.valid_until else None,
        "is_active": coupon.is_active,
        "is_expired": coupon.valid_until is not None and coupon.valid_until < now,
        "is_exhausted": coupon.max_uses is not None and coupon.used_count >= coupon.max_uses,
        "stripe_coupon_id": coupon.stripe_coupon_id,
        "stripe_promo_code_id": coupon.stripe_promo_code_id,
        "created_by": coupon.created_by,
        "created_at": coupon.created_at.isoformat(),
        "updated_at": coupon.updated_at.isoformat(),
    }


@router.patch("/coupons/{coupon_id}", summary="Atualizar cupom")
async def admin_update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas"})

    coupon = await db.scalar(select(Coupon).where(Coupon.id == coupon_id))
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado.")

    if data.description is not None:
        coupon.description = data.description
    if data.discount_value is not None:
        coupon.discount_value = data.discount_value
    if data.max_uses is not None:
        coupon.max_uses = data.max_uses
    if data.valid_until is not None:
        coupon.valid_until = data.valid_until
    if data.is_active is not None:
        coupon.is_active = data.is_active
    if data.applicable_plans is not None:
        coupon.applicable_plans = data.applicable_plans

    await db.commit()
    return {"ok": True}


@router.delete("/coupons/{coupon_id}", summary="Deletar cupom")
async def admin_delete_coupon(
    coupon_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full"})

    coupon = await db.scalar(select(Coupon).where(Coupon.id == coupon_id))
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado.")

    await db.delete(coupon)
    await db.commit()
    return {"ok": True}


# ─── /admin/invoices ──────────────────────────────────────────────────────────

@router.get("/invoices", summary="Listar faturas")
async def admin_list_invoices(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID | None = Query(default=None),
    status: str = Query(default=""),
    month: str = Query(default="", description="YYYY-MM"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    _, role = admin_data
    _check_roles(role, {"full", "financeiro"})

    from app.modules.billing.invoice_model import Invoice

    q = select(Invoice).order_by(Invoice.created_at.desc())

    if tenant_id:
        q = q.where(Invoice.tenant_id == tenant_id)
    if status:
        q = q.where(Invoice.status == status)
    if month:
        try:
            year, mon = month.split("-")
            from_dt = datetime(int(year), int(mon), 1, tzinfo=timezone.utc)
            if int(mon) == 12:
                to_dt = datetime(int(year) + 1, 1, 1, tzinfo=timezone.utc)
            else:
                to_dt = datetime(int(year), int(mon) + 1, 1, tzinfo=timezone.utc)
            q = q.where(Invoice.created_at >= from_dt, Invoice.created_at < to_dt)
        except (ValueError, AttributeError):
            pass

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    invoices = await db.scalars(q.offset((page - 1) * page_size).limit(page_size))

    items = []
    for inv in invoices:
        tenant = None
        if inv.tenant_id:
            tenant = await db.scalar(select(Tenant).where(Tenant.id == inv.tenant_id))
        items.append({
            "id": str(inv.id),
            "tenant_id": str(inv.tenant_id) if inv.tenant_id else None,
            "tenant_name": tenant.name if tenant else "—",
            "stripe_invoice_id": inv.stripe_invoice_id,
            "amount": float(inv.amount),
            "currency": inv.currency,
            "status": inv.status,
            "plan": inv.plan,
            "period_start": inv.period_start.isoformat() if inv.period_start else None,
            "period_end": inv.period_end.isoformat() if inv.period_end else None,
            "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            "invoice_pdf": inv.invoice_pdf,
            "created_at": inv.created_at.isoformat(),
        })

    # Totais
    total_paid = await db.scalar(
        select(func.sum(Invoice.amount)).where(Invoice.status == "paid")
    ) or 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_paid_all_time": float(total_paid),
    }


@router.get("/invoices/export", summary="Exportar faturas em CSV")
async def admin_export_invoices(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    month: str = Query(default="", description="YYYY-MM — vazio exporta tudo"),
    status: str = Query(default="paid"),
):
    _, role = admin_data
    _check_roles(role, {"full", "financeiro"})

    from app.modules.billing.invoice_model import Invoice

    q = select(Invoice).order_by(Invoice.paid_at.desc().nullslast(), Invoice.created_at.desc())
    if status:
        q = q.where(Invoice.status == status)
    if month:
        try:
            year, mon = month.split("-")
            from_dt = datetime(int(year), int(mon), 1, tzinfo=timezone.utc)
            if int(mon) == 12:
                to_dt = datetime(int(year) + 1, 1, 1, tzinfo=timezone.utc)
            else:
                to_dt = datetime(int(year), int(mon) + 1, 1, tzinfo=timezone.utc)
            q = q.where(Invoice.created_at >= from_dt, Invoice.created_at < to_dt)
        except (ValueError, AttributeError):
            pass

    invoices = await db.scalars(q)
    invoice_list = list(invoices)

    # Busca nomes de tenants em batch
    tenant_ids = {inv.tenant_id for inv in invoice_list if inv.tenant_id}
    tenants_map: dict[uuid.UUID, str] = {}
    if tenant_ids:
        rows = await db.execute(
            select(Tenant.id, Tenant.name).where(Tenant.id.in_(tenant_ids))
        )
        tenants_map = {row.id: row.name for row in rows}

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "ID Fatura Stripe", "Empresa", "Plano", "Valor (R$)",
        "Status", "Pago em", "Período início", "Período fim", "PDF",
    ])
    for inv in invoice_list:
        tenant_name = tenants_map.get(inv.tenant_id, "") if inv.tenant_id else ""
        writer.writerow([
            inv.stripe_invoice_id,
            tenant_name,
            inv.plan or "",
            f"{float(inv.amount):.2f}".replace(".", ","),
            inv.status,
            inv.paid_at.strftime("%d/%m/%Y") if inv.paid_at else "",
            inv.period_start.strftime("%d/%m/%Y") if inv.period_start else "",
            inv.period_end.strftime("%d/%m/%Y") if inv.period_end else "",
            inv.invoice_pdf or "",
        ])

    output.seek(0)
    filename = f"faturas_{month or 'todas'}_{status}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),  # utf-8-sig = BOM para Excel BR
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── /admin/equipe ────────────────────────────────────────────────────────────

ROLE_LABELS = {
    "full": "Acesso Total",
    "vendas": "Vendas",
    "financeiro": "Financeiro",
    "marketing": "Marketing",
    "suporte": "Suporte",
}


@router.get("/equipe", summary="Listar usuários da equipe admin")
async def admin_list_equipe(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full"})

    # Inclui os admin_emails (CEO/fundadores) como entradas virtuais
    team = []
    for email in settings.admin_emails:
        team.append({
            "id": None,
            "email": email,
            "role": "full",
            "role_label": "Acesso Total",
            "is_active": True,
            "notes": "Fundador",
            "created_by": "sistema",
            "created_at": None,
            "is_env_admin": True,
        })

    db_admins = await db.scalars(select(AdminUser).order_by(AdminUser.created_at.desc()))
    for a in db_admins:
        # Não duplica se já está nos admin_emails
        if a.email.lower() in [e.lower() for e in settings.admin_emails]:
            continue
        team.append({
            "id": str(a.id),
            "email": a.email,
            "role": a.role,
            "role_label": ROLE_LABELS.get(a.role, a.role),
            "is_active": a.is_active,
            "notes": a.notes,
            "created_by": a.created_by,
            "created_at": a.created_at.isoformat(),
            "is_env_admin": False,
        })

    return {"items": team}


@router.post("/equipe", summary="Adicionar membro à equipe admin")
async def admin_create_equipe(
    data: AdminUserCreateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = admin_data
    _check_roles(role, {"full"})

    if data.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role inválido. Opções: {', '.join(sorted(ADMIN_ROLES))}"
        )

    email = data.email.lower().strip()
    if email in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(status_code=409, detail="Email já é admin via variável de ambiente.")

    existing = await db.scalar(select(AdminUser).where(AdminUser.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Esse email já tem acesso ao painel.")

    admin_user = AdminUser(
        email=email,
        role=data.role,
        notes=data.notes,
        created_by=user.email,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(admin_user)

    return {"id": str(admin_user.id), "email": admin_user.email, "role": admin_user.role}


@router.patch("/equipe/{admin_user_id}", summary="Atualizar membro da equipe")
async def admin_update_equipe(
    admin_user_id: uuid.UUID,
    data: AdminUserUpdateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full"})

    admin_user = await db.scalar(select(AdminUser).where(AdminUser.id == admin_user_id))
    if not admin_user:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")

    if data.role is not None:
        if data.role not in ADMIN_ROLES:
            raise HTTPException(status_code=400, detail=f"Role inválido.")
        admin_user.role = data.role
    if data.is_active is not None:
        admin_user.is_active = data.is_active
    if data.notes is not None:
        admin_user.notes = data.notes

    await db.commit()
    return {"ok": True}


@router.post("/equipe/{admin_user_id}/send-invite", summary="Enviar link de acesso ao membro")
async def admin_send_equipe_invite(
    admin_user_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    inviter, role = admin_data
    _check_roles(role, {"full"})

    admin_user = await db.scalar(select(AdminUser).where(AdminUser.id == admin_user_id))
    if not admin_user:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")

    role_label = ROLE_LABELS.get(admin_user.role, admin_user.role)

    # Verifica se já tem conta Jarbis
    existing_user = await db.scalar(
        select(User).where(User.email == admin_user.email)
    )

    if existing_user:
        # Tem conta → envia link de reset de senha
        token = secrets.token_urlsafe(32)
        existing_user.reset_token = token
        existing_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.flush()
        await db.commit()
        reset_url = f"{settings.frontend_url}/nova-senha?token={token}"
        from app.core.email import send_password_reset_email
        await send_password_reset_email(existing_user.email, existing_user.full_name, reset_url)
    else:
        # Sem conta → envia convite para criar conta
        await send_admin_invite_email(admin_user.email, role_label, inviter.email)

    return {"ok": True, "has_account": existing_user is not None}


@router.delete("/equipe/{admin_user_id}", summary="Remover membro da equipe")
async def admin_delete_equipe(
    admin_user_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full"})

    admin_user = await db.scalar(select(AdminUser).where(AdminUser.id == admin_user_id))
    if not admin_user:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")

    await db.delete(admin_user)
    await db.commit()
    return {"ok": True}


# ─── /admin/tenants/{tenant_id}/fiscal ────────────────────────────────────────

@router.patch("/tenants/{tenant_id}/fiscal", summary="Atualizar dados fiscais do tenant")
async def admin_update_tenant_fiscal(
    tenant_id: uuid.UUID,
    data: TenantFiscalUpdateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = admin_data
    _check_roles(role, {"full", "financeiro", "vendas"})

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    for field in ("cnpj", "razao_social", "inscricao_estadual", "cep",
                  "logradouro", "numero", "complemento", "bairro", "cidade", "estado"):
        val = getattr(data, field)
        if val is not None:
            setattr(tenant, field, val.strip() if val.strip() else None)

    await _audit(db, user.email, "fiscal_update", "tenant", str(tenant_id), tenant.name,
                 f"Dados fiscais atualizados: CNPJ={data.cnpj or '—'}")
    await db.commit()
    return {"ok": True}


# ─── /admin/affiliates/{affiliate_id}/payments ────────────────────────────────

@router.get("/affiliates/{affiliate_id}/payments", summary="Listar pagamentos de comissão do afiliado")
async def admin_list_affiliate_payments(
    affiliate_id: uuid.UUID,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "financeiro", "marketing"})

    affiliate = await db.scalar(select(Affiliate).where(Affiliate.id == affiliate_id))
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado.")

    payments = await db.scalars(
        select(AffiliatePayment)
        .where(AffiliatePayment.affiliate_id == affiliate_id)
        .order_by(AffiliatePayment.created_at.desc())
    )
    total_paid = await db.scalar(
        select(func.sum(AffiliatePayment.amount))
        .where(AffiliatePayment.affiliate_id == affiliate_id)
    ) or Decimal("0.00")

    return {
        "items": [
            {
                "id": str(p.id),
                "amount": float(p.amount),
                "period_description": p.period_description,
                "note": p.note,
                "created_by": p.created_by,
                "created_at": p.created_at.isoformat(),
            }
            for p in payments
        ],
        "total_paid": float(total_paid),
        "affiliate_name": affiliate.name,
        "affiliate_code": affiliate.code,
    }


@router.post("/affiliates/{affiliate_id}/payments", summary="Registrar pagamento de comissão")
async def admin_create_affiliate_payment(
    affiliate_id: uuid.UUID,
    data: AffiliatePaymentCreateInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = admin_data
    _check_roles(role, {"full", "financeiro"})

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor do pagamento deve ser positivo.")

    affiliate = await db.scalar(select(Affiliate).where(Affiliate.id == affiliate_id))
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado.")

    payment = AffiliatePayment(
        affiliate_id=affiliate_id,
        amount=data.amount,
        period_description=data.period_description,
        note=data.note,
        created_by=user.email,
    )
    db.add(payment)

    await _audit(db, user.email, "affiliate_payment", "affiliate",
                 str(affiliate_id), affiliate.name,
                 f"Pagamento R${data.amount:.2f} referente a: {data.period_description or '—'}")
    await db.commit()
    await db.refresh(payment)

    return {
        "id": str(payment.id),
        "amount": float(payment.amount),
        "period_description": payment.period_description,
        "created_at": payment.created_at.isoformat(),
    }


# ─── /admin/audit-log ─────────────────────────────────────────────────────────

@router.get("/audit-log", summary="Log de ações administrativas")
async def admin_audit_log(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    entity_type: str = Query(default=""),
    action: str = Query(default=""),
    admin_email: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    _, role = admin_data
    _check_roles(role, {"full"})

    q = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
    if entity_type:
        q = q.where(AdminAuditLog.entity_type == entity_type)
    if action:
        q = q.where(AdminAuditLog.action == action)
    if admin_email:
        q = q.where(AdminAuditLog.admin_email.ilike(f"%{admin_email}%"))

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    logs = await db.scalars(q.offset((page - 1) * page_size).limit(page_size))

    return {
        "items": [
            {
                "id": str(log.id),
                "admin_email": log.admin_email,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "entity_name": log.entity_name,
                "description": log.description,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ─── /admin/marketing ─────────────────────────────────────────────────────────

@router.get("/marketing", summary="Dashboard de marketing — aquisição e conversão")
async def admin_marketing_dashboard(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "marketing", "vendas"})

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Breakdown por utm_source ─────────────────────────────────────────────
    source_rows = await db.execute(
        select(Tenant.utm_source, func.count().label("count"))
        .group_by(Tenant.utm_source)
        .order_by(func.count().desc())
    )
    by_source = [
        {"source": row.utm_source or "orgânico/direto", "count": row.count}
        for row in source_rows
    ]

    # ── Funil: trial → pago ──────────────────────────────────────────────────
    total_tenants = await db.scalar(select(func.count()).select_from(Tenant)) or 0
    trial_tenants = await db.scalar(
        select(func.count()).select_from(Tenant)
        .where(Tenant.trial_ends_at.isnot(None))
    ) or 0
    paid_tenants = await db.scalar(
        select(func.count()).select_from(Tenant)
        .where(
            Tenant.subscription_status == "active",
            Tenant.plan.notin_(["free", "internal"]),
        )
    ) or 0

    conversion_rate = round(paid_tenants / trial_tenants * 100, 1) if trial_tenants > 0 else 0.0

    # ── Afiliados: conversões por código ────────────────────────────────────
    affiliate_rows = await db.execute(
        select(Tenant.affiliate_code, func.count().label("count"))
        .where(Tenant.affiliate_code.isnot(None))
        .group_by(Tenant.affiliate_code)
        .order_by(func.count().desc())
        .limit(10)
    )
    by_affiliate = [
        {"code": row.affiliate_code, "count": row.count}
        for row in affiliate_rows
    ]
    organic_count = await db.scalar(
        select(func.count()).select_from(Tenant)
        .where(Tenant.affiliate_code.is_(None))
    ) or 0
    affiliated_count = total_tenants - organic_count

    # ── Cupons mais usados ───────────────────────────────────────────────────
    coupon_rows = await db.scalars(
        select(Coupon)
        .where(Coupon.used_count > 0)
        .order_by(Coupon.used_count.desc())
        .limit(10)
    )
    top_coupons = [
        {
            "code": c.code,
            "used_count": c.used_count,
            "discount_label": f"{c.discount_value}%" if c.discount_type == "percent" else f"R${c.discount_value}",
            "is_active": c.is_active,
        }
        for c in coupon_rows
    ]

    # ── Signups no mês atual por canal ──────────────────────────────────────
    signups_month = await db.scalar(
        select(func.count()).select_from(Tenant)
        .where(Tenant.created_at >= month_start)
    ) or 0

    return {
        "funil": {
            "total_tenants": total_tenants,
            "total_trial": trial_tenants,
            "total_paid": paid_tenants,
            "conversion_trial_to_paid": conversion_rate,
        },
        "aquisicao": {
            "by_source": by_source,
            "organic": organic_count,
            "via_affiliate": affiliated_count,
            "by_affiliate": by_affiliate,
        },
        "cupons": top_coupons,
        "signups_mes_atual": signups_month,
    }


# ─── /admin/metrics/mrr-history ───────────────────────────────────────────────

@router.get("/metrics/mrr-history", summary="Histórico de MRR (série temporal)")
async def admin_mrr_history(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    months: int = Query(default=12, ge=1, le=36),
):
    _, role = admin_data
    _check_roles(role, {"full", "financeiro", "vendas"})

    # Busca snapshots dos últimos N meses
    from_date = (datetime.now(timezone.utc) - timedelta(days=months * 31)).date()
    rows = await db.scalars(
        select(MrrSnapshot)
        .where(MrrSnapshot.snapshot_date >= from_date)
        .order_by(MrrSnapshot.snapshot_date.asc())
    )
    snapshots = list(rows)

    # Se não há snapshots, gera dados em tempo real para hoje como fallback
    if not snapshots:
        PLAN_MRR = {"solo": 79.90, "starter": 79.90, "equipe": 189.90, "professional": 189.90, "ilimitado": 599.90}
        paid_rows = await db.execute(
            select(Tenant.plan, Tenant.addon_packs, func.count().label("count"))
            .where(Tenant.is_active == True, Tenant.subscription_status == "active", Tenant.plan.in_(list(PLAN_MRR.keys())))  # noqa: E712
            .group_by(Tenant.plan, Tenant.addon_packs)
        )
        mrr = sum(row.count * (PLAN_MRR[row.plan] + row.addon_packs * 49.90) for row in paid_rows)
        return {
            "series": [{"date": str(datetime.now(timezone.utc).date()), "mrr": round(mrr, 2), "arr": round(mrr * 12, 2), "paying_tenants": 0}],
            "current_mrr": round(mrr, 2),
            "mom_change": 0.0,
            "has_history": False,
        }

    series = [
        {
            "date": str(s.snapshot_date),
            "mrr": float(s.mrr),
            "arr": float(s.arr),
            "paying_tenants": s.paying_tenants,
            "new_tenants": s.new_tenants,
            "churned_tenants": s.churned_tenants,
        }
        for s in snapshots
    ]

    current_mrr = float(snapshots[-1].mrr) if snapshots else 0.0
    prev_mrr = float(snapshots[-2].mrr) if len(snapshots) >= 2 else current_mrr
    # MoM: compara último snapshot com o de 30 dias atrás
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).date()
    older = next((s for s in reversed(snapshots) if s.snapshot_date <= month_ago), None)
    mom_change = round((current_mrr - float(older.mrr)) / float(older.mrr) * 100, 1) if older and float(older.mrr) > 0 else 0.0

    return {
        "series": series,
        "current_mrr": current_mrr,
        "mom_change": mom_change,
        "has_history": True,
    }


# ─── /admin/metrics/mrr-snapshots (reset) ─────────────────────────────────────

@router.delete("/metrics/mrr-snapshots", summary="Limpar histórico MRR (reset)")
async def admin_reset_mrr_snapshots(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full"})
    await db.execute(delete(MrrSnapshot))
    await db.commit()
    return {"ok": True, "message": "Histórico MRR apagado. Novos snapshots serão gerados a partir de hoje."}


# ─── /admin/metrics/retention ─────────────────────────────────────────────────

@router.get("/metrics/retention", summary="Churn rate, LTV e métricas de retenção")
async def admin_retention(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full", "financeiro", "vendas"})

    PLAN_MRR = {"solo": 79.90, "starter": 79.90, "equipe": 189.90, "professional": 189.90, "ilimitado": 599.90}
    now = datetime.now(timezone.utc)

    # MRR atual
    paid_rows = await db.execute(
        select(Tenant.plan, Tenant.addon_packs, func.count().label("count"))
        .where(Tenant.is_active == True, Tenant.subscription_status == "active", Tenant.plan.in_(list(PLAN_MRR.keys())))  # noqa: E712
        .group_by(Tenant.plan, Tenant.addon_packs)
    )
    mrr = sum(row.count * (PLAN_MRR[row.plan] + row.addon_packs * 49.90) for row in paid_rows)

    paying_tenants = await db.scalar(
        select(func.count()).select_from(Tenant)
        .where(Tenant.is_active == True, Tenant.subscription_status == "active", Tenant.plan.in_(list(PLAN_MRR.keys())))  # noqa: E712
    ) or 0

    # Churn: cancelamentos nos últimos 30 dias
    month_start = now - timedelta(days=30)
    churned_30d = await db.scalar(
        select(func.count()).select_from(Tenant)
        .where(Tenant.canceled_at.isnot(None), Tenant.canceled_at >= month_start)
    ) or 0

    active_30d_ago = await db.scalar(
        select(func.count()).select_from(Tenant)
        .where(Tenant.created_at <= month_start, Tenant.subscription_status == "active")
    ) or 0

    churn_rate = round(churned_30d / active_30d_ago * 100, 2) if active_30d_ago > 0 else 0.0

    # LTV = ARPA / churn_rate
    arpa = round(mrr / paying_tenants, 2) if paying_tenants > 0 else 0.0
    ltv = round(arpa / (churn_rate / 100), 2) if churn_rate > 0 else 0.0

    # NRR estimado (simplificado: sem expansão real, usa MRR como proxy)
    nrr = round((1 - churn_rate / 100) * 100, 1)

    # Série mensal de churn (últimos 6 meses)
    monthly_churn = []
    for i in range(5, -1, -1):
        m_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            m_end = (now.replace(day=1) - timedelta(days=(i - 1) * 30)).replace(day=1)
        else:
            m_end = now
        canceled = await db.scalar(
            select(func.count()).select_from(Tenant)
            .where(Tenant.canceled_at >= m_start, Tenant.canceled_at < m_end)
        ) or 0
        monthly_churn.append({
            "month": m_start.strftime("%Y-%m"),
            "churned": canceled,
        })

    return {
        "mrr": round(mrr, 2),
        "arr": round(mrr * 12, 2),
        "paying_tenants": paying_tenants,
        "arpa": arpa,
        "churn_rate_30d": churn_rate,
        "ltv_estimated": ltv,
        "nrr_estimated": nrr,
        "churned_last_30d": churned_30d,
        "monthly_churn": monthly_churn,
    }


# ─── /admin/customer-success ──────────────────────────────────────────────────

@router.get("/customer-success", summary="Lista de clientes por health score (piores primeiro)")
async def admin_customer_success(
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    risk_only: bool = Query(default=False, description="Apenas em risco ou churn (score < 80)"),
):
    _, role = admin_data
    _check_roles(role, {"full", "vendas", "suporte"})

    from app.modules.reports.models import Report
    from app.modules.reports.dataset_models import ReportDataset

    tenants = await db.scalars(select(Tenant).where(Tenant.is_active == True).order_by(Tenant.created_at.desc()))  # noqa: E712
    tenant_list = list(tenants)

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    results = []

    for t in tenant_list:
        score = 0
        reasons = []

        # +30: pagamento em dia
        if t.subscription_status == "active":
            score += 30
        else:
            reasons.append(f"Pagamento {t.subscription_status}")

        # +20: login recente (algum usuário nos últimos 7 dias)
        recent_login = await db.scalar(
            select(func.count()).select_from(User)
            .where(User.tenant_id == t.id, User.last_login_at >= week_ago)
        ) or 0
        if recent_login > 0:
            score += 20
        else:
            reasons.append("Sem login nos últimos 7 dias")

        # +20: tem dashboards
        dash_count = await db.scalar(
            select(func.count()).select_from(Report).where(Report.tenant_id == t.id)
        ) or 0
        if dash_count > 0:
            score += 20
        else:
            reasons.append("Nenhum dashboard criado")

        # +15: tem datasets
        ds_count = await db.scalar(
            select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == t.id)
        ) or 0
        if ds_count > 0:
            score += 15
        else:
            reasons.append("Nenhum dataset")

        # +15: mais de 1 usuário
        user_count = await db.scalar(
            select(func.count()).select_from(User).where(User.tenant_id == t.id)
        ) or 0
        if user_count > 1:
            score += 15
        else:
            reasons.append("Apenas 1 usuário")

        if risk_only and score >= 80:
            continue

        status_label = "saudavel" if score >= 80 else ("risco" if score >= 50 else "churn")

        owner = await db.scalar(
            select(User).where(User.tenant_id == t.id, User.role == "owner")
        )

        results.append({
            "id": str(t.id),
            "name": t.name,
            "slug": t.slug,
            "plan": t.plan,
            "plan_name": PLAN_NAMES.get(t.plan, t.plan),
            "subscription_status": t.subscription_status,
            "health_score": score,
            "health_status": status_label,
            "risk_reasons": reasons,
            "user_count": user_count,
            "dash_count": dash_count,
            "owner_email": owner.email if owner else None,
            "created_at": t.created_at.isoformat(),
        })

    # Ordena por score crescente (piores primeiro), depois por data
    results.sort(key=lambda x: (x["health_score"], x["created_at"]))

    return {
        "items": results[:limit],
        "total": len(results),
        "at_risk": sum(1 for r in results if r["health_status"] != "saudavel"),
        "churn_risk": sum(1 for r in results if r["health_status"] == "churn"),
    }


# ── Portal do Afiliado — gerenciamento de convite ─────────────────────────────

@router.post("/affiliates/{affiliate_id}/invite")
async def send_affiliate_invite(
    affiliate_id: uuid.UUID,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Gera (ou regenera) o token de convite do afiliado para primeiro acesso ao portal.
    Em produção, enviaria email — por ora retorna o link diretamente.
    """
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "marketing"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    affiliate = await db.scalar(select(Affiliate).where(Affiliate.id == affiliate_id))
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado")

    token = secrets.token_urlsafe(32)
    affiliate.invite_token = token
    affiliate.invite_expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.commit()

    invite_link = f"https://jarbis.cc/affiliate/set-password?token={token}"
    return {
        "invite_link": invite_link,
        "expires_in_days": 7,
        "affiliate_email": affiliate.email,
        "affiliate_name": affiliate.name,
    }


# ── Fase 4 — Bulk Actions ─────────────────────────────────────────────────────

@router.post("/tenants/bulk-extend-trial")
async def bulk_extend_trial(
    body: BulkExtendTrialInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Estende o trial de múltiplos tenants de uma vez."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "suporte"):
        raise HTTPException(status_code=403, detail="Acesso negado")
    if not 1 <= body.days <= 365:
        raise HTTPException(status_code=400, detail="Dias deve ser entre 1 e 365")

    updated = 0
    now = datetime.now(timezone.utc)
    for tid in body.tenant_ids:
        t = await db.scalar(select(Tenant).where(Tenant.id == tid))
        if t:
            base = t.trial_ends_at or now
            t.trial_ends_at = base + timedelta(days=body.days)
            updated += 1

    await _audit(
        db, user.email, "bulk_extend_trial", "tenant", None, None,
        f"{updated} tenants com trial +{body.days}d"
    )
    await db.commit()
    return {"ok": True, "updated": updated, "days_added": body.days}


# ── Fase 4 — Alertas Proativos ────────────────────────────────────────────────

@router.get("/alerts")
async def get_admin_alerts(
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Alertas proativos para o time interno:
    - trial_expiring: trial acaba em ≤ 3 dias
    - past_due_critical: inadimplente há > 7 dias
    - high_churn_risk: health score < 50 (calcula subset)
    - inactive_new: cadastrado < 30 dias, sem login em 7 dias
    """
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "suporte", "financeiro"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    now = datetime.now(timezone.utc)

    # 1. Trial expirando em ≤ 3 dias
    trial_rows = await db.scalars(
        select(Tenant).where(
            Tenant.trial_ends_at.isnot(None),
            Tenant.trial_ends_at > now,
            Tenant.trial_ends_at <= now + timedelta(days=3),
            Tenant.is_active == True,  # noqa: E712
        ).order_by(Tenant.trial_ends_at)
    )
    trial_expiring = []
    for t in trial_rows.all():
        owner = await db.scalar(select(User).where(User.tenant_id == t.id, User.role == "owner"))
        delta = (t.trial_ends_at - now).days if t.trial_ends_at else 0
        trial_expiring.append({
            "id": str(t.id), "name": t.name, "slug": t.slug,
            "owner_email": owner.email if owner else None,
            "trial_ends_at": t.trial_ends_at.isoformat() if t.trial_ends_at else None,
            "days_remaining": max(0, delta),
        })

    # 2. Past due crítico: inadimplente há > 7 dias (usa created_at como proxy — melhor que nada)
    past_due_rows = await db.scalars(
        select(Tenant).where(
            Tenant.subscription_status == "past_due",
            Tenant.is_active == True,  # noqa: E712
        ).order_by(Tenant.updated_at)
    )
    past_due_critical = []
    for t in past_due_rows.all():
        owner = await db.scalar(select(User).where(User.tenant_id == t.id, User.role == "owner"))
        past_due_critical.append({
            "id": str(t.id), "name": t.name, "slug": t.slug,
            "plan": t.plan,
            "owner_email": owner.email if owner else None,
        })

    # 3. Sem login recente nos novos (cadastrado < 30 dias, sem login em 7 dias)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    new_tenants = await db.scalars(
        select(Tenant).where(
            Tenant.created_at >= thirty_days_ago,
            Tenant.is_active == True,  # noqa: E712
        )
    )
    inactive_new = []
    for t in new_tenants.all():
        owner = await db.scalar(select(User).where(User.tenant_id == t.id, User.role == "owner"))
        if owner and (owner.last_login_at is None or owner.last_login_at < seven_days_ago):
            days_since = (now - t.created_at).days
            inactive_new.append({
                "id": str(t.id), "name": t.name, "slug": t.slug,
                "owner_email": owner.email if owner else None,
                "days_since_signup": days_since,
                "last_login_at": owner.last_login_at.isoformat() if owner and owner.last_login_at else None,
            })

    total = len(trial_expiring) + len(past_due_critical) + len(inactive_new)
    return {
        "total": total,
        "trial_expiring": trial_expiring,
        "past_due_critical": past_due_critical,
        "inactive_new": inactive_new,
    }


# ── Fase 4 — CRM: busca tenants por estágio ───────────────────────────────────

@router.get("/crm")
async def get_crm_board(
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna tenants agrupados por crm_stage para o kanban."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "suporte"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    tenants_result = await db.scalars(
        select(Tenant).where(Tenant.is_active == True).order_by(Tenant.created_at.desc())  # noqa: E712
    )
    tenants = tenants_result.all()

    STAGES = ["novo", "contato", "demo_agendada", "proposta", "cliente", "perdido"]
    board: dict[str, list] = {s: [] for s in STAGES}

    for t in tenants:
        stage = t.crm_stage if t.crm_stage in STAGES else "novo"
        owner = await db.scalar(select(User).where(User.tenant_id == t.id, User.role == "owner"))
        board[stage].append({
            "id": str(t.id),
            "name": t.name,
            "plan": t.plan,
            "subscription_status": t.subscription_status,
            "owner_email": owner.email if owner else None,
            "trial_days_remaining": t.trial_days_remaining,
            "created_at": t.created_at.isoformat(),
        })

    return {
        "stages": STAGES,
        "board": board,
        "total": len(tenants),
    }


# ── Fase 4 — Email Dispatch ───────────────────────────────────────────────────

def _build_campaign_html(subject: str, body_html: str, tenant_name: str) -> str:
    """Monta o HTML do email de campanha com template padrão Jarbis."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
    {_HEADER_HTML}
    <div style="padding: 40px 32px;">
      <p style="color: #475569; font-size: 14px; margin: 0 0 20px;">Olá, <strong style="color: #0f172a;">{tenant_name}</strong>!</p>
      {body_html}
    </div>
    {_FOOTER_HTML}
  </div>
</body>
</html>"""


@router.post("/emails/preview")
async def preview_campaign_recipients(
    body: CampaignEmailInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna a lista de destinatários para preview antes de enviar."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "marketing"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    recipients = await _get_campaign_recipients(body, db)
    return {
        "count": len(recipients),
        "recipients": [{"tenant_name": r[0], "owner_email": r[1]} for r in recipients[:20]],
        "showing": min(20, len(recipients)),
    }


@router.post("/emails/send-campaign")
async def send_email_campaign(
    body: CampaignEmailInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Envia email para segmento de tenants via Resend."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "marketing"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    recipients = await _get_campaign_recipients(body, db)
    if not recipients:
        raise HTTPException(status_code=400, detail="Nenhum destinatário encontrado para este segmento.")

    sent = 0
    failed = 0
    for tenant_name, owner_email in recipients:
        html = body.body_html if body.raw_html else _build_campaign_html(body.subject, body.body_html, tenant_name)
        ok = await send_admin_email(owner_email, body.subject, html)
        if ok:
            sent += 1
        else:
            failed += 1

    await _audit(
        db, user.email, "email_campaign", "campaign", None, body.subject,
        f"Enviado para {sent} destinatários, {failed} falhas"
    )
    await db.commit()
    return {"ok": True, "sent": sent, "failed": failed, "total": len(recipients)}


async def _get_campaign_recipients(
    body: CampaignEmailInput, db: AsyncSession
) -> list[tuple[str, str]]:
    """Retorna lista de (tenant_name, owner_email) conforme segmentação."""
    now = datetime.now(timezone.utc)

    if body.send_to_tenant_id:
        t = await db.scalar(select(Tenant).where(Tenant.id == body.send_to_tenant_id))
        if not t:
            return []
        owner = await db.scalar(select(User).where(User.tenant_id == t.id, User.role == "owner"))
        if owner:
            return [(t.name, owner.email)]
        return []

    q = select(Tenant).where(Tenant.is_active == True)  # noqa: E712
    if body.segment_plan:
        q = q.where(Tenant.plan == body.segment_plan)
    if body.segment_status:
        q = q.where(Tenant.subscription_status == body.segment_status)
    if body.segment_trial_days_max is not None:
        cutoff = now + timedelta(days=body.segment_trial_days_max)
        q = q.where(
            Tenant.trial_ends_at.isnot(None),
            Tenant.trial_ends_at <= cutoff,
            Tenant.trial_ends_at > now,
        )

    tenants_result = await db.scalars(q)
    tenants = tenants_result.all()

    result = []
    for t in tenants:
        owner = await db.scalar(select(User).where(User.tenant_id == t.id, User.role == "owner"))
        if owner:
            result.append((t.name, owner.email))
    return result


# ── Fase 5 — Onboarding Checklist ────────────────────────────────────────────

@router.get("/tenants/{tenant_id}/onboarding")
async def get_tenant_onboarding(
    tenant_id: uuid.UUID,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Checklist de onboarding calculado on-the-fly para o tenant."""
    await _get_admin_role(user.email, db)

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    owner = await db.scalar(select(User).where(User.tenant_id == tenant_id, User.role == "owner"))
    user_count = await db.scalar(select(func.count()).select_from(User).where(User.tenant_id == tenant_id)) or 0
    dash_count = await db.scalar(select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)) or 0
    dataset_count = await db.scalar(select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tenant_id)) or 0

    steps = [
        {"id": "email_verified",   "label": "Email verificado",          "done": bool(owner and owner.email_verified)},
        {"id": "first_login",      "label": "Primeiro login realizado",   "done": bool(owner and owner.last_login_at)},
        {"id": "dashboard_criado", "label": "Dashboard criado",           "done": dash_count > 0},
        {"id": "dataset_adicionado","label": "Dataset adicionado",        "done": dataset_count > 0},
        {"id": "usuario_convidado","label": "Usuário convidado",          "done": user_count > 1},
        {"id": "plano_ativo",      "label": "Plano pago ativo",           "done": tenant.subscription_status == "active" and tenant.plan not in ("free", "trial")},
    ]
    done = sum(1 for s in steps if s["done"])
    pct = round(done / len(steps) * 100)
    return {"steps": steps, "completed": done, "total": len(steps), "percent": pct}


# ── Fase 5 — Support Tickets ──────────────────────────────────────────────────

class TicketCreateInput(BaseModel):
    tenant_id: uuid.UUID
    title: str
    description: str = ""
    priority: str = "medium"
    assigned_to: str | None = None


class TicketUpdateInput(BaseModel):
    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = None
    title: str | None = None


class TicketCommentInput(BaseModel):
    content: str


@router.get("/support/tickets")
async def list_support_tickets(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    tenant_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "suporte"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    q = select(SupportTicket).order_by(SupportTicket.created_at.desc())
    if status:
        q = q.where(SupportTicket.status == status)
    if priority:
        q = q.where(SupportTicket.priority == priority)
    if tenant_id:
        q = q.where(SupportTicket.tenant_id == tenant_id)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    tickets = await db.scalars(q.offset((page - 1) * page_size).limit(page_size))

    result = []
    for t in tickets.all():
        tenant = await db.scalar(select(Tenant).where(Tenant.id == t.tenant_id))
        result.append({
            "id": str(t.id),
            "tenant_id": str(t.tenant_id),
            "tenant_name": tenant.name if tenant else None,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "created_by": t.created_by,
            "assigned_to": t.assigned_to,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
            "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
        })
    return {"items": result, "total": total or 0}


@router.post("/support/tickets")
async def create_support_ticket(
    body: TicketCreateInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "suporte"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    tenant = await db.scalar(select(Tenant).where(Tenant.id == body.tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    ticket = SupportTicket(
        id=uuid.uuid4(),
        tenant_id=body.tenant_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        assigned_to=body.assigned_to,
        created_by=user.email,
    )
    db.add(ticket)
    await _audit(db, user.email, "ticket_create", "tenant", str(body.tenant_id), tenant.name, body.title)
    await db.commit()
    return {"id": str(ticket.id), "ok": True}


@router.get("/support/tickets/{ticket_id}")
async def get_support_ticket(
    ticket_id: uuid.UUID,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_admin_role(user.email, db)
    ticket = await db.scalar(select(SupportTicket).where(SupportTicket.id == ticket_id))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado.")

    tenant = await db.scalar(select(Tenant).where(Tenant.id == ticket.tenant_id))
    comments_result = await db.scalars(
        select(SupportTicketComment)
        .where(SupportTicketComment.ticket_id == ticket_id)
        .order_by(SupportTicketComment.created_at)
    )
    return {
        "id": str(ticket.id),
        "tenant_id": str(ticket.tenant_id),
        "tenant_name": tenant.name if tenant else None,
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status,
        "priority": ticket.priority,
        "created_by": ticket.created_by,
        "assigned_to": ticket.assigned_to,
        "created_at": ticket.created_at.isoformat(),
        "updated_at": ticket.updated_at.isoformat(),
        "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
        "comments": [
            {
                "id": str(c.id),
                "author_email": c.author_email,
                "content": c.content,
                "created_at": c.created_at.isoformat(),
            }
            for c in comments_result.all()
        ],
    }


@router.patch("/support/tickets/{ticket_id}")
async def update_support_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdateInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_admin_role(user.email, db)
    ticket = await db.scalar(select(SupportTicket).where(SupportTicket.id == ticket_id))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado.")

    if body.status:
        ticket.status = body.status
        if body.status == "resolved" and not ticket.resolved_at:
            ticket.resolved_at = datetime.now(timezone.utc)
    if body.priority:
        ticket.priority = body.priority
    if body.assigned_to is not None:
        ticket.assigned_to = body.assigned_to
    if body.title:
        ticket.title = body.title

    await db.commit()
    return {"ok": True}


@router.post("/support/tickets/{ticket_id}/comments")
async def add_ticket_comment(
    ticket_id: uuid.UUID,
    body: TicketCommentInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_admin_role(user.email, db)
    ticket = await db.scalar(select(SupportTicket).where(SupportTicket.id == ticket_id))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado.")

    comment = SupportTicketComment(
        id=uuid.uuid4(),
        ticket_id=ticket_id,
        author_email=user.email,
        content=body.content,
    )
    db.add(comment)
    ticket.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": str(comment.id), "ok": True}


# ── Fase 5 — NF-e via NFe.io ─────────────────────────────────────────────────

class NfeIssueInput(BaseModel):
    competencia: str           # YYYY-MM
    valor: Decimal
    descricao: str = "Assinatura Jarbis"


@router.get("/tenants/{tenant_id}/nfe")
async def list_tenant_nfe(
    tenant_id: uuid.UUID,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "financeiro"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    docs = await db.scalars(
        select(NfeDocument)
        .where(NfeDocument.tenant_id == tenant_id)
        .order_by(NfeDocument.created_at.desc())
    )
    return [
        {
            "id": str(d.id),
            "competencia": d.competencia,
            "valor": float(d.valor),
            "descricao": d.descricao,
            "status": d.status,
            "nfe_url": d.nfe_url,
            "pdf_url": d.pdf_url,
            "xml_url": d.xml_url,
            "error_message": d.error_message,
            "issued_by": d.issued_by,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs.all()
    ]


@router.post("/tenants/{tenant_id}/nfe")
async def issue_nfe(
    tenant_id: uuid.UUID,
    body: NfeIssueInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Emite NF-e de serviço via NFe.io para o tenant."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "financeiro"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")
    if not tenant.cnpj:
        raise HTTPException(status_code=400, detail="Tenant sem CNPJ cadastrado. Preencha os dados fiscais primeiro.")

    doc = NfeDocument(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        competencia=body.competencia,
        valor=body.valor,
        descricao=body.descricao,
        status="pending",
        issued_by=user.email,
    )
    db.add(doc)
    await db.flush()

    if not settings.nfeio_api_key or not settings.nfeio_company_id:
        doc.status = "error"
        doc.error_message = "NFEIO_API_KEY ou NFEIO_COMPANY_ID não configurados."
        await db.commit()
        return {"id": str(doc.id), "status": "error", "message": doc.error_message}

    # Monta payload NFe.io NFS-e
    cnpj_digits = "".join(filter(str.isdigit, tenant.cnpj or ""))
    payload = {
        "cityServiceCode": "1.07",
        "description": body.descricao,
        "servicesAmount": float(body.valor),
        "borrower": {
            "federalTaxNumber": cnpj_digits,
            "name": tenant.razao_social or tenant.name,
            "email": "",
            "address": {
                "country": "BRA",
                "postalCode": (tenant.cep or "").replace("-", ""),
                "street": tenant.logradouro or "",
                "number": tenant.numero or "S/N",
                "additionalInformation": tenant.complemento or "",
                "district": tenant.bairro or "",
                "city": {"name": tenant.cidade or ""},
                "state": tenant.estado or "SP",
            },
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://api.nfe.io/v1/companies/{settings.nfeio_company_id}/serviceinvoices",
                headers={
                    "Authorization": f"Basic {settings.nfeio_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if resp.status_code in (200, 201, 202):
            data = resp.json()
            doc.nfeio_id = data.get("id")
            doc.status = "issued"
            doc.nfe_url = data.get("flowStatus", {}).get("url")
            doc.pdf_url = data.get("pdfUrl")
            doc.xml_url = data.get("xmlUrl")
        else:
            doc.status = "error"
            doc.error_message = f"NFe.io retornou {resp.status_code}: {resp.text[:300]}"
    except Exception as e:
        doc.status = "error"
        doc.error_message = str(e)[:300]

    await _audit(db, user.email, "nfe_issue", "tenant", str(tenant_id), tenant.name,
                 f"NF-e {body.competencia} R${body.valor} → {doc.status}")
    await db.commit()
    return {
        "id": str(doc.id),
        "status": doc.status,
        "nfeio_id": doc.nfeio_id,
        "pdf_url": doc.pdf_url,
        "error_message": doc.error_message,
    }


# ── Fase 5 — SSE: Alertas em Tempo Real ──────────────────────────────────────

@router.get("/events")
async def admin_sse_events(
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Server-Sent Events: envia snapshot de alertas a cada 30s.
    O cliente mantém conexão aberta e recebe updates sem polling manual.
    """
    await _get_admin_role(user.email, db)

    async def event_generator():
        try:
            while True:
                async with AsyncSessionLocal() as session:
                    now = datetime.now(timezone.utc)

                    trial_count = await session.scalar(
                        select(func.count()).select_from(Tenant).where(
                            Tenant.trial_ends_at.isnot(None),
                            Tenant.trial_ends_at > now,
                            Tenant.trial_ends_at <= now + timedelta(days=3),
                            Tenant.is_active == True,  # noqa: E712
                        )
                    ) or 0

                    past_due_count = await session.scalar(
                        select(func.count()).select_from(Tenant).where(
                            Tenant.subscription_status == "past_due",
                            Tenant.is_active == True,  # noqa: E712
                        )
                    ) or 0

                    open_tickets = await session.scalar(
                        select(func.count()).select_from(SupportTicket).where(
                            SupportTicket.status.in_(["open", "in_progress"])
                        )
                    ) or 0

                    new_signups_today = await session.scalar(
                        select(func.count()).select_from(Tenant).where(
                            Tenant.created_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)
                        )
                    ) or 0

                data = {
                    "trial_expiring": trial_count,
                    "past_due": past_due_count,
                    "open_tickets": open_tickets,
                    "new_signups_today": new_signups_today,
                    "ts": now.isoformat(),
                }
                yield f"data: {json.dumps(data)}\n\n"
                await asyncio.sleep(30)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ══════════════════════════════════════════════════════════════════════════════
# FASE 6 — Audit Log UI, Impersonation, API Keys
# ══════════════════════════════════════════════════════════════════════════════

# ── Fase 6 — Audit Log ───────────────────────────────────────────────────────

@router.get("/audit-log")
async def list_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_email: str | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Histórico de ações administrativas com filtros."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full",):
        raise HTTPException(status_code=403, detail="Acesso restrito ao role full")

    q = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
    if admin_email:
        q = q.where(AdminAuditLog.admin_email.ilike(f"%{admin_email}%"))
    if action:
        q = q.where(AdminAuditLog.action == action)
    if entity_type:
        q = q.where(AdminAuditLog.entity_type == entity_type)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.scalars(q.offset((page - 1) * page_size).limit(page_size))

    return {
        "items": [
            {
                "id": str(r.id),
                "admin_email": r.admin_email,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "entity_name": r.entity_name,
                "description": r.description,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows.all()
        ],
        "total": total or 0,
        "page": page,
        "page_size": page_size,
    }


# ── Fase 6 — Impersonation ────────────────────────────────────────────────────

@router.post("/tenants/{tenant_id}/impersonate")
async def impersonate_tenant(
    tenant_id: uuid.UUID,
    response: Response,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Seta um cookie httpOnly jarbis_impersonation_token (15 min) que autentica
    como o owner do tenant. O painel admin continua usando jarbis_admin_token
    Bearer, portanto não é afetado pelo cookie de impersonação.
    Apenas role 'full' pode impersonar.
    """
    role = await _get_admin_role(user.email, db)
    if role != "full":
        raise HTTPException(status_code=403, detail="Apenas o role 'full' pode impersonar tenants")

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")

    owner = await db.scalar(
        select(User).where(User.tenant_id == tenant_id, User.role == "owner")
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Owner não encontrado para este tenant")

    token = create_access_token(
        data={
            "sub": str(owner.id),
            "tenant_id": str(owner.tenant_id),
            "impersonated_by": user.email,
            "impersonation": True,
        },
        expires_delta=timedelta(minutes=15),
    )

    is_prod = settings.is_production
    response.set_cookie(
        key="jarbis_impersonation_token",
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=15 * 60,
        path="/",
    )

    await _audit(
        db, user.email, "impersonate", "tenant", str(tenant_id), tenant.name,
        f"Impersonou {owner.email} por 15 min"
    )
    await db.commit()

    return {
        "tenant_name": tenant.name,
        "owner_email": owner.email,
        "expires_in_minutes": 15,
    }


@router.post("/tenants/impersonate/end")
async def end_impersonation(
    response: Response,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Encerra a sessão de impersonação limpando o cookie jarbis_impersonation_token."""
    is_prod = settings.is_production
    response.delete_cookie(
        key="jarbis_impersonation_token",
        path="/",
        samesite="none" if is_prod else "lax",
    )
    await _audit(db, user.email, "impersonate_end", "tenant", description="Encerrou sessão de impersonação")
    await db.commit()
    return {"ok": True}


# ── Fase 6 — API Keys ─────────────────────────────────────────────────────────

class ApiKeyCreateInput(BaseModel):
    name: str
    scopes: str = "read"
    expires_in_days: int | None = None


@router.get("/tenants/{tenant_id}/api-keys")
async def list_api_keys(
    tenant_id: uuid.UUID,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role = await _get_admin_role(user.email, db)
    if role not in ("full",):
        raise HTTPException(status_code=403, detail="Acesso negado")

    keys = await db.scalars(
        select(ApiKey).where(ApiKey.tenant_id == tenant_id).order_by(ApiKey.created_at.desc())
    )
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "key_prefix": k.key_prefix,
            "scopes": k.scopes,
            "is_active": k.is_active,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "expires_at": k.expires_at.isoformat() if k.expires_at else None,
            "created_by": k.created_by,
            "created_at": k.created_at.isoformat(),
        }
        for k in keys.all()
    ]


@router.post("/tenants/{tenant_id}/api-keys")
async def create_api_key(
    tenant_id: uuid.UUID,
    body: ApiKeyCreateInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria uma nova API key para o tenant. A chave completa só é retornada nesta chamada."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full",):
        raise HTTPException(status_code=403, detail="Acesso negado")

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")

    # Gera chave: jrb_live_<random32>
    raw_secret = secrets.token_urlsafe(32)
    full_key = f"jrb_live_{raw_secret}"
    prefix = full_key[:16]  # ex: jrb_live_AbCdEfGh
    hashed = hashlib.sha256(full_key.encode()).hexdigest()

    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)

    key = ApiKey(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=body.name,
        key_prefix=prefix,
        hashed_key=hashed,
        scopes=body.scopes,
        expires_at=expires_at,
        created_by=user.email,
    )
    db.add(key)
    await _audit(db, user.email, "api_key_create", "tenant", str(tenant_id), tenant.name, body.name)
    await db.commit()

    return {
        "id": str(key.id),
        "name": key.name,
        "key": full_key,   # ← única vez que a chave completa é retornada
        "key_prefix": prefix,
        "scopes": key.scopes,
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


@router.delete("/tenants/{tenant_id}/api-keys/{key_id}")
async def revoke_api_key(
    tenant_id: uuid.UUID,
    key_id: uuid.UUID,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role = await _get_admin_role(user.email, db)
    if role not in ("full",):
        raise HTTPException(status_code=403, detail="Acesso negado")

    key = await db.scalar(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.tenant_id == tenant_id)
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key não encontrada")

    key.is_active = False
    await _audit(db, user.email, "api_key_revoke", "tenant", str(tenant_id), None, key.name)
    await db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# FASE 7 — MRR Movements, Cohort, NPS, Onboarding/me, Lifecycle logs
# ══════════════════════════════════════════════════════════════════════════════

# ── Fase 7 — MRR Movements ────────────────────────────────────────────────────

@router.get("/metrics/mrr-movements")
async def admin_mrr_movements(
    months: int = Query(default=12, ge=1, le=24),
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Breakdown mensal de MRR: MRR início, fim, novos tenants, churned, net new."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "financeiro", "vendas"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    now = datetime.now(timezone.utc)
    result = []
    ARPA = 159.90  # ARPA estimado médio

    for i in range(months - 1, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
        month_end_approx = (month_start + timedelta(days=32)).replace(day=1)

        snap_start = await db.scalar(
            select(MrrSnapshot)
            .where(MrrSnapshot.snapshot_date >= month_start.date(),
                   MrrSnapshot.snapshot_date < month_end_approx.date())
            .order_by(MrrSnapshot.snapshot_date.asc())
        )
        snap_end = await db.scalar(
            select(MrrSnapshot)
            .where(MrrSnapshot.snapshot_date >= month_start.date(),
                   MrrSnapshot.snapshot_date < month_end_approx.date())
            .order_by(MrrSnapshot.snapshot_date.desc())
        )

        mrr_start = float(snap_start.mrr) if snap_start else 0.0
        mrr_end = float(snap_end.mrr) if snap_end else 0.0

        new_t = await db.scalar(
            select(func.sum(MrrSnapshot.new_tenants))
            .where(MrrSnapshot.snapshot_date >= month_start.date(),
                   MrrSnapshot.snapshot_date < month_end_approx.date())
        ) or 0
        churned_t = await db.scalar(
            select(func.sum(MrrSnapshot.churned_tenants))
            .where(MrrSnapshot.snapshot_date >= month_start.date(),
                   MrrSnapshot.snapshot_date < month_end_approx.date())
        ) or 0

        result.append({
            "month": month_start.strftime("%Y-%m"),
            "mrr_start": round(mrr_start, 2),
            "mrr_end": round(mrr_end, 2),
            "new_mrr": round(int(new_t) * ARPA, 2),
            "churned_mrr": round(int(churned_t) * ARPA, 2),
            "net_new_mrr": round(mrr_end - mrr_start, 2),
            "new_tenants": int(new_t),
            "churned_tenants": int(churned_t),
        })

    return {"months": result}


# ── Fase 7 — Cohort Analysis ──────────────────────────────────────────────────

@router.get("/metrics/cohort")
async def admin_cohort(
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retenção por coorte: para cada mês de cadastro, % ainda ativos em M+1, M+3, M+6, M+12."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "financeiro", "vendas"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    now = datetime.now(timezone.utc)
    cohorts = []

    for i in range(11, -1, -1):
        cohort_start = (now.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
        cohort_end = (cohort_start + timedelta(days=32)).replace(day=1)

        total = await db.scalar(
            select(func.count()).select_from(Tenant).where(
                Tenant.created_at >= cohort_start,
                Tenant.created_at < cohort_end,
            )
        ) or 0
        if total == 0:
            continue

        retention = {}
        for months_after, label in [(1, "m1"), (3, "m3"), (6, "m6"), (12, "m12")]:
            check_date = cohort_start + timedelta(days=months_after * 30)
            if check_date > now:
                retention[label] = None
                continue
            still_active = await db.scalar(
                select(func.count()).select_from(Tenant).where(
                    Tenant.created_at >= cohort_start,
                    Tenant.created_at < cohort_end,
                    Tenant.is_active == True,  # noqa: E712
                    (Tenant.canceled_at.is_(None)) | (Tenant.canceled_at > check_date),
                )
            ) or 0
            retention[label] = round(still_active / total * 100, 1)

        cohorts.append({"cohort": cohort_start.strftime("%Y-%m"), "total": total, **retention})

    return {"cohorts": cohorts}


# ── Fase 7 — NPS Admin ────────────────────────────────────────────────────────

@router.get("/nps")
async def admin_nps_results(
    months: int = Query(default=6, ge=1, le=24),
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Resultados de NPS: score médio, distribuição e comentários recentes."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "vendas", "suporte"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    from_dt = datetime.now(timezone.utc) - timedelta(days=months * 30)
    rows = await db.scalars(
        select(NpsSurvey).where(NpsSurvey.created_at >= from_dt).order_by(NpsSurvey.created_at.desc())
    )
    surveys = list(rows)

    if not surveys:
        return {"total": 0, "avg_score": None, "nps": None, "distribution": {}, "recent_comments": []}

    scores = [s.score for s in surveys]
    promoters = sum(1 for s in scores if s >= 9)
    detractors = sum(1 for s in scores if s <= 6)
    nps_score = round((promoters - detractors) / len(scores) * 100, 1)

    recent = []
    for s in surveys[:20]:
        if s.comment:
            t = await db.scalar(select(Tenant).where(Tenant.id == s.tenant_id))
            recent.append({
                "score": s.score,
                "comment": s.comment,
                "tenant_name": t.name if t else None,
                "created_at": s.created_at.isoformat(),
            })

    return {
        "total": len(surveys),
        "avg_score": round(sum(scores) / len(scores), 1),
        "nps": nps_score,
        "promoters_pct": round(promoters / len(scores) * 100, 1),
        "detractors_pct": round(detractors / len(scores) * 100, 1),
        "distribution": {str(s): sum(1 for sc in scores if sc == s) for s in range(0, 11)},
        "recent_comments": recent,
    }


# ── Fase 7 — NPS Submit (tenant) ─────────────────────────────────────────────

class NpsSubmitInput(BaseModel):
    score: int
    comment: str = ""


@router.post("/nps/submit")
async def submit_nps(
    body: NpsSubmitInput,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Tenant submete resposta de NPS (uma vez por usuário)."""
    if not 0 <= body.score <= 10:
        raise HTTPException(status_code=400, detail="Score deve ser entre 0 e 10")

    existing = await db.scalar(select(NpsSurvey).where(NpsSurvey.user_id == user.id))
    if existing:
        return {"ok": True, "already_submitted": True}

    db.add(NpsSurvey(tenant_id=user.tenant_id, user_id=user.id,
                      score=body.score, comment=body.comment))
    await db.commit()
    return {"ok": True, "already_submitted": False}


@router.get("/nps/me")
async def get_nps_status(
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Verifica se o usuário já respondeu o NPS."""
    existing = await db.scalar(select(NpsSurvey).where(NpsSurvey.user_id == user.id))
    return {"submitted": existing is not None}


# ── Fase 7 — Onboarding para o tenant logado ─────────────────────────────────

@router.get("/onboarding/me")
async def get_my_onboarding(
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Checklist de onboarding do tenant logado — usado no dashboard in-app."""
    from app.modules.reports.models import Report
    from app.modules.reports.dataset_models import ReportDataset

    tid = user.tenant_id
    tenant = await db.scalar(select(Tenant).where(Tenant.id == tid))

    dash_count = await db.scalar(
        select(func.count()).select_from(Report).where(Report.tenant_id == tid)) or 0
    ds_count = await db.scalar(
        select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tid)) or 0
    user_count = await db.scalar(
        select(func.count()).select_from(User).where(User.tenant_id == tid)) or 1
    is_paid = tenant and tenant.subscription_status == "active" and tenant.plan != "free"

    steps = [
        {"key": "email_verified",    "label": "Verificar email",           "done": bool(user.email_verified),     "href": None},
        {"key": "first_login",       "label": "Fazer o primeiro login",     "done": user.last_login_at is not None, "href": None},
        {"key": "dashboard_created", "label": "Criar primeiro dashboard",   "done": dash_count > 0,                 "href": "/dashboards/novo"},
        {"key": "dataset_connected", "label": "Conectar um dataset",        "done": ds_count > 0,                   "href": "/datasets"},
        {"key": "user_invited",      "label": "Convidar um colega",         "done": user_count > 1,                 "href": "/configuracoes/usuarios"},
        {"key": "plan_upgraded",     "label": "Fazer upgrade do plano",     "done": bool(is_paid),                  "href": "/configuracoes/planos"},
    ]
    done_count = sum(1 for s in steps if s["done"])
    return {
        "steps": steps,
        "done_count": done_count,
        "total": len(steps),
        "percent": round(done_count / len(steps) * 100),
        "completed": done_count == len(steps),
    }


# ── Fase 7 — Lifecycle email logs (admin) ────────────────────────────────────

@router.get("/lifecycle-emails")
async def list_lifecycle_emails(
    limit: int = Query(default=100, ge=1, le=500),
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Lifecycle emails enviados — monitoramento."""
    role = await _get_admin_role(user.email, db)
    if role not in ("full", "marketing"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    rows = await db.scalars(
        select(LifecycleEmailLog).order_by(LifecycleEmailLog.sent_at.desc()).limit(limit)
    )
    result = []
    for r in rows.all():
        t = await db.scalar(select(Tenant).where(Tenant.id == r.tenant_id))
        result.append({
            "id": str(r.id),
            "tenant_name": t.name if t else None,
            "email_type": r.email_type,
            "recipient_email": r.recipient_email,
            "sent_at": r.sent_at.isoformat(),
        })
    return {"items": result, "total": len(result)}


# ── Fase 8 — Broadcast de notificações (admin → usuários de um tenant) ────────

class NotificationBroadcastInput(BaseModel):
    title: str
    body: str
    link: str | None = None
    type: str = "info"
    tenant_id: uuid.UUID | None = None  # None = todos os tenants


@router.post("/notifications/broadcast", summary="Enviar notificação in-app para tenant(s)")
async def broadcast_notification(
    data: NotificationBroadcastInput,
    admin_data: tuple = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    _, role = admin_data
    _check_roles(role, {"full"})

    q = select(User).where(User.is_active == True)  # noqa: E712
    if data.tenant_id:
        q = q.where(User.tenant_id == data.tenant_id)

    users = await db.scalars(q)
    count = 0
    for u in users.all():
        db.add(UserNotification(
            user_id=u.id,
            tenant_id=u.tenant_id,
            type=data.type,
            title=data.title,
            body=data.body,
            link=data.link,
        ))
        count += 1
    await db.commit()
    return {"ok": True, "sent_to": count}


# ── Security Threats ────────────────────────────────────────────────────────

@router.get("/security/threats", summary="Lista IPs com atividade suspeita (últimas 2h)")
async def list_security_threats(
    current_user: User = Depends(get_superadmin),
):
    """Lê do Redis os IPs que atingiram rate limit recentemente."""
    try:
        from app.core.cache import get_redis
        import time

        redis = get_redis()
        try:
            now = int(time.time())
            cutoff = now - 7200  # últimas 2h

            # IPs com atividade recente (sorted set por timestamp)
            raw = await redis.zrangebyscore("threat:ips", cutoff, "+inf", withscores=True)
            threats = []
            for ip_bytes, score in raw:
                ip = ip_bytes.decode() if isinstance(ip_bytes, bytes) else ip_bytes
                hits_raw = await redis.get(f"threat:hits:{ip}")
                hits = int(hits_raw) if hits_raw else 0
                alerted = await redis.exists(f"threat:alerted:{ip}")

                # Últimos eventos
                events_raw = await redis.lrange(f"threat:events:{ip}", 0, 4)
                events = []
                for e in events_raw:
                    e_str = e.decode() if isinstance(e, bytes) else e
                    parts = e_str.split("|", 1)
                    events.append(parts[1] if len(parts) == 2 else e_str)

                threats.append({
                    "ip": ip,
                    "hits": hits,
                    "alerted": bool(alerted),
                    "last_seen": int(score),
                    "recent_events": events,
                })

            # Ordena por hits desc
            threats.sort(key=lambda x: x["hits"], reverse=True)
            return {"threats": threats, "total": len(threats)}
        finally:
            await redis.aclose()
    except Exception as e:
        return {"threats": [], "total": 0, "error": str(e)}
