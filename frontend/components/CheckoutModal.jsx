'use client'

import { useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
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

const STRIPE_APPEARANCE = {
  theme: 'flat',
  variables: {
    colorPrimary: '#7c3aed',
    colorBackground: '#ffffff',
    colorText: '#111827',
    colorDanger: '#ef4444',
    colorTextSecondary: '#6b7280',
    colorTextPlaceholder: '#9ca3af',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: '14px',
    spacingUnit: '4px',
    borderRadius: '12px',
    gridRowSpacing: '20px',
  },
  rules: {
    '.Input': {
      border: '1px solid #e5e7eb',
      padding: '10px 14px',
      boxShadow: 'none',
      transition: 'border-color 0.15s',
    },
    '.Input:focus': {
      border: '1px solid #7c3aed',
      boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
      outline: 'none',
    },
    '.Input--invalid': { border: '1px solid #ef4444' },
    '.Label': {
      fontWeight: '600',
      color: '#374151',
      fontSize: '13px',
      marginBottom: '6px',
    },
    '.Error': { color: '#ef4444', fontSize: '12px' },
    '.Tab': { border: '1px solid #e5e7eb', borderRadius: '10px' },
    '.Tab--selected': { border: '1px solid #7c3aed', color: '#7c3aed' },
    '.Tab:hover': { borderColor: '#7c3aed' },
    '.Block': { border: '1px solid #e5e7eb', borderRadius: '12px' },
  },
}

// ─── Etapa 1: Detalhes do plano ───────────────────────────────────────────────

function StepDetails({ plan, annual, monthlyPrice, annualTotal, display, hasActiveSubscription, onClose, onNext }) {
  const toast = useToast()
  const [billingName, setBillingName] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const nameToSave = billingName.trim() || 'JARBIS.CC'
      await api.billing.setBillingName(nameToSave)

      if (hasActiveSubscription) {
        // Upgrade imediato com proration — sem precisar de Elements
        const result = await api.billing.upgrade(plan.key, annual, couponCode.trim())
        if (result.checkout_url) {
          window.location.href = result.checkout_url
          return
        }
        toast('Plano atualizado com sucesso!', 'success', 6000)
        onNext({ type: 'immediate_success' })
        return
      }

      // Nova assinatura — cria subscription intent
      const intent = await api.billing.subscriptionIntent(plan.key, annual, couponCode.trim())
      onNext({ type: 'elements', ...intent })
    } catch (err) {
      toast(err.message || 'Erro ao processar. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
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
          onChange={e => setBillingName(e.target.value)}
          maxLength={22}
          placeholder="JARBIS.CC"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono tracking-wide uppercase"
          style={{ textTransform: 'uppercase' }}
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Aparece na fatura do cartão. Padrão: <span className="font-mono font-semibold">JARBIS.CC</span>
        </p>
      </div>

      {/* Segurança */}
      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Pagamento 100% seguro. Dados do cartão processados diretamente pela Stripe — nunca passam pelos nossos servidores.</span>
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
        ) : hasActiveSubscription ? (
          'Fazer upgrade agora →'
        ) : (
          'Ir para pagamento →'
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        {hasActiveSubscription
          ? 'O valor proporcional será cobrado imediatamente.'
          : 'No próximo passo você insere os dados do cartão.'}
        {' '}Cancele a qualquer momento.
      </p>
    </form>
  )
}

// ─── Etapa 2: Formulário de pagamento (Stripe Elements) ───────────────────────

function PaymentForm({ onClose, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setErrorMsg('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/configuracoes/planos?success=1`,
      },
      redirect: 'if_required',
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Erro ao processar pagamento.')
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      toast('Assinatura ativada com sucesso! 🎉', 'success', 8000)
      onSuccess?.()
      onClose()
      return
    }

    // Outros status (e.g., requires_action) — Stripe já redirecionou
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultValues: { billingDetails: { address: { country: 'BR' } } },
        }}
      />

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe || !elements}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Confirmar pagamento
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Processado pela Stripe com criptografia de ponta a ponta. Cancele a qualquer momento.
      </p>
    </form>
  )
}

// ─── Modal principal ───────────────────────────────────────────────────────────

export default function CheckoutModal({ plan, annual, hasActiveSubscription, onClose, onSuccess }) {
  const [step, setStep] = useState('details') // 'details' | 'payment'
  const [stripeInstance, setStripeInstance] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)

  const display = PLAN_DISPLAY[plan.key] || { name: plan.key, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
  const monthlyPrice = annual ? +(plan.monthlyPrice * 0.8).toFixed(2) : plan.monthlyPrice
  const annualTotal  = annual ? +(monthlyPrice * 12).toFixed(2) : null

  async function handleNext(data) {
    if (data.type === 'immediate_success') {
      onSuccess?.()
      onClose()
      return
    }
    // Inicializa Stripe com a publishable key retornada pelo backend
    const stripe = await loadStripe(data.publishable_key)
    setStripeInstance(stripe)
    setClientSecret(data.client_secret)
    setStep('payment')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#0B0A1A] px-6 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LogoWithText size={24} light />
              {step === 'payment' && (
                <button
                  onClick={() => { setStep('details'); setClientSecret(null) }}
                  className="ml-2 text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 text-xs"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Voltar
                </button>
              )}
            </div>
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
                <span className="text-xs text-gray-500 font-medium">Plano selecionado</span>
                <div className={`text-lg font-black ${display.color}`}>Jarbis {display.name}</div>
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

          {/* Steps indicator */}
          {!hasActiveSubscription && (
            <div className="flex items-center gap-2 mt-4">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 'details' ? 'text-violet-400' : 'text-gray-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === 'details' ? 'bg-violet-500 text-white' : 'bg-gray-600 text-gray-300'}`}>1</span>
                Detalhes
              </div>
              <div className="flex-1 h-px bg-gray-700" />
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 'payment' ? 'text-violet-400' : 'text-gray-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === 'payment' ? 'bg-violet-500 text-white' : 'bg-gray-600 text-gray-300'}`}>2</span>
                Pagamento
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo por etapa */}
        {step === 'details' && (
          <StepDetails
            plan={plan}
            annual={annual}
            monthlyPrice={monthlyPrice}
            annualTotal={annualTotal}
            display={display}
            hasActiveSubscription={hasActiveSubscription}
            onClose={onClose}
            onNext={handleNext}
          />
        )}

        {step === 'payment' && stripeInstance && clientSecret && (
          <Elements
            stripe={stripeInstance}
            options={{ clientSecret, appearance: STRIPE_APPEARANCE, locale: 'pt-BR' }}
          >
            <PaymentForm onClose={onClose} onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  )
}
