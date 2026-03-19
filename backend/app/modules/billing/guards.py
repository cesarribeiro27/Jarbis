"""
Guards de limite de plano.

Cada função verifica se o tenant atingiu o limite do seu plano
(incluindo addon_packs comprados) e lança PlanLimitError (HTTP 402) se necessário.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import FeatureNotAvailableError, PlanLimitError, TrialExpiredError
from app.modules.billing.plan_limits import PLAN_NAMES, PLAN_PRICES, PLANS, get_effective_limits

# Plano mínimo para cada feature (chave = slug do plano em PLANS)
_FEATURE_MIN_PLAN: dict[str, str] = {
    "ai": "equipe",
    "embed": "free",
    "white_label": "ilimitado",
}


def check_feature_allowed(feature: str, plan: str) -> None:
    """Lança FeatureNotAvailableError se o plano não inclui a feature."""
    limits = PLANS.get(plan, PLANS["free"])
    allowed = getattr(limits, f"allow_{feature}", False)
    if not allowed:
        required = _FEATURE_MIN_PLAN.get(feature, "equipe")
        required_name = PLAN_NAMES.get(required, required)
        raise FeatureNotAvailableError(feature=feature, required_plan=required_name)


def check_trial_active(tenant) -> None:
    """Lança TrialExpiredError se o trial do tenant já encerrou e o plano ainda é free."""
    if tenant.trial_ends_at is not None and tenant.plan in ("free", None):
        if tenant.trial_ends_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise TrialExpiredError()


async def check_dashboard_limit(
    db: AsyncSession, tenant_id: uuid.UUID, plan: str, addon_packs: int = 0
) -> None:
    from app.modules.reports.models import Report
    limits = get_effective_limits(plan, addon_packs)
    max_dashboards = limits["dashboards"]
    if max_dashboards == -1:
        return
    count = await db.scalar(
        select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)
    )
    if (count or 0) >= max_dashboards:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Limite de {max_dashboards} dashboard(s) atingido no plano {PLAN_NAMES.get(plan, plan)}. "
            f"Faça upgrade para o plano {next_plan} ou adquira um pack de expansão."
        )


async def check_dataset_limit(
    db: AsyncSession, tenant_id: uuid.UUID, plan: str, addon_packs: int = 0
) -> None:
    from app.modules.reports.dataset_models import ReportDataset
    limits = get_effective_limits(plan, addon_packs)
    max_datasets = limits["datasets"]
    if max_datasets == -1:
        return
    count = await db.scalar(
        select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tenant_id)
    )
    if (count or 0) >= max_datasets:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Limite de {max_datasets} dataset(s) atingido no plano {PLAN_NAMES.get(plan, plan)}. "
            f"Faça upgrade para o plano {next_plan} ou adquira um pack de expansão."
        )


async def check_user_limit(
    db: AsyncSession, tenant_id: uuid.UUID, plan: str, addon_packs: int = 0
) -> None:
    from app.modules.tenants.models import User
    limits = get_effective_limits(plan, addon_packs)
    max_users = limits["users"]
    if max_users == -1:
        return
    count = await db.scalar(
        select(func.count()).select_from(User).where(
            User.tenant_id == tenant_id,
            User.is_active == True,  # noqa: E712
        )
    )
    if (count or 0) >= max_users:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Limite de {max_users} usuário(s) atingido no plano {PLAN_NAMES.get(plan, plan)}. "
            f"Faça upgrade para o plano {next_plan} ou adquira um pack de expansão."
        )


async def check_alert_limit(
    db: AsyncSession, tenant_id: uuid.UUID, plan: str, addon_packs: int = 0
) -> None:
    from app.modules.reports.alert_models import ReportAlert
    limits = get_effective_limits(plan, addon_packs)
    max_alerts = limits["alerts"]
    if max_alerts == -1:
        return
    if max_alerts == 0:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Alertas não estão disponíveis no plano {PLAN_NAMES.get(plan, plan)}. "
            f"Faça upgrade para o plano {next_plan}."
        )
    count = await db.scalar(
        select(func.count()).select_from(ReportAlert).where(ReportAlert.tenant_id == tenant_id)
    )
    if (count or 0) >= max_alerts:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Limite de {max_alerts} alerta(s) atingido no plano {PLAN_NAMES.get(plan, plan)}. "
            f"Faça upgrade para o plano {next_plan} ou adquira um pack de expansão."
        )


async def check_ai_query_limit(
    db: AsyncSession, tenant_id: uuid.UUID, plan: str
) -> None:
    """Lança PlanLimitError se o tenant atingiu a cota mensal de queries de IA."""
    from datetime import timezone
    from app.modules.reports.ai_usage_models import AIUsageLog

    limits = PLANS.get(plan, PLANS["free"])
    max_queries = limits.max_ai_queries_monthly
    if max_queries == -1:
        return  # ilimitado (Enterprise)
    if max_queries == 0:
        raise FeatureNotAvailableError(feature="ai", required_plan=PLAN_NAMES.get("equipe", "Profissional"))

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count = await db.scalar(
        select(func.count()).select_from(AIUsageLog).where(
            AIUsageLog.tenant_id == tenant_id,
            AIUsageLog.created_at >= month_start,
        )
    )
    if (count or 0) >= max_queries:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Cota de {max_queries} consultas de IA por mês atingida no plano {PLAN_NAMES.get(plan, plan)}. "
            f"Faça upgrade para o plano {next_plan} para continuar usando a IA."
        )


def _next_plan(current: str) -> str:
    order = ["free", "solo", "equipe", "ilimitado", "enterprise"]
    idx = order.index(current) if current in order else 0
    next_idx = min(idx + 1, len(order) - 1)
    next_key = order[next_idx]
    price = PLAN_PRICES.get(next_key, "")
    return f"{PLAN_NAMES.get(next_key, next_key)}{' (' + str(price) + ')' if price else ''}"
