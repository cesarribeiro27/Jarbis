import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow():
    return datetime.utcnow()


class SocialToken(Base):
    """
    Token OAuth de rede social vinculado a um veículo.

    Armazena access_token + refresh_token de cada plataforma.
    O sync automático usa esses tokens para buscar métricas sem
    interação do usuário após a autorização inicial.
    """
    __tablename__ = "social_tokens"
    __table_args__ = (
        UniqueConstraint("vehicle_id", "platform", name="uq_social_token_vehicle_platform"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )

    platform: Mapped[str] = mapped_column(String(30), nullable=False)

    access_token:  Mapped[str]            = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str | None]     = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scope: Mapped[str | None]             = mapped_column(Text, nullable=True)

    platform_user_id:  Mapped[str | None] = mapped_column(String(200), nullable=True)
    platform_username: Mapped[str | None] = mapped_column(String(200), nullable=True)

    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
