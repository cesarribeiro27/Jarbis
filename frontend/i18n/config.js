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

/** Preços por locale (placeholder — ajustar antes de ativar Stripe para es/en) */
export const PRICING = {
  'pt-BR': {
    currency: 'BRL',
    symbol: 'R$',
    solo: 79.90,
    equipe: 189.90,
    ilimitado: 599.90,
  },
  es: {
    currency: 'USD',
    symbol: '$',
    solo: 19.90,
    equipe: 49.90,
    ilimitado: 149.90,
  },
  en: {
    currency: 'USD',
    symbol: '$',
    solo: 19.90,
    equipe: 49.90,
    ilimitado: 149.90,
  },
  fr: {
    currency: 'USD',
    symbol: '$',
    solo: 19.90,
    equipe: 49.90,
    ilimitado: 149.90,
  },
  de: {
    currency: 'USD',
    symbol: '$',
    solo: 19.90,
    equipe: 49.90,
    ilimitado: 149.90,
  },
  it: {
    currency: 'USD',
    symbol: '$',
    solo: 19.90,
    equipe: 49.90,
    ilimitado: 149.90,
  },
  zh: {
    currency: 'USD',
    symbol: '$',
    solo: 19.90,
    equipe: 49.90,
    ilimitado: 149.90,
  },
  ja: {
    currency: 'USD',
    symbol: '$',
    solo: 19.90,
    equipe: 49.90,
    ilimitado: 149.90,
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
