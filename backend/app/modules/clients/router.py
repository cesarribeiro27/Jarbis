"""
Endpoints Clientes

GET    /clients          — Lista clientes do tenant
POST   /clients          — Cria novo cliente
GET    /clients/{id}     — Detalhe do cliente
PUT    /clients/{id}     — Atualiza cliente
DELETE /clients/{id}     — Remove cliente
GET    /clients/{id}/plans — Planos de mídia do cliente
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.media_plans.schemas import MediaPlanSummary
from app.modules.tenants.models import User

from .schemas import ClientCreate, ClientResponse, ClientUpdate
from .service import ClientService

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ClientService(db)
    return await service.list_clients(current_user.tenant_id)


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    body: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ClientService(db)
    client = await service.create_client(current_user.tenant_id, body.model_dump())
    return {**{col.key: getattr(client, col.key) for col in client.__table__.columns}, "total_planos": 0}


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ClientService(db)
    client = await service.get_client(client_id, current_user.tenant_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    plans = await service.get_client_plans(client_id, current_user.tenant_id)
    return {**{col.key: getattr(client, col.key) for col in client.__table__.columns}, "total_planos": len(plans)}


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    body: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ClientService(db)
    client = await service.update_client(client_id, current_user.tenant_id, body.model_dump(exclude_none=True))
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    plans = await service.get_client_plans(client_id, current_user.tenant_id)
    return {**{col.key: getattr(client, col.key) for col in client.__table__.columns}, "total_planos": len(plans)}


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ClientService(db)
    deleted = await service.delete_client(client_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")


@router.get("/{client_id}/plans", response_model=list[MediaPlanSummary])
async def get_client_plans(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ClientService(db)
    client = await service.get_client(client_id, current_user.tenant_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    plans = await service.get_client_plans(client_id, current_user.tenant_id)
    result = []
    for p in plans:
        invest = sum(
            it.custo_total or it.custo_negociado or 0
            for it in (p.items if hasattr(p, 'items') else [])
        ) or None
        result.append(MediaPlanSummary(
            id=p.id, nome=p.nome, anunciante=p.anunciante, agencia=p.agencia,
            data_inicio=p.data_inicio, data_fim=p.data_fim, budget_total=p.budget_total,
            parse_status=p.parse_status, total_items=0, investimento_total=invest,
            arquivo_nome=p.arquivo_nome, created_at=p.created_at,
        ))
    return result
