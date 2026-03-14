"""Módulo Organograma — estrutura da agência por tenant."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


CARGO_ORDER = {
    "VP / Head": 1,
    "Diretor": 2,
    "Gerente": 3,
    "Supervisor": 4,
    "Coordenador": 4,
    "Analista": 5,
    "Assistente": 6,
    "Estagiário": 7,
}


class OrgMember(Base):
    """Membro da equipe de mídia da agência."""
    __tablename__ = "org_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    cargo: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(300), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nucleo: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Núcleo / conta que atende")
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class OrgShare(Base):
    """Token de compartilhamento público do organograma."""
    __tablename__ = "org_shares"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
