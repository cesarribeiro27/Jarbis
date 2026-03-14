import uuid
from datetime import date

import httpx


class SpotifyProvider:
    """Busca dados de podcast/show via Spotify Web API."""

    async def fetch(self, vehicle_id: uuid.UUID, show_id: str, client_id: str, client_secret: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                # Autenticação Client Credentials
                token_resp = await client.post(
                    "https://accounts.spotify.com/api/token",
                    data={"grant_type": "client_credentials"},
                    auth=(client_id, client_secret),
                )
                token_resp.raise_for_status()
                token = token_resp.json()["access_token"]

                # Dados do show/podcast
                show_resp = await client.get(
                    f"https://api.spotify.com/v1/shows/{show_id}",
                    params={"market": "BR"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                show_resp.raise_for_status()
                show = show_resp.json()

                total_episodes = show.get("total_episodes", 0)
                meta = {
                    "name":           show.get("name"),
                    "publisher":      show.get("publisher"),
                    "total_episodes": total_episodes,
                    "spotify_url":    show.get("external_urls", {}).get("spotify"),
                    "languages":      show.get("languages", []),
                }

                return [
                    {
                        "vehicle_id":     vehicle_id,
                        "metric_type":    "PAGE_VIEWS",
                        "value":          float(total_episodes),
                        "source":         "DECLARADO",
                        "reference_date": date.today(),
                        "metrics":        meta,
                    },
                ]
            except httpx.HTTPError:
                return []
