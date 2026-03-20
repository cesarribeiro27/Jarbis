# Changelog — Jarbis

Formato: `vMAJOR.MINOR.PATCH`
- **MAJOR**: mudança estrutural grande
- **MINOR**: nova feature ou melhoria visível
- **PATCH**: bug fix, ajuste de texto, tradução

---

## v01.07.00 — 2026-03-20

### Sprint 10 — Sub-organizações e Warp Cache

- **N27**: Sub-organizações (multi-tenant enterprise) — tenants do plano Ilimitado podem criar sub-orgs filhas, alternar contexto com banner visual, gerenciar via `/configuracoes/sub-orgs`
- **N29**: Warp Cache (aceleração de queries) — rows de datasets pré-computadas em Redis (TTL=1h), 3 camadas de cache: query-specific → Warp rows → PostgreSQL; badge "Warp ativo" no detalhe do dataset
- **Fix**: Login com credenciais erradas agora exibe mensagem de erro em vez de fazer loop silencioso (401 em rotas de auth não redireciona mais para /login)
- **Fix UX**: dark mode corrigido nas telas de templates, datasets e detalhe de dataset

---

## v01.06.03 — 2026-03-20

### Fixes UX

- Tela de templates agora usa AppLayout padrão (sidebar + header do site)
- Blocos sem dataset conectado exibem estado vazio amigável em vez de "Erro desconhecido"
- Botões de upgrade nos cards de plano agora redirecionam corretamente ao Stripe (novo endpoint `/billing/checkout/plan`)

---

## v01.06.00 — 2026-03-20

### Sprint 9 — SMS Alerts, Google Analytics, SDK NPM

- **N34**: Alertas via SMS (Twilio) — campo `notify_sms` no modelo, envio automático nas notificações de alerta
- **N30**: Conector Google Analytics Data API v1 — importa sessões, usuários, bounce rate por Property ID + API Key
- **N31**: SDK NPM `@jarbis/react-embed` — componente `<JarbisDashboard>` com iframe, postMessage, filtros e temas; página de documentação em `/configuracoes/sdk`

---

## v01.05.00 — 2026-03-20

### Sprint 8 — Novos tipos de gráfico e interatividade embed

- **N25**: Brush Filter — seleção de intervalo arrastando em line/bar/area charts
- **N26**: Gantt Chart — timeline visual com barras coloridas por grupo
- **N28**: Custom Events — `window.parent.postMessage` ao clicar em elementos (para embed)
- **N32**: Sankey Diagram — SVG de fluxo entre categorias (source → target → value)
- **N33**: Candlestick OHLC — velas com wick, body colorido por alta/baixa
- **N33**: Box Plot — whiskers, Q1-Q3, mediana por grupo (até 8 grupos)

---

## v01.04.00 — 2026-03-20

### Sprint 7 — Observabilidade, gráficos analíticos e customização

- **N19**: Query Logs — tabela `query_logs`, endpoint e página `/configuracoes/query-logs` com status/duração/cache
- **N20**: Histograma — agrupamento automático em bins configuráveis (5–50)
- **N21**: Bullet Chart — barra de valor vs meta com marcador vertical (verde/vermelho)
- **N22**: Custom CSS por dashboard — textarea no CanvasConfig, `<style>` injetado no canvas
- **N23**: Timezone por dashboard — dropdown com 18 fusos horários (padrão America/Sao_Paulo)
- **N24**: Value Mapping — mapeamento De/Para/Cor aplicado em todos os 28 tipos de bloco

---

## v01.03.00 — 2026-03-20

### Sprint 6 — Conectores de banco, Collections, Pivot Table

- **N13**: Conector PostgreSQL/MySQL direto — Fernet encryption, asyncpg/aiomysql, endpoints test/create/sync
- **N14**: Pivot Table — cross-tab com agrupamento row×col e totais por linha/coluna/geral
- **N15**: Collections/Pastas — sidebar de pastas nos dashboards, CRUD completo via API
- **N18**: AI Summary Widget — bloco autônomo que gera insight automático via ai-query
- Migrations: `e5f6g7h8i9j0` (db fields), `ab1c2d3e4f5g` (collections)

---

## v01.02.00 — 2026-03-19

### Sprint 5 — Heatmap, Waterfall, Versionamento, Export XLS

- **N7**: Version history — snapshots automáticos ao salvar, restauração de versões anteriores
- **N8**: Heatmap — grid colorido por intensidade (div-based com rgba)
- **N9**: Waterfall chart — ComposedChart com barra base transparente + valor colorido
- **N10**: Go-to-URL on click — clique em barra/ponto abre URL configurável com `{label}`
- **N11**: Email agendado com link (base para PDF anexado)
- **N12**: Export XLSX por bloco (XML Spreadsheet format)
- Alertas multi-canal: `notify_email` e `notify_slack_url` no modelo
- Datasets: `sync_mode` (replace/append) e `computed_columns` (simpleeval)
- Relatórios agendados: model, service e página `/configuracoes/relatorios`

---

## v01.01.00 — 2026-03-19

### Sprint 4 — Canvas UX, Undo/Redo, Export, Stacked charts, IA

- **N1**: Undo/Redo no canvas (Ctrl+Z / Ctrl+Y, até 20 passos)
- **N2**: Export CSV por bloco
- **N3**: Export PDF do dashboard (html2canvas → jsPDF)
- **N4**: Stacked Bar + Stacked Area (Recharts com `stackId`)
- **N5**: AI → adicionar bloco ao canvas diretamente do painel IA
- **N6**: Query caching Redis (TTL 5min, invalidação por versão do dataset)
- Canvas UX: auto-fill dataset, drop zone visual, mini-toolbar flutuante, selected block com ring roxo
- Templates: unificados em `novo/page.jsx`, category chips, badges, empty state
- Dashboards: lista sem templates duplicados
- Embed RLS tokens com filtros por usuário (G10)
- Drill-down em bar/pie com breadcrumb (G11)
- Mapa Brasil — bubble map com 27 estados + DF
- Gráfico funil SVG (G4)

---

## v01.0.01 — 2026-03-17

### i18n — DashboardRail + tradução dinâmica de conteúdo

- DashboardRail: barra lateral totalmente localizada em 8 idiomas
- Dashboards em modo VIEW: título, páginas e blocos traduzidos via Google Translate API
- Script `translate-messages.mjs` para propagação automática de novas chaves

---

## v01.0.00 — 2026-03-17

### Lançamento inicial em produção

- Deploy frontend (Vercel) + backend (Railway)
- Sistema de autenticação multi-tenant com roles (owner, admin, member, viewer)
- Dashboards com blocos interativos (KPI, gráficos, tabela, filtros, etc.)
- Datasets via CSV e API externa com auto-refresh
- Alertas por email
- Billing via Stripe (planos Solo, Equipe, Business)
- Painel de configurações (perfil, senha, usuários, planos)
- Internacionalização: pt-BR, en, es, fr, de, it, zh, ja
- Link de compartilhamento público com tradução automática via Google Translate API
- DashboardRail com ícones de edição totalmente localizado
