"""
Guards de limite de plano.

Cada função verifica se o tenant atingiu o limite do seu plano
e lança PlanLimitError (HTTP 402) se necessário.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PlanLimitError
from app.modules.billing.plan_limits import PLAN_NAMES, PLAN_PRICES, get_limits


async def check_dashboard_limit(db: AsyncSession, tenant_id: uuid.UUID, plan: str) -> None:
    from app.modules.reports.models import Report
    limits = get_limits(plan)
    max_dashboards = limits["dashboards"]
    if max_dashboards == -1:
        return
    count = await db.scalar(
        select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)
    )
    if (count or 0) >= max_dashboards:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Limite de {max_dashboards} dashboard(s) atingido no plano {PLAN_NAMES[plan]}. "
            f"Faça upgrade para o plano {next_plan} para continuar."
        )


async def check_dataset_limit(db: AsyncSession, tenant_id: uuid.UUID, plan: str) -> None:
    from app.modules.reports.dataset_models import ReportDataset
    limits = get_limits(plan)
    max_datasets = limits["datasets"]
    if max_datasets == -1:
        return
    count = await db.scalar(
        select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tenant_id)
    )
    if (count or 0) >= max_datasets:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Limite de {max_datasets} dataset(s) atingido no plano {PLAN_NAMES[plan]}. "
            f"Faça upgrade para o plano {next_plan} para continuar."
        )


async def check_user_limit(db: AsyncSession, tenant_id: uuid.UUID, plan: str) -> None:
    from app.modules.tenants.models import User
    limits = get_limits(plan)
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
            f"Limite de {max_users} usuário(s) atingido no plano {PLAN_NAMES[plan]}. "
            f"Faça upgrade para o plano {next_plan} para continuar."
        )


async def check_alert_limit(db: AsyncSession, tenant_id: uuid.UUID, plan: str) -> None:
    from app.modules.reports.alert_models import ReportAlert
    limits = get_limits(plan)
    max_alerts = limits["alerts"]
    if max_alerts == -1:
        return
    if max_alerts == 0:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Alertas não estão disponíveis no plano {PLAN_NAMES[plan]}. "
            f"Faça upgrade para o plano {next_plan}."
        )
    count = await db.scalar(
        select(func.count()).select_from(ReportAlert).where(ReportAlert.tenant_id == tenant_id)
    )
    if (count or 0) >= max_alerts:
        next_plan = _next_plan(plan)
        raise PlanLimitError(
            f"Limite de {max_alerts} alerta(s) atingido no plano {PLAN_NAMES[plan]}. "
            f"Faça upgrade para o plano {next_plan} para continuar."
        )


def _next_plan(current: str) -> str:
    order = ["free", "starter", "professional", "enterprise"]
    idx = order.index(current) if current in order else 0
    next_idx = min(idx + 1, len(order) - 1)
    next_key = order[next_idx]
    price = PLAN_PRICES.get(next_key, "")
    return f"{PLAN_NAMES[next_key]}{' (' + price + ')' if price else ''}"
