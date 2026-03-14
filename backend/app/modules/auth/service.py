"""
Serviço de autenticação.

Responsável por: registro de novos tenants, login, geração de tokens.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.modules.tenants.models import Tenant, User


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: RegisterRequest) -> AuthResponse:
        """
        Cria um novo tenant e seu primeiro usuário (owner).
        """
        # Verifica email duplicado
        existing = await self.db.scalar(select(User).where(User.email == data.email))
        if existing:
            raise ConflictError(f"Email '{data.email}' já cadastrado.")

        # Cria o tenant (organização)
        slug = slugify(data.organization_name)
        existing_slug = await self.db.scalar(select(Tenant).where(Tenant.slug == slug))
        if existing_slug:
            slug = f"{slug}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

        tenant = Tenant(name=data.organization_name, slug=slug)
        self.db.add(tenant)
        await self.db.flush()  # Gera o tenant.id sem commitar

        # Cria o usuário owner do tenant
        user = User(
            tenant_id=tenant.id,
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role="owner",
        )
        self.db.add(user)
        await self.db.flush()

        return self._build_auth_response(user)

    async def login(self, data: LoginRequest) -> AuthResponse:
        """Autentica um usuário e retorna os tokens JWT."""
        user = await self.db.scalar(select(User).where(User.email == data.email))

        if not user or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Email ou senha incorretos.")

        if not user.is_active:
            raise UnauthorizedError("Conta desativada. Entre em contato com o suporte.")

        # Atualiza last_login
        user.last_login_at = datetime.now(timezone.utc)

        return self._build_auth_response(user)

    def _build_auth_response(self, user: User) -> AuthResponse:
        token_payload = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(
                access_token=create_access_token(token_payload),
                refresh_token=create_refresh_token(str(user.id)),
            ),
        )
