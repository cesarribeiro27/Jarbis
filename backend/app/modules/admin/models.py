"""
Modelos do módulo administrativo.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Affiliate(Base):
    """
    Afiliado que indica o Jarbis e recebe comissão por conversões.
    Os tenants criados via link de afiliado têm affiliate_code preenchido.
    """
    __tablename__ = "affiliates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    commission_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00"),
        comment="Percentual de comissão (ex: 20.00 = 20%)"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Portal do afiliado — acesso próprio
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invite_token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    invite_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    def __repr__(self) -> str:
        return f"<Affiliate {self.code}>"


class AdminUser(Base):
    """
    Usuário da equipe interna com acesso ao painel admin.
    Roles: full | vendas | financeiro | marketing | suporte
    """
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(
        String(30), nullable=False, default="suporte",
        comment="full | vendas | financeiro | marketing | suporte"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_by: Mapped[str] = mapped_column(String(254), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    def __repr__(self) -> str:
        return f"<AdminUser {self.email} role={self.role}>"


class Coupon(Base):
    """
    Cupom de desconto para novos assinantes.
    Pode ser percentual (% off) ou valor fixo (R$ off).
    """
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    discount_type: Mapped[str] = mapped_column(
        String(10), nullable=False, default="percent",
        comment="percent | fixed"
    )
    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False,
        comment="Valor do desconto: 20 = 20% ou R$20,00 dependendo do tipo"
    )
    applicable_plans: Mapped[str] = mapped_column(
        String(200), nullable=False, default="all",
        comment="'all' ou lista separada por vírgula: solo,equipe,ilimitado"
    )
    max_uses: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="null = ilimitado"
    )
    used_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stripe_coupon_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_promo_code_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by: Mapped[str] = mapped_column(String(254), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    def __repr__(self) -> str:
        return f"<Coupon {self.code} {self.discount_type}={self.discount_value}>"


class TenantNote(Base):
    """Nota interna sobre um tenant — CRM básico."""
    __tablename__ = "tenant_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    admin_email: Mapped[str] = mapped_column(String(254), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<TenantNote tenant={self.tenant_id} by={self.admin_email}>"


class AffiliatePayment(Base):
    """
    Registro de pagamento de comissão para um afiliado.
    Permite marcar quais comissões já foram pagas e manter histórico.
    """
    __tablename__ = "affiliate_payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    affiliate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("affiliates.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False,
        comment="Valor pago em BRL"
    )
    period_description: Mapped[str] = mapped_column(
        String(100), nullable=False, default="",
        comment="Ex: Março/2026 ou Q1 2026"
    )
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_by: Mapped[str] = mapped_column(String(254), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<AffiliatePayment affiliate={self.affiliate_id} amount={self.amount}>"


class AdminAuditLog(Base):
    """
    Registro de ações administrativas — quem fez o quê e quando.
    Gerado automaticamente em ações críticas: mudança de plano,
    ativar/desativar conta, extensão de trial, etc.
    """
    __tablename__ = "admin_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    admin_email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    action: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="Ex: plan_change, toggle_active, extend_trial, coupon_create"
    )
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Ex: tenant, coupon, affiliate"
    )
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    def __repr__(self) -> str:
        return f"<AdminAuditLog {self.action} by={self.admin_email}>"


class MrrSnapshot(Base):
    """
    Snapshot diário de MRR — base para gráfico histórico de receita.
    Gerado automaticamente pelo background loop às 00:00 UTC.
    """
    __tablename__ = "mrr_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    snapshot_date: Mapped[datetime] = mapped_column(
        Date, nullable=False, unique=True, index=True,
        comment="Data do snapshot (1 por dia)"
    )
    mrr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    arr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    paying_tenants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_tenants: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
        comment="Novos pagantes em relação ao dia anterior")
    churned_tenants: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
        comment="Cancelamentos no dia")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<MrrSnapshot {self.snapshot_date} mrr={self.mrr}>"


class SupportTicket(Base):
    """
    Ticket de suporte vinculado a um tenant.
    Criado pelo admin ou automaticamente via alerta.
    """
    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="open",
        comment="open | in_progress | resolved | closed"
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medium",
        comment="low | medium | high | critical"
    )
    created_by: Mapped[str] = mapped_column(String(254), nullable=False, comment="Email do admin que abriu")
    assigned_to: Mapped[str | None] = mapped_column(String(254), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def __repr__(self) -> str:
        return f"<SupportTicket {self.title[:40]} status={self.status}>"


class SupportTicketComment(Base):
    """Comentário em um ticket de suporte."""
    __tablename__ = "support_ticket_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    author_email: Mapped[str] = mapped_column(String(254), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<SupportTicketComment ticket={self.ticket_id} by={self.author_email}>"


class NfeDocument(Base):
    """
    NF-e de serviço emitida para um tenant via NFe.io.
    Armazena o estado da nota e links para PDF/XML.
    """
    __tablename__ = "nfe_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    nfeio_id: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="ID retornado pela NFe.io")
    competencia: Mapped[str] = mapped_column(String(7), nullable=False, comment="YYYY-MM")
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    descricao: Mapped[str] = mapped_column(String(500), nullable=False, default="Assinatura Jarbis")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending",
        comment="pending | issued | cancelled | error"
    )
    nfe_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    xml_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_by: Mapped[str] = mapped_column(String(254), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def __repr__(self) -> str:
        return f"<NfeDocument tenant={self.tenant_id} {self.competencia} status={self.status}>"


class ApiKey(Base):
    """
    Chave de API por tenant — permite integrações programáticas sem senha.
    A chave real só é exibida uma vez; armazenamos apenas o hash + prefixo visível.
    """
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Nome descritivo (ex: Integração Zapier)")
    key_prefix: Mapped[str] = mapped_column(
        String(12), nullable=False,
        comment="Prefixo visível da chave, ex: jrb_live_abc1"
    )
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False, comment="SHA-256 da chave completa")
    scopes: Mapped[str] = mapped_column(
        String(300), nullable=False, default="read",
        comment="Escopos separados por vírgula: read, write, embed"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(254), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<ApiKey {self.key_prefix}... tenant={self.tenant_id}>"


class LifecycleEmailLog(Base):
    """
    Registro de email de ciclo de vida enviado para um tenant.
    Evita reenvio: cada (tenant_id, email_type) é enviado no máximo uma vez.
    """
    __tablename__ = "lifecycle_email_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    email_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="d1_welcome | d3_activation | d7_engagement | d30_retention"
    )
    recipient_email: Mapped[str] = mapped_column(String(254), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<LifecycleEmailLog {self.email_type} tenant={self.tenant_id}>"


class NpsSurvey(Base):
    """
    Resposta de NPS (Net Promoter Score) de um usuário.
    Exibida como modal in-app após 30 dias de conta.
    """
    __tablename__ = "nps_surveys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False, comment="0-10")
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    def __repr__(self) -> str:
        return f"<NpsSurvey score={self.score} tenant={self.tenant_id}>"
