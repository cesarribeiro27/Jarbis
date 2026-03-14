"""Schemas Organograma."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class OrgMemberCreate(BaseModel):
    nome: str
    cargo: str
    email: str | None = None
    telefone: str | None = None
    nucleo: str | None = None
    notas: str | None = None
    ordem: int = 0


class OrgMemberUpdate(BaseModel):
    nome: str | None = None
    cargo: str | None = None
    email: str | None = None
    telefone: str | None = None
    nucleo: str | None = None
    notas: str | None = None
    ativo: bool | None = None
    ordem: int | None = None


class OrgMemberResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    nome: str
    cargo: str
    email: str | None
    telefone: str | None
    nucleo: str | None
    notas: str | None
    ativo: bool
    ordem: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrgShareResponse(BaseModel):
    token: str
    url: str
