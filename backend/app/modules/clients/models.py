"""
Módulo Clientes — contas/anunciantes gerenciados pela agência.

Cada cliente representa uma conta (anunciante) com suas campanhas,
planos de mídia e equipe responsável dentro do núcleo.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )

    # --- Identificação ---
    nome: Mapped[str] = mapped_column(String(300), nullable=False, comment="Nome do cliente / anunciante")
    nome_fantasia: Mapped[str | None] = mapped_column(String(300), nullable=True)
    segmento: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Ex: Financeiro, Varejo, Telecom")
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- Status ---
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ATIVO",
        comment="ATIVO, PAUSADO, INATIVO"
    )

    # --- Observações ---
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    def __repr__(self) -> str:
        return f"<Client {self.nome}>"
