"""Model de alertas por threshold em datasets."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ReportAlert(Base):
    __tablename__ = "report_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report_datasets.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    value_col: Mapped[str] = mapped_column(String(200), nullable=False)
    agg: Mapped[str] = mapped_column(String(20), nullable=False, default="sum")
    operator: Mapped[str] = mapped_column(String(10), nullable=False)  # gt|lt|gte|lte|eq
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    filter_col: Mapped[str | None] = mapped_column(String(200), nullable=True)
    filter_val: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ok|triggered
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
