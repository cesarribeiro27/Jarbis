/**
 * JarbisLogo — 5 opções de logo SVG como componentes React.
 *
 * Uso:  <LogoA size={40} color="#6D28D9" />
 * Props:
 *   size  — largura/altura em px  (default: 36)
 *   color — cor principal         (default: "#6D28D9" violeta Jarbis)
 *   light — se true usa branco no ícone (para fundos escuros)
 */

export function LogoA({ size = 36, color = '#6D28D9', light = false }) {
  // Conceito: Órbita + ∴ — três pontos maçônicos no núcleo da órbita
  const ic = light ? '#fff' : color
  // Em fundo escuro com cor violeta, usa violeta claro para o glow
  const dotColor = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Anel orbital externo tracejado */}
      <circle cx="20" cy="20" r="17" stroke={ic} strokeWidth="1.8" strokeDasharray="5 3" opacity="0.28" />
      {/* Arco ativo (topo → direita) */}
      <path d="M20 4 A16 16 0 0 1 36 20" stroke={ic} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      {/* Satélite no fim do arco */}
      <circle cx="36" cy="20" r="2.8" fill={ic} />
      {/* Núcleo — anel interno translúcido */}
      <circle cx="20" cy="20" r="6.5" fill={ic} opacity="0.07" />
      <circle cx="20" cy="20" r="6.5" stroke={ic} strokeWidth="1.2" opacity="0.3" />
      {/* ∴  três pontos em triângulo (símbolo maçônico) */}
      <circle cx="20"   cy="16.5" r="1.6" fill={dotColor} />  {/* topo */}
      <circle cx="17.2" cy="22"   r="1.6" fill={dotColor} />  {/* inferior esquerdo */}
      <circle cx="22.8" cy="22"   r="1.6" fill={dotColor} />  {/* inferior direito */}
    </svg>
  )
}

export function LogoB({ size = 36, color = '#6D28D9', light = false }) {
  // Conceito: Farol — barras verticais crescentes com raio de luz, formam "J"
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Raios de luz */}
      <line x1="20" y1="8" x2="20" y2="2" stroke={ic} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="20" y1="8" x2="25" y2="4" stroke={ic} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <line x1="20" y1="8" x2="15" y2="4" stroke={ic} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      {/* Barras — farol / gráfico crescente */}
      <rect x="8"  y="28" width="5" height="8"  rx="2" fill={ic} opacity="0.45" />
      <rect x="15" y="20" width="5" height="16" rx="2" fill={ic} opacity="0.65" />
      <rect x="22" y="12" width="5" height="24" rx="2" fill={ic} />
      {/* Detalhe: curva base do J */}
      <path d="M22 36 Q29 36 30 30" stroke={ic} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function LogoC({ size = 36, color = '#6D28D9', light = false }) {
  // Conceito: Nexo — 3 hexágonos conectados, "J" em negativo
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="nf" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={ic} floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Hexágono top */}
      <polygon points="20,3 27,7 27,15 20,19 13,15 13,7" fill={ic} opacity="0.9" />
      {/* Hexágono bottom-left */}
      <polygon points="12,22 19,26 19,34 12,38 5,34 5,26" fill={ic} opacity="0.55" />
      {/* Hexágono bottom-right */}
      <polygon points="28,22 35,26 35,34 28,38 21,34 21,26" fill={ic} opacity="0.75" />
      {/* Linhas de conexão */}
      <line x1="20" y1="19" x2="12" y2="22" stroke={ic} strokeWidth="1.5" opacity="0.4" />
      <line x1="20" y1="19" x2="28" y2="22" stroke={ic} strokeWidth="1.5" opacity="0.4" />
      {/* J em negativo no hex top */}
      <rect x="18.5" y="6" width="2.5" height="8" rx="1.25" fill="white" />
      <path d="M16 14 Q18.5 17 21 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function LogoD({ size = 36, color = '#6D28D9', light = false }) {
  // Conceito: Ascensão — barras crescentes com seta, barra da direita forma "J"
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fundo circular suave */}
      <circle cx="20" cy="20" r="18" fill={ic} opacity="0.08" />
      {/* Barras crescentes */}
      <rect x="6"  y="30" width="6" height="6"  rx="2" fill={ic} opacity="0.35" />
      <rect x="14" y="22" width="6" height="14" rx="2" fill={ic} opacity="0.55" />
      {/* Barra da direita — forma J */}
      <rect x="22" y="10" width="6" height="26" rx="2" fill={ic} />
      <path d="M22 36 Q22 40 17 40" stroke={ic} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Seta upward */}
      <path d="M25 10 L25 4 M22 7 L25 4 L28 7" stroke={ic} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoE({ size = 36, color = '#6D28D9', light = false }) {
  // Conceito: Identidade tipográfica — "J" moderno com sparkline integrada
  const ic = light ? '#fff' : color
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fundo quadrado arredondado */}
      <rect width="40" height="40" rx="10" fill={ic} />
      {/* J tipográfico */}
      <text
        x="20" y="29"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="24"
        fill="white"
        letterSpacing="-1"
      >J</text>
      {/* Spark line no canto superior direito */}
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

/**
 * LogoWithText — Logo + "Jarbis" em texto, para uso em barras de navegação.
 * variant: 'A' | 'B' | 'C' | 'D' | 'E'  (default: 'A' — logo aprovado)
 */
export function LogoWithText({ size = 32, color = '#6D28D9', light = false, variant = 'A', className = '' }) {
  const logos = { A: LogoA, B: LogoB, C: LogoC, D: LogoD, E: LogoE }
  const Icon = logos[variant] || LogoE
  const textColor = light ? '#fff' : '#1A1A2E'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Icon size={size} color={color} light={light} />
      <span style={{ color: textColor, fontWeight: 800, fontSize: size * 0.56, letterSpacing: '-0.03em', lineHeight: 1 }}>
        jarbis
      </span>
    </span>
  )
}

// Logo oficial aprovado: Órbita + ∴
export default LogoA
