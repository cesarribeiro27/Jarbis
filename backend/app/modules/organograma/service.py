"""Service — Organograma."""

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import OrgMember, OrgShare


class OrgService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_members(self, tenant_id: uuid.UUID) -> list[OrgMember]:
        result = await self.db.execute(
            select(OrgMember)
            .where(OrgMember.tenant_id == tenant_id)
            .order_by(OrgMember.ordem, OrgMember.nome)
        )
        return result.scalars().all()

    async def get_member(self, member_id: uuid.UUID, tenant_id: uuid.UUID) -> OrgMember | None:
        result = await self.db.execute(
            select(OrgMember).where(OrgMember.id == member_id, OrgMember.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create_member(self, tenant_id: uuid.UUID, data: dict) -> OrgMember:
        member = OrgMember(tenant_id=tenant_id, **data)
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def update_member(self, member_id: uuid.UUID, tenant_id: uuid.UUID, data: dict) -> OrgMember | None:
        member = await self.get_member(member_id, tenant_id)
        if not member:
            return None
        for k, v in data.items():
            setattr(member, k, v)
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def delete_member(self, member_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        member = await self.get_member(member_id, tenant_id)
        if not member:
            return False
        await self.db.delete(member)
        await self.db.commit()
        return True

    async def get_share(self, tenant_id: uuid.UUID) -> OrgShare | None:
        result = await self.db.execute(
            select(OrgShare).where(OrgShare.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create_share(self, tenant_id: uuid.UUID) -> OrgShare:
        existing = await self.get_share(tenant_id)
        if existing:
            return existing
        token = secrets.token_urlsafe(32)
        share = OrgShare(tenant_id=tenant_id, token=token)
        self.db.add(share)
        await self.db.commit()
        await self.db.refresh(share)
        return share

    async def revoke_share(self, tenant_id: uuid.UUID) -> bool:
        share = await self.get_share(tenant_id)
        if not share:
            return False
        await self.db.delete(share)
        await self.db.commit()
        return True

    async def get_members_by_token(self, token: str) -> tuple[list[OrgMember], uuid.UUID] | None:
        result = await self.db.execute(
            select(OrgShare).where(OrgShare.token == token)
        )
        share = result.scalar_one_or_none()
        if not share:
            return None
        members = await self.list_members(share.tenant_id)
        return members, share.tenant_id
