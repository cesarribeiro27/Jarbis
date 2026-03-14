import uuid
from datetime import date

import httpx


class KwaiProvider:
    """Busca métricas de perfil via Kwai Open API."""

    async def fetch(self, vehicle_id: uuid.UUID, user_id: str, access_token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"https://open.kwai.com/oauth2/open_api/user/info",
                    params={"user_id": user_id},
                    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                )
                resp.raise_for_status()
                user = resp.json().get("result", {}).get("user_info", {})

                fans   = user.get("fan_count", 0)
                likes  = user.get("like_count", 0)
                videos = user.get("photo_count", 0)
                meta   = {"fans": fans, "likes": likes, "videos": videos}

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "SEGUIDORES",
                        "value":          float(fans),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "ENGAJAMENTO",
                        "value":          float(likes),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                ]
            except httpx.HTTPError:
                return []
