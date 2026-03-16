# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jarbis** — SaaS de BI embarcado para PMEs brasileiras. Multi-tenant, com dashboards interativos, datasets (CSV/API), alertas e billing via Stripe.

- **Repo correto:** `/Users/cesarribeiro/jarbis/Jarbis/` (NÃO usar `/Users/cesarribeiro/jarbis/` — repo fantasma)
- **GitHub:** `cesarribeiro27/Jarbis`
- **Backend:** Railway (auto-deploy no push) → `jarbis-production.up.railway.app`
- **Frontend:** Vercel (auto-deploy no push) → `jarbis.cc`
- **Login master local:** `Cesar / 123`

## Commands

```bash
# Desenvolvimento local com Docker
make up           # Sobe todos os serviços
make logs         # Logs em tempo real
make migrate      # Aplica migrations pendentes
make shell-backend  # Bash no container do backend
make shell-db       # psql direto

# Migrations
alembic upgrade head                          # Aplica todas
alembic revision --autogenerate -m "desc"     # Cria nova migration
# Em produção (Railway): rodam automaticamente via entrypoint.sh no startup

# Frontend
cd frontend && npm run dev    # localhost:3001
cd frontend && npm run build  # build de produção

# Backend sem Docker
cd backend
uvicorn app.main:app --reload --port 8000
```

URLs locais: Frontend `localhost:3001`, Backend `localhost:8000`, Docs `localhost:8000/docs`

## Architecture

### Stack
- **Backend:** FastAPI + SQLAlchemy 2.0 async (asyncpg) + PostgreSQL + Redis + Alembic
- **Frontend:** Next.js 15 App Router + React 19 + Tailwind CSS + Recharts + React Grid Layout
- **Docker containers:** `lumetra_backend`, `lumetra_frontend`, `lumetra_postgres`, `lumetra_redis` (nomes históricos)

### Backend — estrutura de módulos

```
backend/app/
├── main.py          # FastAPI app, CORS, SlowAPI, lifespan, background refresh loop
├── config.py        # Pydantic BaseSettings — carrega .env, expõe `settings`
├── database.py      # Engine async, AsyncSessionLocal, get_db() dependency
├── core/
│   ├── security.py      # JWT encode/decode, bcrypt hash/verify
│   ├── rate_limit.py    # SlowAPI limiter instance
│   ├── exceptions.py    # UnauthorizedError, ConflictError
│   └── pagination.py    # Helpers de paginação
└── modules/
    ├── auth/        # Registro, login, convite, roles, verificação de email
    ├── tenants/     # Modelo Tenant e User (multi-tenancy)
    ├── reports/     # Dashboards, blocos, datasets, share tokens, AI query
    └── billing/     # Stripe checkout, webhook, limites por plano
```

### Multi-tenancy
Todo dado é isolado por `tenant_id`. Todas as queries incluem `WHERE tenant_id = user.tenant_id`. Nunca há acesso cross-tenant.

Roles: `owner > admin > member > viewer`

### Reports / Dashboards
- `Report` tem `blocks: JSONB` (legado) e `pages: JSONB` (atual — array de `{id, title, blocks:[]}`)
- `ReportDataset` suporta tipo `csv` (upload) e `api` (URL externa com auto-refresh)
- Blocos são totalmente flexíveis via JSONB — config renderizada no frontend pelo `ReportBuilder.jsx`
- Share público via token em `GET /reports/public/{token}` (sem auth)

### Frontend — componentes chave

```
frontend/
├── app/
│   ├── dashboard/          # Painel inicial (métricas, recentes)
│   ├── dashboards/
│   │   ├── page.jsx        # Lista de dashboards com cards + cropper de capa
│   │   ├── novo/page.jsx   # Criação de novo dashboard
│   │   └── [id]/page.jsx   # Edição/visualização de dashboard existente
│   ├── admin/lab/page.jsx  # UI Lab — calibração de componentes
│   └── configuracoes/      # Usuários e configurações da conta
├── components/
│   ├── AppLayout.jsx        # Sidebar esquerda com navegação
│   ├── DashboardRail.jsx    # Barra lateral direita de 6 ícones (edit mode)
│   └── ReportBuilder.jsx    # Engine de renderização dos blocos (2000+ linhas)
│       # Exporta: BlockConfigPanel, DatasetPanel, CanvasConfigPanel
└── lib/
    ├── api.js              # Cliente HTTP — JWT em localStorage, Bearer header
    └── toast.js            # Sistema de notificações
```

### Auth flow
1. Login → `POST /auth/login` → recebe `access_token` (60min) + `refresh_token` (7 dias)
2. Frontend armazena em `localStorage` como `jarbis_token`
3. Toda requisição envia `Authorization: Bearer <token>`
4. 401 → redireciona para `/login` e limpa localStorage

### Dependency injection (backend)
```python
# Usuário autenticado
from app.modules.auth.dependencies import get_current_user, get_current_active_user
user: User = Depends(get_current_active_user)

# Database session
db: AsyncSession = Depends(get_db)
```

### Route ordering (crítico)
Em `reports/router.py`, rotas com path params genéricos (`/{report_id}`) devem sempre ficar **no final do arquivo** — do contrário capturam rotas estáticas como `/datasets`, `/public`, etc., causando erro UUID parse.

### Migrations
Arquivos em `backend/migrations/versions/`. Seguir o padrão de revision ID alfanumérico curto (ex: `h2i3j4k5l6m7`). O `down_revision` deve apontar para a migration anterior. O `entrypoint.sh` roda `alembic upgrade head` automaticamente no startup do container.

### Deploy
Push para `main` no GitHub aciona:
- **Railway:** rebuild do backend Docker + restart (migrations rodam no startup)
- **Vercel:** rebuild do frontend Next.js

Para checar status do deploy Railway:
```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer <RAILWAY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ project(id: \"b0427fd6-f044-412f-8abd-c337c34393dc\") { services { edges { node { name deployments(first: 1) { edges { node { id status } } } } } } } }"}'
```
