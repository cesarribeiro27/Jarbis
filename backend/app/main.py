"""
Jarbis API — Entry Point
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.modules.auth.router import router as auth_router
from app.modules.billing.router import router as billing_router
from app.modules.reports.router import router as reports_router


async def _refresh_loop():
    """Background task: auto-refresh datasets on schedule."""
    from app.database import AsyncSessionLocal
    from app.modules.reports.dataset_models import ReportDataset
    from app.modules.reports.dataset_service import DatasetService
    from sqlalchemy import select, and_

    while True:
        await asyncio.sleep(60)
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                result = await db.scalars(
                    select(ReportDataset).where(
                        and_(
                            ReportDataset.refresh_interval_minutes.isnot(None),
                            ReportDataset.next_refresh_at <= now,
                        )
                    )
                )
                datasets = result.all()
                svc = DatasetService(db)
                for ds in datasets:
                    try:
                        if ds.type == "api" and ds.api_url:
                            await svc.sync_api(ds.id, ds.tenant_id)
                        ds.next_refresh_at = now + timedelta(minutes=ds.refresh_interval_minutes)
                    except Exception:
                        ds.next_refresh_at = now + timedelta(minutes=5)
                if datasets:
                    await db.commit()
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[Jarbis] Iniciando API v{settings.app_version} ({settings.environment})")
    task = asyncio.create_task(_refresh_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    print("[Jarbis] Encerrando API")


app = FastAPI(
    title="Jarbis API",
    description="BI embarcado para empresas brasileiras.",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(reports_router)


@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}


@app.get("/", tags=["Sistema"])
async def root():
    return {"name": "Jarbis API", "version": settings.app_version, "docs": "/docs"}
