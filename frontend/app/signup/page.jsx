'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">J</span>
            </div>
            <span className="font-black text-gray-900 text-lg">Jarbis</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Criar conta grátis</h1>
          <p className="text-gray-500 text-sm mt-1">Sem cartão de crédito</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Mínimo 8 caracteres, com número"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">
            Ao criar uma conta você concorda com nossos{' '}
            <Link href="/termos" className="underline">Termos</Link> e{' '}
            <Link href="/privacidade" className="underline">Privacidade</Link>
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
