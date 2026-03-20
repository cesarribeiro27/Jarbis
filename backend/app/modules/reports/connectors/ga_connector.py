"""Google Analytics Data API v1 connector."""
import httpx
from datetime import datetime, timedelta


async def fetch_ga_report(
    property_id: str,
    api_secret: str,
    dimensions: list[str],
    metrics: list[str],
    date_range_days: int = 30,
) -> list[dict]:
    """
    Fetches data from Google Analytics Data API v1 (Measurement Protocol style).
    Uses the runReport endpoint with an API secret.

    property_id: GA4 property ID (ex: "123456789")
    api_secret: API Secret from GA4 Admin > Data Streams > Measurement Protocol API secrets
    """
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=date_range_days)).strftime("%Y-%m-%d")

    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"

    payload = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "dimensions": [{"name": d} for d in dimensions],
        "metrics": [{"name": m} for m in metrics],
        "limit": 10000,
    }

    headers = {"Content-Type": "application/json"}
    params = {"key": api_secret}  # using API key in query param

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers, params=params)
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
