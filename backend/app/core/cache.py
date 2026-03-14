"""
Cache utilitário — Redis async

Uso simples:
    redis = get_redis()
    await cache_set(redis, "key", {"data": 1}, ttl=300)
    data = await cache_get(redis, "key")
    await redis.aclose()

Uso com decorator:
    @cached("vehicles:list", ttl=300)
    async def list_vehicles(db: AsyncSession, ...):
        ...
"""

import functools
import json
import os
from typing import Any

from redis.asyncio import Redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


def get_redis() -> Redis:
    return Redis.from_url(REDIS_URL, decode_responses=True)


async def cache_get(redis: Redis, key: str) -> Any | None:
    value = await redis.get(key)
    if value is None:
        return None
    return json.loads(value)


async def cache_set(redis: Redis, key: str, value: Any, ttl: int = 300) -> None:
    await redis.set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete(redis: Redis, key: str) -> None:
    await redis.delete(key)


def cached(key_prefix: str, ttl: int = 300):
    """
    Decorator para cachear o retorno de funções async.

    A chave é gerada como: "{key_prefix}:{args[1:]}{kwargs}".
    Não inclui o primeiro argumento (geralmente `self` ou `db`).

    Exemplo:
        @cached("vehicles", ttl=300)
        async def list_vehicles(db, tipo=None):
            ...
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{key_prefix}:{args[1:]}:{sorted(kwargs.items())}"
            redis = get_redis()
            try:
                cached_value = await cache_get(redis, key)
                if cached_value is not None:
                    return cached_value
                result = await func(*args, **kwargs)
                if result is not None:
                    await cache_set(redis, key, result, ttl)
                return result
            finally:
                await redis.aclose()

        return wrapper
    return decorator
