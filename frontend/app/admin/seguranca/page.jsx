'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

export default function AdminSecurityPage() {
  const [totpEnabled, setTotpEnabled] = useState(null)
  const [step, setStep] = useState('status') // 'status' | 'setup' | 'confirm' | 'disable'
  const [qrData, setQrData] = useState(null)
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'success'|'error', text }

  useEffect(() => {
    fetch(`${API_URL}/admin/totp/status`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setTotpEnabled(d.totp_enabled))
      .catch(() => setTotpEnabled(false))
  }, [])

  async function startSetup() {
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${API_URL}/admin/totp/setup`, {
        method: 'POST',
        credentials: 'include',
      })
      const d = await r.json()
      if (!r.ok) { setMsg({ type: 'error', text: d.detail || 'Erro ao iniciar setup.' }); return }
      setQrData(d.qr_base64)
      setSecret(d.secret)
      setStep('setup')
    } finally {
      setLoading(false)
    }
  }

  async function confirmSetup(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${API_URL}/admin/totp/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const d = await r.json()
      if (!r.ok) { setMsg({ type: 'error', text: d.detail || 'Codigo invalido.' }); setCode(''); return }
      setTotpEnabled(true)
      setStep('status')
      setMsg({ type: 'success', text: '2FA ativado com sucesso! Use seu app autenticador a partir de agora.' })
    } finally {
      setLoading(false)
    }
  }

  async function disable2FA(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${API_URL}/admin/totp/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const d = await r.json()
      if (!r.ok) { setMsg({ type: 'error', text: d.detail || 'Codigo invalido.' }); setCode(''); return }
      setTotpEnabled(false)
      setStep('status')
      setMsg({ type: 'success', text: '2FA desativado.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-black text-white mb-1">Seguranca do painel</h1>
        <p className="text-gray-500 text-sm mb-8">Configuracoes de autenticacao de dois fatores (2FA)</p>

        {msg && (
          <div className={`rounded-xl px-4 py-3 mb-6 text-sm ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {msg.text}
          </div>
        )}

        {step === 'status' && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-semibold text-white mb-1">Autenticador TOTP</div>
                <div className="text-sm text-gray-500">Google Authenticator, Authy ou similar</div>
              </div>
              {totpEnabled === null ? (
                <span className="text-gray-600 text-sm">...</span>
              ) : totpEnabled ? (
                <span className="text-xs bg-emerald-900/40 text-emerald-400 px-3 py-1 rounded-full font-semibold">Ativo</span>
              ) : (
                <span className="text-xs bg-gray-800 text-gray-500 px-3 py-1 rounded-full">Inativo</span>
              )}
            </div>

            {totpEnabled ? (
              <button
                onClick={() => { setStep('disable'); setCode(''); setMsg(null) }}
                className="w-full border border-red-800/50 text-red-400 font-semibold py-3 rounded-xl hover:bg-red-900/20 transition-colors text-sm"
              >
                Desativar 2FA
              </button>
            ) : (
              <button
                onClick={startSetup}
                disabled={loading}
                className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Gerando QR Code...' : 'Ativar 2FA'}
              </button>
            )}
          </div>
        )}

        {step === 'setup' && qrData && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 space-y-5">
            <div>
              <div className="font-semibold text-white mb-1">1. Escaneie o QR Code</div>
              <p className="text-sm text-gray-500 mb-4">Abra o Google Authenticator ou Authy e escaneie:</p>
              <div className="flex justify-center bg-white rounded-xl p-4 mb-4">
                <img src={`data:image/png;base64,${qrData}`} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
              <div className="text-xs text-gray-600 text-center">
                Ou adicione manualmente o codigo: <span className="font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded">{secret}</span>
              </div>
            </div>

            <div>
              <div className="font-semibold text-white mb-1">2. Confirme com o primeiro codigo</div>
              <form onSubmit={confirmSetup} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  placeholder="000000"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-2xl text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Ativar 2FA'}
                </button>
                <button type="button" onClick={() => setStep('status')} className="w-full text-gray-500 text-sm hover:text-gray-300">
                  Cancelar
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'disable' && (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-6">
            <div className="font-semibold text-white mb-1">Desativar 2FA</div>
            <p className="text-sm text-gray-500 mb-4">Digite o codigo do seu app autenticador para confirmar.</p>
            <form onSubmit={disable2FA} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="000000"
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 text-2xl text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Desativar 2FA'}
              </button>
              <button type="button" onClick={() => setStep('status')} className="w-full text-gray-500 text-sm hover:text-gray-300">
                Cancelar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
