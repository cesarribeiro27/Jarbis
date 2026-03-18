'use client'

import { useState } from 'react'
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

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Silencioso — nunca revelar se o email existe ou não
    } finally {
      setLoading(false)
      setSent(true)
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
          <h1 className="text-2xl font-black text-white tracking-tight text-center">Recuperar senha</h1>
          <p className="text-gray-400 text-sm mt-2 text-center">
            Digite seu email e enviaremos um link de redefinição
          </p>
        </div>

        {sent ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-violet-900/40 border border-violet-700/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed">
              Se este email estiver cadastrado, você receberá um link em instantes.
            </p>
            <p className="text-gray-500 text-xs">
              Verifique também sua caixa de spam.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-900/40"
            >
              {loading ? 'Enviando...' : 'Enviar link'}
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
