import uuid
from datetime import date

import httpx


class InstagramProvider:
    """Busca métricas de perfil e engajamento via Meta Graph API."""

    async def fetch(self, vehicle_id: uuid.UUID, handle: str, access_token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                profile_resp = await client.get(
                    f"https://graph.instagram.com/v19.0/{handle}",
                    params={"fields": "followers_count,media_count,biography", "access_token": access_token},
                )
                media_resp = await client.get(
                    f"https://graph.instagram.com/v19.0/{handle}/media",
                    params={"fields": "like_count,comments_count,timestamp", "limit": 12, "access_token": access_token},
                )
                profile_resp.raise_for_status()
                media_resp.raise_for_status()

                profile = profile_resp.json()
                media_items = media_resp.json().get("data", [])

                total_likes    = sum(m.get("like_count", 0) for m in media_items)
                total_comments = sum(m.get("comments_count", 0) for m in media_items)
                engagement     = total_likes + total_comments

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "SEGUIDORES",
                        "value":          float(profile.get("followers_count", 0)),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        {"followers": profile.get("followers_count", 0), "media_count": profile.get("media_count", 0)},
                    },
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "ENGAJAMENTO",
                        "value":          float(engagement),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        {"likes": total_likes, "comments": total_comments, "posts_analisados": len(media_items)},
                    },
                ]
            except httpx.HTTPError:
                return []
