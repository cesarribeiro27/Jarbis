import uuid
from datetime import date

import httpx


class YouTubeFullProvider:
    """
    Busca dados completos do canal + top 10 vídeos via YouTube Data API v3.

    Métricas retornadas:
      - SEGUIDORES   : subscriberCount
      - REACH        : viewCount total do canal
      - PAGE_VIEWS   : soma de views dos top 10 vídeos
      - ENGAJAMENTO  : soma de likes + comentários dos top 10 vídeos
    """

    async def fetch(self, vehicle_id: uuid.UUID, channel_id: str, api_key: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                # 1. Dados do canal
                ch_resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/channels",
                    params={"part": "statistics,snippet", "id": channel_id, "key": api_key},
                )
                ch_resp.raise_for_status()
                items = ch_resp.json().get("items", [])
                if not items:
                    return []
                stats   = items[0].get("statistics", {})
                snippet = items[0].get("snippet", {})

                subscribers = int(stats.get("subscriberCount", 0))
                total_views = int(stats.get("viewCount", 0))
                total_videos = int(stats.get("videoCount", 0))

                # 2. IDs dos top 10 vídeos por views
                search_resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={
                        "part": "id", "channelId": channel_id, "type": "video",
                        "order": "viewCount", "maxResults": 10, "key": api_key,
                    },
                )
                video_ids = []
                if search_resp.status_code == 200:
                    video_ids = [
                        i["id"]["videoId"]
                        for i in search_resp.json().get("items", [])
                        if i.get("id", {}).get("videoId")
                    ]

                # 3. Estatísticas dos vídeos
                top_views = top_likes = top_comments = 0
                top_videos_meta = []
                if video_ids:
                    vids_resp = await client.get(
                        "https://www.googleapis.com/youtube/v3/videos",
                        params={"part": "statistics,snippet", "id": ",".join(video_ids), "key": api_key},
                    )
                    if vids_resp.status_code == 200:
                        for v in vids_resp.json().get("items", []):
                            vs = v.get("statistics", {})
                            vv = int(vs.get("viewCount", 0))
                            vl = int(vs.get("likeCount", 0))
                            vc = int(vs.get("commentCount", 0))
                            top_views    += vv
                            top_likes    += vl
                            top_comments += vc
                            top_videos_meta.append({
                                "title":    v.get("snippet", {}).get("title"),
                                "views":    vv,
                                "likes":    vl,
                                "comments": vc,
                            })

                meta = {
                    "channel_title": snippet.get("title"),
                    "subscribers":   subscribers,
                    "total_views":   total_views,
                    "total_videos":  total_videos,
                    "top10_views":   top_views,
                    "top10_likes":   top_likes,
                    "top10_comments": top_comments,
                    "top_videos":    top_videos_meta,
                }

                return [
                    {"vehicle_id": vehicle_id, "metric_type": "SEGUIDORES",  "value": float(subscribers),             "source": "DECLARADO", "reference_date": date.today(), "metrics": meta},
                    {"vehicle_id": vehicle_id, "metric_type": "REACH",       "value": float(total_views),             "source": "DECLARADO", "reference_date": date.today(), "metrics": meta},
                    {"vehicle_id": vehicle_id, "metric_type": "PAGE_VIEWS",  "value": float(top_views),               "source": "DECLARADO", "reference_date": date.today(), "metrics": meta},
                    {"vehicle_id": vehicle_id, "metric_type": "ENGAJAMENTO", "value": float(top_likes + top_comments), "source": "DECLARADO", "reference_date": date.today(), "metrics": meta},
                ]

            except (httpx.HTTPError, KeyError, IndexError):
                return []
