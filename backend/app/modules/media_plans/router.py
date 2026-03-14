"""
Endpoints Planos de Mídia

POST /media-plans/upload      — Upload xlsx → parse → persiste
GET  /media-plans             — Lista planos do tenant
GET  /media-plans/{id}        — Detalhes com todos os itens
DELETE /media-plans/{id}      — Remove plano e itens
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

from .schemas import ItemUpdateRequest, MaterialItemRow, MediaPlanItemResponse, MediaPlanResponse, MediaPlanSummary, UploadResult
from .service import MediaPlanService

router = APIRouter(prefix="/media-plans", tags=["Planos de Mídia"])

_ALLOWED_EXTENSIONS = (".xlsx", ".xls")
_MAX_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post(
    "/upload",
    response_model=UploadResult,
    status_code=201,
    summary="Upload de plano de mídia em Excel",
)
async def upload_plan(
    file: Annotated[UploadFile, File(description="Arquivo .xlsx ou .xls do plano de mídia")],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Recebe um arquivo Excel de plano de mídia, detecta automaticamente as abas
    (TV, Rádio, Jornal, OOH, Digital…) e salva os dados estruturados no banco.
    """
    filename = file.filename or "plano.xlsx"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Envie um arquivo .xlsx ou .xls")

    content = await file.read()
    if len(content) > _MAX_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 20 MB)")

    service = MediaPlanService(db)
    plan = await service.upload_xlsx(
        tenant_id=current_user.tenant_id,
        filename=filename,
        file_bytes=content,
    )

    meios = list({it.meio for it in plan.items})
    erros = []
    if plan.parse_erros:
        import json
        erros = json.loads(plan.parse_erros)

    return UploadResult(
        plan_id=plan.id,
        nome=plan.nome,
        total_items=len(plan.items),
        meios_encontrados=sorted(meios),
        parse_status=plan.parse_status,
        parse_erros=erros,
    )


@router.get(
    "",
    response_model=list[MediaPlanSummary],
    summary="Lista planos de mídia do tenant",
)
async def list_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MediaPlanService(db)
    plans = await service.list_plans(current_user.tenant_id)
    return [MediaPlanSummary(**p) for p in plans]


@router.get(
    "/items/material",
    response_model=list[MaterialItemRow],
    summary="Lista todos os itens de material do tenant",
)
async def list_material_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MediaPlanService(db)
    return await service.list_material_items(current_user.tenant_id)


@router.get(
    "/{plan_id}",
    response_model=MediaPlanResponse,
    summary="Detalhes do plano com todos os itens",
)
async def get_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MediaPlanService(db)
    plan = await service.get_plan(plan_id, current_user.tenant_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    invest = sum(
        it.custo_total or it.custo_negociado or 0
        for it in plan.items
        if it.custo_total or it.custo_negociado
    ) or None

    return MediaPlanResponse(
        id=plan.id,
        tenant_id=plan.tenant_id,
        nome=plan.nome,
        anunciante=plan.anunciante,
        agencia=plan.agencia,
        produto=plan.produto,
        data_inicio=plan.data_inicio,
        data_fim=plan.data_fim,
        budget_total=plan.budget_total,
        moeda=plan.moeda,
        arquivo_nome=plan.arquivo_nome,
        parse_status=plan.parse_status,
        parse_erros=plan.parse_erros,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        items=plan.items,
        total_items=len(plan.items),
        investimento_total=invest,
    )


@router.patch(
    "/{plan_id}/items/{item_id}",
    response_model=MediaPlanItemResponse,
    summary="Atualiza status PI e material de um item do plano",
)
async def update_item(
    plan_id: uuid.UUID,
    item_id: uuid.UUID,
    body: ItemUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MediaPlanService(db)
    item = await service.update_item(plan_id, item_id, current_user.tenant_id, body.model_dump(exclude_none=True))
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item


@router.delete(
    "/{plan_id}",
    status_code=204,
    summary="Remove plano de mídia",
)
async def delete_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = MediaPlanService(db)
    deleted = await service.delete_plan(plan_id, current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
