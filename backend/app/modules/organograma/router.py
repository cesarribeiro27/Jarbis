"""
Endpoints Organograma

GET    /organograma              — Lista membros do tenant
POST   /organograma              — Adiciona membro
PUT    /organograma/{id}         — Atualiza membro
DELETE /organograma/{id}         — Remove membro
POST   /organograma/share        — Gera link público
DELETE /organograma/share        — Revoga link público
GET    /organograma/public/{token} — View pública (sem auth)
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import settings
from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import OrgMemberCreate, OrgMemberResponse, OrgMemberUpdate, OrgShareResponse
from .service import OrgService

router = APIRouter(prefix="/organograma", tags=["Organograma"])


@router.get("", response_model=list[OrgMemberResponse])
async def list_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OrgService(db)
    return await service.list_members(current_user.tenant_id)


@router.post("", response_model=OrgMemberResponse, status_code=201)
async def create_member(
    body: OrgMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OrgService(db)
    return await service.create_member(current_user.tenant_id, body.model_dump())


@router.put("/{member_id}", response_model=OrgMemberResponse)
async def update_member(
    member_id: uuid.UUID,
    body: OrgMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OrgService(db)
    member = await service.update_member(member_id, current_user.tenant_id, body.model_dump(exclude_none=True))
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    return member


@router.delete("/{member_id}", status_code=204)
async def delete_member(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OrgService(db)
    deleted = await service.delete_member(member_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Membro não encontrado")


@router.post("/share", response_model=OrgShareResponse)
async def create_share(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OrgService(db)
    share = await service.create_share(current_user.tenant_id)
    base = str(request.base_url).rstrip("/")
    return OrgShareResponse(token=share.token, url=f"{base}/org/{share.token}")


@router.delete("/share", status_code=204)
async def revoke_share(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OrgService(db)
    await service.revoke_share(current_user.tenant_id)


@router.get("/share", response_model=OrgShareResponse | None)
async def get_share(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = OrgService(db)
    share = await service.get_share(current_user.tenant_id)
    if not share:
        return None
    base = str(request.base_url).rstrip("/")
    return OrgShareResponse(token=share.token, url=f"{base}/org/{share.token}")


@router.get("/public/{token}", response_model=list[OrgMemberResponse])
async def get_public_org(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    service = OrgService(db)
    result = await service.get_members_by_token(token)
    if not result:
        raise HTTPException(status_code=404, detail="Organograma não encontrado")
    members, _ = result
    return members
