'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

const LANGS = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'es',    label: 'Español',   flag: '🇪🇸' },
  { code: 'en',    label: 'English',   flag: '🇺🇸' },
  { code: 'fr',    label: 'Français',  flag: '🇫🇷' },
  { code: 'de',    label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'it',    label: 'Italiano',  flag: '🇮🇹' },
  { code: 'zh',    label: '中文',       flag: '🇨🇳' },
  { code: 'ja',    label: '日本語',     flag: '🇯🇵' },
]

export default function LanguageSwitcher({ light = false, dropUp = false }) {
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // fecha ao clicar fora
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function switchLocale(code) {
    setOpen(false)
    await fetch('/api/set-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: code }),
    })
    window.location.reload()
  }

  const current = LANGS.find(l => l.code === locale) || LANGS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-lg transition-colors ${
          light
            ? 'text-gray-400 hover:text-white hover:bg-white/10'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label="Selecionar idioma"
      >
        {/* Globe icon */}
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`absolute right-0 w-40 rounded-xl bg-white border border-gray-100 shadow-lg shadow-gray-200/50 py-1 z-50 ${dropUp ? 'bottom-full mb-1' : 'mt-1'}`}>
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                lang.code === locale ? 'text-violet-700 font-semibold' : 'text-gray-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === locale && (
                <svg className="w-3.5 h-3.5 text-violet-600 ml-auto" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
