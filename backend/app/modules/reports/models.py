"""
Relatórios customizáveis — blocos de dados e visualizações.

Cada relatório pertence a um tenant e é composto por blocos (widgets).
Blocos podem ser: KPI, gráfico de barras, linhas, pizza, tabela, texto.
A configuração dos blocos é armazenada como JSONB para flexibilidade máxima.
"""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Array de blocos serializados como JSONB
    # Cada bloco: {id, type, title, data_source, config, position}
    blocks: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Múltiplas páginas: [{id, title, blocks: [...]}]
    # Se preenchido, tem prioridade sobre blocks (que fica como compat com legado)
    pages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Datasets vinculados explicitamente a este dashboard
    # Lista de UUIDs (strings) dos ReportDatasets que o usuário quer usar neste dashboard
    dataset_ids: Mapped[list] = mapped_column(JSONB, nullable=True, default=list)

    # Imagem de capa (base64 data URL da imagem recortada)
    cover_image: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Idioma padrão do link público (ex: "pt-BR", "en", "es")
    language: Mapped[str] = mapped_column(String(10), nullable=False, server_default="pt-BR", default="pt-BR")

    # Share
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    is_shared: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    share_view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Expiração do link público. None = sem expiração (tokens legados). Novos tokens: 90 dias.
    share_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    def generate_share_token(self, expires_days: int = 90):
        from datetime import timedelta
        self.share_token = secrets.token_urlsafe(24)
        self.is_shared = True
        self.share_token_expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    @property
    def share_token_valid(self) -> bool:
        """Retorna True se o token existe, está ativo e não expirou."""
        if not self.is_shared or not self.share_token:
            return False
        if self.share_token_expires_at and self.share_token_expires_at < datetime.now(timezone.utc):
            return False
        return True
