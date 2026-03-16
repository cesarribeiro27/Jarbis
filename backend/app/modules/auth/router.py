"""
Endpoints de autenticação e gestão de usuários do tenant.

POST  /auth/register           — Cria novo tenant + usuário owner
POST  /auth/login              — Autentica e retorna tokens JWT
GET   /auth/me                 — Retorna dados do usuário autenticado
GET   /auth/users              — Lista usuários do tenant
POST  /auth/users/invite       — Convida/cria usuário no tenant (owner/admin)
PATCH /auth/users/{id}         — Atualiza role ou status (owner/admin)
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.rate_limit import limiter
from app.core.security import hash_password, verify_password
from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest, UserResponse, validate_password
from app.modules.auth.service import AuthService
from app.modules.tenants.models import User

router = APIRouter(prefix="/auth", tags=["Autenticação"])

ROLE_ORDER = {"owner": 3, "admin": 2, "member": 1, "viewer": 0}


def _set_auth_cookie(response: Response, token: str) -> None:
    """Define o cookie httpOnly com o JWT de acesso."""
    is_prod = settings.is_production
    response.set_cookie(
        key="jarbis_token",
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
VALID_ROLES = {"owner", "admin", "member", "viewer"}


def _can_manage(actor: User, target: User) -> bool:
    """owner pode gerenciar todos; admin pode gerenciar member/viewer."""
    if actor.id == target.id:
        return False
    actor_rank = ROLE_ORDER.get(actor.role, 0)
    target_rank = ROLE_ORDER.get(target.role, 0)
    return actor_rank >= 2 and actor_rank > target_rank


class InviteUserRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    role: str = "member"


class UpdateUserRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None


@router.post("/register", response_model=AuthResponse, status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, data: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.register(data)
    _set_auth_cookie(response, result.tokens.access_token)
    return result


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        return validate_password(v)


@router.post("/signup", response_model=AuthResponse, status_code=201)
@limiter.limit("3/minute")
async def signup(request: Request, data: SignupRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Cadastro público — cria tenant + usuário owner automaticamente."""
    reg = RegisterRequest(
        organization_name=data.name,
        full_name=data.name,
        email=data.email,
        password=data.password,
    )
    service = AuthService(db)
    result = await service.register(reg)
    _set_auth_cookie(response, result.tokens.access_token)
    return result


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Autentica um usuário e retorna tokens de acesso."""
    service = AuthService(db)
    result = await service.login(data)
    _set_auth_cookie(response, result.tokens.access_token)
    return result


@router.post("/logout", status_code=204)
async def logout(response: Response):
    """Encerra a sessão removendo o cookie de autenticação."""
    response.delete_cookie(key="jarbis_token", path="/", samesite="none" if settings.is_production else "lax")


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


@router.post("/verify-email", response_model=AuthResponse)
@limiter.limit("10/hour")
async def verify_email(request: Request, data: VerifyEmailRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Verifica o código de 6 dígitos e ativa o email do usuário."""
    service = AuthService(db)
    result = await service.verify_email(data.email, data.code)
    _set_auth_cookie(response, result.tokens.access_token)
    return result


@router.post("/resend-verification", status_code=204)
async def resend_verification(data: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    """Reenvia o código de verificação por email."""
    service = AuthService(db)
    await service.resend_verification(data.email)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Retorna os dados do usuário autenticado."""
    return UserResponse.model_validate(current_user)


class UpdateMeRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6, max_length=100)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UpdateMeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza nome e/ou senha do usuário autenticado."""
    if data.full_name:
        current_user.full_name = data.full_name

    if data.new_password:
        if not data.current_password:
            raise HTTPException(status_code=400, detail="Informe a senha atual para trocar a senha.")
        if not verify_password(data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Senha atual incorreta.")
        current_user.hashed_password = hash_password(data.new_password)

    await db.commit()
    return UserResponse.model_validate(current_user)


# ---------------------------------------------------------------------------
# Gestão de usuários do tenant
# ---------------------------------------------------------------------------

@router.get("/users", response_model=list[UserResponse])
async def list_tenant_users(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos os usuários do mesmo tenant, ordenados por criação."""
    result = await db.scalars(
        select(User)
        .where(User.tenant_id == current_user.tenant_id)
        .order_by(User.created_at)
    )
    return [UserResponse.model_validate(u) for u in result.all()]


@router.post("/users/invite", response_model=UserResponse, status_code=201)
async def invite_user(
    data: InviteUserRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria um novo usuário no mesmo tenant. Requer role owner ou admin."""
    if ROLE_ORDER.get(current_user.role, 0) < 2:
        raise HTTPException(status_code=403, detail="Apenas owners e admins podem convidar usuários.")

    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"Role inválido. Use: {', '.join(VALID_ROLES)}")

    if ROLE_ORDER.get(data.role, 0) >= ROLE_ORDER.get(current_user.role, 0):
        raise HTTPException(status_code=403, detail="Você não pode criar um usuário com role igual ou maior que o seu.")

    existing = await db.scalar(select(User).where(User.email == data.email))
    if existing:
        raise HTTPException(status_code=409, detail=f"Email '{data.email}' já cadastrado.")

    user = User(
        tenant_id=current_user.tenant_id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    await db.flush()
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UpdateUserRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza role e/ou status ativo de um usuário. Requer owner ou admin."""
    if ROLE_ORDER.get(current_user.role, 0) < 2:
        raise HTTPException(status_code=403, detail="Apenas owners e admins podem alterar usuários.")

    target = await db.scalar(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if not _can_manage(current_user, target):
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar este usuário.")

    if data.role is not None:
        if data.role not in VALID_ROLES:
            raise HTTPException(status_code=422, detail=f"Role inválido. Use: {', '.join(VALID_ROLES)}")
        if ROLE_ORDER.get(data.role, 0) >= ROLE_ORDER.get(current_user.role, 0):
            raise HTTPException(status_code=403, detail="Você não pode atribuir um role igual ou maior que o seu.")
        target.role = data.role

    if data.is_active is not None:
        target.is_active = data.is_active

    return UserResponse.model_validate(target)
