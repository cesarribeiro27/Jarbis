"""
Importador bulk de audiência de portais digitais via CSV.

Formato esperado do CSV (separador vírgula ou ponto-e-vírgula):
  domain,month,pageviews,unique_visitors
  g1.globo.com,2024-01,280000000,55000000
  uol.com.br,2024-01,190000000,42000000
  ...

Campos:
  domain          Domínio do portal (deve corresponder a extra_metadata.domain)
  month           YYYY-MM (mês de referência)
  pageviews       Número inteiro de page views
  unique_visitors Número inteiro de visitantes únicos

Ambas as métricas são opcionais — se pageviews for 0/vazio, não é importado.
"""

import csv
import io
from datetime import date, datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.vehicles.models import Vehicle


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_int(val: str) -> int | None:
    if not val:
        return None
    val = val.strip().replace(".", "").replace(",", "").replace(" ", "")
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _parse_month(val: str) -> date | None:
    val = val.strip()
    try:
        return date(int(val[:4]), int(val[5:7]), 1)
    except Exception:
        return None


_AUDIENCE_UPSERT = text("""
INSERT INTO audience_records (
    id, vehicle_id, metric_type, source,
    reference_date, period_type, value, created_at
)
VALUES (
    gen_random_uuid(), CAST(:vehicle_id AS uuid),
    CAST(:metric_type AS audience_metric_type_enum),
    CAST(:source AS audience_source_enum),
    :reference_date, 'monthly',
    :value, :created_at
)
ON CONFLICT (vehicle_id, metric_type, source, reference_date) DO UPDATE SET
    value = EXCLUDED.value
""")


async def import_audience_csv(content: str, db: AsyncSession) -> dict:
    """
    Processa string CSV e importa audiência para os portais.
    Retorna estatísticas do processo.
    """
    stats = {"rows_parsed": 0, "imported": 0, "skipped": 0, "errors": []}

    # Detecta delimitador
    delimiter = ";" if content.count(";") > content.count(",") else ","

    reader = csv.DictReader(io.StringIO(content.strip()), delimiter=delimiter)

    now = _utcnow()

    # Carrega mapa domain -> vehicle_id em cache
    result = await db.execute(
        select(Vehicle.id, Vehicle.extra_metadata).where(
            Vehicle.vehicle_type == "DIGITAL"
        )
    )
    domain_to_id: dict[str, str] = {}
    for row in result:
        meta = row.extra_metadata or {}
        domain = meta.get("domain", "")
        if domain:
            domain_to_id[domain.lower().strip()] = str(row.id)

    for row in reader:
        stats["rows_parsed"] += 1
        domain = (row.get("domain") or "").lower().strip()
        month_str = (row.get("month") or row.get("mes") or "").strip()
        pv_str = row.get("pageviews") or row.get("page_views") or ""
        uv_str = row.get("unique_visitors") or row.get("visitantes_unicos") or row.get("visitors") or ""

        vehicle_id = domain_to_id.get(domain)
        if not vehicle_id:
            stats["skipped"] += 1
            continue

        ref_date = _parse_month(month_str)
        if not ref_date:
            stats["errors"].append(f"Mês inválido para {domain}: '{month_str}'")
            stats["skipped"] += 1
            continue

        pageviews = _parse_int(pv_str)
        unique_visitors = _parse_int(uv_str)

        if not pageviews and not unique_visitors:
            stats["skipped"] += 1
            continue

        try:
            if pageviews and pageviews > 0:
                await db.execute(_AUDIENCE_UPSERT, {
                    "vehicle_id": vehicle_id,
                    "metric_type": "PAGE_VIEWS",
                    "source": "ESTIMADO",
                    "reference_date": ref_date,
                    "value": float(pageviews),
                    "created_at": now,
                })
                stats["imported"] += 1

            if unique_visitors and unique_visitors > 0:
                await db.execute(_AUDIENCE_UPSERT, {
                    "vehicle_id": vehicle_id,
                    "metric_type": "UNIQUE_VISITORS",
                    "source": "ESTIMADO",
                    "reference_date": ref_date,
                    "value": float(unique_visitors),
                    "created_at": now,
                })
                stats["imported"] += 1

        except Exception as exc:
            stats["errors"].append(f"Erro ao inserir {domain} {month_str}: {exc}")
            stats["skipped"] += 1
            continue

    await db.commit()
    return stats
