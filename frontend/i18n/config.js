/**
 * i18n/config.js — Configuração de locales do Jarbis.
 * Edge-safe: sem imports do Node.js core.
 */

export const LOCALES = ['pt-BR', 'es', 'en', 'fr', 'de', 'it', 'zh', 'ja']
export const DEFAULT_LOCALE = 'pt-BR'

export const COUNTRY_TO_LOCALE = {
  // Lusófonos → pt-BR
  BR: 'pt-BR', PT: 'pt-BR', AO: 'pt-BR', MZ: 'pt-BR', CV: 'pt-BR', GW: 'pt-BR', ST: 'pt-BR', TL: 'pt-BR',
  // Hispânicos → es
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PY: 'es', UY: 'es',
  PE: 'es', EC: 'es', BO: 'es', VE: 'es', CR: 'es', PA: 'es', GT: 'es',
  HN: 'es', SV: 'es', NI: 'es', DO: 'es', CU: 'es', PR: 'es', GQ: 'es',
  // Francófonos → fr
  FR: 'fr', CA: 'fr', BE: 'fr', CH: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', MG: 'fr',
  // Germânicos → de
  DE: 'de', AT: 'de',
  // Italianos → it
  IT: 'it',
  // Asiáticos
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
  JP: 'ja',
}

/** Preços por locale — novos planos: essential, pro, business */
export const PRICING = {
  'pt-BR': {
    currency: 'BRL',
    symbol: 'R$',
    essential: 97.00,
    pro: 247.00,
    business: 697.00,
    // aliases legados
    solo: 97.00,
    equipe: 247.00,
    ilimitado: 697.00,
  },
  es: {
    currency: 'USD',
    symbol: '$',
    essential: 25.00,
    pro: 65.00,
    business: 185.00,
    solo: 25.00,
    equipe: 65.00,
    ilimitado: 185.00,
  },
  en: {
    currency: 'USD',
    symbol: '$',
    essential: 25.00,
    pro: 65.00,
    business: 185.00,
    solo: 25.00,
    equipe: 65.00,
    ilimitado: 185.00,
  },
  fr: {
    currency: 'USD',
    symbol: '$',
    essential: 25.00,
    pro: 65.00,
    business: 185.00,
    solo: 25.00,
    equipe: 65.00,
    ilimitado: 185.00,
  },
  de: {
    currency: 'USD',
    symbol: '$',
    essential: 25.00,
    pro: 65.00,
    business: 185.00,
    solo: 25.00,
    equipe: 65.00,
    ilimitado: 185.00,
  },
  it: {
    currency: 'USD',
    symbol: '$',
    essential: 25.00,
    pro: 65.00,
    business: 185.00,
    solo: 25.00,
    equipe: 65.00,
    ilimitado: 185.00,
  },
  zh: {
    currency: 'USD',
    symbol: '$',
    essential: 25.00,
    pro: 65.00,
    business: 185.00,
    solo: 25.00,
    equipe: 65.00,
    ilimitado: 185.00,
  },
  ja: {
    currency: 'USD',
    symbol: '$',
    essential: 25.00,
    pro: 65.00,
    business: 185.00,
    solo: 25.00,
    equipe: 65.00,
    ilimitado: 185.00,
  },
}

export function getLocaleFromCountry(country) {
  return COUNTRY_TO_LOCALE[country] || DEFAULT_LOCALE
}

export function getPricing(locale) {
  return PRICING[locale] || PRICING[DEFAULT_LOCALE]
}

export function fmtPrice(amount, locale) {
  const p = getPricing(locale)
  if (amount === null) return null
  if (amount === 0) return '0'
  return `${p.symbol}${amount.toFixed(2).replace('.', ',')}`
}
