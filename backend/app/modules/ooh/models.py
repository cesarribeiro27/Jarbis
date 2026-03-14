"""
Módulo OOH (Out of Home) — painéis e campanhas de mídia exterior.

Dados privados por tenant: cada agência gerencia suas próprias campanhas.
A Lumetra acumula os dados anonimizados para inteligência de mercado.
"""

import secrets
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey,
    Integer, String, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OohCampaign(Base):
    """
    Campanha OOH — agrupa painéis de uma mesma ação de mídia exterior.
    Pertence a um tenant (agência/anunciante).
    """
    __tablename__ = "ooh_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(300), nullable=False)
    advertiser: Mapped[str | None] = mapped_column(String(300), nullable=True)
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PLANEJAMENTO",
        comment="PLANEJAMENTO, ATIVA, ENCERRADA, CANCELADA"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    panels: Mapped[list["OohPanel"]] = relationship(
        "OohPanel", back_populates="campaign", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<OohCampaign {self.name}>"


class OohPanel(Base):
    """
    Painel OOH individual — outdoor, backlight, digital, mobiliário urbano, etc.

    Campos preenchidos pelo usuário via CSV:
      - Endereço, formato, dimensões, operadora, fluxo informado

    Campos preenchidos automaticamente pela plataforma:
      - latitude/longitude (geocodificação via Nominatim/OSM)
      - populacao_municipio (cruzamento com tabela municipios/IBGE)
      - alcance_estimado (cálculo baseado em raio de visibilidade)
    """
    __tablename__ = "ooh_panels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ooh_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Identificação ---
    nome: Mapped[str | None] = mapped_column(String(300), nullable=True)
    codigo_operadora: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # --- Localização ---
    endereco: Mapped[str] = mapped_column(String(500), nullable=False)
    cidade: Mapped[str | None] = mapped_column(String(200), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Geocodificação (preenchido automaticamente)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    geocode_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDENTE",
        comment="PENDENTE, OK, FALHOU"
    )
    geocoded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- Formato ---
    formato: Mapped[str] = mapped_column(
        String(50), nullable=False, default="OUTDOOR",
        comment="OUTDOOR, BACKLIGHT, FRONTLIGHT, DIGITAL, MOBILIARIO, BUSDOOR, METRO, AEROPORTO, OUTRO"
    )
    largura_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    altura_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    faces: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    digital: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    iluminado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # --- Operadora ---
    operadora: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # --- Métricas fornecidas pelo usuário ---
    fluxo_diario: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="Fluxo diário de pessoas informado pela operadora"
    )
    ots_mensal: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="OTS (Opportunity To See) mensal fornecido"
    )
    valor_periodo: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Enriquecimento automático pela Lumetra ---
    populacao_municipio: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="Populacão do município (IBGE Censo 2022)"
    )
    raio_visibilidade_m: Mapped[int] = mapped_column(
        Integer, nullable=False, default=300,
        comment="Raio de visibilidade estimado em metros"
    )
    alcance_estimado: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="Alcance estimado de pessoas (calculado pela plataforma)"
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    campaign: Mapped["OohCampaign"] = relationship("OohCampaign", back_populates="panels")

    def __repr__(self) -> str:
        return f"<OohPanel {self.endereco}>"


class OohCampaignShare(Base):
    """
    Link público de compartilhamento de campanha OOH.

    Permite que a agência gere um link para o cliente visualizar
    o mapa, relatório e evolução da campanha sem precisar de login.
    """
    __tablename__ = "ooh_campaign_shares"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ooh_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        default=lambda: secrets.token_urlsafe(24),
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    def __repr__(self) -> str:
        return f"<OohCampaignShare {self.token}>"
