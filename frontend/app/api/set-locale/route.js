import { NextResponse } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from '@/i18n/config'

export async function POST(request) {
  const { locale } = await request.json()
  const safe = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE

  const response = NextResponse.json({ ok: true, locale: safe })
  response.cookies.set('NEXT_LOCALE', safe, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    sameSite: 'lax',
  })
  return response
}
