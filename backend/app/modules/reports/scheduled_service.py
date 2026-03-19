"""Service — Relatórios agendados."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .scheduled_models import ScheduledReport


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _next_run(frequency: str, from_dt: datetime | None = None) -> datetime:
    base = from_dt or _utcnow()
    if frequency == "daily":
        return base + timedelta(days=1)
    elif frequency == "weekly":
        return base + timedelta(weeks=1)
    elif frequency == "monthly":
        # Add ~30 days
        return base + timedelta(days=30)
    return base + timedelta(days=1)


class ScheduledReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self, tenant_id: uuid.UUID) -> list[ScheduledReport]:
        result = await self.db.execute(
            select(ScheduledReport)
            .where(ScheduledReport.tenant_id == tenant_id)
            .order_by(ScheduledReport.created_at.desc())
        )
        return result.scalars().all()

    async def get(self, schedule_id: uuid.UUID, tenant_id: uuid.UUID) -> ScheduledReport | None:
        result = await self.db.execute(
            select(ScheduledReport).where(
                ScheduledReport.id == schedule_id,
                ScheduledReport.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        tenant_id: uuid.UUID,
        report_id: uuid.UUID,
        report_name: str,
        frequency: str,
        emails: list[str],
    ) -> ScheduledReport:
        sr = ScheduledReport(
            tenant_id=tenant_id,
            report_id=report_id,
            report_name=report_name,
            frequency=frequency,
            emails=emails,
            next_run=_next_run(frequency),
            is_active=True,
        )
        self.db.add(sr)
        await self.db.commit()
        await self.db.refresh(sr)
        return sr

    async def update(
        self,
        schedule_id: uuid.UUID,
        tenant_id: uuid.UUID,
        frequency: str | None = None,
        emails: list[str] | None = None,
        is_active: bool | None = None,
    ) -> ScheduledReport | None:
        sr = await self.get(schedule_id, tenant_id)
        if not sr:
            return None
        if frequency is not None:
            sr.frequency = frequency
            sr.next_run = _next_run(frequency)
        if emails is not None:
            from sqlalchemy.orm.attributes import flag_modified
            sr.emails = emails
            flag_modified(sr, "emails")
        if is_active is not None:
            sr.is_active = is_active
        await self.db.commit()
        await self.db.refresh(sr)
        return sr

    async def delete(self, schedule_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        sr = await self.get(schedule_id, tenant_id)
        if not sr:
            return False
        await self.db.delete(sr)
        await self.db.commit()
        return True

    async def get_due(self) -> list[ScheduledReport]:
        """Retorna agendamentos ativos com next_run <= agora."""
        now = _utcnow()
        result = await self.db.execute(
            select(ScheduledReport).where(
                ScheduledReport.is_active == True,
                ScheduledReport.next_run <= now,
            )
        )
        return result.scalars().all()

    async def mark_sent(self, sr: ScheduledReport) -> None:
        sr.last_run = _utcnow()
        sr.next_run = _next_run(sr.frequency, sr.last_run)
        await self.db.commit()
