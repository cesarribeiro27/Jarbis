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
    """Extrai o JWT do cookie httpOnly ou do header Authorization Bearer."""
    token = request.cookies.get("jarbis_token")
    if token:
        return token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
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
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user
