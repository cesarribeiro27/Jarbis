import uuid
from datetime import date

import httpx


class FacebookProvider:
    """Busca métricas de página via Meta Graph API v19."""

    async def fetch(self, vehicle_id: uuid.UUID, page_id: str, access_token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                page_resp = await client.get(
                    f"https://graph.facebook.com/v19.0/{page_id}",
                    params={"fields": "fan_count,followers_count,talking_about_count,name", "access_token": access_token},
                )
                page_resp.raise_for_status()
                page = page_resp.json()

                # Insights: page_reach diário
                insights_resp = await client.get(
                    f"https://graph.facebook.com/v19.0/{page_id}/insights",
                    params={"metric": "page_impressions,page_reach", "period": "day", "access_token": access_token},
                )
                reach = 0
                impressions = 0
                if insights_resp.status_code == 200:
                    for item in insights_resp.json().get("data", []):
                        values = item.get("values", [{}])
                        last = values[-1].get("value", 0) if values else 0
                        if item.get("name") == "page_reach":
                            reach = last
                        elif item.get("name") == "page_impressions":
                            impressions = last

                meta = {
                    "fans": page.get("fan_count", 0),
                    "followers": page.get("followers_count", 0),
                    "talking_about": page.get("talking_about_count", 0),
                    "reach": reach,
                    "impressions": impressions,
                }

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "SEGUIDORES",
                        "value":          float(page.get("fan_count", 0)),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "REACH",
                        "value":          float(reach),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "ENGAJAMENTO",
                        "value":          float(page.get("talking_about_count", 0)),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                ]
            except httpx.HTTPError:
                return []
