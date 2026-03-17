"""
Limites por plano do Jarbis.

-1 = ilimitado
None em price_monthly = sob consulta (Enterprise)
"""

from decimal import Decimal
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PlanLimits:
    name: str
    price_monthly: Optional[Decimal]     # None = sob consulta
    max_dashboards: int                  # -1 = ilimitado
    max_datasets: int                    # -1 = ilimitado
    max_users: int                       # -1 = ilimitado
    max_alerts: int                      # -1 = ilimitado
    allow_embed: bool = False
    allow_ai: bool = False
    allow_white_label: bool = False
    sla: bool = False


PLANS: dict[str, PlanLimits] = {
    "free": PlanLimits(
        name="Gratuito",
        price_monthly=Decimal("0"),
        max_dashboards=2,
        max_datasets=2,
        max_users=1,
        max_alerts=0,
        allow_embed=False,
        allow_ai=False,
        allow_white_label=False,
        sla=False,
    ),
    "solo": PlanLimits(
        name="Solo",
        price_monthly=Decimal("79.90"),
        max_dashboards=8,
        max_datasets=8,
        max_users=1,
        max_alerts=5,
        allow_embed=True,
        allow_ai=False,
        allow_white_label=False,
        sla=False,
    ),
    "equipe": PlanLimits(
        name="Profissional",
        price_monthly=Decimal("189.90"),
        max_dashboards=20,
        max_datasets=15,
        max_users=1,
        max_alerts=15,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
    "ilimitado": PlanLimits(
        name="Equipe",
        price_monthly=Decimal("599.90"),
        max_dashboards=50,
        max_datasets=30,
        max_users=5,
        max_alerts=50,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=True,
        sla=False,
    ),
    "enterprise": PlanLimits(
        name="Enterprise",
        price_monthly=None,              # sob consulta — negociação manual
        max_dashboards=-1,
        max_datasets=-1,
        max_users=-1,
        max_alerts=-1,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=True,
        sla=True,
    ),
    # ── Chaves legadas (mantidas para compatibilidade com tenants já criados) ──
    "starter": PlanLimits(
        name="Solo",
        price_monthly=Decimal("79.90"),
        max_dashboards=8,
        max_datasets=8,
        max_users=1,
        max_alerts=5,
        allow_embed=True,
        allow_ai=False,
        allow_white_label=False,
        sla=False,
    ),
    "professional": PlanLimits(
        name="Profissional",
        price_monthly=Decimal("189.90"),
        max_dashboards=20,
        max_datasets=15,
        max_users=1,
        max_alerts=15,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
}

# ── Add-on pack: R$49,90/mês por pack (+1 user, +5 dash, +3 datasets) ────────
ADDON_PACK_PRICE = Decimal("49.90")
ADDON_PACK_USERS = 1
ADDON_PACK_DASHBOARDS = 5
ADDON_PACK_DATASETS = 3


def get_effective_limits(plan: str, addon_packs: int = 0) -> dict:
    """Retorna os limites efetivos considerando add-on packs."""
    base = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    if addon_packs <= 0:
        return base
    return {
        "dashboards":  base["dashboards"] + addon_packs * ADDON_PACK_DASHBOARDS if base["dashboards"] != -1 else -1,
        "datasets":    base["datasets"]   + addon_packs * ADDON_PACK_DATASETS   if base["datasets"]   != -1 else -1,
        "users":       base["users"]      + addon_packs * ADDON_PACK_USERS      if base["users"]      != -1 else -1,
        "alerts":      base["alerts"],
        "white_label": base["white_label"],
        "ai":          base["ai"],
        "embed":       base["embed"],
        "sla":         base["sla"],
    }

# ── Dicts legados usados em partes do código que ainda lêem como dict ────────

PLAN_LIMITS: dict[str, dict] = {
    key: {
        "dashboards":    p.max_dashboards,
        "datasets":      p.max_datasets,
        "users":         p.max_users,
        "alerts":        p.max_alerts,
        "white_label":   p.allow_white_label,
        "ai":            p.allow_ai,
        "embed":         p.allow_embed,
        "sla":           p.sla,
    }
    for key, p in PLANS.items()
}

PLAN_NAMES: dict[str, str] = {key: p.name for key, p in PLANS.items()}

PLAN_PRICES: dict[str, str] = {
    "solo":         "R$79,90/mês",
    "equipe":       "R$189,90/mês",
    "ilimitado":    "R$599,90/mês",
    "enterprise":   "Sob consulta",
    # legado
    "starter":      "R$79,90/mês",
    "professional": "R$189,90/mês",
}


def get_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def get_plan(plan: str) -> PlanLimits:
    return PLANS.get(plan, PLANS["free"])
