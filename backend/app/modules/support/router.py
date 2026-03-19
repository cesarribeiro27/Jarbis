"""
Módulo de suporte: chatbot flutuante com Claude Haiku.
- Free: resposta FAQ fixo (sem chamar Anthropic)
- Solo: IA real com limite de 40 mensagens/mês
- Profissional+: IA real ilimitada
Endpoint stateless — histórico mantido no frontend.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import anthropic

from app.config import settings
from app.core.exceptions import PlanLimitError
from app.core.rate_limit import limiter
from app.database import get_db
from app.modules.auth.dependencies import get_current_active_user
from app.modules.billing.guards import check_halp_limit
from app.modules.billing.plan_limits import PLANS
from app.modules.support.models import HalpUsageLog
from app.modules.tenants.models import Tenant, User

router = APIRouter(prefix="/support", tags=["support"])

SYSTEM_PROMPT = """Você é o assistente de suporte do Jarbis, uma plataforma de Business Intelligence (BI) para PMEs brasileiras.

Responda APENAS sobre o Jarbis — funcionalidades, planos, como usar. Não analise dados do usuário nem responda perguntas fora do escopo do produto.
Seja direto, amigável e use sempre português brasileiro. Respostas curtas e objetivas.

FUNCIONALIDADES PRINCIPAIS:
- Dashboards: criar, editar com drag-and-drop, organizar em múltiplas páginas, compartilhar via link público
- Blocos disponíveis: KPI (número em destaque com delta %), Barras, Barras horizontais, Área, Linhas, Pizza, Dispersão (XY), Combo (barras+linha), Bolhas, Treemap, Gauge, Velocímetro, Tabela, Texto livre, Filtro interativo, Slider de data, Imagem
- Datasets: upload CSV/Excel, conexão via URL de API externa com auto-refresh configurável
- Filtros: filtros cruzados entre blocos do mesmo dataset, filtro global de data range
- Compartilhamento: gerar link público com token único, idioma configurável (8 idiomas: pt-BR, es, en, fr, de, it, zh, ja)
- Alertas: notificações automáticas quando métricas atingem thresholds configurados
- Embed: incorporar dashboards em outros sites via iframe com token de embed
- IA (planos Profissional+): fazer perguntas em linguagem natural sobre seus dados

PLANOS:
- Gratuito: 2 dashboards, 2 datasets, 1 usuário, 0 alertas — grátis para sempre
- Solo (R$79,90/mês): 8 dashboards, 8 datasets, 1 usuário, 5 alertas + assistente com IA (40 msgs/mês)
- Profissional (R$189,90/mês): 20 dashboards, 15 datasets, 1 usuário, 15 alertas + IA avançada
- Grupo (R$599,90/mês): 50 dashboards, 30 datasets, 5 usuários, 50 alertas + IA avançada
- Enterprise: limites customizados, SLA, suporte dedicado — sob consulta

COMO FAZER COISAS COMUNS:
- Criar dashboard: menu Dashboards → botão "Novo dashboard"
- Adicionar bloco: no dashboard em edição, clicar no "+" da paleta lateral ou arrastar tipo de bloco
- Conectar dataset: no dashboard, painel lateral → aba Dados → "Adicionar dataset" → upload CSV ou URL de API
- Compartilhar: botão "Compartilhar" no dashboard → copiar link público
- Mudar idioma do link: configurações do canvas → "Idioma do link público"
- Configurar alerta: menu Alertas → "Novo alerta" → selecionar dataset, coluna, threshold e canal
- Gerenciar plano: menu Configurações → Planos

Se não souber a resposta, diga honestamente e sugira enviar email para comercial@jarbis.cc."""

FAQ_RESPONSE = """Olá! No plano Gratuito posso te ajudar com as dúvidas mais comuns:

**Como fazer as coisas principais:**
• **Criar dashboard** → Dashboards → "Novo dashboard"
• **Adicionar dados** → Painel lateral no dashboard → aba Dados → "Adicionar dataset"
• **Compartilhar** → Botão "Compartilhar" no dashboard → copiar link
• **Configurar alerta** → Menu Alertas → "Novo alerta"
• **Ver meu plano** → Configurações → Planos

Para assistente inteligente com respostas personalizadas, faça upgrade para o plano **Solo** (R$79,90/mês).

Outras dúvidas? Escreva para **comercial@jarbis.cc**"""


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    used: int = 0
    limit: int = 0  # 0 = FAQ/ilimitado


class UsageResponse(BaseModel):
    plan: str
    used: int
    limit: int      # 0 = FAQ fixo, -1 = ilimitado
    remaining: int  # -1 = ilimitado


@router.get("/usage", response_model=UsageResponse)
async def get_halp_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna uso mensal do Halp para o tenant."""
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    plan = tenant.plan if tenant else "free"
    limits = PLANS.get(plan, PLANS["free"])
    max_halp = limits.max_halp_monthly

    if max_halp == 0:
        return UsageResponse(plan=plan, used=0, limit=0, remaining=0)

    if max_halp == -1:
        return UsageResponse(plan=plan, used=0, limit=-1, remaining=-1)

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    used = await db.scalar(
        select(func.count()).select_from(HalpUsageLog).where(
            HalpUsageLog.tenant_id == current_user.tenant_id,
            HalpUsageLog.created_at >= month_start,
        )
    ) or 0

    return UsageResponse(plan=plan, used=used, limit=max_halp, remaining=max(0, max_halp - used))


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("30/hour")
async def support_chat(
    request: Request,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Chat de suporte com Claude Haiku. Stateless — histórico enviado pelo frontend."""
    tenant = await db.scalar(select(Tenant).where(Tenant.id == current_user.tenant_id))
    plan = tenant.plan if tenant else "free"
    limits = PLANS.get(plan, PLANS["free"])
    max_halp = limits.max_halp_monthly

    # Free: FAQ fixo, sem chamada à IA
    if max_halp == 0:
        return ChatResponse(reply=FAQ_RESPONSE, used=0, limit=0)

    # Solo/Profissional+: verificar cota
    try:
        await check_halp_limit(db, current_user.tenant_id, plan)
    except PlanLimitError as e:
        if "halp_faq_only" in str(e):
            return ChatResponse(reply=FAQ_RESPONSE, used=0, limit=0)
        raise

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    messages = [{"role": m.role, "content": m.content} for m in body.history[-10:]]
    messages.append({"role": "user", "content": body.message})

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    # Registrar uso (apenas planos com limite definido)
    if max_halp != -1:
        db.add(HalpUsageLog(
            id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            plan=plan,
        ))
        await db.commit()

    # Buscar uso atualizado
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    used = await db.scalar(
        select(func.count()).select_from(HalpUsageLog).where(
            HalpUsageLog.tenant_id == current_user.tenant_id,
            HalpUsageLog.created_at >= month_start,
        )
    ) or 0

    return ChatResponse(
        reply=response.content[0].text,
        used=used,
        limit=max_halp if max_halp != -1 else 0,
    )
