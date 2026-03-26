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

class ShortLinkUpdate(BaseModel):
    name: str


class ShortLinkCreate(BaseModel):
    original_url: str
    name: str
    custom_slug: str | None = None

    @field_validator("original_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL deve começar com http:// ou https://")
        return v

    @field_validator("custom_slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        v = v.strip().lower()
        if not re.match(r'^[a-z0-9][a-z0-9\-_]{1,30}[a-z0-9]$', v):
            raise ValueError("Slug deve ter 3-32 caracteres: letras, números, hífen ou underscore")
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
