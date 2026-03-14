"""
Importador de portais digitais brasileiros.

Faz upsert de veículos do tipo DIGITAL a partir da lista curada em portals_seed.py.
Slug gerado a partir do domínio (normalizado).

Nota técnica: usa INSERT raw com sqlalchemy.text() porque a coluna "metadata"
conflita com o atributo reservado MetaData do SQLAlchemy no insert ORM bulk.
"""

import json
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .portals_seed import PORTALS


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _normalize_portal(portal: dict) -> dict:
    domain = portal["domain"]
    slug = f"digital-{_slugify(domain)}"
    return {
        "id": str(uuid.uuid4()),
        "name": portal["name"][:300],
        "trade_name": (portal.get("trade_name") or "")[:300] or None,
        "slug": slug[:300],
        "vehicle_type": "DIGITAL",
        "segment": portal.get("segment", "GENERALISTA"),
        "status": "ATIVO",
        "coverage_scope": portal.get("coverage_scope", "NACIONAL"),
        "coverage_states": json.dumps(portal.get("coverage_states")) if portal.get("coverage_states") else None,
        "coverage_cities": None,
        "description": portal.get("description"),
        "website_url": (f"https://{domain}" if not domain.startswith("http") else domain)[:500],
        "logo_url": None,
        "parent_company": (portal.get("parent_company") or "")[:300] or None,
        "founded_year": portal.get("founded_year"),
        "cnpj": None,
        "phone": None,
        "email": None,
        "meta_json": json.dumps({"domain": domain, "source": "lumetra_seed"}),
        "is_verified": True,
    }


# SQL com ON CONFLICT DO UPDATE — usa nome real da coluna "metadata"
# Nota: asyncpg não suporta :param::cast — usar CAST(:param AS tipo)
_UPSERT_SQL = text("""
INSERT INTO vehicles (
    id, name, trade_name, slug, vehicle_type, segment, status,
    coverage_scope, coverage_states, coverage_cities,
    description, website_url, logo_url, parent_company, founded_year,
    cnpj, phone, email, metadata, is_verified, created_at, updated_at
) VALUES (
    CAST(:id AS uuid), :name, :trade_name, :slug,
    CAST(:vehicle_type AS vehicle_type_enum), CAST(:segment AS media_segment_enum),
    CAST(:status AS vehicle_status_enum), CAST(:coverage_scope AS coverage_scope_enum),
    CAST(:coverage_states AS jsonb), CAST(:coverage_cities AS jsonb),
    :description, :website_url, :logo_url, :parent_company, :founded_year,
    :cnpj, :phone, :email, CAST(:meta_json AS jsonb),
    :is_verified, :created_at, :updated_at
)
ON CONFLICT (slug) DO UPDATE SET
    name           = EXCLUDED.name,
    trade_name     = EXCLUDED.trade_name,
    vehicle_type   = EXCLUDED.vehicle_type,
    segment        = EXCLUDED.segment,
    status         = EXCLUDED.status,
    coverage_scope = EXCLUDED.coverage_scope,
    coverage_states = EXCLUDED.coverage_states,
    description    = EXCLUDED.description,
    website_url    = EXCLUDED.website_url,
    parent_company = EXCLUDED.parent_company,
    founded_year   = EXCLUDED.founded_year,
    metadata       = EXCLUDED.metadata,
    is_verified    = EXCLUDED.is_verified,
    updated_at     = EXCLUDED.updated_at
""")


class DigitalPortalsImporter:
    async def run(self, db: AsyncSession) -> dict:
        stats = {"total": len(PORTALS), "created_or_updated": 0, "errors": 0}
        now = _utcnow()

        batch = []
        for portal in PORTALS:
            try:
                row = _normalize_portal(portal)
                row["created_at"] = now
                row["updated_at"] = now
                batch.append(row)
            except Exception as exc:
                stats["errors"] += 1
                print(f"[DigitalPortalsImporter] Erro em '{portal.get('name')}': {exc}")

        # Deduplicar por slug
        seen: dict[str, dict] = {}
        for item in batch:
            seen[item["slug"]] = item
        batch = list(seen.values())

        count = 0
        for row in batch:
            try:
                await db.execute(_UPSERT_SQL, row)
                count += 1
            except Exception as exc:
                stats["errors"] += 1
                print(f"[DigitalPortalsImporter] Erro ao inserir '{row.get('name')}': {exc}")

        await db.commit()
        stats["created_or_updated"] = count
        return stats
