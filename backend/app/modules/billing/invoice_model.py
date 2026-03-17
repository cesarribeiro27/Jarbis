"""
Modelo de fatura (Invoice) — histórico de cobranças recebidas via Stripe webhook.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Invoice(Base):
    """
    Fatura gerada pelo Stripe e armazenada localmente.
    Preenchida pelos eventos invoice.paid e invoice.payment_failed do webhook.
    tenant_id usa SET NULL para preservar histórico mesmo se o tenant for deletado.
    """
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    stripe_invoice_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False,
        comment="Valor em BRL (centavos / 100)"
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="brl")
    status: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="paid | open | void | uncollectible"
    )
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invoice_pdf: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Plano do tenant no momento da cobrança"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def __repr__(self) -> str:
        return f"<Invoice {self.stripe_invoice_id} status={self.status}>"
