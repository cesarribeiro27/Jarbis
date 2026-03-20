"""
Endpoints de Sub-organizações.

Permite que tenants enterprise criem e gerenciem sub-organizações filhas.
Cada sub-org é um tenant separado com parent_tenant_id apontando para o pai.

POST   /tenants/sub-orgs              — Cria nova sub-org
GET    /tenants/sub-orgs              — Lista sub-orgs do tenant autenticado
GET    /tenants/sub-orgs/{id}         — Detalhe de uma sub-org
PATCH  /tenants/sub-orgs/{id}         — Atualiza nome da sub-org
DELETE /tenants/sub-orgs/{id}         — Desativa sub-org (soft-delete)
POST   /tenants/sub-orgs/{id}/switch  — Retorna info para alternar contexto
"""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import Tenant, User

router = APIRouter(prefix="/tenants", tags=["Sub-organizações"])

_ALLOWED_PLANS = {"ilimitado", "enterprise", "business"}


def _require_suborg_plan(tenant: Tenant) -> None:
    if tenant.plan not in _ALLOWED_PLANS:
        raise HTTPException(
            status_code=403,
            detail="Sub-organizações disponíveis apenas nos planos Ilimitado e Enterprise.",
        )


def _require_owner_or_admin(user: User) -> None:
    if user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Apenas owner ou admin pode gerenciar sub-organizações.")


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    return f"{slug}-{uuid.uuid4().hex[:6]}"


class CreateSubOrgRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    owner_email: str | None = None
    owner_name: str | None = None
    owner_password: str | None = None


class UpdateSubOrgRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    is_active: bool | None = None


class SubOrgResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    is_active: bool
    is_suborg: bool
    parent_tenant_id: uuid.UUID | None

    model_config = {"from_attributes": True}


@router.post("/sub-orgs", response_model=SubOrgResponse, status_code=201)
async def create_sub_org(
    data: CreateSubOrgRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cria uma nova sub-organização filha do tenant autenticado."""
    parent = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    if not parent:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")
    _require_owner_or_admin(current_user)
    _require_suborg_plan(parent)

    # Limite: máximo de 20 sub-orgs por tenant pai
    count_result = await db.scalar(
        select(func.count()).select_from(Tenant).where(
            Tenant.parent_tenant_id == parent.id,
            Tenant.is_suborg == True,  # noqa: E712
        )
    )
    if count_result and count_result >= 20:
        raise HTTPException(status_code=400, detail="Limite de 20 sub-organizações atingido.")

    suborg = Tenant(
        name=data.name,
        slug=_slugify(data.name),
        plan="free",
        is_suborg=True,
        parent_tenant_id=parent.id,
    )
    db.add(suborg)
    await db.flush()  # obtém o ID antes de criar o usuário

    # Cria usuário owner na sub-org se fornecido
    if data.owner_email and data.owner_name and data.owner_password:
        try:
            from app.core.security import hash_password
            user_obj = User(
                tenant_id=suborg.id,
                email=data.owner_email,
                hashed_password=hash_password(data.owner_password),
                full_name=data.owner_name,
                role="owner",
                is_active=True,
                email_verified=True,
            )
            db.add(user_obj)
        except Exception:
            pass  # não bloquear criação da sub-org se usuário falhar

    await db.commit()
    await db.refresh(suborg)
    return suborg


@router.get("/sub-orgs", response_model=list[SubOrgResponse])
async def list_sub_orgs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lista todas as sub-organizações do tenant autenticado."""
    _require_owner_or_admin(current_user)
    result = await db.scalars(
        select(Tenant)
        .where(Tenant.parent_tenant_id == current_user.tenant_id, Tenant.is_suborg == True)  # noqa: E712
        .order_by(Tenant.created_at.desc())
    )
    return result.all()


@router.get("/sub-orgs/{suborg_id}", response_model=SubOrgResponse)
async def get_sub_org(
    suborg_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna detalhes de uma sub-organização."""
    _require_owner_or_admin(current_user)
    suborg = await db.scalar(
        select(Tenant).where(
            Tenant.id == suborg_id,
            Tenant.parent_tenant_id == current_user.tenant_id,
            Tenant.is_suborg == True,  # noqa: E712
        )
    )
    if not suborg:
        raise HTTPException(status_code=404, detail="Sub-organização não encontrada.")
    return suborg


@router.patch("/sub-orgs/{suborg_id}", response_model=SubOrgResponse)
async def update_sub_org(
    suborg_id: uuid.UUID,
    data: UpdateSubOrgRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Atualiza nome ou status de uma sub-organização."""
    _require_owner_or_admin(current_user)
    suborg = await db.scalar(
        select(Tenant).where(
            Tenant.id == suborg_id,
            Tenant.parent_tenant_id == current_user.tenant_id,
            Tenant.is_suborg == True,  # noqa: E712
        )
    )
    if not suborg:
        raise HTTPException(status_code=404, detail="Sub-organização não encontrada.")
    if data.name is not None:
        suborg.name = data.name
    if data.is_active is not None:
        suborg.is_active = data.is_active
    await db.commit()
    await db.refresh(suborg)
    return suborg


@router.delete("/sub-orgs/{suborg_id}", status_code=204)
async def delete_sub_org(
    suborg_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Desativa uma sub-organização (soft-delete via is_active=False)."""
    _require_owner_or_admin(current_user)
    suborg = await db.scalar(
        select(Tenant).where(
            Tenant.id == suborg_id,
            Tenant.parent_tenant_id == current_user.tenant_id,
            Tenant.is_suborg == True,  # noqa: E712
        )
    )
    if not suborg:
        raise HTTPException(status_code=404, detail="Sub-organização não encontrada.")
    suborg.is_active = False
    await db.commit()


@router.post("/sub-orgs/{suborg_id}/switch")
async def switch_to_sub_org(
    suborg_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna as informações da sub-org para o frontend armazenar o contexto.
    O frontend usa o suborg_id no header X-Suborg-ID nas próximas requisições.
    """
    _require_owner_or_admin(current_user)
    suborg = await db.scalar(
        select(Tenant).where(
            Tenant.id == suborg_id,
            Tenant.parent_tenant_id == current_user.tenant_id,
            Tenant.is_suborg == True,  # noqa: E712
            Tenant.is_active == True,  # noqa: E712
        )
    )
    if not suborg:
        raise HTTPException(status_code=404, detail="Sub-organização não encontrada ou inativa.")
    return {
        "suborg_id": str(suborg.id),
        "suborg_name": suborg.name,
        "parent_tenant_id": str(current_user.tenant_id),
        "parent_name": None,  # frontend já tem o nome do tenant pai
    }
