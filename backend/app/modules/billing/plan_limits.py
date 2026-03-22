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
    max_rows_per_dataset: int = -1       # -1 = ilimitado
    max_ai_queries_monthly: int = 0      # 0 = sem acesso, -1 = ilimitado
    max_halp_monthly: int = 0            # 0 = FAQ fixo (sem IA), -1 = ilimitado
    allow_embed: bool = False
    allow_ai: bool = False
    allow_white_label: bool = False
    sla: bool = False


# ── Planos canônicos (novas chaves) ───────────────────────────────────────────

PLANS: dict[str, PlanLimits] = {
    "free": PlanLimits(
        name="Free",
        price_monthly=Decimal("0"),
        max_dashboards=2,
        max_datasets=2,
        max_users=1,
        max_alerts=0,
        max_rows_per_dataset=5_000,
        max_ai_queries_monthly=10,   # split: 3 gerações + 7 perguntas
        max_halp_monthly=0,
        allow_embed=False,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
    "essential": PlanLimits(
        name="Essential",
        price_monthly=Decimal("97.00"),
        max_dashboards=8,
        max_datasets=5,
        max_users=1,
        max_alerts=3,
        max_rows_per_dataset=100_000,
        max_ai_queries_monthly=60,   # split: 10 gerações + 50 perguntas
        max_halp_monthly=20,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
    "pro": PlanLimits(
        name="Pro",
        price_monthly=Decimal("247.00"),
        max_dashboards=20,
        max_datasets=15,
        max_users=1,
        max_alerts=10,
        max_rows_per_dataset=500_000,
        max_ai_queries_monthly=225,  # split: 25 gerações + 200 perguntas
        max_halp_monthly=40,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
    "business": PlanLimits(
        name="Business",
        price_monthly=Decimal("697.00"),
        max_dashboards=50,
        max_datasets=30,
        max_users=5,
        max_alerts=30,
        max_rows_per_dataset=2_000_000,
        max_ai_queries_monthly=550,  # split: 50 gerações + 500 perguntas
        max_halp_monthly=-1,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=True,
        sla=False,                   # SLA apenas no Enterprise
    ),
    "enterprise": PlanLimits(
        name="Enterprise",
        price_monthly=None,          # sob consulta — negociação manual
        max_dashboards=-1,
        max_datasets=-1,
        max_users=-1,
        max_alerts=-1,
        max_rows_per_dataset=-1,
        max_ai_queries_monthly=-1,
        max_halp_monthly=-1,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=True,
        sla=True,
    ),
    # ── Chaves legadas (aliases para os novos planos — compatibilidade com tenants existentes) ──
    "solo": PlanLimits(
        name="Essential",
        price_monthly=Decimal("97.00"),
        max_dashboards=8,
        max_datasets=5,
        max_users=1,
        max_alerts=3,
        max_rows_per_dataset=100_000,
        max_ai_queries_monthly=60,
        max_halp_monthly=20,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
    "equipe": PlanLimits(
        name="Pro",
        price_monthly=Decimal("247.00"),
        max_dashboards=20,
        max_datasets=15,
        max_users=1,
        max_alerts=10,
        max_rows_per_dataset=500_000,
        max_ai_queries_monthly=225,
        max_halp_monthly=40,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
    "ilimitado": PlanLimits(
        name="Business",
        price_monthly=Decimal("697.00"),
        max_dashboards=50,
        max_datasets=30,
        max_users=5,
        max_alerts=30,
        max_rows_per_dataset=2_000_000,
        max_ai_queries_monthly=550,
        max_halp_monthly=-1,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=True,
        sla=False,
    ),
    "starter": PlanLimits(
        name="Essential",
        price_monthly=Decimal("97.00"),
        max_dashboards=8,
        max_datasets=5,
        max_users=1,
        max_alerts=3,
        max_rows_per_dataset=100_000,
        max_ai_queries_monthly=60,
        max_halp_monthly=20,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
    "professional": PlanLimits(
        name="Pro",
        price_monthly=Decimal("247.00"),
        max_dashboards=20,
        max_datasets=15,
        max_users=1,
        max_alerts=10,
        max_rows_per_dataset=500_000,
        max_ai_queries_monthly=225,
        allow_embed=True,
        allow_ai=True,
        allow_white_label=False,
        sla=False,
    ),
}

# ── Add-on packs ──────────────────────────────────────────────────────────────
ADDON_PACK_PRICE = Decimal("49.00")       # Pack Completo legado: +1 user, +5 dash, +3 datasets
ADDON_PACK_USERS = 1
ADDON_PACK_DASHBOARDS = 5
ADDON_PACK_DATASETS = 3

ADDON_DASH_PRICE = Decimal("29.00")       # Pack Dashboards: +5 dashboards
ADDON_DASH_DASHBOARDS = 5

ADDON_DATASET_PRICE = Decimal("19.00")    # Pack Fontes de Dados: +3 datasets
ADDON_DATASET_DATASETS = 3

ADDON_USER_PRICE = Decimal("49.00")       # +1 usuário extra (apenas Business)
ADDON_USER_USERS = 1

ADDON_AI_QUESTIONS_PRICE = Decimal("19.00")   # +50 perguntas de IA/mês
ADDON_AI_QUESTIONS = 50

ADDON_AI_GENERATIONS_PRICE = Decimal("29.00") # +10 gerações de dashboard/mês
ADDON_AI_GENERATIONS = 10

ADDON_ROW_PACK_PRICE = Decimal("49.00")       # +100k linhas por dataset
ADDON_ROW_PACK_ROWS = 100_000


def get_effective_limits(
    plan: str,
    addon_packs: int = 0,
    addon_dashboards: int = 0,
    addon_datasets: int = 0,
    addon_ai_queries: int = 0,
    addon_row_packs: int = 0,
) -> dict:
    """Retorna os limites efetivos considerando add-on packs."""
    base = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    has_addons = addon_packs > 0 or addon_dashboards > 0 or addon_datasets > 0 or addon_ai_queries > 0 or addon_row_packs > 0
    if not has_addons:
        return base
    return {
        "dashboards":  base["dashboards"] + addon_packs * ADDON_PACK_DASHBOARDS + addon_dashboards * ADDON_DASH_DASHBOARDS if base["dashboards"] != -1 else -1,
        "datasets":    base["datasets"]   + addon_packs * ADDON_PACK_DATASETS   + addon_datasets   * ADDON_DATASET_DATASETS if base["datasets"]   != -1 else -1,
        "users":       base["users"]      + addon_packs * ADDON_PACK_USERS      if base["users"]      != -1 else -1,
        "alerts":      base["alerts"],
        "ai_queries":  base.get("ai_queries", 0) + addon_ai_queries * ADDON_AI_QUESTIONS if base.get("ai_queries", 0) != -1 else -1,
        "rows":        base.get("rows", -1) + addon_row_packs * ADDON_ROW_PACK_ROWS if base.get("rows", -1) != -1 else -1,
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
        "rows":          p.max_rows_per_dataset,
        "ai_queries":    p.max_ai_queries_monthly,
        "white_label":   p.allow_white_label,
        "ai":            p.allow_ai,
        "embed":         p.allow_embed,
        "sla":           p.sla,
    }
    for key, p in PLANS.items()
}

PLAN_NAMES: dict[str, str] = {key: p.name for key, p in PLANS.items()}

PLAN_PRICES: dict[str, str] = {
    "essential":    "R$97,00/mês",
    "pro":          "R$247,00/mês",
    "business":     "R$697,00/mês",
    "enterprise":   "Sob consulta",
    # legados
    "solo":         "R$97,00/mês",
    "equipe":       "R$247,00/mês",
    "ilimitado":    "R$697,00/mês",
    "starter":      "R$97,00/mês",
    "professional": "R$247,00/mês",
}


def get_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def get_plan(plan: str) -> PlanLimits:
    return PLANS.get(plan, PLANS["free"])
