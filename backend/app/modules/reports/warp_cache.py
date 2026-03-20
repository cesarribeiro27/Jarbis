"""Warp Cache — Pre-compute de rows de datasets em Redis.

Armazena o array de rows (com computed_columns já aplicadas) em Redis
com TTL de 1h, evitando leituras repetidas do campo JSONB no PostgreSQL.

Hierarquia de cache para queries:
  1. Query-specific cache (TTL=5min) — resultado já agregado
  2. Warp rows cache (TTL=1h) — rows brutas, reaproveitadas por qualquer query
  3. PostgreSQL — fonte de verdade

Invalidação:
  - sync do dataset → warp_invalidate() + version bump (invalida query caches)
  - TTL natural de 1h
  - datasets com row_count > 100 000 são excluídos (proteção de memória)
"""

import json

from app.core.cache import cache_get, cache_set

_WARP_TTL = 3600          # 1 hora
_WARP_MAX_ROWS = 100_000  # limite de proteção de memória


def _warp_key(dataset_id: str) -> str:
    return f"jarbis:warp:rows:{dataset_id}"


async def warp_get_rows(redis, dataset_id: str) -> list[dict] | None:
    """Retorna rows pré-computadas do Warp cache, ou None se não houver."""
    return await cache_get(redis, _warp_key(dataset_id))


async def warp_set_rows(redis, dataset_id: str, rows: list[dict]) -> None:
    """Armazena rows no Warp cache (pula se exceder limite de linhas)."""
    if len(rows) > _WARP_MAX_ROWS:
        return
    await cache_set(redis, _warp_key(dataset_id), rows, ttl=_WARP_TTL)


async def warp_invalidate(redis, dataset_id: str) -> None:
    """Remove rows do Warp cache para o dataset."""
    await redis.delete(_warp_key(dataset_id))


async def warp_status(redis, dataset_id: str) -> dict:
    """Retorna status do Warp cache para um dataset."""
    key = _warp_key(dataset_id)
    ttl = await redis.ttl(key)
    if ttl == -2:
        return {"cached": False, "ttl_remaining": 0, "rows_cached": 0}
    raw = await redis.get(key)
    if raw is None:
        return {"cached": False, "ttl_remaining": 0, "rows_cached": 0}
    try:
        rows = json.loads(raw)
        rows_count = len(rows) if isinstance(rows, list) else 0
    except Exception:
        rows_count = 0
    return {"cached": True, "ttl_remaining": max(0, ttl), "rows_cached": rows_count}
