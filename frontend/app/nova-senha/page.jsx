'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#6D28D9" />
      <path d="M16 6L26 11.5V20.5L16 26L6 20.5V11.5L16 6Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4" fill="white" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  )
}

function NovaSenhaContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoMark />
              <span className="font-black text-xl tracking-tight text-white">jarbis</span>
            </Link>
          </div>
          <div className="bg-gray-900 border border-red-900/40 rounded-2xl px-6 py-8 space-y-3">
            <svg className="w-10 h-10 text-red-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-gray-200 text-sm">Link inválido ou expirado.</p>
            <p className="text-gray-500 text-xs">Solicite um novo link de redefinição de senha.</p>
          </div>
          <Link href="/recuperar-senha" className="inline-block text-sm text-violet-400 hover:text-violet-300 hover:underline font-medium">
            Solicitar novo link →
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (r.ok) {
        setSuccess(true)
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.detail || 'Token inválido ou expirado. Solicite um novo link.')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <LogoMark />
            <span className="font-black text-xl tracking-tight text-white">jarbis</span>
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight text-center">Nova senha</h1>
          <p className="text-gray-400 text-sm mt-2 text-center">
            Escolha uma senha segura para sua conta
          </p>
        </div>

        {success ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <p className="text-gray-200 text-sm">Senha redefinida com sucesso!</p>
            <Link
              href="/login"
              className="inline-block w-full bg-violet-600 text-white font-bold py-3 rounded-full hover:bg-violet-700 transition-colors text-sm mt-2"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Nova senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 pr-11 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPass ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 pr-11 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showConfirm ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-900/40"
            >
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-violet-400 hover:text-violet-300 hover:underline font-medium">
            ← Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function NovaSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NovaSenhaContent />
    </Suspense>
  )
}
