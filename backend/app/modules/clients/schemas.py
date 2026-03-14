"""Schemas Clientes."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class ClientCreate(BaseModel):
    nome: str
    nome_fantasia: str | None = None
    segmento: str | None = None
    logo_url: str | None = None
    status: str = "ATIVO"
    notas: str | None = None


class ClientUpdate(BaseModel):
    nome: str | None = None
    nome_fantasia: str | None = None
    segmento: str | None = None
    logo_url: str | None = None
    status: str | None = None
    notas: str | None = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    nome: str
    nome_fantasia: str | None
    segmento: str | None
    logo_url: str | None
    status: str
    notas: str | None
    created_at: datetime
    updated_at: datetime

    # Totais calculados
    total_planos: int = 0

    model_config = {"from_attributes": True}
