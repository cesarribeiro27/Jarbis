"""
Importador de municípios e dados populacionais do IBGE.

Combina duas APIs públicas:
  1. /v1/localidades/municipios  → 5.571 municípios com UF e região
  2. /v3/agregados/4709/periodos/2022/variaveis/93 → população Censo 2022

Faz upsert na tabela `municipios` e atualiza os campos coverage_cities
dos veículos importados da ANATEL com os códigos IBGE corretos.
"""

from datetime import datetime, timezone

import httpx
from sqlalchemy import text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.municipios.models import Municipio

MUNICIPIOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
POPULACAO_URL = (
    "https://servicodados.ibge.gov.br/api/v3/agregados/4709"
    "/periodos/2022/variaveis/93?localidades=N6[all]"
)

BATCH_SIZE = 500


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IbgeImporter:
    async def run(self, db: AsyncSession) -> dict:
        stats = {"municipios_upserted": 0, "vehicles_updated": 0, "errors": 0}

        municipios = await self._fetch_municipios()
        populacao = await self._fetch_populacao()

        # Merge população nos municípios
        for m in municipios:
            codigo = str(m["id"])
            m["populacao_2022"] = populacao.get(codigo)

        # Upsert em batches
        for i in range(0, len(municipios), BATCH_SIZE):
            batch = municipios[i : i + BATCH_SIZE]
            count = await self._upsert_batch(db, batch)
            stats["municipios_upserted"] += count

        # Atualiza coverage_cities dos veículos ANATEL com códigos IBGE
        updated = await self._update_vehicle_coverage(db)
        stats["vehicles_updated"] = updated

        return stats

    async def _fetch_municipios(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            response = await client.get(MUNICIPIOS_URL)
            response.raise_for_status()
            return response.json()

    async def _fetch_populacao(self) -> dict[str, int]:
        """Retorna dict {codigo_ibge: populacao}."""
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            response = await client.get(POPULACAO_URL)
            response.raise_for_status()
            data = response.json()

        result: dict[str, int] = {}
        for variavel in data:
            for item in variavel.get("resultados", []):
                for serie in item.get("series", []):
                    codigo = serie["localidade"]["id"]
                    valor = serie["serie"].get("2022", "")
                    if valor and valor != "-":
                        result[codigo] = int(valor)
        return result

    async def _upsert_batch(self, db: AsyncSession, batch: list[dict]) -> int:
        now = _utcnow()
        rows = []
        seen: set[str] = set()

        for m in batch:
            codigo = str(m["id"])
            if codigo in seen:
                continue
            seen.add(codigo)

            uf_data = (
                ((m.get("microrregiao") or {})
                 .get("mesorregiao") or {})
                .get("UF") or {}
            )
            regiao_data = uf_data.get("regiao") or {}

            rows.append({
                "codigo_ibge": codigo,
                "nome": m["nome"],
                "uf": uf_data.get("sigla", ""),
                "nome_uf": uf_data.get("nome", ""),
                "regiao": regiao_data.get("nome", ""),
                "populacao_2022": m.get("populacao_2022"),
                "created_at": now,
                "updated_at": now,
            })

        if not rows:
            return 0

        stmt = pg_insert(Municipio).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["codigo_ibge"],
            set_={
                "nome": stmt.excluded.nome,
                "uf": stmt.excluded.uf,
                "nome_uf": stmt.excluded.nome_uf,
                "regiao": stmt.excluded.regiao,
                "populacao_2022": stmt.excluded.populacao_2022,
                "updated_at": now,
            },
        )

        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount

    async def _update_vehicle_coverage(self, db: AsyncSession) -> int:
        """
        Atualiza coverage_cities dos veículos ANATEL substituindo o nome
        da cidade pelo código IBGE oficial (ex: 'São Paulo' → '3550308').
        """
        # Ativa extensão unaccent se não estiver ativa
        await db.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        await db.commit()

        result = await db.execute(text("""
            UPDATE vehicles v
            SET coverage_cities = (
                SELECT jsonb_agg(m.codigo_ibge ORDER BY m.codigo_ibge)
                FROM municipios m
                WHERE m.uf = v.coverage_states->>0
                  AND unaccent(lower(m.nome)) = unaccent(lower(v.coverage_cities->>0))
            )
            WHERE
                v.metadata->>'fonte' = 'ANATEL'
                AND jsonb_array_length(v.coverage_cities) = 1
                AND v.coverage_cities->>0 IS NOT NULL
                AND v.coverage_cities->>0 != ''
            RETURNING v.id
        """))
        await db.commit()
        return result.rowcount
