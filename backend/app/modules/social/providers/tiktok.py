import uuid
from datetime import date

import httpx


class TikTokProvider:
    """Busca métricas de perfil via TikTok Research API."""

    async def fetch(self, vehicle_id: uuid.UUID, username: str, access_token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.post(
                    "https://open.tiktokapis.com/v2/research/user/info/",
                    headers={"Authorization": f"Bearer {access_token}"},
                    json={"username": username, "fields": ["display_name", "follower_count", "likes_count", "video_count"]},
                )
                resp.raise_for_status()
                data = resp.json().get("data", {}).get("user_info", resp.json().get("data", {}))

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "SEGUIDORES",
                        "value":          float(data.get("follower_count", 0)),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        {"likes": data.get("likes_count", 0), "videos": data.get("video_count", 0)},
                    },
                ]
            except httpx.HTTPError:
                return []
