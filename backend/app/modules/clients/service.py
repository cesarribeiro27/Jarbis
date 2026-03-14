"""Service — Clientes."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.media_plans.models import MediaPlan

from .models import Client


class ClientService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_clients(self, tenant_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(Client).where(Client.tenant_id == tenant_id).order_by(Client.nome)
        )
        clients = result.scalars().all()

        # Contar planos por cliente (pelo client_id ou pelo nome como fallback)
        plan_counts: dict[uuid.UUID, int] = {}
        if clients:
            ids = [c.id for c in clients]
            counts_result = await self.db.execute(
                select(MediaPlan.client_id, func.count(MediaPlan.id))
                .where(MediaPlan.client_id.in_(ids))
                .group_by(MediaPlan.client_id)
            )
            plan_counts = {row[0]: row[1] for row in counts_result}

        return [
            {**{col.key: getattr(c, col.key) for col in Client.__table__.columns},
             "total_planos": plan_counts.get(c.id, 0)}
            for c in clients
        ]

    async def get_client(self, client_id: uuid.UUID, tenant_id: uuid.UUID) -> Client | None:
        result = await self.db.execute(
            select(Client).where(Client.id == client_id, Client.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create_client(self, tenant_id: uuid.UUID, data: dict) -> Client:
        client = Client(tenant_id=tenant_id, **data)
        self.db.add(client)
        await self.db.commit()
        await self.db.refresh(client)
        return client

    async def update_client(self, client_id: uuid.UUID, tenant_id: uuid.UUID, data: dict) -> Client | None:
        client = await self.get_client(client_id, tenant_id)
        if not client:
            return None
        for k, v in data.items():
            setattr(client, k, v)
        await self.db.commit()
        await self.db.refresh(client)
        return client

    async def delete_client(self, client_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        client = await self.get_client(client_id, tenant_id)
        if not client:
            return False
        await self.db.delete(client)
        await self.db.commit()
        return True

    async def get_client_plans(self, client_id: uuid.UUID, tenant_id: uuid.UUID) -> list[MediaPlan]:
        result = await self.db.execute(
            select(MediaPlan).where(
                MediaPlan.client_id == client_id,
                MediaPlan.tenant_id == tenant_id,
            ).order_by(MediaPlan.created_at.desc())
        )
        return result.scalars().all()
