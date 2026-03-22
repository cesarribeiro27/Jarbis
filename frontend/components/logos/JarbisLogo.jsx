/**
 * JarbisLogo — Logo oficial Jarbis + variantes legadas.
 *
 * Logo oficial: LogoComet — 3 cometas em órbita anti-horária nos vértices do ∴
 *   Órbita: círculo r=14 centrado em (24,24)
 *   Pontos ∴: apex (24,10) · base-dir (36,31) · base-esq (12,31)
 *   Rastros: arcos de 70° com gradiente transparente→cor
 *
 * LogoA é alias de LogoComet para retrocompatibilidade.
 *
 * Uso:
 *   import { LogoComet } from '@/components/logos/JarbisLogo'
 *   <LogoComet size={40} />
 *
 *   import { LogoA } from '@/components/logos/JarbisLogo'  // mesmo resultado
 *   <LogoA size={40} light />
 */

// ─── IDs de gradiente únicos por instância ─────────────────────────────────
// Os gradientes são idênticos em todas as instâncias, portanto IDs fixos
// funcionam sem conflito visual mesmo quando há múltiplos logos na página.
const GT1 = 'jbc-trail-1'
const GT2 = 'jbc-trail-2'
const GT3 = 'jbc-trail-3'

// ─── Logo oficial: Cometa ∴ ────────────────────────────────────────────────
export function LogoComet({ size = 36, light = false }) {
  // light=true → fundo transparente com a órbita em branco (para headers já escuros)
  // light=false → fundo dark #0B0A1A embutido (padrão — funciona em qualquer contexto)
  const bg = light ? 'transparent' : '#0B0A1A'
  const apexColor = '#A78BFA'
  const tailColor = '#7C3AED'
  const dotWhite = light ? 'rgba(255,255,255,1)' : 'white'

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Rastro 1: upper-right → apex (topo ∴) */}
        <linearGradient id={GT1} x1="36" y1="17" x2="24" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={apexColor} stopOpacity="0"/>
          <stop offset="100%" stopColor={apexColor} stopOpacity="1"/>
        </linearGradient>
        {/* Rastro 2: bottom → base-dir ∴ */}
        <linearGradient id={GT2} x1="24" y1="38" x2="36" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={tailColor} stopOpacity="0"/>
          <stop offset="100%" stopColor={tailColor} stopOpacity="1"/>
        </linearGradient>
        {/* Rastro 3: upper-left → base-esq ∴ */}
        <linearGradient id={GT3} x1="12" y1="17" x2="12" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={tailColor} stopOpacity="0"/>
          <stop offset="100%" stopColor={tailColor} stopOpacity="1"/>
        </linearGradient>
      </defs>

      {/* Fundo */}
      {bg !== 'transparent' && (
        <rect width="48" height="48" rx="13" fill={bg}/>
      )}

      {/* Órbita — traço pontilhado sutil */}
      <circle cx="24" cy="24" r="14" stroke="#6D28D9" strokeWidth=".5" strokeDasharray="2 3" opacity=".2"/>

      {/* ── RASTROS (comet trails — arcos com gradiente) ── */}
      {/* Rastro apex: de (36,17) → (24,10) anti-horário */}
      <path d="M36,17 A14,14 0 0,0 24,10" stroke={`url(#${GT1})`} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Rastro base-dir: de (24,38) → (36,31) anti-horário */}
      <path d="M24,38 A14,14 0 0,0 36,31" stroke={`url(#${GT2})`} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Rastro base-esq: de (12,17) → (12,31) anti-horário */}
      <path d="M12,17 A14,14 0 0,0 12,31" stroke={`url(#${GT3})`} strokeWidth="2.5" strokeLinecap="round" fill="none"/>

      {/* ── ∴ — COMETAS (pontos brilhantes no fim de cada rastro) ── */}

      {/* Apex ∴ — mais luminoso (ponto principal) */}
      <circle cx="24" cy="10" r="3.8" fill={apexColor} opacity=".2"/>
      <circle cx="24" cy="10" r="2.6" fill={apexColor}/>
      <circle cx="24" cy="10" r="1.2" fill={dotWhite}/>

      {/* Base direita ∴ */}
      <circle cx="36" cy="31" r="3" fill={tailColor} opacity=".2"/>
      <circle cx="36" cy="31" r="2.2" fill={tailColor}/>
      <circle cx="36" cy="31" r="1" fill="rgba(255,255,255,.8)"/>

      {/* Base esquerda ∴ */}
      <circle cx="12" cy="31" r="3" fill={tailColor} opacity=".2"/>
      <circle cx="12" cy="31" r="2.2" fill={tailColor}/>
      <circle cx="12" cy="31" r="1" fill="rgba(255,255,255,.8)"/>
    </svg>
  )
}

// ─── Retrocompatibilidade — LogoA agora é o Cometa ─────────────────────────
export function LogoA({ size = 36, light = false }) {
  return <LogoComet size={size} light={light} />
}

// ─── Variantes legadas (mantidas) ──────────────────────────────────────────

export function LogoB({ size = 36, color = '#6D28D9', light = false }) {
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="8" x2="20" y2="2" stroke={ic} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="20" y1="8" x2="25" y2="4" stroke={ic} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <line x1="20" y1="8" x2="15" y2="4" stroke={ic} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <rect x="8"  y="28" width="5" height="8"  rx="2" fill={ic} opacity="0.45" />
      <rect x="15" y="20" width="5" height="16" rx="2" fill={ic} opacity="0.65" />
      <rect x="22" y="12" width="5" height="24" rx="2" fill={ic} />
      <path d="M22 36 Q29 36 30 30" stroke={ic} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function LogoC({ size = 36, color = '#6D28D9', light = false }) {
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="20,3 27,7 27,15 20,19 13,15 13,7" fill={ic} opacity="0.9" />
      <polygon points="12,22 19,26 19,34 12,38 5,34 5,26" fill={ic} opacity="0.55" />
      <polygon points="28,22 35,26 35,34 28,38 21,34 21,26" fill={ic} opacity="0.75" />
      <line x1="20" y1="19" x2="12" y2="22" stroke={ic} strokeWidth="1.5" opacity="0.4" />
      <line x1="20" y1="19" x2="28" y2="22" stroke={ic} strokeWidth="1.5" opacity="0.4" />
      <rect x="18.5" y="6" width="2.5" height="8" rx="1.25" fill="white" />
      <path d="M16 14 Q18.5 17 21 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function LogoD({ size = 36, color = '#6D28D9', light = false }) {
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill={ic} opacity="0.08" />
      <rect x="6"  y="30" width="6" height="6"  rx="2" fill={ic} opacity="0.35" />
      <rect x="14" y="22" width="6" height="14" rx="2" fill={ic} opacity="0.55" />
      <rect x="22" y="10" width="6" height="26" rx="2" fill={ic} />
      <path d="M22 36 Q22 40 17 40" stroke={ic} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M25 10 L25 4 M22 7 L25 4 L28 7" stroke={ic} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoE({ size = 36, color = '#6D28D9', light = false }) {
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill={ic} />
      <text
        x="20" y="29"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="24"
        fill="white"
        letterSpacing="-1"
      >J</text>
      <polyline
        points="22,8 25,5 28,7 31,4 34,6"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <circle cx="34" cy="6" r="1.5" fill="white" opacity="0.8" />
    </svg>
  )
}

// ─── LogoWithText — Logo + wordmark ────────────────────────────────────────
export function LogoWithText({ size = 32, light = false, className = '' }) {
  const textColor = light ? '#fff' : '#1A1A2E'
  const bColor    = light ? '#A78BFA' : '#6D28D9'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoComet size={size} light={light} />
      <span style={{
        color: textColor,
        fontWeight: 900,
        fontSize: size * 0.56,
        letterSpacing: '-0.05em',
        lineHeight: 1,
        fontFamily: 'Inter, sans-serif',
      }}>
        jar<span style={{ color: bColor }}>b</span>is
      </span>
    </span>
  )
}

// ─── Default export ─────────────────────────────────────────────────────────
export default LogoComet
