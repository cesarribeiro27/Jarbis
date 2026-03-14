import uuid
from datetime import date

import httpx


class TwitterProvider:
    """Busca métricas de perfil via Twitter/X API v2."""

    async def fetch(self, vehicle_id: uuid.UUID, username: str, bearer_token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"https://api.twitter.com/2/users/by/username/{username}",
                    params={"user.fields": "public_metrics"},
                    headers={"Authorization": f"Bearer {bearer_token}"},
                )
                resp.raise_for_status()
                pm = resp.json().get("data", {}).get("public_metrics", {})

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "SEGUIDORES",
                        "value":          float(pm.get("followers_count", 0)),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        pm,
                    },
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "IMPRESSOES",
                        "value":          float(pm.get("impression_count", pm.get("tweet_count", 0))),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        pm,
                    },
                ]
            except httpx.HTTPError:
                return []
