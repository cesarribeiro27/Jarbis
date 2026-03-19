"""Dataset de demonstração — criado automaticamente para novos tenants."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .dataset_models import ReportDataset

# ---------------------------------------------------------------------------
# Dados de amostra  — 12 meses × 5 categorias = 60 linhas
# Colunas: mes, categoria, produto, regiao, receita, pedidos
# ---------------------------------------------------------------------------

_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
          "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

# (categoria, produto, regiao, fator_base_receita, fator_base_pedidos)
_GRUPOS = [
    ("Eletrônicos", "Produto A", "SP", 84200, 312),
    ("Vestuário",   "Produto B", "RJ", 52100, 189),
    ("Casa",        "Produto C", "MG", 38500, 142),
    ("Esporte",     "Produto D", "RS", 29800,  98),
    ("Outros",      "Produto E", "PR", 18700,  67),
]

# Multiplicadores mensais (sazonalidade realista)
_MULT = [1.00, 1.09, 0.93, 1.25, 1.33, 1.17,
         1.44, 1.60, 1.41, 1.70, 1.86, 2.25]

ONBOARDING_COLUMNS = ["mes", "categoria", "produto", "regiao", "receita", "pedidos"]

ONBOARDING_ROWS: list[dict] = []
for i, mes in enumerate(_MESES):
    m = _MULT[i]
    for cat, prod, reg, rec_base, ped_base in _GRUPOS:
        ONBOARDING_ROWS.append({
            "mes":       mes,
            "categoria": cat,
            "produto":   prod,
            "regiao":    reg,
            "receita":   round(rec_base * m),
            "pedidos":   round(ped_base * m),
        })

# ---------------------------------------------------------------------------
# Serviço
# ---------------------------------------------------------------------------


async def ensure_onboarding_dataset(
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> ReportDataset:
    """Retorna o dataset de demo do tenant, ou cria um novo."""
    result = await db.execute(
        select(ReportDataset).where(
            ReportDataset.tenant_id == tenant_id,
            ReportDataset.is_demo.is_(True),
        )
    )
    ds = result.scalar_one_or_none()
    if ds:
        return ds

    ds = ReportDataset(
        tenant_id=tenant_id,
        name="Dados de Demonstração",
        type="csv",
        rows=ONBOARDING_ROWS,
        columns=ONBOARDING_COLUMNS,
        row_count=len(ONBOARDING_ROWS),
        is_demo=True,
    )
    db.add(ds)
    await db.commit()
    await db.refresh(ds)
    return ds
