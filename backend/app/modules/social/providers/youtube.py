import uuid
from datetime import date

import httpx


class YouTubeProvider:
    """Busca estatísticas do canal via Google YouTube Data API v3."""

    async def fetch(self, vehicle_id: uuid.UUID, channel_id: str, api_key: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/channels",
                    params={"part": "statistics", "id": channel_id, "key": api_key},
                )
                resp.raise_for_status()
                items = resp.json().get("items", [])
                if not items:
                    return []

                stats = items[0].get("statistics", {})
                subscribers = int(stats.get("subscriberCount", 0))
                views       = int(stats.get("viewCount", 0))
                videos      = int(stats.get("videoCount", 0))
                meta        = {"subscribers": subscribers, "total_views": views, "videos": videos}

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "SEGUIDORES",
                        "value":          float(subscribers),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "REACH",
                        "value":          float(views),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                ]
            except (httpx.HTTPError, KeyError, IndexError):
                return []
