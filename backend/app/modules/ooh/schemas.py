"""Schemas OOH — contratos de entrada e saída da API."""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class OohPanelResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    nome: str | None
    codigo_operadora: str | None
    endereco: str
    cidade: str | None
    uf: str | None
    cep: str | None
    latitude: float | None
    longitude: float | None
    geocode_status: str
    formato: str
    largura_m: float | None
    altura_m: float | None
    faces: int
    digital: bool
    iluminado: bool
    operadora: str | None
    fluxo_diario: int | None
    ots_mensal: int | None
    valor_periodo: float | None
    populacao_municipio: int | None
    raio_visibilidade_m: int
    alcance_estimado: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OohCampaignCreate(BaseModel):
    name: str = Field(min_length=2, max_length=300)
    advertiser: str | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    notes: str | None = None


class OohCampaignResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    advertiser: str | None
    data_inicio: date | None
    data_fim: date | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    panels: list[OohPanelResponse] = []

    # Totais calculados
    total_paineis: int = 0
    paineis_geocodificados: int = 0
    alcance_total_estimado: int | None = None
    fluxo_total_diario: int | None = None
    investimento_total: float | None = None

    model_config = {"from_attributes": True}


class OohCampaignSummary(BaseModel):
    id: uuid.UUID
    name: str
    advertiser: str | None
    data_inicio: date | None
    data_fim: date | None
    status: str
    total_paineis: int
    paineis_geocodificados: int
    alcance_total_estimado: int | None
    investimento_total: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CsvUploadResult(BaseModel):
    campaign_id: uuid.UUID
    campaign_name: str
    paineis_importados: int
    linhas_ignoradas: int
    erros: list[str]
    geocoding_status: str


class ShareLinkResponse(BaseModel):
    token: str
    share_url: str
    is_active: bool
    view_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicCampaignResponse(BaseModel):
    """Versão pública da campanha — sem tenant_id, segura para exibição sem auth."""
    id: uuid.UUID
    name: str
    advertiser: str | None
    data_inicio: Any | None
    data_fim: Any | None
    status: str
    notes: str | None
    panels: list[OohPanelResponse] = []
    total_paineis: int = 0
    paineis_geocodificados: int = 0
    alcance_total_estimado: int | None = None
    fluxo_total_diario: int | None = None
    investimento_total: float | None = None

    model_config = {"from_attributes": True}
