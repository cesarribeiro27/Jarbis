'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { LogoWithText } from '@/components/logos/JarbisLogo'

function VerificarEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Google Ads — dispara conversão ao chegar na página de verificação
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: 'AW-17421636806/QRlVCPr7oIscEMappPNA',
        value: 1.0,
        currency: 'BRL',
      })
    }
  }, [])
  const email = searchParams.get('email') || ''

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const inputs = useRef([])

  function handleChange(i, val) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = v
    setCode(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setCode(text.split(''))
      inputs.current[5]?.focus()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) return setError('Digite os 6 dígitos do código.')
    setLoading(true)
    setError('')
    try {
      const data = await api.verifyEmail(email, fullCode)
      const accessToken = data.tokens?.access_token
      if (accessToken) {
        localStorage.setItem('jarbis_token', accessToken)
      }
      localStorage.setItem('jarbis_user', JSON.stringify(data.user))
      if (data.trial_days_remaining !== null && data.trial_days_remaining !== undefined) {
        localStorage.setItem('jarbis_trial_days', String(data.trial_days_remaining))
      }

      // Verifica se há preview pendente para reclamar (veio da home antes de criar conta)
      const pendingPreviewToken = localStorage.getItem('pending_preview_token')
      if (pendingPreviewToken && accessToken) {
        localStorage.removeItem('pending_preview_token')
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'
          const res = await fetch(`${apiBase}/reports/preview/${pendingPreviewToken}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          })
          if (res.ok) {
            const claimed = await res.json()
            if (claimed?.dataset_id) {
              router.push(`/dashboards/novo?from=preview&dataset_id=${claimed.dataset_id}&ds_name=${encodeURIComponent(claimed.name || 'Meu Dashboard')}`)
              return
            }
          }
        } catch (err) {
          console.warn('[verificar-email] claimPreview falhou:', err?.message)
        }
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Código inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setResendMsg('')
    setError('')
    try {
      await api.resendVerification(email)
      setResendMsg('Novo código enviado! Verifique seu email.')
    } catch {
      setResendMsg('Erro ao reenviar. Tente novamente.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAFAF8' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <LogoWithText size={32} />
          </Link>

          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black text-gray-900">Confirme seu email</h1>
          <p className="text-gray-500 text-sm mt-2">
            Enviamos um código de 6 dígitos para<br />
            <span className="font-semibold text-gray-700">{email}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {resendMsg && (
            <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
              {resendMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-black border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || code.join('').length < 6}
              className="w-full bg-violet-600 text-white font-bold py-2.5 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Confirmar email'}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              Não recebeu o código?{' '}
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-violet-600 font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? 'Enviando...' : 'Reenviar'}
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-2">O código expira em 15 minutos</p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Email errado?{' '}
          <Link href="/signup" className="text-violet-600 font-semibold hover:underline">
            Voltar ao cadastro
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerificarEmailContent />
    </Suspense>
  )
}
