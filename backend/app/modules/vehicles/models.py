"""
Models do domínio de Veículos de Mídia.

Vehicle é a entidade central da Lumetra. Representa qualquer meio de
comunicação do ecossistema brasileiro, do Jornal Nacional a um
influenciador do TikTok.

Decisão arquitetural: usamos JSONB para o campo `metadata` porque cada
tipo de mídia tem atributos únicos (TV tem número de afiliadas, jornal
tem ISSN, influenciador tem handle de redes sociais). Isso evita dezenas
de tabelas especializadas sem perder a capacidade de consulta do PostgreSQL.
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.modules.vehicles.enums import (
    AudienceMetricType,
    AudienceSource,
    CoverageScope,
    MediaSegment,
    VehicleStatus,
    VehicleType,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Vehicle(Base):
    """
    Veículo de comunicação.

    Entidade central da plataforma. Representa TV, rádio, jornal, portal
    digital, influenciador — qualquer ponto de contato com a audiência.
    """
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # --- Identificação ---
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    trade_name: Mapped[str | None] = mapped_column(
        String(300), nullable=True,
        comment="Nome fantasia ou marca comercial"
    )

    # --- Classificação ---
    vehicle_type: Mapped[VehicleType] = mapped_column(
        SAEnum(VehicleType, name="vehicle_type_enum"), nullable=False, index=True
    )
    segment: Mapped[MediaSegment] = mapped_column(
        SAEnum(MediaSegment, name="media_segment_enum"),
        nullable=False,
        default=MediaSegment.GENERALISTA,
    )
    status: Mapped[VehicleStatus] = mapped_column(
        SAEnum(VehicleStatus, name="vehicle_status_enum"),
        nullable=False,
        default=VehicleStatus.ATIVO,
        index=True,
    )

    # --- Cobertura geográfica ---
    coverage_scope: Mapped[CoverageScope] = mapped_column(
        SAEnum(CoverageScope, name="coverage_scope_enum"),
        nullable=False,
        default=CoverageScope.NACIONAL,
    )
    coverage_states: Mapped[list | None] = mapped_column(
        JSONB, nullable=True,
        comment="Lista de UFs cobertas: ['SP', 'RJ', 'MG']"
    )
    coverage_cities: Mapped[list | None] = mapped_column(
        JSONB, nullable=True,
        comment="Lista de municípios (IBGE codes)"
    )

    # --- Informações editoriais e institucionais ---
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parent_company: Mapped[str | None] = mapped_column(
        String(300), nullable=True,
        comment="Grupo de comunicação proprietário"
    )
    founded_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)

    # --- Metadados específicos por tipo ---
    # Armazenados em JSONB para flexibilidade.
    # TV: {"canal": 4, "operadora": "Globo", "afiliadas": 120}
    # Jornal: {"issn": "1234-5678", "periodicidade": "diario"}
    # Influenciador: {"instagram": "@handle", "tiktok": "@handle", "nicho": "lifestyle"}
    extra_metadata: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, name="metadata"
    )

    # --- Controle ---
    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False,
        comment="Dados verificados pela equipe Lumetra"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relacionamentos
    audience_records: Mapped[list["AudienceRecord"]] = relationship(
        "AudienceRecord", back_populates="vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Vehicle {self.vehicle_type.value}: {self.name}>"


class AudienceRecord(Base):
    """
    Registro de audiência de um veículo em um período específico.

    Cada registro representa uma medição de audiência vinda de uma fonte
    específica (ex: Kantar IBOPE, ComScore), para uma métrica específica
    (ex: audiência média, share), em um período de tempo definido.

    O campo `metrics` JSONB armazena os valores numéricos e breakdown
    demográfico, permitindo que cada tipo de mídia tenha sua estrutura
    sem criar tabelas separadas.
    """
    __tablename__ = "audience_records"
    __table_args__ = (
        UniqueConstraint(
            "vehicle_id", "metric_type", "source", "reference_date",
            name="uq_audience_record"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Identificação da medição ---
    metric_type: Mapped[AudienceMetricType] = mapped_column(
        SAEnum(AudienceMetricType, name="audience_metric_type_enum"), nullable=False
    )
    source: Mapped[AudienceSource] = mapped_column(
        SAEnum(AudienceSource, name="audience_source_enum"), nullable=False
    )

    # --- Período de referência ---
    reference_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="monthly",
        comment="Granularidade: daily, weekly, monthly, quarterly, yearly"
    )

    # --- Valores ---
    value: Mapped[float] = mapped_column(Float, nullable=False, comment="Valor principal da métrica")
    universe: Mapped[float | None] = mapped_column(
        Float, nullable=True,
        comment="Universo de referência (ex: total de domicílios com TV)"
    )

    # --- Breakdown e detalhamento ---
    # Estrutura flexível por tipo de mídia:
    # TV: {"total": 15.3, "homens": 13.1, "mulheres": 17.2, "18_34": 12.0}
    # Digital: {"desktop": 4500000, "mobile": 8200000, "avg_session_minutes": 3.2}
    # OOH: {"faces": 12, "impactos_dia": 45000, "perfil": {"abc": 0.65}}
    metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # --- Observações ---
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relacionamentos
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="audience_records")

    def __repr__(self) -> str:
        return f"<AudienceRecord vehicle={self.vehicle_id} metric={self.metric_type.value} date={self.reference_date}>"
