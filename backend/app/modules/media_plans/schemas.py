"""Schemas Planos de Mídia — contratos de entrada e saída da API."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class MediaPlanItemResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    meio: str
    veiculo: str | None
    programa: str | None
    formato: str | None
    uf: str | None
    praca: str | None
    data_inicio: date | None
    data_fim: date | None
    custo_tabela: float | None
    desconto_pct: float | None
    custo_negociado: float | None
    custo_total: float | None
    insercoes: int | None
    grp: float | None
    trp: float | None
    audiencia_pct: float | None
    impactos: int | None
    cpp: float | None
    cpm: float | None
    alcance_pct: float | None
    frequencia_media: float | None
    ouvintes_por_minuto: int | None
    centimetragem: float | None
    tiragem: int | None
    impressoes: int | None
    cliques: int | None
    ctr_pct: float | None
    cpc: float | None
    cpa: float | None
    conversoes: int | None
    objetivo: str | None
    faces: int | None
    municipio: str | None
    fluxo_diario: int | None
    aba_origem: str | None
    linha_origem: int | None
    pi_status: str = "PENDENTE"
    pi_numero: str | None = None
    pi_enviado_em: date | None = None
    pi_confirmado_em: date | None = None
    material_formato: str | None = None
    material_dimensoes: str | None = None
    material_tipo_fechamento: str | None = None
    material_prazo_entrega: date | None = None
    material_horario_entrega: str | None = None
    material_status: str = "PENDENTE"
    material_entregue_em: date | None = None
    observacoes: str | None = None

    model_config = {"from_attributes": True}


class ItemUpdateRequest(BaseModel):
    pi_status: str | None = None
    pi_numero: str | None = None
    pi_enviado_em: date | None = None
    pi_confirmado_em: date | None = None
    material_formato: str | None = None
    material_dimensoes: str | None = None
    material_tipo_fechamento: str | None = None
    material_prazo_entrega: date | None = None
    material_horario_entrega: str | None = None
    material_status: str | None = None
    material_entregue_em: date | None = None
    observacoes: str | None = None


class MediaPlanResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    nome: str
    anunciante: str | None
    agencia: str | None
    produto: str | None
    data_inicio: date | None
    data_fim: date | None
    budget_total: float | None
    moeda: str
    arquivo_nome: str | None
    parse_status: str
    parse_erros: str | None
    created_at: datetime
    updated_at: datetime
    items: list[MediaPlanItemResponse] = []

    # Totais calculados
    total_items: int = 0
    investimento_total: float | None = None

    model_config = {"from_attributes": True}


class MediaPlanSummary(BaseModel):
    id: uuid.UUID
    nome: str
    anunciante: str | None
    agencia: str | None
    data_inicio: date | None
    data_fim: date | None
    budget_total: float | None
    parse_status: str
    total_items: int
    investimento_total: float | None
    arquivo_nome: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MaterialItemRow(BaseModel):
    """Item enriquecido com dados do plano — usado na tela Entrega de Material."""
    id: uuid.UUID
    plan_id: uuid.UUID
    plan_nome: str
    anunciante: str | None
    meio: str
    veiculo: str | None
    formato: str | None
    material_formato: str | None
    material_dimensoes: str | None
    material_tipo_fechamento: str | None
    material_prazo_entrega: date | None
    material_horario_entrega: str | None
    material_status: str
    material_entregue_em: date | None
    observacoes: str | None

    model_config = {"from_attributes": True}


class UploadResult(BaseModel):
    plan_id: uuid.UUID
    nome: str
    total_items: int
    meios_encontrados: list[str]
    parse_status: str
    parse_erros: list[str]
