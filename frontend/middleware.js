import { NextResponse } from 'next/server'
import { getLocaleFromCountry, LOCALES, DEFAULT_LOCALE } from './i18n/config'

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Manutenção ──────────────────────────────────────────────────────────────
  if (MAINTENANCE_MODE) {
    if (
      pathname.startsWith('/manutencao') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/api')
    ) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/manutencao', request.url))
  }

  // ── Detecção de locale por IP (Vercel Edge) ──────────────────────────────────
  // Não sobrescreve cookie existente — respeita escolha manual do usuário
  const existing = request.cookies.get('NEXT_LOCALE')?.value
  if (!existing || !LOCALES.includes(existing)) {
    // Tenta detectar pelo país (request.geo disponível no Vercel Edge)
    const country = request.geo?.country
    let locale = DEFAULT_LOCALE
    if (country) {
      locale = getLocaleFromCountry(country)
    } else {
      // Fallback: Accept-Language header
      const acceptLang = request.headers.get('accept-language') || ''
      if (acceptLang.includes('en')) locale = 'en'
      else if (acceptLang.match(/es|mx|ar|co|cl/i)) locale = 'es'
      else locale = DEFAULT_LOCALE
    }

    const response = NextResponse.next()
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      sameSite: 'lax',
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
