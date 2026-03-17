"""
Módulo de suporte: chatbot flutuante com Claude Haiku.
Endpoint stateless — histórico mantido no frontend.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

import anthropic

from app.config import settings
from app.core.rate_limit import limiter
from app.modules.auth.dependencies import get_current_active_user
from app.modules.tenants.models import User

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
- Solo (R$79,90/mês): 8 dashboards, 8 datasets, 1 usuário, 5 alertas
- Profissional (R$189,90/mês): 20 dashboards, 15 datasets, 1 usuário, 15 alertas + IA
- Ilimitado (R$599,90/mês): 50 dashboards, 30 datasets, 5 usuários, 50 alertas + IA
- Enterprise: limites customizados, SLA, suporte dedicado — sob consulta

COMO FAZER COISAS COMUNS:
- Criar dashboard: menu Dashboards → botão "Novo dashboard"
- Adicionar bloco: no dashboard em edição, clicar no "+" da paleta lateral ou arrastar tipo de bloco
- Conectar dataset: no dashboard, painel lateral → aba Dados → "Adicionar dataset" → upload CSV ou URL de API
- Compartilhar: botão "Compartilhar" no dashboard → copiar link público
- Mudar idioma do link: configurações do canvas → "Idioma do link público"
- Configurar alerta: menu Alertas → "Novo alerta" → selecionar dataset, coluna, threshold e canal

Se não souber a resposta, diga honestamente e sugira enviar email para comercial@jarbis.cc."""


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/hour")
async def support_chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Chat de suporte com Claude Haiku. Stateless — histórico enviado pelo frontend."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Montar histórico (máx 10 mensagens anteriores para economizar tokens)
    messages = [{"role": m.role, "content": m.content} for m in body.history[-10:]]
    messages.append({"role": "user", "content": body.message})

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    return ChatResponse(reply=response.content[0].text)
