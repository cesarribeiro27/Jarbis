"""
Serviço de autenticação.

Responsável por: registro de novos tenants, login, geração de tokens.
"""

import random
import secrets
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify

from app.core.email import send_password_reset_email, send_verification_email
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.modules.tenants.models import Tenant, User

TRIAL_DAYS = 7
CODE_EXPIRES_MINUTES = 15


def _generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: RegisterRequest) -> AuthResponse:
        """
        Cria um novo tenant e seu primeiro usuário (owner).
        Envia código de verificação por email e inicia trial de 7 dias.
        """
        # Verifica email duplicado
        existing = await self.db.scalar(select(User).where(User.email == data.email))
        if existing:
            raise ConflictError(f"Email '{data.email}' já cadastrado.")

        # Cria o tenant com trial de 7 dias
        slug = slugify(data.organization_name)
        existing_slug = await self.db.scalar(select(Tenant).where(Tenant.slug == slug))
        if existing_slug:
            slug = f"{slug}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

        tenant = Tenant(
            name=data.organization_name,
            slug=slug,
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS),
        )
        self.db.add(tenant)
        await self.db.flush()

        # Gera código de verificação
        code = _generate_code()

        # Cria o usuário owner do tenant
        user = User(
            tenant_id=tenant.id,
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role="owner",
            email_verified=False,
            verification_code=code,
            verification_code_expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRES_MINUTES),
        )
        self.db.add(user)
        await self.db.flush()

        # Envia email com código (não bloqueia o registro se falhar)
        try:
            await send_verification_email(user.email, user.full_name, code)
        except Exception as e:
            print(f"[EMAIL] Falha ao enviar verificação: {e}")

        return self._build_auth_response(user, needs_verification=True)

    async def verify_email(self, email: str, code: str) -> AuthResponse:
        """Verifica o código de 6 dígitos e ativa o email do usuário."""
        from sqlalchemy.orm import selectinload
        user = await self.db.scalar(select(User).where(User.email == email).options(selectinload(User.tenant)))
        if not user:
            raise UnauthorizedError("Email não encontrado.")

        if user.email_verified:
            return self._build_auth_response(user)

        now = datetime.now(timezone.utc)
        if not user.verification_code or user.verification_code != code:
            raise UnauthorizedError("Código inválido.")

        if user.verification_code_expires_at and user.verification_code_expires_at < now:
            raise UnauthorizedError("Código expirado. Solicite um novo.")

        user.email_verified = True
        user.verification_code = None
        user.verification_code_expires_at = None
        await self.db.flush()

        return self._build_auth_response(user)

    async def resend_verification(self, email: str) -> None:
        """Gera novo código e reenvia o email de verificação."""
        user = await self.db.scalar(select(User).where(User.email == email))
        if not user or user.email_verified:
            return  # Silencioso por segurança

        code = _generate_code()
        user.verification_code = code
        user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRES_MINUTES)
        await self.db.flush()

        try:
            await send_verification_email(user.email, user.full_name, code)
        except Exception as e:
            print(f"[EMAIL] Falha ao reenviar verificação: {e}")

    async def login(self, data: LoginRequest) -> AuthResponse:
        """Autentica um usuário e retorna os tokens JWT."""
        from sqlalchemy.orm import selectinload
        user = await self.db.scalar(select(User).where(User.email == data.email).options(selectinload(User.tenant)))

        if not user or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Email ou senha incorretos.")

        if not user.is_active:
            raise UnauthorizedError("Conta desativada. Entre em contato com o suporte.")

        # Atualiza last_login
        user.last_login_at = datetime.now(timezone.utc)

        # Registra sessão para health score
        try:
            from app.modules.admin.models import UserSession
            session = UserSession(user_id=user.id, tenant_id=user.tenant_id)
            self.db.add(session)
        except Exception:
            pass

        return self._build_auth_response(user)

    async def forgot_password(self, email: str, frontend_url: str) -> None:
        """
        Gera token de reset e envia email com link de redefinição.
        Não revela se o email existe ou não (segurança).
        """
        user = await self.db.scalar(select(User).where(User.email == email))
        if not user:
            return  # Silencioso por segurança

        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await self.db.flush()

        reset_url = f"{frontend_url}/nova-senha?token={token}"
        try:
            await send_password_reset_email(user.email, user.full_name, reset_url)
        except Exception as e:
            print(f"[EMAIL] Falha ao enviar reset de senha: {e}")

    async def reset_password(self, token: str, new_password: str) -> None:
        """
        Valida token, atualiza senha e invalida todas as sessões ativas.
        """
        user = await self.db.scalar(select(User).where(User.reset_token == token))
        if not user:
            raise UnauthorizedError("Token inválido ou já utilizado.")

        now = datetime.now(timezone.utc)
        if not user.reset_token_expires_at or user.reset_token_expires_at < now:
            raise UnauthorizedError("Token expirado. Solicite um novo link de redefinição.")

        user.hashed_password = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expires_at = None
        user.session_revoked_at = now
        user.is_active = True
        user.email_verified = True
        await self.db.flush()

    def _build_auth_response(self, user: User, needs_verification: bool = False) -> AuthResponse:
        token_payload = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
        trial_days = user.tenant.trial_days_remaining if user.tenant else None
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(
                access_token=create_access_token(token_payload),
                refresh_token=create_refresh_token(str(user.id)),
            ),
            needs_verification=needs_verification,
            trial_days_remaining=trial_days,
        )
