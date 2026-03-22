# Jarbis — Identidade Visual

> **Regra crítica:** Sempre consultar este arquivo antes de criar qualquer componente de UI, email, landing page, documento ou comunicação visual do Jarbis.

---

## Marca

| Campo | Valor |
|-------|-------|
| **Nome** | Jarbis |
| **Domínio** | jarbis.cc |
| **Produto** | SaaS de BI embarcado para PMEs brasileiras |
| **Tagline** | Inteligência de dados para quem faz acontecer. |
| **Tom de voz** | Direto, humano, empoderador — sem jargão corporativo |
| **Empresa mãe** | Mazzel Tech (selos no footer quando aplicável) |

---

## Cores

### Paleta principal (violet)

| Token | Hex | Uso |
|-------|-----|-----|
| `brand` | `#6D28D9` | Cor primária — botões, headers, destaques principais |
| `accent` | `#7C3AED` | Hover de botões, gradiente secundário |
| `brand-light` | `#8B5CF6` | Elementos secundários, ícones |
| `brand-50` | `#f5f3ff` | Backgrounds suaves com tom de marca |
| `brand-100` | `#ede9fe` | Chips, badges, fundos de cards de destaque |

### Superfícies e fundo

| Token | Hex | Uso |
|-------|-----|-----|
| `surface` | `#FAFAF8` | Background da aplicação (quase branco, levemente quente) |
| `white` | `#FFFFFF` | Cards, modais, containers |
| `dark` | `#0F0F1A` | Background dark mode |

### Texto

| Token | Hex | Uso |
|-------|-----|-----|
| `text` | `#1A1A2E` | Texto primário (quase preto, tom azul-escuro) |
| `muted` | `#6B7280` | Texto secundário, labels, placeholders |
| `subtle` | `#94A3B8` | Texto desabilitado, captions |

### Bordas e separadores

| Token | Hex | Uso |
|-------|-----|-----|
| `border` | `#E2E8F0` | Bordas de cards, inputs, divisores |
| `border-light` | `#F1F5F9` | Separadores sutis |

### Status / Feedback

| Cor | Hex | Uso |
|-----|-----|-----|
| Sucesso | `#16A34A` | Confirmações, status ativo |
| Aviso | `#D97706` | Alertas, uso próximo do limite |
| Erro | `#DC2626` | Erros, danger zones |
| Info | `#2563EB` | Informações neutras |

---

## Gradiente padrão

```css
background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%);
```

Usado em: headers de email, hero sections, banners, CTA buttons premium.

---

## Tipografia

| Elemento | Fonte | Peso | Tamanho |
|----------|-------|------|---------|
| Headings H1 | Inter | 800 | 28–36px |
| Headings H2 | Inter | 700 | 20–24px |
| Body | Inter | 400 | 15–16px |
| Labels / Caps | Inter | 600–700 | 11–13px |
| Code / OTP | monospace (Courier New) | 700–900 | variável |

**Line-height:** 1.6 para body, 1.2 para headings
**Letter-spacing:** -0.4px em headings grandes, 0.1em em labels uppercase

---

## Logo

### Símbolo: Cometa ∴ (oficial desde 22/03/2026)

**Conceito:** 3 cometas em órbita anti-horária nos vértices exatos do ∴ (símbolo maçônico "portanto"). Para o mundo: movimento, dados em fluxo, tecnologia viva. Para quem conhece: o ∴ está precisamente posicionado.

**Geometria:**
- Órbita: círculo r=14, centro (24,24), traço pontilhado `#6D28D9` opacity 0.2
- Apex ∴ — cometa topo: posição (24,10) · cor `#A78BFA` · rastro de (36,17)
- Base-dir ∴ — cometa inferior-direito: posição (36,31) · cor `#7C3AED` · rastro de (24,38)
- Base-esq ∴ — cometa inferior-esquerdo: posição (12,31) · cor `#7C3AED` · rastro de (12,17)
- Rastros: arcos SVG de 70° com gradiente transparente→cor (`stroke-linecap: round`)
- Fundo: `rect` 48×48 rx=13 fill `#0B0A1A` (sempre dark — é um app icon contido)

**Componente:** `LogoComet` em `components/logos/JarbisLogo.jsx` · `LogoA` é alias retrocompat.

**Wordmark junto ao ícone:**
- Texto: `jarbis` em minúsculo · Inter 900 · letter-spacing -0.05em
- "b" em violeta: `#6D28D9` (fundo claro) ou `#A78BFA` (fundo escuro)
- Resto do texto: `#1A1A2E` (claro) ou `#ffffff` (escuro)

**Tamanho mínimo:** 20×20px (abaixo disso, usar só os 3 pontos ∴)

**Para emails:** usar `<img src="https://jarbis.cc/logo-email.svg">` — versão flat sem gradiente, compatível com Gmail/Outlook

**Nunca usar** JARBIS em maiúsculas ou caixa mista "Jarbis" no logotipo inline

---

## Componentes padrão

### Botão primário
```
background: #6D28D9
color: white
border-radius: 12px
padding: 14px 28px
font-weight: 700
font-size: 14px
hover: background #7C3AED
```

### Botão gradiente (premium / CTA)
```
background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)
color: white
border-radius: 12px
padding: 14px 28px
font-weight: 700
```

### Card padrão
```
background: white
border: 1px solid #E2E8F0
border-radius: 16px
box-shadow: 0 2px 8px rgba(109,40,217,0.08)
```

### Badge de plano
```
Solo:       bg #ede9fe, text #6D28D9
Equipe:     bg #ede9fe, text #7C3AED
Ilimitado:  bg #ddd6fe, text #5B21B6
Enterprise: bg #f5f5f4, text #1A1A2E
```

---

## Emails

### Header
```html
background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)
Logo órbita (img src="https://jarbis.cc/logo-email.svg") + "jarbis" centralizados
```

### Estrutura
- Max-width: 480px
- Background externo: `#f1f5f9`
- Card: branco, border-radius 16px, shadow `0 2px 8px rgba(0,0,0,0.08)`
- Padding corpo: 40px 32px
- Footer: `#f8fafc`, tagline + links

### Tagline no footer de email
> "Inteligência de dados para quem faz acontecer."

---

## Tom de voz

| Evitar | Usar |
|--------|------|
| "BI para empresas" | "Inteligência de dados para quem faz acontecer" |
| "Solução corporativa" | "Simples, rápido, direto" |
| "Plataforma enterprise" | "Seus dados, do jeito que você entende" |
| Jargão técnico sem contexto | Linguagem clara e acolhedora |
| "Usuário" | "Você" / "César" (nome real) |

**Princípio:** O Jarbis é o oposto de SAP. É para quem faz acontecer — dono de negócio, gestor, analista — não para quem tem equipe de TI.

---

## Dark mode

O site suporta dark mode via classe `.dark` no `<html>`. Cores dark:

| Elemento | Dark |
|----------|------|
| Background app | `#0F0F1A` |
| Card | `#1E1E2E` |
| Border | `#2D2D3D` |
| Text | `#F1F5F9` |
| Text muted | `#94A3B8` |

> Emails **não** usam dark mode — sempre renderizar em light mode.
