"""
Model de Municípios brasileiros.

Armazena os 5.571 municípios do Brasil com dados do IBGE:
código oficial, UF, região e população do Censo 2022.

Usado como base para calcular o universo de audiência de cada praça
de mídia — essencial para planejamento e projeção de alcance.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Municipio(Base):
    __tablename__ = "municipios"
    __table_args__ = (
        UniqueConstraint("codigo_ibge", name="uq_municipio_codigo_ibge"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Identificação oficial IBGE
    codigo_ibge: Mapped[str] = mapped_column(
        String(7), nullable=False, index=True,
        comment="Código de 7 dígitos do IBGE (ex: 3550308 = São Paulo)"
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False, index=True)

    # Localização
    uf: Mapped[str] = mapped_column(
        String(2), nullable=False, index=True,
        comment="Sigla da UF (SP, RJ, MG...)"
    )
    nome_uf: Mapped[str] = mapped_column(String(100), nullable=False)
    regiao: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Norte, Nordeste, Centro-Oeste, Sudeste, Sul"
    )

    # Dados demográficos — Censo IBGE 2022
    populacao_2022: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="População residente - Censo 2022"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    def __repr__(self) -> str:
        return f"<Municipio {self.nome} - {self.uf} (pop: {self.populacao_2022})>"
