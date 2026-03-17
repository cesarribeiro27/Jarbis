"""
Rotas administrativas — acesso restrito a super-admins (ADMIN_EMAILS).

Todas as rotas requerem que o usuário autenticado tenha email listado em
settings.admin_emails. Retornam 403 para qualquer outro usuário.
"""

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.modules.admin.models import Affiliate
from app.modules.auth.dependencies import get_current_active_user
from app.modules.billing.plan_limits import PLAN_NAMES, PLAN_PRICES, PLANS, get_effective_limits
from app.modules.tenants.models import Tenant, User

router = APIRouter(tags=["admin"])


# ─── Super-admin dependency ───────────────────────────────────────────────────

async def get_superadmin(current_user: User = Depends(get_current_active_user)) -> User:
    """Verifica se o usuário é super-admin (email em ADMIN_EMAILS)."""
    if current_user.email.lower() not in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return current_user


# ─── Schemas ──────────────────────────────────────────────────────────────────

class TenantUpdateInput(BaseModel):
    plan: str | None = None
    is_active: bool | None = None
    addon_packs: int | None = None
    extend_trial_days: int | None = None  # adiciona N dias ao trial


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


# ─── /admin/me ────────────────────────────────────────────────────────────────

@router.get("/me", summary="Confirma acesso de super-admin")
async def admin_me(admin: User = Depends(get_superadmin)):
    return {"email": admin.email, "is_superadmin": True}


# ─── /admin/metrics ───────────────────────────────────────────────────────────

@router.get("/metrics", summary="Métricas globais do produto")
async def admin_metrics(
    admin: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.reports.models import Report
    from app.modules.reports.dataset_models import ReportDataset

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # Totais gerais
    total_tenants = await db.scalar(select(func.count()).select_from(Tenant))
    total_users = await db.scalar(select(func.count()).select_from(User))
    total_dashboards = await db.scalar(select(func.count()).select_from(Report))
    total_datasets = await db.scalar(select(func.count()).select_from(ReportDataset))

    # Tenants por status
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

    # Novos signups
    signups_today = await db.scalar(
        select(func.count()).select_from(Tenant).where(Tenant.created_at >= today_start)
    )
    signups_7d = await db.scalar(
        select(func.count()).select_from(Tenant).where(Tenant.created_at >= week_start)
    )
    signups_30d = await db.scalar(
        select(func.count()).select_from(Tenant).where(Tenant.created_at >= month_start)
    )

    # Distribuição por plano
    plan_rows = await db.execute(
        select(Tenant.plan, func.count().label("count"))
        .where(Tenant.is_active == True)  # noqa: E712
        .group_by(Tenant.plan)
    )
    by_plan = {row.plan: row.count for row in plan_rows}

    # MRR estimado (apenas planos pagos com subscription ativa)
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
    }


# ─── /admin/tenants ───────────────────────────────────────────────────────────

@router.get("/tenants", summary="Listar todos os tenants")
async def admin_list_tenants(
    admin: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
    search: str = Query(default="", description="Busca por nome, slug ou email de owner"),
    plan: str = Query(default="", description="Filtrar por plano"),
    status: str = Query(default="", description="active | trial | past_due | inactive"),
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
    admin: User = Depends(get_superadmin),
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
         "role": u.role, "is_active": u.is_active, "created_at": u.created_at.isoformat()}
        for u in users
    ]

    limits = get_effective_limits(tenant.plan, tenant.addon_packs)
    usage = {
        "dashboards": await db.scalar(select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)) or 0,
        "datasets": await db.scalar(select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tenant_id)) or 0,
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
    admin: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

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

    await db.commit()
    return {"ok": True, "tenant_id": str(tenant_id)}


# ─── /admin/affiliates ────────────────────────────────────────────────────────

@router.get("/affiliates", summary="Listar afiliados")
async def admin_list_affiliates(
    admin: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
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
    admin: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
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
    admin: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
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
    admin: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
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
