"""
Enriquecimento de veículos via Brasil API (CNPJ).

Consulta a API pública brasilapi.com.br para preencher automaticamente
telefone, e-mail e outros dados institucionais a partir do CNPJ cadastrado.

Brasil API: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
- Gratuita, sem chave de API
- Rate limit: ~3 req/s
- Retorna: telefone, email, nome_fantasia, situacao_cadastral, etc.
"""

import asyncio
import re
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.vehicles.models import Vehicle
from app.modules.vehicles.schemas import VehicleResponse

BRASIL_API_URL = "https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
# Delay entre chamadas no batch para respeitar rate limit (~3 req/s)
BATCH_DELAY_S = 0.4


def _clean_cnpj(cnpj: str) -> str:
    """Remove formatação: 12.345.678/0001-99 → 12345678000199"""
    return re.sub(r"\D", "", cnpj)


def _format_phone(raw: str | None) -> str | None:
    """Normaliza telefone retornado pela Brasil API."""
    if not raw:
        return None
    # Remove espaços extras e caracteres inválidos
    cleaned = raw.strip()
    if not cleaned or cleaned == "0":
        return None
    return cleaned


def _format_email(raw: str | None) -> str | None:
    if not raw:
        return None
    email = raw.strip().lower()
    return email if "@" in email else None


async def fetch_cnpj_data(cnpj: str, client: httpx.AsyncClient) -> dict | None:
    """
    Consulta a Brasil API para um CNPJ.
    Retorna dict com os dados ou None em caso de erro / CNPJ não encontrado.
    """
    cnpj_clean = _clean_cnpj(cnpj)
    if len(cnpj_clean) != 14:
        return None

    try:
        resp = await client.get(
            BRASIL_API_URL.format(cnpj=cnpj_clean),
            timeout=10.0,
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        return None


async def enrich_vehicle(
    vehicle_id: uuid.UUID,
    db: AsyncSession,
    overwrite: bool = False,
) -> dict:
    """
    Enriquece um único veículo com dados da Brasil API.

    Args:
        vehicle_id: UUID do veículo
        db: Sessão assíncrona do banco
        overwrite: Se True, sobrescreve dados existentes.
                   Se False, preenche apenas campos vazios.

    Returns:
        Dict com status e campos atualizados.
    """
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        return {"status": "not_found"}

    if not vehicle.cnpj:
        return {"status": "no_cnpj"}

    async with httpx.AsyncClient(
        headers={"User-Agent": "Lumetra/1.0 (contato@lumetra.com.br)"}
    ) as client:
        data = await fetch_cnpj_data(vehicle.cnpj, client)

    if not data:
        return {"status": "cnpj_not_found", "cnpj": vehicle.cnpj}

    # Situação cadastral — apenas enriquece ativos
    situacao = data.get("descricao_situacao_cadastral", "").upper()
    updated_fields = {}

    phone_api = _format_phone(data.get("telefone"))
    email_api = _format_email(data.get("email"))
    trade_name_api = data.get("nome_fantasia") or None
    website_api = data.get("descricao_tipo_logradouro")  # não usado, placeholder

    # Aplica apenas campos vazios (ou todos se overwrite=True)
    if phone_api and (not vehicle.phone or overwrite):
        vehicle.phone = phone_api
        updated_fields["phone"] = phone_api

    if email_api and (not vehicle.email or overwrite):
        vehicle.email = email_api
        updated_fields["email"] = email_api

    if trade_name_api and (not vehicle.trade_name or overwrite):
        vehicle.trade_name = trade_name_api
        updated_fields["trade_name"] = trade_name_api

    if updated_fields:
        await db.flush()
        await db.refresh(vehicle)

    return {
        "status": "enriched" if updated_fields else "already_complete",
        "cnpj": vehicle.cnpj,
        "situacao_cadastral": situacao,
        "updated_fields": updated_fields,
        "vehicle": VehicleResponse.model_validate(vehicle),
    }


async def enrich_all_vehicles(
    db: AsyncSession,
    overwrite: bool = False,
) -> dict:
    """
    Enriquece em batch todos os veículos que têm CNPJ mas faltam
    telefone ou e-mail (ou todos se overwrite=True).

    Respeita o rate limit da Brasil API com delay entre chamadas.

    Returns:
        Estatísticas da execução.
    """
    # Busca veículos com CNPJ cadastrado
    query = select(Vehicle).where(Vehicle.cnpj.isnot(None))
    if not overwrite:
        # Só processa os que ainda não têm telefone OU e-mail
        from sqlalchemy import or_
        query = query.where(
            or_(Vehicle.phone.is_(None), Vehicle.email.is_(None))
        )

    result = await db.execute(query)
    vehicles = result.scalars().all()

    stats = {
        "total": len(vehicles),
        "enriched": 0,
        "already_complete": 0,
        "cnpj_not_found": 0,
        "errors": 0,
    }

    async with httpx.AsyncClient(
        headers={"User-Agent": "Lumetra/1.0 (contato@lumetra.com.br)"}
    ) as client:
        for vehicle in vehicles:
            try:
                data = await fetch_cnpj_data(vehicle.cnpj, client)
                if not data:
                    stats["cnpj_not_found"] += 1
                    await asyncio.sleep(BATCH_DELAY_S)
                    continue

                updated = False

                phone_api = _format_phone(data.get("telefone"))
                email_api = _format_email(data.get("email"))
                trade_name_api = data.get("nome_fantasia") or None

                if phone_api and (not vehicle.phone or overwrite):
                    vehicle.phone = phone_api
                    updated = True

                if email_api and (not vehicle.email or overwrite):
                    vehicle.email = email_api
                    updated = True

                if trade_name_api and (not vehicle.trade_name or overwrite):
                    vehicle.trade_name = trade_name_api
                    updated = True

                if updated:
                    await db.flush()
                    stats["enriched"] += 1
                else:
                    stats["already_complete"] += 1

            except Exception:
                stats["errors"] += 1

            await asyncio.sleep(BATCH_DELAY_S)

    await db.commit()
    return stats
