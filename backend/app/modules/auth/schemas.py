"""Schemas de autenticação (request/response)."""

import re
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


def validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("A senha deve ter pelo menos 8 caracteres.")
    if not re.search(r"\d", v):
        raise ValueError("A senha deve conter pelo menos um número.")
    return v


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    organization_name: str = Field(min_length=2, max_length=200)

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        return validate_password(v)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    tenant_id: uuid.UUID
    is_active: bool = True
    email_verified: bool = False
    last_login_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse
    needs_verification: bool = False
    trial_days_remaining: int | None = None
