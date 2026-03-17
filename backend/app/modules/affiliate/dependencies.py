"""
Dependências de autenticação para o portal do afiliado.
Auth separada do sistema principal — JWT com claim type='affiliate'.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.database import get_db
from app.modules.admin.models import Affiliate

bearer_scheme = HTTPBearer()


async def get_current_affiliate(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Affiliate:
    """
    Valida o JWT do afiliado e retorna o objeto Affiliate.
    Rejeita tokens de usuário normal (type != 'affiliate').
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "affiliate":
            raise credentials_exception
        affiliate_id: str = payload.get("sub")
        if not affiliate_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.scalar(select(Affiliate).where(Affiliate.id == affiliate_id))
    if not result:
        raise credentials_exception
    if not result.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta de afiliado desativada",
        )
    return result
