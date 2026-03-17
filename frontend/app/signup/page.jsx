'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { api } from '@/lib/api'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { LogoA } from '@/components/logos/JarbisLogo'

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  )
}

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

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('signup')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [refCode, setRefCode] = useState(null)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setRefCode(ref.toUpperCase())
  }, [searchParams])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  const passStrength = (() => {
    const p = form.password
    if (!p) return null
    const hasLen = p.length >= 8
    const hasNum = /\d/.test(p)
    if (hasLen && hasNum) return 'strong'
    if (p.length >= 4) return 'medium'
    return 'weak'
  })()

  const confirmStatus = (() => {
    if (!form.confirm) return null
    return form.confirm === form.password ? 'match' : 'mismatch'
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) return
    setLoading(true)
    setError('')
    try {
      const data = await api.signup(form.name, form.email, form.password, refCode)
      localStorage.setItem('jarbis_user', JSON.stringify(data.user))
      if (data.trial_days_remaining != null) {
        localStorage.setItem('jarbis_trial_days', String(data.trial_days_remaining))
      }
      if (data.needs_verification) {
        router.push(`/verificar-email?email=${encodeURIComponent(form.email)}`)
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

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF8' }}>
      {/* left — decorative (hidden mobile) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden" style={{ background: '#0B0A1A' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(124,58,237,0.3) 0%, transparent 65%)' }} />
        <div className="relative text-center px-12">
          <LogoA size={64} color="#a78bfa" light={false} />
          <div className="mt-6 text-5xl font-black text-white tracking-tight leading-tight">
            jarbis
          </div>
          <p className="mt-4 text-gray-400 text-lg max-w-xs mx-auto">
            BI embarcado em português, do jeito que o Brasil precisa.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-gray-500 text-sm">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>7 dias grátis · Sem cartão · Cancele quando quiser</span>
          </div>
        </div>
      </div>

      {/* right — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        {/* language switcher top right */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <LogoA size={32} color="#6D28D9" />
            <span className="font-black text-xl tracking-tight text-gray-900">jarbis</span>
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{t('title')}</h1>
          <p className="text-gray-500 mb-8">{t('subtitle')}</p>

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
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nameLabel')}</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                required
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('emailLabel')}</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                placeholder={t('emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('passwordLabel')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                  className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                  placeholder={t('passwordPlaceholder')}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {passStrength && (
                <div className="flex gap-1 mt-2 items-center">
                  {['weak', 'medium', 'strong'].map((s, i) => (
                    <div key={s} className="flex-1 h-1 rounded-full transition-colors" style={{
                      background: passStrength === 'strong' ? '#10b981' : passStrength === 'medium' && i < 2 ? '#f59e0b' : passStrength === 'weak' && i === 0 ? '#ef4444' : '#e5e7eb'
                    }} />
                  ))}
                  <span className="text-xs ml-1" style={{
                    color: passStrength === 'strong' ? '#10b981' : passStrength === 'medium' ? '#f59e0b' : '#ef4444'
                  }}>
                    {passStrength === 'strong' ? t('passwordStrong') : passStrength === 'medium' ? t('passwordMedium') : t('passwordWeak')}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('confirmPasswordLabel')}</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  required
                  className={`w-full border bg-white rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
                    confirmStatus === 'mismatch'
                      ? 'border-red-400 focus:ring-red-400'
                      : confirmStatus === 'match'
                      ? 'border-green-400 focus:ring-green-400'
                      : 'border-gray-200 focus:ring-violet-500'
                  }`}
                  placeholder={t('confirmPasswordPlaceholder')}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {confirmStatus === 'mismatch' && (
                <p className="text-xs text-red-500 mt-1">{t('passwordMismatch')}</p>
              )}
              {confirmStatus === 'match' && (
                <p className="text-xs text-green-600 mt-1">{t('passwordMatch')}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || confirmStatus === 'mismatch'}
              className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm shadow-violet-200"
            >
              {loading ? t('submitLoading') : t('submit')}
            </button>
          </form>

          {/* divider */}
          <div className="relative mt-6 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#FAFAF8] px-3 text-gray-400">{t('orContinueWith')}</span>
            </div>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-2">
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

          <p className="text-xs text-gray-400 text-center mt-4">
            {t('termsText')}{' '}
            <Link href="/termos" className="underline hover:text-gray-600">{t('termsLink')}</Link>{' '}
            {t('andText')}{' '}
            <Link href="/privacidade" className="underline hover:text-gray-600">{t('privacyLink')}</Link>
          </p>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-violet-600 font-semibold hover:underline">
              {t('loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
