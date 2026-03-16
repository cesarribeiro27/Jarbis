"""Service — Datasets de Relatórios."""

from __future__ import annotations

import csv
import io
import ipaddress
import json
import socket
import uuid
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx
import openpyxl
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .dataset_models import ReportDataset


_BLOCKED_HOSTS = {
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",  # AWS/GCP metadata
    "instance-data",
}


def _validate_ssrf(url: str) -> None:
    """Bloqueia URLs internas/privadas para prevenir SSRF."""
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="URL inválida.")

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Apenas URLs http/https são permitidas.")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="URL sem hostname.")

    if hostname.lower() in _BLOCKED_HOSTS:
        raise HTTPException(status_code=400, detail="URL interna não permitida.")

    # Tenta parsear como IP direto; caso seja hostname, resolve
    try:
        addr = ipaddress.ip_address(hostname)
    except ValueError:
        try:
            addr = ipaddress.ip_address(socket.gethostbyname(hostname))
        except Exception:
            raise HTTPException(status_code=400, detail=f"Não foi possível resolver o hostname: {hostname}")

    if (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
    ):
        raise HTTPException(status_code=400, detail="URLs de redes privadas não são permitidas.")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _detect_columns(rows: list[dict]) -> list[str]:
    if not rows:
        return []
    return list(rows[0].keys())


def _coerce_row(row: dict) -> dict:
    """Tenta converter strings numéricas para float."""
    out = {}
    for k, v in row.items():
        if isinstance(v, str):
            cleaned = v.strip().replace(",", ".").replace(" ", "")
            try:
                out[k] = float(cleaned)
            except ValueError:
                out[k] = v.strip() if v.strip() else None
        else:
            out[k] = v
    return out


def _parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return [_coerce_row(dict(row)) for row in reader]


def _parse_excel(content: bytes) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(rows[0])]
    result = []
    for row in rows[1:]:
        if all(v is None for v in row):
            continue
        result.append(_coerce_row({headers[i]: row[i] for i in range(len(headers))}))
    return result


def _extract_json_path(data: Any, path: str | None) -> list:
    """Navega pelo JSON usando notação de ponto. Ex: 'data.items'"""
    if not path:
        if isinstance(data, list):
            return data
        return [data] if isinstance(data, dict) else []
    parts = path.split(".")
    current = data
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            break
    if isinstance(current, list):
        return current
    return [current] if isinstance(current, dict) else []


def _parse_date_value(v: Any) -> date | None:
    """Tenta parsear um valor como date. Suporta ISO, BR (DD/MM/YYYY) e variantes."""
    if v is None:
        return None
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    if isinstance(v, datetime):
        return v.date()
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except ValueError:
            continue
    return None


def _aggregate(rows: list[dict], label_col: str, value_col: str, agg: str) -> list[dict]:
    """Agrupa rows por label_col e agrega value_col."""
    groups: dict[str, list[float]] = {}
    for row in rows:
        label = str(row.get(label_col, "")) if row.get(label_col) is not None else "(vazio)"
        try:
            value = float(row.get(value_col, 0) or 0)
        except (TypeError, ValueError):
            value = 0.0
        groups.setdefault(label, []).append(value)

    result = []
    for label, values in groups.items():
        if agg == "sum":
            v = sum(values)
        elif agg == "avg":
            v = sum(values) / len(values) if values else 0
        elif agg == "count":
            v = len(values)
        elif agg == "max":
            v = max(values) if values else 0
        elif agg == "min":
            v = min(values) if values else 0
        else:  # none — just use first value
            v = values[0] if values else 0
        result.append({"label": label, "value": round(v, 4)})

    return result


class DatasetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self, tenant_id: uuid.UUID) -> list[ReportDataset]:
        result = await self.db.execute(
            select(ReportDataset)
            .where(ReportDataset.tenant_id == tenant_id)
            .order_by(ReportDataset.created_at.desc())
        )
        return result.scalars().all()

    async def get(self, dataset_id: uuid.UUID, tenant_id: uuid.UUID) -> ReportDataset | None:
        result = await self.db.execute(
            select(ReportDataset).where(
                ReportDataset.id == dataset_id,
                ReportDataset.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_from_file(
        self,
        tenant_id: uuid.UUID,
        name: str,
        filename: str,
        content: bytes,
    ) -> ReportDataset:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in ("xlsx", "xls"):
            rows = _parse_excel(content)
            ds_type = "excel"
        else:
            rows = _parse_csv(content)
            ds_type = "csv"

        columns = _detect_columns(rows)
        ds = ReportDataset(
            tenant_id=tenant_id,
            name=name,
            type=ds_type,
            rows=rows,
            columns=columns,
            row_count=len(rows),
        )
        self.db.add(ds)
        await self.db.commit()
        await self.db.refresh(ds)
        return ds

    async def create_from_api(
        self,
        tenant_id: uuid.UUID,
        name: str,
        api_url: str,
        api_headers: dict | None,
        api_data_path: str | None,
    ) -> ReportDataset:
        rows, columns = await self._fetch_api(api_url, api_headers or {}, api_data_path)
        ds = ReportDataset(
            tenant_id=tenant_id,
            name=name,
            type="api",
            rows=rows,
            columns=columns,
            row_count=len(rows),
            api_url=api_url,
            api_headers=api_headers,
            api_data_path=api_data_path,
            last_synced_at=_utcnow(),
        )
        self.db.add(ds)
        await self.db.commit()
        await self.db.refresh(ds)
        return ds

    async def sync_api(self, dataset_id: uuid.UUID, tenant_id: uuid.UUID) -> ReportDataset | None:
        ds = await self.get(dataset_id, tenant_id)
        if not ds or ds.type != "api" or not ds.api_url:
            return None
        rows, columns = await self._fetch_api(ds.api_url, ds.api_headers or {}, ds.api_data_path)
        ds.rows = rows
        ds.columns = columns
        ds.row_count = len(rows)
        ds.last_synced_at = _utcnow()
        await self.db.commit()
        await self.db.refresh(ds)
        return ds

    async def delete(self, dataset_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        ds = await self.get(dataset_id, tenant_id)
        if not ds:
            return False
        await self.db.delete(ds)
        await self.db.commit()
        return True

    _VALID_AGGS = {"sum", "avg", "count", "max", "min", "none"}

    def query(
        self,
        ds: ReportDataset,
        label_col: str,
        value_col: str,
        agg: str = "sum",
        filter_col: str | None = None,
        filter_val: str | None = None,
        date_col: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[dict]:
        """Agrega as rows do dataset e retorna [{label, value}]."""
        available = ds.columns or []
        if agg not in self._VALID_AGGS:
            raise HTTPException(
                status_code=422,
                detail=f"Agregação inválida: '{agg}'. Use: {', '.join(sorted(self._VALID_AGGS))}",
            )
        if label_col not in available:
            raise HTTPException(
                status_code=422,
                detail=f"Coluna label '{label_col}' não encontrada. Disponíveis: {available}",
            )
        if value_col != "__count__" and value_col not in available:
            raise HTTPException(
                status_code=422,
                detail=f"Coluna value '{value_col}' não encontrada. Disponíveis: {available}",
            )
        if not ds.rows:
            return []
        rows = ds.rows
        if filter_col and filter_val is not None:
            rows = [r for r in rows if str(r.get(filter_col, "")) == filter_val]
        if date_col and (date_from or date_to):
            d_from = _parse_date_value(date_from) if date_from else None
            d_to = _parse_date_value(date_to) if date_to else None
            filtered = []
            for r in rows:
                rd = _parse_date_value(r.get(date_col))
                if rd is None:
                    continue
                if d_from and rd < d_from:
                    continue
                if d_to and rd > d_to:
                    continue
                filtered.append(r)
            rows = filtered
        # Se value_col for "__count__", conta linhas por label
        if value_col == "__count__":
            groups: dict[str, int] = {}
            for row in rows:
                label = str(row.get(label_col, "")) or "(vazio)"
                groups[label] = groups.get(label, 0) + 1
            return [{"label": k, "value": v} for k, v in groups.items()]
        return _aggregate(rows, label_col, value_col, agg)

    async def _fetch_api(
        self, url: str, headers: dict, data_path: str | None
    ) -> tuple[list[dict], list[str]]:
        _validate_ssrf(url)
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        raw_rows = _extract_json_path(data, data_path)
        rows = [_coerce_row(r) for r in raw_rows if isinstance(r, dict)]
        columns = _detect_columns(rows)
        return rows, columns
