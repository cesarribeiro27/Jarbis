'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="absolute inset-0 bg-violet-600 rounded-xl rotate-[8deg]" />
        <div className="absolute inset-0 bg-violet-500 rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <rect x="3" y="10" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="8" y="6" width="4" height="11" rx="1" fill="white" />
            <rect x="13" y="3" width="4" height="14" rx="1" fill="white" fillOpacity="0.7" />
          </svg>
        </div>
      </div>
      <span className="font-black text-xl tracking-tight text-gray-900">Jarbis</span>
    </Link>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

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

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api.signup(form.name, form.email, form.password)
      localStorage.setItem('jarbis_token', data.tokens.access_token)
      localStorage.setItem('jarbis_user', JSON.stringify(data.user))
      if (data.trial_days_remaining !== null && data.trial_days_remaining !== undefined) {
        localStorage.setItem('jarbis_trial_days', String(data.trial_days_remaining))
      }
      if (data.needs_verification) {
        router.push(`/verificar-email?email=${encodeURIComponent(form.email)}`)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF8' }}>
      {/* left — decorative (hidden mobile) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden" style={{ background: '#0B0A1A' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />
        <div className="relative px-12">
          <div className="space-y-4">
            {[
              { icon: '⚡', text: 'Setup em 2 minutos' },
              { icon: '🇧🇷', text: 'Interface 100% em português' },
              { icon: '🔒', text: 'Dados seguros na nuvem' },
              { icon: '💳', text: 'Sem cartão de crédito' },
              { icon: '🤖', text: 'IA nativa em português' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-gray-300 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* right — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo />
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">Criar conta grátis</h1>
          <p className="text-gray-500 mb-8">7 dias grátis, sem cartão de crédito</p>

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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                required
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                  className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                  placeholder="Mínimo 8 caracteres, com número"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass
                    ? <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                    : <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>
                  }
                </button>
              </div>
              {passStrength && (
                <div className="flex gap-1 mt-2">
                  {['weak','medium','strong'].map((s, i) => (
                    <div key={s} className="flex-1 h-1 rounded-full transition-colors" style={{
                      background: passStrength === 'strong' ? '#10b981' : passStrength === 'medium' && i < 2 ? '#f59e0b' : passStrength === 'weak' && i === 0 ? '#ef4444' : '#e5e7eb'
                    }} />
                  ))}
                  <span className="text-xs ml-1" style={{
                    color: passStrength === 'strong' ? '#10b981' : passStrength === 'medium' ? '#f59e0b' : '#ef4444'
                  }}>
                    {passStrength === 'strong' ? 'Forte' : passStrength === 'medium' ? 'Média' : 'Fraca'}
                  </span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm shadow-violet-200"
            >
              {loading ? 'Criando conta...' : 'Criar conta grátis →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Ao criar uma conta você concorda com nossos{' '}
            <Link href="/termos" className="underline hover:text-gray-600">Termos</Link> e{' '}
            <Link href="/privacidade" className="underline hover:text-gray-600">Privacidade</Link>
          </p>

          <p className="text-center text-sm text-gray-500 mt-5">
            Já tem conta?{' '}
            <Link href="/login" className="text-violet-600 font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
