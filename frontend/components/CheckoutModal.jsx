'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { LogoWithText } from '@/components/logos/JarbisLogo'

const PLAN_DISPLAY = {
  essential: { name: 'Essential', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  pro:       { name: 'Pro',       color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  business:  { name: 'Business',  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  solo:      { name: 'Essential', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  equipe:    { name: 'Pro',       color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  ilimitado: { name: 'Business',  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
}

// Modal usado exclusivamente para upgrade/downgrade de assinantes ativos (proration imediata).
// Novos assinantes são redirecionados para /checkout.

export default function CheckoutModal({ plan, annual, onClose, onSuccess }) {
  const toast = useToast()
  const [billingName, setBillingName] = useState('')
  const [couponCode, setCouponCode]   = useState('')
  const [loading, setLoading]         = useState(false)

  const display = PLAN_DISPLAY[plan.key] || { name: plan.key, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
  const monthlyPrice = annual ? +(plan.monthlyPrice * 0.8).toFixed(2) : plan.monthlyPrice
  const annualTotal  = annual ? +(monthlyPrice * 12).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const nameToSave = billingName.trim().toUpperCase() || 'JARBIS.CC'
      await api.billing.setBillingName(nameToSave)

      const result = await api.billing.upgrade(plan.key, annual, couponCode.trim())
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      toast('Plano atualizado com sucesso!', 'success', 6000)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast(err.message || 'Erro ao processar. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#0B0A1A] px-6 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4">
            <LogoWithText size={24} light />
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Resumo do plano */}
          <div className={`rounded-xl border ${display.border} ${display.bg} px-4 py-3`}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium">Mudando para</span>
                <div className={`text-lg font-black ${display.color}`}>Jarbis {display.name}</div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-black ${display.color}`}>
                  R${monthlyPrice.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-xs text-gray-400">{annual ? '/mês · anual' : '/mês'}</div>
              </div>
            </div>
            {annual && annualTotal && (
              <div className="mt-2 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 inline-block">
                Total anual: R${annualTotal.toFixed(2).replace('.', ',')} · Economia de 20%
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Você paga apenas a diferença proporcional ao mudar de plano.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Cupom */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Cupom de desconto
              <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              maxLength={32}
              placeholder="Ex: JARBIS20"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono tracking-wide uppercase"
            />
          </div>

          {/* Nome na fatura */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nome na fatura do cartão
              <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={billingName}
              onChange={e => setBillingName(e.target.value.toUpperCase())}
              maxLength={22}
              placeholder="JARBIS.CC"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono tracking-wide uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar upgrade →'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            O valor proporcional será cobrado imediatamente. Cancele a qualquer momento.
          </p>
        </form>
      </div>
    </div>
  )
}
