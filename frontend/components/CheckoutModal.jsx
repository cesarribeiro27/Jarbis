'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { LogoWithText } from '@/components/logos/JarbisLogo'

const PLAN_DISPLAY = {
  essential: { name: 'Essential', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  pro:       { name: 'Pro',       color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  business:  { name: 'Business',  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  // legados
  solo:       { name: 'Essential', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  equipe:     { name: 'Pro',       color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  ilimitado:  { name: 'Business',  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
}

/**
 * Modal de pagamento com identidade Jarbis.
 *
 * Props:
 *   plan     { key, monthlyPrice } — plano selecionado
 *   annual   boolean
 *   hasActiveSubscription  boolean — se true, faz upgrade com proration; se false, vai para checkout
 *   onClose  () => void
 *   onSuccess () => void — chamado após upgrade imediato (sem redirect)
 */
export default function CheckoutModal({ plan, annual, hasActiveSubscription, onClose, onSuccess }) {
  const toast = useToast()
  const [billingName, setBillingName] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [loading, setLoading] = useState(false)

  const display = PLAN_DISPLAY[plan.key] || { name: plan.key, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
  const monthlyPrice = annual ? +(plan.monthlyPrice * 0.8).toFixed(2) : plan.monthlyPrice
  const annualTotal  = annual ? +(monthlyPrice * 12).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      // 1. Salva o billing name (opcional)
      const nameToSave = billingName.trim() || 'JARBIS.CC'
      await api.billing.setBillingName(nameToSave)

      // 2. Upgrade (proration) ou novo checkout
      const result = await api.billing.upgrade(plan.key, annual, couponCode.trim())

      if (result.checkout_url) {
        // Sem assinatura ativa: redireciona para Stripe
        window.location.href = result.checkout_url
        return
      }

      // Upgrade imediato concluído
      toast('Plano atualizado com sucesso!', 'success', 6000)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast(err.message || 'Erro ao processar pagamento.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header com identidade Jarbis */}
        <div className="bg-[#0B0A1A] px-6 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4">
            <LogoWithText size={24} light />
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Resumo do plano */}
          <div className={`rounded-xl border ${display.border} ${display.bg} px-4 py-3`}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium">Plano selecionado</span>
                <div className={`text-lg font-black ${display.color}`}>
                  Jarbis {display.name}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-black ${display.color}`}>
                  R${monthlyPrice.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-xs text-gray-400">
                  {annual ? '/mês · cobrado anualmente' : '/mês'}
                </div>
              </div>
            </div>
            {annual && annualTotal && (
              <div className="mt-2 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 inline-block">
                Total anual: R${annualTotal.toFixed(2).replace('.', ',')} · Economia de 20%
              </div>
            )}
          </div>

          {hasActiveSubscription && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Você paga apenas a diferença proporcional ao mudar de plano.
            </p>
          )}
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Campo de cupom de desconto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
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

          {/* Campo de billing name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nome na fatura do cartão
              <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={billingName}
              onChange={e => setBillingName(e.target.value)}
              maxLength={22}
              placeholder="JARBIS.CC"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono tracking-wide uppercase"
              style={{ textTransform: 'uppercase' }}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Aparece na fatura do seu cartão. Deixe em branco para usar <span className="font-mono font-semibold">JARBIS.CC</span>.
            </p>
          </div>

          {/* Segurança */}
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Pagamento seguro processado pela Stripe. Seus dados de cartão nunca passam pelos nossos servidores.</span>
          </div>

          {/* CTA */}
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
            ) : hasActiveSubscription ? (
              'Fazer upgrade agora →'
            ) : (
              'Continuar para pagamento →'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            {hasActiveSubscription
              ? 'O valor proporcional será cobrado imediatamente.'
              : 'Você será redirecionado para o ambiente seguro de pagamento.'}
            {' '}Cancele a qualquer momento.
          </p>
        </form>
      </div>
    </div>
  )
}
