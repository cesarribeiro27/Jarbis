import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class BlockConfig(BaseModel):
    id: str
    type: str  # kpi, bar, line, pie, table, text
    title: str = ""
    data_source: str = ""  # vehicles_by_type, vehicles_by_uf, ooh_metrics, custom
    config: dict[str, Any] = {}
    position: int = 0


class ReportCreate(BaseModel):
    title: str = Field(min_length=2, max_length=300)
    description: str | None = None
    blocks: list[dict[str, Any]] = []
    pages: list[dict[str, Any]] = []
    dataset_ids: list[str] | None = None  # None = não configurado (comportamento legado)


class ReportUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    blocks: list[dict[str, Any]] | None = None
    pages: list[dict[str, Any]] | None = None
    cover_image: str | None = None
    language: str | None = None
    dataset_ids: list[str] | None = None


class ReportResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    blocks: list[dict[str, Any]]
    pages: list[dict[str, Any]]
    cover_image: str | None
    is_shared: bool
    share_token: str | None
    share_view_count: int
    language: str = "pt-BR"
    dataset_ids: list[str] | None = None  # None = legado (mostra todos)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportSummary(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    cover_image: str | None
    is_shared: bool
    block_count: int
    view_count: int = 0
    language: str = "pt-BR"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShareResponse(BaseModel):
    token: str
    share_url: str
    view_count: int
