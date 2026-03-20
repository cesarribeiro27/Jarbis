"""
Models de Tenant e User.

Multi-tenancy: cada organização (agência, anunciante, veículo) é um tenant.
Os dados de mídia são compartilhados, mas workspaces, relatórios e
configurações são isolados por tenant.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Tenant(Base):
    """
    Organização cliente do Jarbis.
    Pode ser uma agência de publicidade, anunciante, veículo ou pesquisador.
    """
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(
        String(50), nullable=False, default="free",
        comment="Plano de assinatura: free, starter, professional, enterprise"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subscription_status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    addon_packs: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Número de packs de expansão ativos (+1 user +5 dash +3 datasets por pack)")
    addon_dashboards: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Dashboards extras comprados via pack individual (+5 por pack)")
    addon_datasets: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Datasets extras comprados via pack individual (+3 por pack)")
    plan_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    affiliate_code: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Código do afiliado que indicou este tenant")
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="Data de cancelamento da assinatura")
    crm_stage: Mapped[str] = mapped_column(
        String(30), nullable=False, default="novo",
        comment="Estágio CRM: novo | contato | demo_agendada | proposta | cliente | perdido"
    )

    # ── UTM tracking (canal de aquisição) ────────────────────────────────────
    utm_source: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Ex: google, instagram, email")
    utm_medium: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Ex: cpc, organic, referral")
    utm_campaign: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Nome da campanha")
    utm_term: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Palavra-chave (Google Ads)")
    utm_content: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Variação do anúncio")

    # ── Dados fiscais (para emissão de NF-e) ─────────────────────────────────
    cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True, comment="CNPJ formatado: XX.XXX.XXX/XXXX-XX")
    razao_social: Mapped[str | None] = mapped_column(String(300), nullable=True)
    inscricao_estadual: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(9), nullable=True)
    logradouro: Mapped[str | None] = mapped_column(String(300), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    complemento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True, comment="UF: SP, RJ, etc.")

    # ── White-label (plano Enterprise) ───────────────────────────────────────
    custom_logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="URL da logo customizada do tenant")
    primary_color: Mapped[str | None] = mapped_column(String(7), nullable=True, comment="Cor primária hex: #7c3aed")

    # ── Sub-organizações ─────────────────────────────────────────────────────
    parent_tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_suborg: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relacionamentos
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    sub_orgs: Mapped[list["Tenant"]] = relationship(
        "Tenant",
        primaryjoin="Tenant.parent_tenant_id == Tenant.id",
        foreign_keys="[Tenant.parent_tenant_id]",
        back_populates="parent_org",
    )
    parent_org: Mapped["Tenant | None"] = relationship(
        "Tenant",
        primaryjoin="Tenant.parent_tenant_id == Tenant.id",
        foreign_keys="[Tenant.parent_tenant_id]",
        back_populates="sub_orgs",
        remote_side="Tenant.id",
    )

    @property
    def trial_days_remaining(self) -> int | None:
        if not self.trial_ends_at:
            return None
        delta = self.trial_ends_at - datetime.now(timezone.utc)
        return max(0, delta.days)

    def __repr__(self) -> str:
        return f"<Tenant {self.slug}>"


class User(Base):
    """
    Usuário da plataforma, sempre vinculado a um tenant.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default="member",
        comment="Papel no tenant: owner, admin, member, viewer"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    verification_code_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reset_token: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    session_revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relacionamentos
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
