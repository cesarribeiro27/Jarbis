"""Google Analytics Data API v1 connector.

Suporta dois modos de autenticação:
- OAuth2 (fluxo padrão para usuários do SaaS): refresh_token via consentimento do Google
- Service Account JSON (uso interno / administradores): JWT RS256
"""
import httpx
from datetime import datetime, timedelta


async def _run_ga_report(access_token: str, property_id: str, dimensions: list[str], metrics: list[str], date_range_days: int) -> list[dict]:
    """Executa o runReport na GA Data API com um access_token já obtido."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=date_range_days)).strftime("%Y-%m-%d")
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    payload = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "dimensions": [{"name": d} for d in dimensions],
        "metrics": [{"name": m} for m in metrics],
        "limit": 10000,
    }
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    rows = []
    dim_headers = [h["name"] for h in data.get("dimensionHeaders", [])]
    met_headers = [h["name"] for h in data.get("metricHeaders", [])]
    for row in data.get("rows", []):
        record = {}
        for i, dv in enumerate(row.get("dimensionValues", [])):
            record[dim_headers[i]] = dv["value"]
        for i, mv in enumerate(row.get("metricValues", [])):
            record[met_headers[i]] = mv["value"]
        rows.append(record)
    return rows


async def fetch_ga_report_oauth(
    property_id: str,
    refresh_token: str,
    client_id: str,
    client_secret: str,
    dimensions: list[str],
    metrics: list[str],
    date_range_days: int = 30,
) -> list[dict]:
    """Busca dados do GA usando OAuth2 refresh token (fluxo padrão para usuários SaaS)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post("https://oauth2.googleapis.com/token", data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        })
        resp.raise_for_status()
        access_token = resp.json()["access_token"]
    return await _run_ga_report(access_token, property_id, dimensions, metrics, date_range_days)


async def fetch_ga_report(
    property_id: str,
    service_account_json: str,
    dimensions: list[str],
    metrics: list[str],
    date_range_days: int = 30,
) -> list[dict]:
    """Busca dados do GA usando Service Account JSON (uso interno / administradores)."""
    import json, time
    from jose import jwt as jose_jwt
    sa = json.loads(service_account_json)
    now = int(time.time())
    payload = {
        "iss": sa["client_email"],
        "scope": "https://www.googleapis.com/auth/analytics.readonly",
        "aud": sa.get("token_uri", "https://oauth2.googleapis.com/token"),
        "iat": now,
        "exp": now + 3600,
    }
    assertion = jose_jwt.encode(payload, sa["private_key"], algorithm="RS256")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(sa.get("token_uri", "https://oauth2.googleapis.com/token"), data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        })
        resp.raise_for_status()
        access_token = resp.json()["access_token"]
    return await _run_ga_report(access_token, property_id, dimensions, metrics, date_range_days)
