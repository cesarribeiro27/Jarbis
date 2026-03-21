"""
Modelo para snapshots históricos de diagnóstico de dashboard.
Cada vez que o usuário roda o diagnóstico, salva um snapshot com
health_score, insights e gaps — permitindo evolução De/Para.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DiagnosisSnapshot(Base):
    __tablename__ = "diagnosis_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    health_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    domain: Mapped[str] = mapped_column(String(64), nullable=False, default="generic")
    domain_name: Mapped[str] = mapped_column(String(128), nullable=False, default="Genérico")

    # Listas de strings / dicts como JSONB
    visual_insights: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    missing_blocks: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    missing_columns: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    suggestions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
