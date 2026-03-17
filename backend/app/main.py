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
from app.modules.admin.router import router as admin_router
from app.modules.affiliate.router import router as affiliate_router
from app.modules.auth.router import router as auth_router
from app.modules.billing.router import router as billing_router
from app.modules.reports.router import router as reports_router
from app.modules.support.router import router as support_router


async def _refresh_loop():
    """Background task: auto-refresh datasets on schedule + MRR snapshot diário."""
    from decimal import Decimal
    from app.database import AsyncSessionLocal
    from app.modules.admin.models import MrrSnapshot
    from app.modules.reports.dataset_models import ReportDataset
    from app.modules.reports.dataset_service import DatasetService
    from app.modules.tenants.models import Tenant
    from sqlalchemy import func, select, and_

    PLAN_MRR = {"solo": 79.90, "starter": 79.90, "equipe": 189.90, "professional": 189.90, "ilimitado": 599.90}

    while True:
        await asyncio.sleep(60)
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)

                # ── Dataset auto-refresh ───────────────────────────────────────
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

                # ── MRR Snapshot diário (roda uma vez por dia às 00:00 UTC) ───
                today = now.date()
                existing_snapshot = await db.scalar(
                    select(MrrSnapshot).where(MrrSnapshot.snapshot_date == today)
                )
                if not existing_snapshot:
                    # Calcula MRR dos tenants pagantes ativos
                    paid_rows = await db.execute(
                        select(Tenant.plan, Tenant.addon_packs, func.count().label("count"))
                        .where(
                            Tenant.is_active == True,  # noqa: E712
                            Tenant.subscription_status == "active",
                            Tenant.plan.in_(list(PLAN_MRR.keys())),
                        )
                        .group_by(Tenant.plan, Tenant.addon_packs)
                    )
                    paid_list = paid_rows.all()
                    mrr = sum(
                        row.count * (PLAN_MRR[row.plan] + (row.addon_packs or 0) * 49.90)
                        for row in paid_list
                    )
                    paying = sum(row.count for row in paid_list)

                    # Calcula churned_tenants: cancelaram ontem (canceled_at no dia anterior)
                    yesterday = today - timedelta(days=1)
                    churned = await db.scalar(
                        select(func.count()).select_from(Tenant).where(
                            func.date(Tenant.canceled_at) == yesterday
                        )
                    ) or 0

                    # Novos pagantes: subscription_status ficou "active" ontem (approximation via created_at)
                    new_paying = await db.scalar(
                        select(func.count()).select_from(Tenant).where(
                            Tenant.subscription_status == "active",
                            func.date(Tenant.created_at) == yesterday,
                        )
                    ) or 0

                    snapshot = MrrSnapshot(
                        snapshot_date=today,
                        mrr=Decimal(str(round(mrr, 2))),
                        arr=Decimal(str(round(mrr * 12, 2))),
                        paying_tenants=paying,
                        new_tenants=new_paying,
                        churned_tenants=churned,
                    )
                    db.add(snapshot)
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

app.include_router(admin_router, prefix="/admin")
app.include_router(affiliate_router)
app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(reports_router)
app.include_router(support_router)


@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}


@app.get("/", tags=["Sistema"])
async def root():
    return {"name": "Jarbis API", "version": settings.app_version, "docs": "/docs"}
