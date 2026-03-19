"""Model — Datasets de Relatórios."""

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ReportDataset(Base):
    """
    Dataset gerenciado pelo usuário — alimenta os blocos de relatório.

    Pode ser:
      - csv/excel: dados carregados via upload de arquivo
      - api: dados buscados de uma URL externa (GET)
    """
    __tablename__ = "report_datasets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(300), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="csv")  # csv, excel, api

    # Dados armazenados como array de objetos
    rows: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    columns: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Config de API (apenas quando type == 'api')
    api_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    api_headers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    api_data_path: Mapped[str | None] = mapped_column(String(200), nullable=True,
                                                       comment="Caminho no JSON, ex: data.items")

    is_demo: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=False)

    # Modo de sincronização de APIs: replace (padrão) ou append (acumula)
    sync_mode: Mapped[str] = mapped_column(String(20), nullable=False, server_default="replace", default="replace")

    # Colunas calculadas: [{name, expression, refs}]
    computed_columns: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refresh_interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_refresh_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
