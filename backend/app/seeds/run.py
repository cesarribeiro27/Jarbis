"""
Seed inicial do banco de dados.

Popula a base com veículos de mídia brasileiros reais para
desenvolvimento e demonstração da plataforma.

Uso: python -m app.seeds.run
"""

import asyncio
from app.database import AsyncSessionLocal
from app.modules.vehicles.models import Vehicle
from app.modules.vehicles.enums import (
    CoverageScope,
    MediaSegment,
    VehicleStatus,
    VehicleType,
)
from slugify import slugify


SEED_VEHICLES = [
    # TV Aberta
    {
        "name": "Rede Globo",
        "vehicle_type": VehicleType.TV_ABERTA,
        "segment": MediaSegment.GENERALISTA,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Globo",
        "website_url": "https://globo.com",
        "founded_year": 1965,
        "is_verified": True,
        "extra_metadata": {"canal_aberto": 4, "afiliadas": 122},
    },
    {
        "name": "SBT",
        "trade_name": "Sistema Brasileiro de Televisão",
        "vehicle_type": VehicleType.TV_ABERTA,
        "segment": MediaSegment.ENTRETENIMENTO,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Silvio Santos",
        "founded_year": 1981,
        "is_verified": True,
    },
    {
        "name": "Record TV",
        "vehicle_type": VehicleType.TV_ABERTA,
        "segment": MediaSegment.GENERALISTA,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Record",
        "founded_year": 1953,
        "is_verified": True,
    },
    # TV Paga
    {
        "name": "GloboNews",
        "vehicle_type": VehicleType.TV_PAGA,
        "segment": MediaSegment.JORNALISMO,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Globo",
        "founded_year": 1996,
        "is_verified": True,
    },
    {
        "name": "CNN Brasil",
        "vehicle_type": VehicleType.TV_PAGA,
        "segment": MediaSegment.JORNALISMO,
        "coverage_scope": CoverageScope.NACIONAL,
        "founded_year": 2020,
        "is_verified": True,
    },
    {
        "name": "SporTV",
        "vehicle_type": VehicleType.TV_PAGA,
        "segment": MediaSegment.ESPORTES,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Globo",
        "founded_year": 1991,
        "is_verified": True,
    },
    # Jornais
    {
        "name": "Folha de S.Paulo",
        "vehicle_type": VehicleType.JORNAL,
        "segment": MediaSegment.JORNALISMO,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Folha",
        "coverage_states": ["SP"],
        "founded_year": 1921,
        "is_verified": True,
        "extra_metadata": {"periodicidade": "diario", "issn": "1414-5723"},
    },
    {
        "name": "O Globo",
        "vehicle_type": VehicleType.JORNAL,
        "segment": MediaSegment.JORNALISMO,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Globo",
        "founded_year": 1925,
        "is_verified": True,
    },
    # Digital
    {
        "name": "UOL",
        "vehicle_type": VehicleType.DIGITAL,
        "segment": MediaSegment.GENERALISTA,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Folha",
        "website_url": "https://uol.com.br",
        "founded_year": 1996,
        "is_verified": True,
    },
    {
        "name": "G1",
        "vehicle_type": VehicleType.DIGITAL,
        "segment": MediaSegment.JORNALISMO,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Globo",
        "website_url": "https://g1.globo.com",
        "is_verified": True,
    },
    # Streaming
    {
        "name": "Globoplay",
        "vehicle_type": VehicleType.STREAMING,
        "segment": MediaSegment.ENTRETENIMENTO,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Globo",
        "website_url": "https://globoplay.globo.com",
        "founded_year": 2015,
        "is_verified": True,
    },
    # Rádio
    {
        "name": "Rádio CBN",
        "vehicle_type": VehicleType.RADIO,
        "segment": MediaSegment.JORNALISMO,
        "coverage_scope": CoverageScope.NACIONAL,
        "parent_company": "Grupo Globo",
        "founded_year": 1991,
        "is_verified": True,
        "extra_metadata": {"frequencia_sp": "90.5 FM", "tipo": "all-news"},
    },
]


async def run_seeds():
    async with AsyncSessionLocal() as session:
        print("[Seed] Iniciando inserção de veículos...")
        count = 0
        for data in SEED_VEHICLES:
            slug = slugify(data["name"])
            from sqlalchemy import select
            existing = await session.scalar(select(Vehicle).where(Vehicle.slug == slug))
            if existing:
                print(f"  [skip] {data['name']} — já existe")
                continue

            vehicle = Vehicle(slug=slug, status=VehicleStatus.ATIVO, **data)
            session.add(vehicle)
            count += 1
            print(f"  [ok]   {data['name']}")

        await session.commit()
        print(f"\n[Seed] {count} veículos inseridos com sucesso.")


if __name__ == "__main__":
    asyncio.run(run_seeds())
