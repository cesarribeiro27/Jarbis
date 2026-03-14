import os
import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.vehicles.models import AudienceRecord, Vehicle

from .providers.facebook import FacebookProvider
from .providers.instagram import InstagramProvider
from .providers.kwai import KwaiProvider
from .providers.linkedin import LinkedInProvider
from .providers.spotify import SpotifyProvider
from .providers.threads import ThreadsProvider
from .providers.tiktok import TikTokProvider
from .providers.twitter import TwitterProvider
from .providers.youtube import YouTubeProvider


class SocialService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def sync_vehicle(self, vehicle_id: uuid.UUID) -> dict:
        """
        Sincroniza métricas de todas as redes sociais configuradas para o veículo.

        Lê os handles/IDs do campo type_metadata (JSONB) e tokens do ambiente.
        Salva cada resultado como AudienceRecord (upsert por constraint uq_audience_record).
        """
        result = await self.db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        vehicle = result.scalar_one_or_none()
        if not vehicle:
            raise ValueError(f"Veículo {vehicle_id} não encontrado.")

        m = vehicle.type_metadata or {}
        records: list[dict] = []
        platforms_synced: list[str] = []

        # --- Instagram ---
        if (handle := m.get("instagram_handle") or m.get("instagram")) and (tok := os.getenv("INSTAGRAM_TOKEN")):
            r = await InstagramProvider().fetch(vehicle_id, handle, tok)
            if r: records += r; platforms_synced.append("instagram")

        # --- Facebook ---
        if (page_id := m.get("facebook_page_id") or m.get("facebook")) and (tok := os.getenv("FACEBOOK_TOKEN")):
            r = await FacebookProvider().fetch(vehicle_id, page_id, tok)
            if r: records += r; platforms_synced.append("facebook")

        # --- YouTube ---
        if (channel_id := m.get("youtube_channel_id") or m.get("youtube")) and (key := os.getenv("YOUTUBE_API_KEY")):
            r = await YouTubeProvider().fetch(vehicle_id, channel_id, key)
            if r: records += r; platforms_synced.append("youtube")

        # --- TikTok ---
        if (user := (m.get("tiktok_username") or m.get("tiktok", "")).lstrip("@")) and (tok := os.getenv("TIKTOK_TOKEN")):
            r = await TikTokProvider().fetch(vehicle_id, user, tok)
            if r: records += r; platforms_synced.append("tiktok")

        # --- Twitter/X ---
        if (tw_user := m.get("twitter_username") or m.get("twitter")) and (tok := os.getenv("TWITTER_BEARER_TOKEN")):
            r = await TwitterProvider().fetch(vehicle_id, tw_user, tok)
            if r: records += r; platforms_synced.append("twitter")

        # --- LinkedIn ---
        if (org_id := m.get("linkedin_organization_id") or m.get("linkedin")) and (tok := os.getenv("LINKEDIN_TOKEN")):
            r = await LinkedInProvider().fetch(vehicle_id, org_id, tok)
            if r: records += r; platforms_synced.append("linkedin")

        # --- Spotify ---
        if (show_id := m.get("spotify_show_id") or m.get("spotify")):
            cid = os.getenv("SPOTIFY_CLIENT_ID")
            csec = os.getenv("SPOTIFY_CLIENT_SECRET")
            if cid and csec:
                r = await SpotifyProvider().fetch(vehicle_id, show_id, cid, csec)
                if r: records += r; platforms_synced.append("spotify")

        # --- Kwai ---
        if (kwai_id := m.get("kwai_user_id") or m.get("kwai")) and (tok := os.getenv("KWAI_TOKEN")):
            r = await KwaiProvider().fetch(vehicle_id, kwai_id, tok)
            if r: records += r; platforms_synced.append("kwai")

        # --- Threads ---
        if (th_id := m.get("threads_user_id") or m.get("threads")) and (tok := os.getenv("THREADS_TOKEN")):
            r = await ThreadsProvider().fetch(vehicle_id, th_id, tok)
            if r: records += r; platforms_synced.append("threads")

        # Upsert em AudienceRecord
        synced = 0
        for rec in records:
            stmt = (
                pg_insert(AudienceRecord)
                .values(
                    id=uuid.uuid4(),
                    vehicle_id=rec["vehicle_id"],
                    metric_type=rec["metric_type"],
                    source=rec["source"],
                    reference_date=rec["reference_date"],
                    period_type="daily",
                    value=rec["value"],
                    metrics=rec.get("metrics"),
                )
                .on_conflict_do_update(
                    constraint="uq_audience_record",
                    set_={"value": rec["value"], "metrics": rec.get("metrics")},
                )
            )
            await self.db.execute(stmt)
            synced += 1

        await self.db.commit()

        return {
            "vehicle_id": str(vehicle_id),
            "synced":     synced,
            "platforms":  platforms_synced,
        }
