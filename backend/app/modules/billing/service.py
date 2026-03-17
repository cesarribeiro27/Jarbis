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
        # Novos planos
        settings.stripe_price_solo:      "solo",
        settings.stripe_price_equipe:    "equipe",
        settings.stripe_price_ilimitado: "ilimitado",
        # Legados — para webhooks de subscriptions antigas
        settings.stripe_price_starter:   "starter",
        settings.stripe_price_pro:       "professional",
        settings.stripe_price_enterprise: "enterprise",
    }
    PRICE_TO_PLAN = {k: v for k, v in PRICE_TO_PLAN.items() if k}


_build_price_map()


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_tenant(self, tenant_id: uuid.UUID) -> Tenant | None:
        return await self.db.scalar(select(Tenant).where(Tenant.id == tenant_id))

    async def get_or_create_customer(self, tenant: Tenant, email: str) -> str:
        """Retorna stripe_customer_id, criando no Stripe se necessário."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        if tenant.stripe_customer_id:
            return tenant.stripe_customer_id
        customer = stripe.Customer.create(
            email=email,
            name=tenant.name,
            metadata={"tenant_id": str(tenant.id)},
        )
        tenant.stripe_customer_id = customer.id
        await self.db.commit()
        return customer.id

    async def create_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
        price_id: str,
    ) -> str:
        """Cria sessão de checkout e retorna a URL."""
        if not _init_stripe():
            raise ValueError("Stripe não configurado.")
        tenant = await self._get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant não encontrado.")

        customer_id = await self.get_or_create_customer(tenant, user_email)

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/configuracoes/planos?success=1",
            cancel_url=f"{settings.frontend_url}/configuracoes/planos?canceled=1",
            metadata={"tenant_id": str(tenant_id)},
            subscription_data={"metadata": {"tenant_id": str(tenant_id)}},
            allow_promotion_codes=True,
        )
        return session.url

    async def create_addon_checkout_session(
        self,
        tenant_id: uuid.UUID,
        user_email: str,
    ) -> str:
        """Cria sessão de checkout para pack de expansão."""
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

        etype = event["type"]
        data = event["data"]["object"]

        if etype == "checkout.session.completed":
            await self._on_checkout_completed(data)
        elif etype in ("customer.subscription.updated", "customer.subscription.created"):
            await self._on_subscription_updated(data)
        elif etype == "customer.subscription.deleted":
            await self._on_subscription_deleted(data)
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
            # Pack de expansão: incrementa addon_packs
            current = getattr(tenant, "addon_packs", 0) or 0
            tenant.addon_packs = current + 1
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

        items = subscription.get("items", {}).get("data", [])
        if items:
            price_id = items[0]["price"]["id"]
            plan = PRICE_TO_PLAN.get(price_id)
            if plan:
                tenant.plan = plan

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

    async def _on_payment_failed(self, invoice: dict) -> None:
        customer_id = invoice.get("customer")
        if not customer_id:
            return
        tenant = await self.db.scalar(
            select(Tenant).where(Tenant.stripe_customer_id == customer_id)
        )
        if not tenant:
            return
        tenant.subscription_status = "past_due"
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
        limits = get_effective_limits(plan, addon_packs)

        dash_count = await self.db.scalar(
            select(func.count()).select_from(Report).where(Report.tenant_id == tenant_id)
        ) or 0
        ds_count = await self.db.scalar(
            select(func.count()).select_from(ReportDataset).where(ReportDataset.tenant_id == tenant_id)
        ) or 0
        user_count = await self.db.scalar(
            select(func.count()).select_from(User).where(
                User.tenant_id == tenant_id, User.is_active == True  # noqa: E712
            )
        ) or 0
        alert_count = await self.db.scalar(
            select(func.count()).select_from(ReportAlert).where(ReportAlert.tenant_id == tenant_id)
        ) or 0

        return {
            "plan": plan,
            "plan_name": PLAN_NAMES.get(plan, plan),
            "subscription_status": tenant.subscription_status,
            "trial_days_remaining": tenant.trial_days_remaining,
            "has_stripe": bool(tenant.stripe_customer_id),
            "addon_packs": addon_packs,
            "limits": limits,
            "usage": {
                "dashboards": dash_count,
                "datasets": ds_count,
                "users": user_count,
                "alerts": alert_count,
            },
        }
