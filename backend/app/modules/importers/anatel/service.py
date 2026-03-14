"""
Importador de dados de radiodifusão da ANATEL.

Baixa o arquivo TV_FM_OM.csv do portal de dados abertos da ANATEL,
normaliza os registros e faz upsert na tabela vehicles.
"""

import csv
import io
import zipfile
from datetime import datetime, timezone

import httpx
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.vehicles.models import Vehicle

from .normalizer import normalize_row

ANATEL_ZIP_URL = (
    "https://www.anatel.gov.br/dadosabertos/paineis_de_dados/radiodifusao/estacoes_radiodifusao.zip"
)
CSV_FILENAME = "TV_FM_OM.csv"
BATCH_SIZE = 500


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AnatelImporter:
    async def run(self, db: AsyncSession, on_progress=None) -> dict:
        stats = {
            "downloaded": 0,
            "processed": 0,
            "created_or_updated": 0,
            "skipped": 0,
            "errors": 0,
        }

        rows = await self._download_and_parse()
        stats["downloaded"] = len(rows)

        if on_progress:
            await on_progress({"step": "normalizing", "total": len(rows)})

        batch: list[dict] = []
        for row in rows:
            normalized = normalize_row(row)
            if normalized is None:
                stats["skipped"] += 1
                continue
            batch.append(normalized)

            if len(batch) >= BATCH_SIZE:
                count = await self._upsert_batch(db, batch)
                stats["created_or_updated"] += count
                stats["processed"] += len(batch)
                batch = []

        if batch:
            count = await self._upsert_batch(db, batch)
            stats["created_or_updated"] += count
            stats["processed"] += len(batch)

        return stats

    async def _download_and_parse(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            response = await client.get(ANATEL_ZIP_URL)
            response.raise_for_status()

        zip_data = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_data) as zf:
            with zf.open(CSV_FILENAME) as f:
                text = f.read().decode("utf-8-sig")

        reader = csv.DictReader(io.StringIO(text), delimiter=";")
        return list(reader)

    async def _upsert_batch(self, db: AsyncSession, batch: list[dict]) -> int:
        now = _utcnow()

        # Deduplicar por slug dentro do batch (o CSV pode ter duplicatas)
        seen: dict[str, dict] = {}
        for item in batch:
            seen[item["slug"]] = item
        batch = list(seen.values())

        for item in batch:
            item["created_at"] = now
            item["updated_at"] = now

        stmt = pg_insert(Vehicle).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=["slug"],
            set_={
                "name": stmt.excluded.name,
                "vehicle_type": stmt.excluded.vehicle_type,
                "segment": stmt.excluded.segment,
                "status": stmt.excluded.status,
                "coverage_scope": stmt.excluded.coverage_scope,
                "coverage_states": stmt.excluded.coverage_states,
                "coverage_cities": stmt.excluded.coverage_cities,
                "parent_company": stmt.excluded.parent_company,
                "cnpj": stmt.excluded.cnpj,
                "metadata": stmt.excluded["metadata"],
                "updated_at": now,
            },
        )

        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount
