"""
Rate Limiting — slowapi + Redis

Uso nos routers:
    from app.core.rate_limit import limiter

    @router.get("/heavy-endpoint")
    @limiter.limit("10/minute")
    async def my_endpoint(request: Request, ...):
        ...
"""

import os

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=REDIS_URL,
    default_limits=["100/minute"],
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = getattr(exc, "retry_after", 60)
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests", "retry_after": retry_after},
        headers={"Retry-After": str(retry_after)},
    )
