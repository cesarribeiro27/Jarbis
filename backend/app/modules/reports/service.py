"""
Serviço de Relatórios — lógica de negócio para criação e consulta de relatórios.

Cada relatório é composto por blocos (widgets) configuráveis e pode ser
compartilhado publicamente via token único.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, text
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
                "block_count": len(r.blocks) if r.blocks else 0,
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

        # Replace port 8000 with 3000 and build share URL
        frontend_base = base_url.replace(":8000", ":3000").rstrip("/")
        share_url = f"{frontend_base}/r/{report.share_token}"

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

    # -------------------------------------------------------------------------
    # Data Sources
    # -------------------------------------------------------------------------

    async def get_data_source(
        self,
        source_name: str,
        tenant_id: uuid.UUID,
        filters: dict = {},
    ) -> list[dict]:
        """
        Returns data for a named data source as a list of {label, value} dicts.

        Available sources:
          - items_by_meio, investment_by_meio, investment_by_client,
            investment_by_month, top_vehicles, material_by_status,
            pi_by_status, items_by_uf
          - vehicles_by_type, vehicles_by_uf, vehicles_by_status,
            municipios_by_regiao, ooh_metrics
        """
        if source_name == "items_by_meio":
            return await self._items_by_meio(tenant_id, filters)
        elif source_name == "investment_by_meio":
            return await self._investment_by_meio(tenant_id, filters)
        elif source_name == "investment_by_client":
            return await self._investment_by_client(tenant_id, filters)
        elif source_name == "investment_by_month":
            return await self._investment_by_month(tenant_id, filters)
        elif source_name == "top_vehicles":
            return await self._top_vehicles(tenant_id, filters)
        elif source_name == "material_by_status":
            return await self._material_by_status(tenant_id, filters)
        elif source_name == "pi_by_status":
            return await self._pi_by_status(tenant_id, filters)
        elif source_name == "items_by_uf":
            return await self._items_by_uf(tenant_id, filters)
        elif source_name == "vehicles_by_type":
            return await self._vehicles_by_type(tenant_id)
        elif source_name == "vehicles_by_uf":
            return await self._vehicles_by_uf(tenant_id)
        elif source_name == "vehicles_by_status":
            return await self._vehicles_by_status(tenant_id)
        elif source_name == "municipios_by_regiao":
            return await self._municipios_by_regiao()
        elif source_name == "ooh_metrics":
            return await self._ooh_metrics(tenant_id)
        elif source_name == "social_followers_top10":
            return await self._social_followers_top10()
        elif source_name == "social_reach_by_platform":
            return await self._social_reach_by_platform()
        elif source_name == "ooh_reach_by_uf":
            return await self._ooh_reach_by_uf(tenant_id)
        elif source_name == "audience_engagement_top10":
            return await self._audience_engagement_top10()
        else:
            return []

    # -------------------------------------------------------------------------
    # Media Plan Data Sources
    # -------------------------------------------------------------------------

    def _build_filter_clauses(self, filters: dict) -> tuple[str, dict]:
        """Returns extra WHERE clauses and params dict for media plan filters."""
        clauses = []
        params: dict = {}
        if filters.get("date_from"):
            clauses.append("AND mpi.data_inicio >= :date_from")
            params["date_from"] = filters["date_from"]
        if filters.get("date_to"):
            clauses.append("AND mpi.data_inicio <= :date_to")
            params["date_to"] = filters["date_to"]
        if filters.get("meio"):
            clauses.append("AND mpi.meio = :meio")
            params["meio"] = filters["meio"]
        if filters.get("anunciante"):
            clauses.append("AND mp.anunciante = :anunciante")
            params["anunciante"] = filters["anunciante"]
        return " ".join(clauses), params

    async def _items_by_meio(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        # anunciante filter requires join with media_plans
        if filters.get("anunciante"):
            sql = text(
                "SELECT mpi.meio AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{filter_sql} "
                "GROUP BY mpi.meio "
                "ORDER BY value DESC"
            )
        else:
            extra = filter_sql.replace("AND mp.anunciante = :anunciante", "")
            sql = text(
                "SELECT mpi.meio AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{extra} "
                "GROUP BY mpi.meio "
                "ORDER BY value DESC"
            )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label, "value": row.value} for row in result]

    async def _investment_by_meio(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        if filters.get("anunciante"):
            sql = text(
                "SELECT mpi.meio AS label, "
                "SUM(COALESCE(mpi.custo_total, mpi.custo_negociado, 0)) AS value "
                "FROM media_plan_items mpi "
                "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{filter_sql} "
                "GROUP BY mpi.meio "
                "ORDER BY value DESC"
            )
        else:
            extra = filter_sql.replace("AND mp.anunciante = :anunciante", "")
            sql = text(
                "SELECT mpi.meio AS label, "
                "SUM(COALESCE(mpi.custo_total, mpi.custo_negociado, 0)) AS value "
                "FROM media_plan_items mpi "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{extra} "
                "GROUP BY mpi.meio "
                "ORDER BY value DESC"
            )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label, "value": float(row.value or 0)} for row in result]

    async def _investment_by_client(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        sql = text(
            "SELECT mp.anunciante AS label, "
            "SUM(COALESCE(mpi.custo_total, mpi.custo_negociado, 0)) AS value "
            "FROM media_plan_items mpi "
            "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
            "WHERE mpi.tenant_id = :tenant_id "
            f"{filter_sql} "
            "GROUP BY mp.anunciante "
            "ORDER BY value DESC "
            "LIMIT 10"
        )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label, "value": float(row.value or 0)} for row in result]

    async def _investment_by_month(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        if filters.get("anunciante"):
            sql = text(
                "SELECT TO_CHAR(DATE_TRUNC('month', mpi.data_inicio), 'Mon/YY') AS label, "
                "SUM(COALESCE(mpi.custo_total, mpi.custo_negociado, 0)) AS value "
                "FROM media_plan_items mpi "
                "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
                "WHERE mpi.tenant_id = :tenant_id "
                "AND mpi.data_inicio >= NOW() - INTERVAL '12 months' "
                f"{filter_sql} "
                "GROUP BY DATE_TRUNC('month', mpi.data_inicio) "
                "ORDER BY DATE_TRUNC('month', mpi.data_inicio) ASC"
            )
        else:
            extra = filter_sql.replace("AND mp.anunciante = :anunciante", "")
            sql = text(
                "SELECT TO_CHAR(DATE_TRUNC('month', mpi.data_inicio), 'Mon/YY') AS label, "
                "SUM(COALESCE(mpi.custo_total, mpi.custo_negociado, 0)) AS value "
                "FROM media_plan_items mpi "
                "WHERE mpi.tenant_id = :tenant_id "
                "AND mpi.data_inicio >= NOW() - INTERVAL '12 months' "
                f"{extra} "
                "GROUP BY DATE_TRUNC('month', mpi.data_inicio) "
                "ORDER BY DATE_TRUNC('month', mpi.data_inicio) ASC"
            )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label, "value": float(row.value or 0)} for row in result]

    async def _top_vehicles(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        if filters.get("anunciante"):
            sql = text(
                "SELECT mpi.veiculo AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
                "WHERE mpi.tenant_id = :tenant_id "
                "AND mpi.veiculo IS NOT NULL "
                f"{filter_sql} "
                "GROUP BY mpi.veiculo "
                "ORDER BY value DESC "
                "LIMIT 10"
            )
        else:
            extra = filter_sql.replace("AND mp.anunciante = :anunciante", "")
            sql = text(
                "SELECT mpi.veiculo AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "WHERE mpi.tenant_id = :tenant_id "
                "AND mpi.veiculo IS NOT NULL "
                f"{extra} "
                "GROUP BY mpi.veiculo "
                "ORDER BY value DESC "
                "LIMIT 10"
            )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label, "value": row.value} for row in result]

    async def _material_by_status(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        if filters.get("anunciante"):
            sql = text(
                "SELECT mpi.material_status AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{filter_sql} "
                "GROUP BY mpi.material_status "
                "ORDER BY value DESC"
            )
        else:
            extra = filter_sql.replace("AND mp.anunciante = :anunciante", "")
            sql = text(
                "SELECT mpi.material_status AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{extra} "
                "GROUP BY mpi.material_status "
                "ORDER BY value DESC"
            )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label or "Sem status", "value": row.value} for row in result]

    async def _pi_by_status(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        if filters.get("anunciante"):
            sql = text(
                "SELECT mpi.pi_status AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{filter_sql} "
                "GROUP BY mpi.pi_status "
                "ORDER BY value DESC"
            )
        else:
            extra = filter_sql.replace("AND mp.anunciante = :anunciante", "")
            sql = text(
                "SELECT mpi.pi_status AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "WHERE mpi.tenant_id = :tenant_id "
                f"{extra} "
                "GROUP BY mpi.pi_status "
                "ORDER BY value DESC"
            )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label or "Sem status", "value": row.value} for row in result]

    async def _items_by_uf(self, tenant_id: uuid.UUID, filters: dict) -> list[dict]:
        filter_sql, filter_params = self._build_filter_clauses(filters)
        if filters.get("anunciante"):
            sql = text(
                "SELECT mpi.uf AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "JOIN media_plans mp ON mp.id = mpi.media_plan_id "
                "WHERE mpi.tenant_id = :tenant_id "
                "AND mpi.uf IS NOT NULL "
                f"{filter_sql} "
                "GROUP BY mpi.uf "
                "ORDER BY value DESC "
                "LIMIT 15"
            )
        else:
            extra = filter_sql.replace("AND mp.anunciante = :anunciante", "")
            sql = text(
                "SELECT mpi.uf AS label, COUNT(*) AS value "
                "FROM media_plan_items mpi "
                "WHERE mpi.tenant_id = :tenant_id "
                "AND mpi.uf IS NOT NULL "
                f"{extra} "
                "GROUP BY mpi.uf "
                "ORDER BY value DESC "
                "LIMIT 15"
            )
        params = {"tenant_id": str(tenant_id), **filter_params}
        result = await self.db.execute(sql, params)
        return [{"label": row.label, "value": row.value} for row in result]

    async def _vehicles_by_type(self, tenant_id: uuid.UUID) -> list[dict]:
        sql = text(
            "SELECT vehicle_type AS label, COUNT(*) AS value "
            "FROM vehicles "
            "WHERE tenant_id = :tenant_id "
            "GROUP BY vehicle_type "
            "ORDER BY value DESC"
        )
        result = await self.db.execute(sql, {"tenant_id": str(tenant_id)})
        return [{"label": row.label, "value": row.value} for row in result]

    async def _vehicles_by_uf(self, tenant_id: uuid.UUID) -> list[dict]:
        sql = text(
            "SELECT uf AS label, COUNT(*) AS value "
            "FROM vehicles, unnest(coverage_states) AS uf "
            "WHERE tenant_id = :tenant_id "
            "GROUP BY uf "
            "ORDER BY value DESC "
            "LIMIT 10"
        )
        result = await self.db.execute(sql, {"tenant_id": str(tenant_id)})
        return [{"label": row.label, "value": row.value} for row in result]

    async def _vehicles_by_status(self, tenant_id: uuid.UUID) -> list[dict]:
        sql = text(
            "SELECT status AS label, COUNT(*) AS value "
            "FROM vehicles "
            "WHERE tenant_id = :tenant_id "
            "GROUP BY status "
            "ORDER BY value DESC"
        )
        result = await self.db.execute(sql, {"tenant_id": str(tenant_id)})
        return [{"label": row.label, "value": row.value} for row in result]

    async def _municipios_by_regiao(self) -> list[dict]:
        sql = text(
            "SELECT regiao AS label, COUNT(*) AS value "
            "FROM municipios "
            "GROUP BY regiao "
            "ORDER BY value DESC"
        )
        result = await self.db.execute(sql)
        return [{"label": row.label, "value": row.value} for row in result]

    async def _ooh_metrics(self, tenant_id: uuid.UUID) -> list[dict]:
        sql = text(
            "SELECT formato AS label, COUNT(*) AS value "
            "FROM ooh_panels "
            "WHERE tenant_id = :tenant_id "
            "GROUP BY formato "
            "ORDER BY value DESC"
        )
        result = await self.db.execute(sql, {"tenant_id": str(tenant_id)})
        return [{"label": row.label, "value": row.value} for row in result]

    async def _social_followers_top10(self) -> list[dict]:
        sql = text(
            "SELECT v.name AS label, MAX(ar.value) AS value "
            "FROM audience_records ar "
            "JOIN vehicles v ON v.id = ar.vehicle_id "
            "WHERE ar.metric = 'SEGUIDORES' "
            "GROUP BY v.id, v.name "
            "ORDER BY value DESC LIMIT 10"
        )
        result = await self.db.execute(sql)
        return [{"label": row.label, "value": row.value} for row in result]

    async def _social_reach_by_platform(self) -> list[dict]:
        sql = text(
            "SELECT ar.platform AS label, SUM(ar.value) AS value "
            "FROM audience_records ar "
            "WHERE ar.metric = 'SEGUIDORES' "
            "GROUP BY ar.platform "
            "ORDER BY value DESC"
        )
        result = await self.db.execute(sql)
        return [{"label": row.label, "value": row.value} for row in result]

    async def _ooh_reach_by_uf(self, tenant_id: uuid.UUID) -> list[dict]:
        sql = text(
            "SELECT p.uf AS label, SUM(p.estimativa_alcance) AS value "
            "FROM ooh_panels p "
            "WHERE p.tenant_id = :tenant_id "
            "GROUP BY p.uf "
            "ORDER BY value DESC LIMIT 15"
        )
        result = await self.db.execute(sql, {"tenant_id": str(tenant_id)})
        return [{"label": row.label, "value": row.value} for row in result]

    async def _audience_engagement_top10(self) -> list[dict]:
        sql = text(
            "SELECT v.name AS label, MAX(ar.value) AS value "
            "FROM audience_records ar "
            "JOIN vehicles v ON v.id = ar.vehicle_id "
            "WHERE ar.metric = 'ENGAJAMENTO' "
            "GROUP BY v.id, v.name "
            "ORDER BY value DESC LIMIT 10"
        )
        result = await self.db.execute(sql)
        return [{"label": row.label, "value": row.value} for row in result]
