"""
Módulo Planos de Mídia — upload e armazenamento de planos em Excel.

Estrutura:
  MediaPlan       — cabeçalho do plano (anunciante, período, budget total)
  MediaPlanItem   — linha de veículo dentro do plano (TV, Rádio, OOH, Digital…)

Dados privados por tenant.
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MediaPlan(Base):
    """
    Cabeçalho do plano de mídia — metadados gerais da campanha.
    Um plano contém N itens (linhas de veículos).
    """
    __tablename__ = "media_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Vínculo com cliente ---
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True,
        comment="FK para clients.id — vínculo com o anunciante cadastrado"
    )

    # --- Identificação ---
    nome: Mapped[str] = mapped_column(String(400), nullable=False, comment="Nome do plano / campanha")
    anunciante: Mapped[str | None] = mapped_column(String(300), nullable=True)
    agencia: Mapped[str | None] = mapped_column(String(300), nullable=True)
    produto: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # --- Período ---
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)

    # --- Financeiro ---
    budget_total: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Budget total da campanha")
    moeda: Mapped[str] = mapped_column(String(3), nullable=False, default="BRL")

    # --- Arquivo original ---
    arquivo_nome: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="Nome do arquivo Excel original")
    arquivo_tamanho_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # --- Status de parsing ---
    parse_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="OK",
        comment="OK, PARCIAL, ERRO"
    )
    parse_erros: Mapped[str | None] = mapped_column(Text, nullable=True, comment="JSON com erros de parsing")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    items: Mapped[list["MediaPlanItem"]] = relationship(
        "MediaPlanItem", back_populates="plan", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<MediaPlan {self.nome}>"


class MediaPlanItem(Base):
    """
    Linha de veículo dentro do plano de mídia.

    Cobre todos os meios: TV, Rádio, Jornal, Revista, OOH, Digital, Social,
    Indoor, Influenciador — campos não aplicáveis ficam NULL.
    """
    __tablename__ = "media_plan_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("media_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Identificação do veículo ---
    meio: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="TV, RADIO, JORNAL, REVISTA, OOH, DIGITAL, SOCIAL, INDOOR, INFLUENCIADOR, OUTRO"
    )
    veiculo: Mapped[str | None] = mapped_column(String(300), nullable=True, comment="Nome do veículo / emissora / site")
    programa: Mapped[str | None] = mapped_column(String(300), nullable=True, comment="Programa ou posicionamento específico")
    formato: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="30s, meia página, leaderboard, 9x16, etc.")
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    praca: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Praça / mercado (ex: São Paulo, Nacional)")

    # --- Período da linha ---
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)

    # --- Financeiro ---
    custo_tabela: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Custo de tabela (sem desconto)")
    desconto_pct: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Percentual de desconto (%)")
    custo_negociado: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Custo após desconto")
    custo_total: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Custo total (negociado × inserções / períodos)")
    bonificacao: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Métricas de audiência (TV / Rádio) ---
    insercoes: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Número de inserções / spots")
    grp: Mapped[float | None] = mapped_column(Float, nullable=True, comment="GRP — Gross Rating Point")
    trp: Mapped[float | None] = mapped_column(Float, nullable=True, comment="TRP — Target Rating Point")
    audiencia_pct: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Audiência % do programa")
    universo: Mapped[int | None] = mapped_column(BigInteger, nullable=True, comment="Universo do target")
    impactos: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cpp: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Custo por Ponto (CPP)")
    cpm: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Custo por Mil Impactos (CPM)")
    alcance_pct: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Alcance % da campanha")
    frequencia_media: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Métricas de rádio ---
    ouvintes_por_minuto: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # --- Métricas de impresso (Jornal / Revista) ---
    centimetragem: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Centimetragem do anúncio")
    tiragem: Mapped[int | None] = mapped_column(BigInteger, nullable=True, comment="Tiragem IVC")
    circulacao: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # --- Métricas de digital ---
    impressoes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cliques: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    ctr_pct: Mapped[float | None] = mapped_column(Float, nullable=True, comment="CTR %")
    cpc: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Custo por Clique")
    cpa: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Custo por Aquisição")
    conversoes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    objetivo: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="AWARENESS, CONSIDERACAO, PERFORMANCE, RETENCAO"
    )

    # --- OOH específico ---
    faces: Mapped[int | None] = mapped_column(Integer, nullable=True)
    municipio: Mapped[str | None] = mapped_column(String(200), nullable=True)
    fluxo_diario: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # --- Metadado do parse ---
    aba_origem: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Nome da aba Excel de origem")
    linha_origem: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Número da linha no Excel")

    # --- Execução — PI (Pedido de Inserção) ---
    pi_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDENTE",
        comment="PENDENTE, ENVIADO, CONFIRMADO, NO_AR, CONCLUIDO"
    )
    pi_numero: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Número do PI")
    pi_enviado_em: Mapped[date | None] = mapped_column(Date, nullable=True)
    pi_confirmado_em: Mapped[date | None] = mapped_column(Date, nullable=True)

    # --- Execução — Cronograma de Material ---
    material_formato: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Ex: VT 30s, Banner 300x250")
    material_dimensoes: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Ex: 1920x1080, 300x250px")
    material_tipo_fechamento: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Ex: MP4, PDF, JPG, ZIP")
    material_prazo_entrega: Mapped[date | None] = mapped_column(Date, nullable=True)
    material_horario_entrega: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="Ex: até 18h")
    material_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDENTE",
        comment="PENDENTE, ENTREGUE, ATRASADO"
    )
    material_entregue_em: Mapped[date | None] = mapped_column(Date, nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    plan: Mapped["MediaPlan"] = relationship("MediaPlan", back_populates="items")

    def __repr__(self) -> str:
        return f"<MediaPlanItem {self.meio}/{self.veiculo}>"
