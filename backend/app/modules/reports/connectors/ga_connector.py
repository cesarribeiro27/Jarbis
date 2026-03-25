"""Google Analytics Data API v1 connector — Service Account auth."""
import json
import time
import httpx
from datetime import datetime, timedelta
from jose import jwt as jose_jwt


async def _get_access_token(service_account_json: str) -> str:
    """Exchange a Service Account JSON for a short-lived OAuth2 access token."""
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
    token_url = sa.get("token_uri", "https://oauth2.googleapis.com/token")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(token_url, data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        })
        resp.raise_for_status()
        return resp.json()["access_token"]


async def fetch_ga_report(
    property_id: str,
    service_account_json: str,
    dimensions: list[str],
    metrics: list[str],
    date_range_days: int = 30,
) -> list[dict]:
    """
    Fetches data from Google Analytics Data API v1beta.
    Authenticates via Service Account JSON credentials.
    """
    access_token = await _get_access_token(service_account_json)

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=date_range_days)).strftime("%Y-%m-%d")
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"

    payload = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "dimensions": [{"name": d} for d in dimensions],
        "metrics": [{"name": m} for m in metrics],
        "limit": 10000,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }

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
