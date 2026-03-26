"""Pydantic schemas do módulo links."""

import uuid
from datetime import datetime
from pydantic import BaseModel, HttpUrl, field_validator


# ── Campaigns ──────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    description: str | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    links_count: int = 0

    model_config = {"from_attributes": True}


# ── Short Links ────────────────────────────────────────────────────────────

class ShortLinkCreate(BaseModel):
    original_url: str
    name: str

    @field_validator("original_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL deve começar com http:// ou https://")
        return v


class ShortLinkResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    slug: str
    original_url: str
    name: str
    clicks_cached: int
    is_active: bool
    created_at: datetime
    short_url: str = ""

    model_config = {"from_attributes": True}


# ── Analytics ──────────────────────────────────────────────────────────────

class ClicksByDay(BaseModel):
    date: str
    clicks: int


class ClicksByCountry(BaseModel):
    country: str
    clicks: int


class ClicksByDevice(BaseModel):
    device_type: str
    clicks: int


class ClicksByHour(BaseModel):
    hour: int
    clicks: int


class LinkAnalytics(BaseModel):
    link_id: str
    total_clicks: int
    unique_countries: int
    by_day: list[ClicksByDay]
    by_country: list[ClicksByCountry]
    by_device: list[ClicksByDevice]
    by_hour: list[ClicksByHour]


class CampaignAnalytics(BaseModel):
    campaign_id: str
    total_clicks: int
    links: list[dict]
    by_day: list[ClicksByDay]
    by_country: list[ClicksByCountry]
    by_device: list[ClicksByDevice]
