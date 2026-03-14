import uuid
from datetime import date

import httpx


class LinkedInProvider:
    """Busca métricas de página de empresa via LinkedIn Marketing API v2."""

    async def fetch(self, vehicle_id: uuid.UUID, organization_id: str, access_token: str) -> list[dict]:
        headers = {"Authorization": f"Bearer {access_token}", "X-Restli-Protocol-Version": "2.0.0"}

        async with httpx.AsyncClient(timeout=10) as client:
            try:
                # Seguidores
                followers_resp = await client.get(
                    f"https://api.linkedin.com/v2/networkSizes/{organization_id}",
                    params={"edgeType": "CompanyFollowedByMember"},
                    headers=headers,
                )
                followers_resp.raise_for_status()
                followers = followers_resp.json().get("firstDegreeSize", 0)

                # Impressões e cliques
                stats_resp = await client.get(
                    "https://api.linkedin.com/v2/organizationalEntityShareStatistics",
                    params={
                        "q": "organizationalEntity",
                        "organizationalEntity": f"urn:li:organization:{organization_id}",
                    },
                    headers=headers,
                )
                impressions = 0
                clicks = 0
                if stats_resp.status_code == 200:
                    ts = stats_resp.json().get("totalShareStatistics", {})
                    impressions = ts.get("impressionCount", 0)
                    clicks      = ts.get("clickCount", 0)

                meta = {"followers": followers, "impressions": impressions, "clicks": clicks}

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
                        "metric_type":    "IMPRESSOES",
                        "value":          float(impressions),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                ]
            except httpx.HTTPError:
                return []
