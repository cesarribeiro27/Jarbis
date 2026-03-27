"""GeoIP — lookup offline de país e cidade a partir de IP.

Carrega o banco GeoLite2-City.mmdb uma única vez em memória.
O lookup leva ~0.1ms, sem chamada de rede.
"""

from __future__ import annotations

import os
from pathlib import Path

_reader = None

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "GeoLite2-City.mmdb"


def init_geoip() -> None:
    """Inicializa o reader. Chamado no lifespan do FastAPI."""
    global _reader
    db = Path(os.environ.get("GEOIP_DB_PATH", str(_DB_PATH)))
    if not db.exists():
        print(f"[GeoIP] Banco não encontrado em {db} — lookup desativado")
        return
    try:
        import geoip2.database
        _reader = geoip2.database.Reader(str(db))
        print(f"[GeoIP] Banco carregado: {db}")
    except Exception as e:
        print(f"[GeoIP] Erro ao carregar banco: {e}")


def lookup(ip: str) -> tuple[str, str]:
    """Retorna (country_name, city_name). Retorna ('', '') em caso de falha."""
    if not _reader or not ip:
        return "", ""
    try:
        r = _reader.city(ip)
        country = r.country.name or ""
        city = r.city.name or ""
        return country, city
    except Exception:
        return "", ""
