"""
Rate Limiting — slowapi + Redis

Uso nos routers:
    from app.core.rate_limit import limiter

    @router.get("/heavy-endpoint")
    @limiter.limit("10/minute")
    async def my_endpoint(request: Request, ...):
        ...
"""

import asyncio
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
)

# Threshold de hits bloqueados antes de disparar email de alerta
_ALERT_THRESHOLD = 20
# Janela de tempo em segundos para contar hits (1 hora)
_WINDOW_SECONDS = 3600


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _track_threat(ip: str, path: str, method: str) -> None:
    """Registra hit bloqueado no Redis e envia email se threshold atingido."""
    try:
        from app.core.cache import get_redis
        from app.config import settings

        redis = get_redis()
        try:
            now = int(time.time())
            event = f"{method} {path}"

            # Contador de hits por IP (janela de 1h)
            hits_key = f"threat:hits:{ip}"
            count = await redis.incr(hits_key)
            await redis.expire(hits_key, _WINDOW_SECONDS)

            # Sorted set de IPs ativos (score = último timestamp)
            await redis.zadd("threat:ips", {ip: now})
            await redis.expire("threat:ips", _WINDOW_SECONDS * 2)

            # Lista dos últimos eventos por IP (max 50)
            events_key = f"threat:events:{ip}"
            await redis.lpush(events_key, f"{now}|{event}")
            await redis.ltrim(events_key, 0, 49)
            await redis.expire(events_key, _WINDOW_SECONDS)

            # Alerta por email — uma vez por IP por janela
            if count >= _ALERT_THRESHOLD:
                alerted_key = f"threat:alerted:{ip}"
                if not await redis.exists(alerted_key):
                    await redis.setex(alerted_key, _WINDOW_SECONDS, "1")
                    # Envia email de alerta
                    from app.core.email import send_admin_email
                    subject = f"[Jarbis] Ataque detectado: {count} reqs bloqueadas de {ip}"
                    body = (
                        f"<h2 style='color:#ef4444'>Possivel ataque detectado</h2>"
                        f"<table style='border-collapse:collapse;width:100%'>"
                        f"<tr><td style='padding:8px;color:#9ca3af'>IP</td>"
                        f"<td style='padding:8px;color:#f9fafb'><b>{ip}</b></td></tr>"
                        f"<tr><td style='padding:8px;color:#9ca3af'>Reqs bloqueadas (1h)</td>"
                        f"<td style='padding:8px;color:#ef4444'><b>{count}</b></td></tr>"
                        f"<tr><td style='padding:8px;color:#9ca3af'>Ultimo endpoint</td>"
                        f"<td style='padding:8px;color:#f9fafb'>{event}</td></tr>"
                        f"</table>"
                        f"<p style='color:#9ca3af;margin-top:16px'>"
                        f"Acesse o painel admin para mais detalhes.</p>"
                    )
                    for admin_email in settings.admin_emails:
                        await send_admin_email(admin_email, subject, body)
        finally:
            await redis.aclose()
    except Exception:
        pass  # Nunca crashar o handler por causa do tracking


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = getattr(exc, "retry_after", 60)
    ip = _get_ip(request)
    path = request.url.path
    method = request.method
    asyncio.create_task(_track_threat(ip, path, method))
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests", "retry_after": retry_after},
        headers={"Retry-After": str(retry_after)},
    )
