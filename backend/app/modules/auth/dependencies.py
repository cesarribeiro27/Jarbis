"""
Dependencies FastAPI para autenticação.

get_current_user é injetado nos endpoints protegidos via Depends().
Aceita token via httpOnly cookie (jarbis_token) ou header Bearer.
"""

import uuid
from datetime import datetime, timezone

from fastapi import Depends, Request
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.database import get_db
from app.modules.tenants.models import User


def _extract_token(request: Request) -> str:
    """
    Extrai o JWT para autenticação, em ordem de prioridade:
    1. Bearer header — usado pelo painel admin (jarbis_admin_token) para garantir
       isolamento durante impersonação.
    2. Cookie jarbis_impersonation_token — sessão temporária de impersonação (15 min),
       setado pelo endpoint /admin/tenants/{id}/impersonate.
    3. Cookie jarbis_token — sessão regular do usuário.
    """
    # jarbis_admin_token (httpOnly cookie) tem prioridade máxima no painel admin
    # para garantir isolamento mesmo durante sessões de impersonação
    token = request.cookies.get("jarbis_admin_token")
    if token:
        return token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    token = request.cookies.get("jarbis_impersonation_token")
    if token:
        return token
    token = request.cookies.get("jarbis_token")
    if token:
        return token
    raise UnauthorizedError("Token de autenticação não fornecido.")


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Valida o JWT (cookie ou Bearer) e retorna o usuário autenticado.
    Usado como dependency nos endpoints protegidos.
    """
    token = _extract_token(request)
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise UnauthorizedError()
    except JWTError:
        raise UnauthorizedError("Token inválido ou expirado.")

    user = await db.scalar(select(User).where(User.id == uuid.UUID(user_id)))
    if not user or not user.is_active:
        raise UnauthorizedError("Usuário não encontrado ou desativado.")

    # Rejeita tokens emitidos antes da revogação de sessão (ex: após reset de senha)
    token_iat = payload.get("iat")
    if user.session_revoked_at and token_iat:
        if datetime.fromtimestamp(token_iat, tz=timezone.utc) < user.session_revoked_at:
            raise UnauthorizedError("Sessão revogada. Faça login novamente.")

    return user


async def get_current_active_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Enforce trial expiration on all non-exempt paths
    _TRIAL_EXEMPT = ("/auth/", "/billing/", "/admin/", "/health", "/docs", "/redoc", "/openapi")
    if not any(request.url.path.startswith(p) for p in _TRIAL_EXEMPT):
        from app.modules.tenants.models import Tenant
        from app.modules.billing.guards import check_trial_active
        tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
        if tenant:
            check_trial_active(tenant)
    return current_user


async def get_effective_tenant_id(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    """
    Retorna o tenant_id efetivo para o request.

    Se o header X-Suborg-ID está presente e válido (sub-org do tenant do user),
    retorna o ID da sub-org. Caso contrário, retorna current_user.tenant_id.
    Apenas owner e admin podem usar contexto de sub-org.
    """
    from fastapi import HTTPException
    from app.modules.tenants.models import Tenant

    suborg_id_str = request.headers.get("X-Suborg-ID")
    if not suborg_id_str:
        return current_user.tenant_id

    if current_user.role not in ("owner", "admin"):
        raise UnauthorizedError("Apenas owner ou admin pode usar contexto de sub-organização.")

    try:
        suborg_id = uuid.UUID(suborg_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="X-Suborg-ID inválido.")

    suborg = await db.scalar(
        select(Tenant).where(
            Tenant.id == suborg_id,
            Tenant.parent_tenant_id == current_user.tenant_id,
            Tenant.is_suborg == True,  # noqa: E712
            Tenant.is_active == True,  # noqa: E712
        )
    )
    if not suborg:
        raise HTTPException(status_code=403, detail="Sub-organização não encontrada ou sem permissão.")

    return suborg_id
