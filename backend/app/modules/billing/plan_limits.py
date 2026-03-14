"""
Limites por plano do Jarbis.

-1 = ilimitado
"""

PLAN_LIMITS: dict[str, dict] = {
    "free": {
        "dashboards": 2,
        "datasets": 1,
        "users": 1,
        "alerts": 0,
        "white_label": False,
        "ai": False,
        "embed": False,
    },
    "starter": {
        "dashboards": 10,
        "datasets": 5,
        "users": 3,
        "alerts": 5,
        "white_label": False,
        "ai": False,
        "embed": True,
    },
    "professional": {
        "dashboards": -1,
        "datasets": -1,
        "users": -1,
        "alerts": -1,
        "white_label": True,
        "ai": True,
        "embed": True,
    },
    "enterprise": {
        "dashboards": -1,
        "datasets": -1,
        "users": -1,
        "alerts": -1,
        "white_label": True,
        "ai": True,
        "embed": True,
    },
}

PLAN_NAMES = {
    "free": "Gratuito",
    "starter": "Starter",
    "professional": "Pro",
    "enterprise": "Enterprise",
}

PLAN_PRICES = {
    "starter": "R$197/mês",
    "professional": "R$597/mês",
    "enterprise": "R$1.497/mês",
}


def get_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
