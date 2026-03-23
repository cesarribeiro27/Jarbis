'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoA } from '@/components/logos/JarbisLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

export default function AdminLoginPage() {
  const router = useRouter()
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
      // 1. Login
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (loginRes.status === 401 || loginRes.status === 422) {
        setError('Email ou senha incorretos.')
        return
      }
      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({}))
        setError(err.detail || 'Erro ao fazer login.')
        return
      }

      const data = await loginRes.json()
      const token = data.tokens?.access_token
      if (!token) {
        setError('Resposta inválida do servidor.')
        return
      }

      // 2. Verificar se é superadmin
      const meRes = await fetch(`${API_URL}/admin/me`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      })

      if (meRes.status === 403) {
        setError('Este email não tem permissão de administrador.')
        return
      }
      if (!meRes.ok) {
        setError('Não foi possível verificar permissões.')
        return
      }

      const me = await meRes.json()
      if (!me?.is_superadmin) {
        setError('Este email não tem permissão de administrador.')
        return
      }

      // 3. Salvar token e redirecionar
      localStorage.setItem('jarbis_admin_token', token)
      window.location.href = '/admin'
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <LogoA size={32} color="#a78bfa" />
          <div className="flex items-center gap-2">
            <span className="font-black text-white text-xl tracking-tight">jar<span style={{ color: '#A78BFA' }}>b</span>is</span>
            <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-md">ADMIN</span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-1 text-center">Acesso restrito</h1>
        <p className="text-gray-500 text-sm text-center mb-8">Apenas administradores do sistema</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow placeholder-gray-600"
              placeholder="admin@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow placeholder-gray-600"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
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
            className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Verificando...' : 'Entrar no painel'}
          </button>
        </form>
      </div>
    </div>
  )
}
