"""
Serviço de cobrança via Stripe.
"""

import uuid

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.billing.plan_limits import PLAN_LIMITS, get_effective_limits
from app.modules.tenants.models import Tenant

PRICE_TO_PLAN: dict[str, str] = {}


def _init_stripe() -> bool:
    if not settings.stripe_secret_key:
        return False
    stripe.api_key = settings.stripe_secret_key
    return True


def _build_price_map() -> None:
    global PRICE_TO_PLAN
    PRICE_TO_PLAN = {
        # Planos atuais (mensal)
        settings.stripe_price_essential:        "essential",
        settings.stripe_price_pro:              "pro",
        settings.stripe_price_business:         "business",
        # Planos atuais (anual)
        settings.stripe_price_essential_annual: "essential",
        settings.stripe_price_pro_annual:       "pro",
        settings.stripe_price_business_annual:  "business",
        # Legados — para webhooks de subscriptions com price IDs antigos
        settings.stripe_price_solo:             "essential",
        settings.stripe_price_equipe:           "pro",
        settings.stripe_price_ilimitado:        "business",
        settings.stripe_price_solo_annual:      "essential",
        settings.stripe_price_equipe_annual:    "pro",
        settings.stripe_price_ilimitado_annual: "business",
        settings.stripe_price_starter:          "essential",
        settings.stripe_price_enterprise:       "enterprise",
    }
    PRICE_TO_PLAN = {k: v for k, v in PRICE_TO_PLAN.items() if k}


_build_price_map()


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_tenant(self, tenant_id: uuid.UUID) -> Tenant | None:
        return await self.db.scalar(select(Tenant).where(Tenant.id == tenant_id))

    def _customer_display_name(self, tenant: Tenant) -> str:
        """Nome exibido nas faturas Stripe: billing_name > nome do tenant > 'Jarbis.cc'."""
        return (tenant.billing_name or tenant.name or "Jarbis.cc").strip()

    async def get_or_create_customer(self, tenant: Tenant, email: str) -> str:
        """Retorna stripe_customer_id, criando no Stripe se necessário."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        if tenant.stripe_customer_id:
            return tenant.stripe_customer_id
        customer = stripe.Customer.create(
            email=email,
            name=self._customer_display_name(tenant),
            metadata={"tenant_id": str(tenant.id)},
        )
        tenant.stripe_customer_id = customer.id
        await self.db.commit()
        return customer.id

    async def update_customer_name(self, tenant: Tenant) -> None:
        """Atualiza o nome do cliente no Stripe quando billing_name muda."""
        if not _init_stripe() or not tenant.stripe_customer_id:
            return
        stripe.Customer.modify(
            tenant.stripe_customer_id,
            name=self._customer_display_name(tenant),
        )

    def _statement_descriptor(self, tenant: Tenant) -> str:
        """Texto que aparece na fatura do cartão do cliente (máx 22 chars, sem < > ' " \)."""
        raw = (tenant.billing_name or "JARBIS.CC").strip()
        # Remove chars inválidos para statement_descriptor
        safe = "".join(c for c in raw if c not in "<>'\"\\")
        return (safe or "JARBIS.CC")[:22].upper()

    async def update_billing_name(self, tenant_id: uuid.UUID, billing_name: str) -> None:
        """Salva o billing_name no tenant e sincroniza com o Stripe."""
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")
        name = (billing_name or "").strip()[:200]
        tenant.billing_name = name or None
        await self.db.commit()
        await self.update_customer_name(tenant)

    async def upgrade_subscription(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
        new_price_id: str,
        coupon_code: str = "",
    ) -> dict:
        """
        Se o tenant tiver assinatura ativa, modifica o plano com proration imediata.
        Se não tiver, cria novo checkout session e retorna {'checkout_url': url}.
        """
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")

        # Sem assinatura ativa → novo checkout
        if not tenant.stripe_subscription_id:
            url = await self.create_checkout_session(tenant_id, user_email, new_price_id, coupon_code)
            return {"checkout_url": url}

        sub = stripe.Subscription.retrieve(tenant.stripe_subscription_id)
        current_price_id = sub["items"]["data"][0]["price"]["id"]

        # Mesmo price_id → nada a fazer
        if current_price_id == new_price_id:
            return {"ok": True, "unchanged": True}

        item_id = sub["items"]["data"][0]["id"]

        # Modifica a subscription e emite fatura imediata com a proration
        stripe.Subscription.modify(
            tenant.stripe_subscription_id,
            items=[{"id": item_id, "price": new_price_id}],
            proration_behavior="always_invoice",
        )
        # O webhook customer.subscription.updated atualizará o plano no banco
        return {"ok": True}

    async def create_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
        price_id: str,
        coupon_code: str = "",
    ) -> str:
        """Cria sessão de checkout e retorna a URL."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")

        customer_id = await self.get_or_create_customer(tenant, user_email)
        descriptor = self._statement_descriptor(tenant)

        # Resolve cupom de desconto se informado
        session_kwargs: dict = {}
        if coupon_code:
            codes = stripe.PromotionCode.list(code=coupon_code.strip().upper(), active=True, limit=1)
            if not codes.data:
                raise ValueError(f"Cupom '{coupon_code}' inválido ou expirado.")
            session_kwargs["discounts"] = [{"promotion_code": codes.data[0].id}]
        else:
            session_kwargs["allow_promotion_codes"] = True

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/configuracoes/planos?success=1",
            cancel_url=f"{settings.frontend_url}/configuracoes/planos?canceled=1",
            metadata={"tenant_id": str(tenant_id)},
            subscription_data={
                "metadata": {"tenant_id": str(tenant_id)},
                "description": descriptor,
            },
            **session_kwargs,
        )
        return session.url

    async def create_subscription_intent(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
        price_id: str,
        coupon_code: str = "",
    ) -> dict:
        """Cria uma subscription incompleta e retorna o client_secret para Stripe Elements."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")

        # Guard: assinatura ativa deve usar upgrade, não novo intent
        if tenant.subscription_status in ("active", "trialing") and tenant.stripe_subscription_id:
            try:
                existing = stripe.Subscription.retrieve(tenant.stripe_subscription_id)
                if existing.status in ("active", "trialing"):
                    raise ValueError("Você já possui uma assinatura ativa. Use o fluxo de upgrade.")
            except ValueError:
                raise
            except Exception:
                pass

        customer_id = await self.get_or_create_customer(tenant, user_email)

        # Cancela subscription incompleta anterior se houver
        if tenant.stripe_subscription_id:
            try:
                existing = stripe.Subscription.retrieve(tenant.stripe_subscription_id)
                if existing.status == "incomplete":
                    stripe.Subscription.cancel(tenant.stripe_subscription_id)
                    tenant.stripe_subscription_id = None
                    await self.db.commit()
            except Exception:
                pass

        create_kwargs: dict = {
            "customer": customer_id,
            "items": [{"price": price_id}],
            "payment_behavior": "default_incomplete",
            "payment_settings": {"save_default_payment_method": "on_subscription"},
            "metadata": {"tenant_id": str(tenant_id)},
        }

        if coupon_code:
            codes = stripe.PromotionCode.list(code=coupon_code.strip().upper(), active=True, limit=1)
            if not codes.data:
                raise ValueError(f"Cupom '{coupon_code}' inválido ou expirado.")
            create_kwargs["discounts"] = [{"promotion_code": codes.data[0].id}]

        subscription = stripe.Subscription.create(**create_kwargs)

        # Salva subscription_id no tenant
        tenant.stripe_subscription_id = subscription.id
        tenant.subscription_status = "incomplete"
        await self.db.commit()

        # Stripe API >= 2025-03-31: invoice.payment_intent removido.
        # Estrutura correta: invoice.payments.data[0].payment.payment_intent.client_secret
        invoice_id = subscription.latest_invoice
        if not invoice_id:
            raise ValueError("Fatura não encontrada para esta assinatura.")

        # Expand: payments → cada item → sub-objeto payment → payment_intent (PaymentIntent)
        invoice = stripe.Invoice.retrieve(
            invoice_id,
            expand=["payments.data.payment.payment_intent"],
        )

        payments_data = invoice.payments.data if getattr(invoice, "payments", None) else []
        if not payments_data:
            raise ValueError("Nenhuma tentativa de pagamento encontrada para esta fatura.")

        payment_obj = payments_data[0].payment        # InvoicePayment.Payment
        pi = payment_obj.payment_intent               # PaymentIntent (expandido)

        # Se não veio expandido, busca separadamente pelo ID
        if isinstance(pi, str):
            pi = stripe.PaymentIntent.retrieve(pi)

        if not pi or not pi.client_secret:
            raise ValueError("PaymentIntent sem client_secret. Tente novamente.")

        return {
            "subscription_id": subscription.id,
            "client_secret": pi.client_secret,
        }

    async def create_addon_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
    ) -> str:
        """Cria sessão de checkout para pack de expansão completo."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        if not settings.stripe_price_addon:
            raise ValueError("Pack de expansão não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")
        customer_id = await self.get_or_create_customer(tenant, user_email)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": settings.stripe_price_addon, "quantity": 1}],
            success_url=f"{settings.frontend_url}/configuracoes/planos?addon=1",
            cancel_url=f"{settings.frontend_url}/configuracoes/planos",
            metadata={"tenant_id": str(tenant_id), "type": "addon"},
            subscription_data={"metadata": {"tenant_id": str(tenant_id), "type": "addon"}},
        )
        return session.url

    async def create_addon_dash_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
    ) -> str:
        """Cria sessão de checkout para pack de dashboards individuais."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        price_id = getattr(settings, "stripe_price_addon_dash", None)
        if not price_id:
            raise ValueError("Pack de dashboards não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")
        customer_id = await self.get_or_create_customer(tenant, user_email)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/configuracoes/planos?addon=1",
            cancel_url=f"{settings.frontend_url}/configuracoes/planos",
            metadata={"tenant_id": str(tenant_id), "type": "addon_dashboard"},
            subscription_data={"metadata": {"tenant_id": str(tenant_id), "type": "addon_dashboard"}},
        )
        return session.url

    async def create_addon_dataset_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
    ) -> str:
        """Cria sessão de checkout para pack de datasets individuais."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        price_id = getattr(settings, "stripe_price_addon_dataset", None)
        if not price_id:
            raise ValueError("Pack de fontes de dados não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")
        customer_id = await self.get_or_create_customer(tenant, user_email)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/configuracoes/planos?addon=1",
            cancel_url=f"{settings.frontend_url}/configuracoes/planos",
            metadata={"tenant_id": str(tenant_id), "type": "addon_dataset"},
            subscription_data={"metadata": {"tenant_id": str(tenant_id), "type": "addon_dataset"}},
        )
        return session.url

    async def create_addon_ai_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
    ) -> str:
        """Cria sessão de checkout para pack de IA (+50 perguntas/mês)."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        price_id = getattr(settings, "stripe_price_addon_ai", None)
        if not price_id:
            raise ValueError("Pack de IA não configurado. Entre em contato pelo comercial@jarbis.cc.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")
        customer_id = await self.get_or_create_customer(tenant, user_email)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/configuracoes/planos?addon=1",
            cancel_url=f"{settings.frontend_url}/configuracoes/planos",
            metadata={"tenant_id": str(tenant_id), "type": "addon_ai"},
            subscription_data={"metadata": {"tenant_id": str(tenant_id), "type": "addon_ai"}},
        )
        return session.url

    async def create_addon_rows_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
    ) -> str:
        """Cria sessão de checkout para pack de linhas extras (+100k linhas/dataset)."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        price_id = getattr(settings, "stripe_price_addon_rows", None)
        if not price_id:
            raise ValueError("Pack de linhas não configurado. Entre em contato pelo comercial@jarbis.cc.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")
        customer_id = await self.get_or_create_customer(tenant, user_email)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/configuracoes/planos?addon=1",
            cancel_url=f"{settings.frontend_url}/configuracoes/planos",
            metadata={"tenant_id": str(tenant_id), "type": "addon_rows"},
            subscription_data={"metadata": {"tenant_id": str(tenant_id), "type": "addon_rows"}},
        )
        return session.url

    async def create_portal_session(self, tenant_id: uuid.UUID) -> str:
        """Cria sessão do portal do cliente e retorna a URL."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant or not tenant.stripe_customer_id:
            raise ValueError("Sem assinatura ativa.")

        session = stripe.billing_portal.Session.create(
            customer=tenant.stripe_customer_id,
            return_url=f"{settings.frontend_url}/configuracoes/planos",
        )
        return session.url

    async def handle_webhook(self, payload: bytes, signature: str) -> None:
        """Processa evento Stripe e atualiza o tenant no banco."""
        if not _init_stripe():
            return
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.stripe_webhook_secret
            )
        except stripe.error.SignatureVerificationError:
            raise ValueError("Assinatura do webhook inválida.")

        # Replay protection: rejeita eventos já processados nas últimas 24h
        event_id = event.get("id", "")
        if event_id:
            from app.core.cache import get_redis
            try:
                redis = get_redis()
                redis_key = f"stripe_event:{event_id}"
                already_processed = await redis.get(redis_key)
                if already_processed:
                    return  # idempotente — ignora evento duplicado
                # Marca como processado com TTL de 24 horas
                await redis.set(redis_key, "1", ex=86400)
                await redis.aclose()
            except Exception:
                pass  # Redis indisponível — processa mesmo assim (fail open)

        etype = event["type"]
        data = event["data"]["object"]

        if etype == "checkout.session.completed":
            await self._on_checkout_completed(data)
        elif etype in ("customer.subscription.updated", "customer.subscription.created"):
            await self._on_subscription_updated(data)
        elif etype == "customer.subscription.deleted":
            await self._on_subscription_deleted(data)
        elif etype == "invoice.paid":
            await self._on_invoice_paid(data)
        elif etype == "invoice.payment_failed":
            await self._on_payment_failed(data)

    async def _on_checkout_completed(self, session: dict) -> None:
        tenant_id = session.get("metadata", {}).get("tenant_id")
        if not tenant_id:
            return
        tenant = await self._get_tenant(uuid.UUID(tenant_id))
        if not tenant:
            return

        checkout_type = session.get("metadata", {}).get("type", "")
        sub_id = session.get("subscription")

        if checkout_type == "addon":
            tenant.addon_packs = (getattr(tenant, "addon_packs", 0) or 0) + 1
            await self.db.commit()
            return

        if checkout_type == "addon_dashboard":
            tenant.addon_dashboards = (getattr(tenant, "addon_dashboards", 0) or 0) + 5
            await self.db.commit()
            return

        if checkout_type == "addon_dataset":
            tenant.addon_datasets = (getattr(tenant, "addon_datasets", 0) or 0) + 3
            await self.db.commit()
            return

        if checkout_type == "addon_ai":
            tenant.addon_ai_queries = (getattr(tenant, "addon_ai_queries", 0) or 0) + 1
            await self.db.commit()
            return

        if checkout_type == "addon_rows":
            tenant.addon_row_packs = (getattr(tenant, "addon_row_packs", 0) or 0) + 1
            await self.db.commit()
            return

        tenant.stripe_subscription_id = sub_id
        tenant.subscription_status = "active"

        # Busca o price_id da subscription para mapear o plano
        if sub_id:
            sub = stripe.Subscription.retrieve(sub_id)
            price_id = sub["items"]["data"][0]["price"]["id"]
            plan = PRICE_TO_PLAN.get(price_id)
            if plan:
                tenant.plan = plan
                tenant.trial_ends_at = None  # encerra trial ao assinar

        await self.db.commit()

    async def _on_subscription_updated(self, subscription: dict) -> None:
        sub_id = subscription["id"]
        tenant = await self.db.scalar(
            select(Tenant).where(Tenant.stripe_subscription_id == sub_id)
        )
        if not tenant:
            # tenta via metadata
            tenant_id = subscription.get("metadata", {}).get("tenant_id")
            if tenant_id:
                tenant = await self._get_tenant(uuid.UUID(tenant_id))
        if not tenant:
            return

        status = subscription.get("status", "active")
        tenant.subscription_status = status

        # Salva subscription_id caso ainda não esteja (criação via Elements)
        sub_id = subscription["id"]
        if not tenant.stripe_subscription_id:
            tenant.stripe_subscription_id = sub_id

        items = subscription.get("items", {}).get("data", [])
        # Só ativa o plano quando pagamento confirmado — ignora status incomplete
        if items and status in ("active", "trialing", "past_due"):
            price_id = items[0]["price"]["id"]
            plan = PRICE_TO_PLAN.get(price_id)
            if plan:
                tenant.plan = plan
                tenant.trial_ends_at = None  # encerra trial ao ativar

        if status == "canceled":
            tenant.plan = "free"

        await self.db.commit()

    async def _on_subscription_deleted(self, subscription: dict) -> None:
        sub_id = subscription["id"]
        tenant = await self.db.scalar(
            select(Tenant).where(Tenant.stripe_subscription_id == sub_id)
        )
        if not tenant:
            return
        tenant.plan = "free"
        tenant.subscription_status = "canceled"
        tenant.stripe_subscription_id = None
        await self.db.commit()

    async def _on_invoice_paid(self, invoice: dict) -> None:
        """Salva fatura paga localmente para histórico e relatórios financeiros."""
        from datetime import datetime, timezone
        from decimal import Decimal
        from app.modules.billing.invoice_model import Invoice

        stripe_invoice_id = invoice.get("id")
        if not stripe_invoice_id:
            return

        # Evita duplicatas
        existing = await self.db.scalar(
            select(Invoice).where(Invoice.stripe_invoice_id == stripe_invoice_id)
        )
        if existing:
            existing.status = "paid"
            existing.paid_at = datetime.now(timezone.utc)
            await self.db.commit()
            return

        # Descobre tenant via stripe_customer_id
        customer_id = invoice.get("customer")
        tenant = None
        if customer_id:
            tenant = await self.db.scalar(
                select(Tenant).where(Tenant.stripe_customer_id == customer_id)
            )

        # Valor em centavos → reais
        amount_cents = invoice.get("amount_paid", 0) or 0
        amount = Decimal(str(amount_cents)) / 100

        # Período da fatura
        lines = invoice.get("lines", {}).get("data", [])
        period_start = period_end = None
        if lines:
            p = lines[0].get("period", {})
            if p.get("start"):
                period_start = datetime.fromtimestamp(p["start"], tz=timezone.utc)
            if p.get("end"):
                period_end = datetime.fromtimestamp(p["end"], tz=timezone.utc)

        # Plano do tenant no momento
        plan = tenant.plan if tenant else None

        inv = Invoice(
            tenant_id=tenant.id if tenant else None,
            stripe_invoice_id=stripe_invoice_id,
            amount=amount,
            currency=(invoice.get("currency") or "brl").lower(),
            status="paid",
            period_start=period_start,
            period_end=period_end,
            paid_at=datetime.now(timezone.utc),
            invoice_pdf=invoice.get("invoice_pdf"),
            plan=plan,
        )
        self.db.add(inv)
        await self.db.commit()

    async def _on_payment_failed(self, invoice: dict) -> None:
        from datetime import datetime, timezone
        from decimal import Decimal
        from app.modules.billing.invoice_model import Invoice

        customer_id = invoice.get("customer")
        if not customer_id:
            return
        tenant = await self.db.scalar(
            select(Tenant).where(Tenant.stripe_customer_id == customer_id)
        )
        if not tenant:
            return
        tenant.subscription_status = "past_due"

        # Registra fatura com falha também
        stripe_invoice_id = invoice.get("id")
        if stripe_invoice_id:
            existing = await self.db.scalar(
                select(Invoice).where(Invoice.stripe_invoice_id == stripe_invoice_id)
            )
            if not existing:
                amount_cents = invoice.get("amount_due", 0) or 0
                inv = Invoice(
                    tenant_id=tenant.id,
                    stripe_invoice_id=stripe_invoice_id,
                    amount=Decimal(str(amount_cents)) / 100,
                    currency=(invoice.get("currency") or "brl").lower(),
                    status="open",
                    plan=tenant.plan,
                )
                self.db.add(inv)

        await self.db.commit()

    async def get_billing_status(self, tenant_id: uuid.UUID) -> dict:
        """Retorna plano, limites, uso atual e status."""
        from sqlalchemy import func
        from app.modules.reports.models import Report
        from app.modules.reports.dataset_models import ReportDataset
        from app.modules.reports.alert_models import ReportAlert
        from app.modules.tenants.models import User
        from app.modules.billing.plan_limits import PLAN_LIMITS, PLAN_NAMES

        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")

        plan = tenant.plan or "free"
        addon_packs = getattr(tenant, "addon_packs", 0) or 0
        addon_dashboards = getattr(tenant, "addon_dashboards", 0) or 0
        addon_datasets = getattr(tenant, "addon_datasets", 0) or 0
        addon_ai_queries = getattr(tenant, "addon_ai_queries", 0) or 0
        addon_row_packs = getattr(tenant, "addon_row_packs", 0) or 0
        limits = get_effective_limits(plan, addon_packs, addon_dashboards, addon_datasets, addon_ai_queries, addon_row_packs)

        dash_count = await self.db.scalar(
            select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)
        ) or 0
        ds_count = await self.db.scalar(
            select(func.count()).select_from(ReportDataset).where(
                ReportDataset.tenant_id == tenant_id,
                ReportDataset.is_demo.is_(False),
            )
        ) or 0
        user_count = await self.db.scalar(
            select(func.count()).select_from(User).where(
                User.tenant_id == tenant_id, User.is_active == True  # noqa: E712
            )
        ) or 0
        alert_count = await self.db.scalar(
            select(func.count()).select_from(ReportAlert).where(ReportAlert.tenant_id == tenant_id)
        ) or 0
        max_row_count = await self.db.scalar(
            select(func.max(ReportDataset.row_count)).where(
                ReportDataset.tenant_id == tenant_id,
                ReportDataset.is_demo.is_(False),
            )
        ) or 0

        from app.modules.links.models import LinkCampaign, ShortLink
        link_campaign_count = await self.db.scalar(
            select(func.count()).select_from(LinkCampaign).where(LinkCampaign.tenant_id == tenant_id)
        ) or 0
        link_count = await self.db.scalar(
            select(func.count()).select_from(ShortLink).where(ShortLink.tenant_id == tenant_id)
        ) or 0

        return {
            "plan": plan,
            "plan_name": PLAN_NAMES.get(plan, plan),
            "subscription_status": tenant.subscription_status,
            "trial_days_remaining": tenant.trial_days_remaining if plan == "free" else None,
            "has_stripe": bool(tenant.stripe_customer_id),
            "has_active_subscription": bool(
                tenant.stripe_subscription_id
                and tenant.subscription_status in ("active", "trialing")
            ),
            "addon_packs": addon_packs,
            "addon_dashboards": addon_dashboards,
            "addon_datasets": addon_datasets,
            "addon_ai_queries": addon_ai_queries,
            "addon_row_packs": addon_row_packs,
            "limits": limits,
            "usage": {
                "dashboards": dash_count,
                "datasets": ds_count,
                "users": user_count,
                "alerts": alert_count,
                "rows": max_row_count,
                "link_campaigns": link_campaign_count,
                "links": link_count,
            },
        }
