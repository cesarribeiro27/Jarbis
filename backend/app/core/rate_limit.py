"""
Rate Limiting — slowapi + Redis

Uso nos routers:
    from app.core.rate_limit import limiter

    @router.get("/heavy-endpoint")
    @limiter.limit("10/minute")
    async def my_endpoint(request: Request, ...):
        ...
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = getattr(exc, "retry_after", 60)
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests", "retry_after": retry_after},
        headers={"Retry-After": str(retry_after)},
    )
