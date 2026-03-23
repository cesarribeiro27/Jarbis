#!/usr/bin/env python3
"""
Script de configuracao do Stripe para o Jarbis.
Execute uma vez para criar os produtos e precos corretos.

Uso:
    STRIPE_SECRET_KEY=sk_live_... python setup_stripe.py

    # Ou com a chave direto no .env do backend:
    cd /Users/cesarribeiro/jarbis/Jarbis
    STRIPE_SECRET_KEY=$(grep STRIPE_SECRET_KEY backend/.env | cut -d= -f2) python setup_stripe.py
"""

import os
import sys

try:
    import stripe
except ImportError:
    print("stripe nao instalado. Execute: pip install stripe")
    sys.exit(1)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

if not stripe.api_key:
    try:
        env_path = os.path.join(os.path.dirname(__file__), "backend", ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("STRIPE_SECRET_KEY="):
                        stripe.api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    except Exception:
        pass

if not stripe.api_key:
    print("STRIPE_SECRET_KEY nao encontrada.")
    print("Execute: STRIPE_SECRET_KEY=sk_... python setup_stripe.py")
    sys.exit(1)

mode = "TEST" if stripe.api_key.startswith("sk_test") else "LIVE"
print(f"\nChave: {stripe.api_key[:16]}... ({mode})")
if mode == "LIVE":
    resp = input("\nAtencao: voce esta usando chave LIVE. Continuar? (s/N): ").strip().lower()
    if resp != "s":
        print("Cancelado.")
        sys.exit(0)

# ── Definicao dos produtos ────────────────────────────────────────────────────

MAIN_PLANS = [
    {
        "name": "Jarbis Essential",
        "description": "Plano Essential: 8 dashboards, 5 fontes de dados, 1 usuario, IA inclusa",
        "env_monthly": "STRIPE_PRICE_ESSENTIAL",
        "env_annual":  "STRIPE_PRICE_ESSENTIAL_ANNUAL",
        "next_monthly": "NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL",
        "next_annual":  "NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL_ANNUAL",
        "monthly_cents": 9700,    # R$97,00
        "annual_cents":  93120,   # R$931,20 (R$77,60/mes x 12)
    },
    {
        "name": "Jarbis Pro",
        "description": "Plano Pro: 20 dashboards, 15 fontes de dados, 1 usuario, IA inclusa, embed",
        "env_monthly": "STRIPE_PRICE_PRO",
        "env_annual":  "STRIPE_PRICE_PRO_ANNUAL",
        "next_monthly": "NEXT_PUBLIC_STRIPE_PRICE_PRO",
        "next_annual":  "NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL",
        "monthly_cents": 24700,   # R$247,00
        "annual_cents":  237120,  # R$2.371,20 (R$197,60/mes x 12)
    },
    {
        "name": "Jarbis Business",
        "description": "Plano Business: 50 dashboards, 30 fontes de dados, 5 usuarios, white-label, IA inclusa",
        "env_monthly": "STRIPE_PRICE_BUSINESS",
        "env_annual":  "STRIPE_PRICE_BUSINESS_ANNUAL",
        "next_monthly": "NEXT_PUBLIC_STRIPE_PRICE_BUSINESS",
        "next_annual":  "NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL",
        "monthly_cents": 69700,   # R$697,00
        "annual_cents":  669120,  # R$6.691,20 (R$557,60/mes x 12)
    },
]

ADDON_PLANS = [
    {
        "name": "Jarbis Pack Completo",
        "description": "Pack de expansao: +1 usuario, +5 dashboards, +3 fontes de dados",
        "env": "STRIPE_PRICE_ADDON",
        "cents": 4900,  # R$49,00
    },
    {
        "name": "Jarbis Pack Dashboards",
        "description": "Pack de dashboards: +5 dashboards por mes",
        "env": "STRIPE_PRICE_ADDON_DASH",
        "cents": 2900,  # R$29,00
    },
    {
        "name": "Jarbis Pack Fontes de Dados",
        "description": "Pack de fontes de dados: +3 conexoes por mes",
        "env": "STRIPE_PRICE_ADDON_DATASET",
        "cents": 1900,  # R$19,00
    },
    {
        "name": "Jarbis Pack IA",
        "description": "Pack de IA: +50 perguntas de IA por mes",
        "env": "STRIPE_PRICE_ADDON_AI",
        "cents": 1900,  # R$19,00
    },
    {
        "name": "Jarbis Pack Linhas",
        "description": "Pack de linhas: +100.000 linhas por dataset",
        "env": "STRIPE_PRICE_ADDON_ROWS",
        "cents": 4900,  # R$49,00
    },
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def find_or_create_product(name, description):
    """Busca produto ativo pelo nome exato. Cria se nao existir."""
    page = stripe.Product.list(limit=100, active=True)
    while True:
        for p in page.data:
            if p.name == name:
                print(f"    produto existente: {p.id}")
                return p.id
        if not page.has_more:
            break
        page = stripe.Product.list(limit=100, active=True, starting_after=page.data[-1].id)

    p = stripe.Product.create(name=name, description=description)
    print(f"    produto criado: {p.id}")
    return p.id


def create_price(product_id, amount_cents, interval="month"):
    """Cria preco de assinatura em BRL."""
    p = stripe.Price.create(
        product=product_id,
        unit_amount=amount_cents,
        currency="brl",
        recurring={"interval": interval},
    )
    return p.id


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\nCriando produtos e precos no Stripe...\n")

    railway_vars = []
    vercel_vars = []

    print("-- Planos principais --")
    for plan in MAIN_PLANS:
        print(f"\n  {plan['name']}")
        prod_id = find_or_create_product(plan["name"], plan["description"])

        m_id = create_price(prod_id, plan["monthly_cents"], "month")
        print(f"    preco mensal: {m_id}")

        a_id = create_price(prod_id, plan["annual_cents"], "year")
        print(f"    preco anual:  {a_id}")

        railway_vars.append(f"{plan['env_monthly']}={m_id}")
        railway_vars.append(f"{plan['env_annual']}={a_id}")
        vercel_vars.append(f"{plan['next_monthly']}={m_id}")
        vercel_vars.append(f"{plan['next_annual']}={a_id}")

    print("\n-- Add-ons --")
    for addon in ADDON_PLANS:
        print(f"\n  {addon['name']}")
        prod_id = find_or_create_product(addon["name"], addon["description"])
        p_id = create_price(prod_id, addon["cents"], "month")
        print(f"    preco: {p_id}")
        railway_vars.append(f"{addon['env']}={p_id}")

    sep = "=" * 65
    print(f"\n{sep}")
    print("CONCLUIDO. Copie as variaveis abaixo para o Railway e Vercel.\n")

    print("Railway (Backend):")
    for v in railway_vars:
        print(f"  {v}")

    print(f"\nVercel (Frontend) — apenas os precos dos planos principais:")
    for v in vercel_vars:
        print(f"  {v}")

    print(f"\n{sep}\n")


if __name__ == "__main__":
    main()
