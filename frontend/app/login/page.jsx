'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { api } from '@/lib/api'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { LogoWithText } from '@/components/logos/JarbisLogo'

const OAUTH_ICONS = {
  google: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  ),
  microsoft: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  ),
}

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api.login(email, password)
      if (data.tokens?.access_token) {
        localStorage.setItem('jarbis_token', data.tokens.access_token)
      }
      localStorage.setItem('jarbis_user', JSON.stringify(data.user))
      if (data.trial_days_remaining != null) {
        localStorage.setItem('jarbis_trial_days', String(data.trial_days_remaining))
      }
      if (data.needs_verification) {
        router.push(`/verificar-email?email=${encodeURIComponent(email)}`)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message || t('errorDefault'))
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'
      const res = await fetch(`${apiBase}/auth/oauth/${provider}/authorize`)
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setError(`OAuth ${provider} indisponível no momento.`)
    }
  }

  const rightTitle = t('rightTitle').split('\n')

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF8' }}>
      {/* left — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        {/* language switcher top right (of this panel) */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm">
          <Link href="/" className="inline-flex items-center mb-8">
            <LogoWithText size={32} />
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{t('title')}</h1>
          <p className="text-gray-500 mb-8">{t('subtitle')}</p>

          {/* OAuth buttons */}
          <div className="space-y-2 mb-5">
            {(['google', 'github']).map(provider => (
              <button
                key={provider}
                type="button"
                onClick={() => handleOAuth(provider)}
                className="w-full flex items-center gap-3 border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {OAUTH_ICONS[provider]}
                <span>{t(`${provider}Button`)}</span>
              </button>
            ))}
          </div>

          {/* divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#FAFAF8] px-3 text-gray-400">{t('orContinueWith')}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('emailLabel')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                placeholder={t('emailPlaceholder')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">{t('passwordLabel')}</label>
                <Link href="/recuperar-senha" className="text-xs text-violet-600 hover:text-violet-700 hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                  placeholder={t('passwordPlaceholder')}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass
                    ? <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                    : <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                  }
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm shadow-violet-200"
            >
              {loading ? t('submitLoading') : t('submit')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('noAccount')}{' '}
            <Link href="/signup" className="text-violet-600 font-semibold hover:underline">
              {t('signupLink')}
            </Link>
          </p>
        </div>
      </div>

      {/* right — decorative (hidden mobile) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden" style={{ background: '#0B0A1A' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />
        <div className="relative text-center px-12">
          <div className="text-6xl font-black text-white tracking-tight leading-tight mb-4">
            {rightTitle[0]}<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {rightTitle[1]}
            </span>
          </div>
          <p className="text-gray-400 text-lg">{t('rightSubtitle')}</p>
        </div>
      </div>
    </div>
  )
}
