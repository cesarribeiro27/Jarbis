"""
Serviço de Relatórios — lógica de negócio para criação e consulta de relatórios.

Cada relatório é composto por blocos (widgets) configuráveis e pode ser
compartilhado publicamente via token único.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.reports.models import Report
from app.modules.reports.schemas import ReportCreate, ReportUpdate


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # CRUD
    # -------------------------------------------------------------------------

    async def create(self, tenant_id: uuid.UUID, data: ReportCreate) -> Report:
        report = Report(
            tenant_id=tenant_id,
            title=data.title,
            description=data.description,
            blocks=data.blocks,
            pages=data.pages,
            dataset_ids=data.dataset_ids,  # None = legado; [] = zero selecionados; [ids] = selecionados
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def list(self, tenant_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(Report)
            .where(Report.tenant_id == tenant_id)
            .order_by(Report.updated_at.desc())
        )
        reports = result.scalars().all()
        return [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "cover_image": r.cover_image,
                "is_shared": r.is_shared,
                "block_count": (
                    sum(len(p.get("blocks", [])) for p in r.pages)
                    if r.pages
                    else len(r.blocks) if r.blocks else 0
                ),
                "view_count": r.share_view_count,
                "language": r.language if hasattr(r, "language") else "pt-BR",
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r in reports
        ]

    async def get(self, report_id: uuid.UUID, tenant_id: uuid.UUID) -> Report | None:
        result = await self.db.execute(
            select(Report).where(
                Report.id == report_id,
                Report.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        report_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: ReportUpdate,
    ) -> Report | None:
        report = await self.get(report_id, tenant_id)
        if not report:
            return None

        if data.title is not None:
            report.title = data.title
        if data.description is not None:
            report.description = data.description
        if data.blocks is not None:
            report.blocks = data.blocks
        if data.pages is not None:
            report.pages = data.pages
        if data.cover_image is not None:
            report.cover_image = data.cover_image
        if data.dataset_ids is not None:
            report.dataset_ids = data.dataset_ids

        report.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def clone(self, report_id: uuid.UUID, tenant_id: uuid.UUID) -> Report:
        source = await self.get(report_id, tenant_id)
        if not source:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Relatório não encontrado")
        cloned = Report(
            tenant_id=tenant_id,
            title=f"Cópia de {source.title}",
            description=source.description,
            blocks=source.blocks,
            pages=source.pages,
            language=source.language if hasattr(source, "language") else "pt-BR",
        )
        self.db.add(cloned)
        await self.db.commit()
        await self.db.refresh(cloned)
        return cloned

    async def delete(self, report_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        report = await self.get(report_id, tenant_id)
        if not report:
            return False
        await self.db.delete(report)
        await self.db.commit()
        return True

    # -------------------------------------------------------------------------
    # Share
    # -------------------------------------------------------------------------

    async def get_or_create_share(
        self,
        report_id: uuid.UUID,
        tenant_id: uuid.UUID,
        base_url: str,
    ) -> dict | None:
        report = await self.get(report_id, tenant_id)
        if not report:
            return None

        if not report.is_shared or not report.share_token:
            report.generate_share_token()
            await self.db.commit()
            await self.db.refresh(report)

        from app.config import settings
        share_url = f"{settings.frontend_url.rstrip('/')}/r/{report.share_token}"

        return {
            "token": report.share_token,
            "share_url": share_url,
            "view_count": report.share_view_count,
        }

    async def get_public(self, token: str) -> Report | None:
        """Fetch a report by share token (no tenant check) and increment view_count."""
        result = await self.db.execute(
            select(Report).where(
                Report.share_token == token,
                Report.is_shared.is_(True),
            )
        )
        report = result.scalar_one_or_none()
        if not report:
            return None

        report.share_view_count += 1
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def get_public_no_increment(self, token: str) -> Report | None:
        """Fetch a report by share token without incrementing view_count (for dataset queries)."""
        result = await self.db.execute(
            select(Report).where(
                Report.share_token == token,
                Report.is_shared.is_(True),
            )
        )
        return result.scalar_one_or_none()
