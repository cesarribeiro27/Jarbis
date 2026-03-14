import uuid
from datetime import date

import httpx


class ThreadsProvider:
    """Busca métricas de perfil via Threads Graph API (Meta)."""

    async def fetch(self, vehicle_id: uuid.UUID, user_id: str, access_token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                insights_resp = await client.get(
                    f"https://graph.threads.net/v1.0/{user_id}/threads_insights",
                    params={"metric": "followers_count,likes,replies,reposts,quotes", "access_token": access_token},
                )
                insights_resp.raise_for_status()

                # Extrai valores do array de insights
                data = {item["name"]: item.get("total_value", {}).get("value", 0)
                        for item in insights_resp.json().get("data", [])}

                followers  = data.get("followers_count", 0)
                engagement = data.get("likes", 0) + data.get("replies", 0) + data.get("reposts", 0) + data.get("quotes", 0)
                meta       = {**data}

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "SEGUIDORES",
                        "value":          float(followers),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "ENGAJAMENTO",
                        "value":          float(engagement),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                ]
            except httpx.HTTPError:
                return []
