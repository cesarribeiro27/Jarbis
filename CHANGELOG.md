# Changelog — Jarbis

Formato: `vMAJOR.MINOR.PATCH`
- **MAJOR**: mudança estrutural grande
- **MINOR**: nova feature ou melhoria visível
- **PATCH**: bug fix, ajuste de texto, tradução

---

## v01.0.01 — 2026-03-17

### i18n — DashboardRail + tradução dinâmica de conteúdo

- DashboardRail: barra lateral totalmente localizada (Edit, Data, Filters, Config, Notes, AI, Help, Open/Close) em 8 idiomas
- Dashboards em modo VIEW: título, páginas e blocos traduzidos automaticamente via Google Translate API ao trocar idioma
- Modo edição mantém conteúdo original em pt-BR
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
