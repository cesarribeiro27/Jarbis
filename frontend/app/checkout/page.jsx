'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { LogoWithText } from '@/components/logos/JarbisLogo'

// ─── Catálogo de produtos ─────────────────────────────────────────────────────

const PLAN_INFO = {
  essential: {
    name: 'Essential',
    monthlyPrice: 97.00,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    features: ['3 dashboards', '3 fontes de dados', '2 usuários', '10k linhas por dataset', 'Compartilhamento público'],
    trialBadge: true,
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 247.00,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    features: ['15 dashboards', '10 fontes de dados', '5 usuários', '100k linhas por dataset', '50 perguntas IA por mês', 'Alertas automáticos'],
    trialBadge: true,
  },
  business: {
    name: 'Business',
    monthlyPrice: 697.00,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    features: ['Dashboards ilimitados', 'Datasets ilimitados', 'Usuários ilimitados', '500k linhas por dataset', 'IA ilimitada', 'White-label'],
    trialBadge: true,
  },
  solo:      { name: 'Essential', monthlyPrice: 97.00,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   features: ['3 dashboards', '3 fontes de dados', '2 usuários'], trialBadge: true },
  equipe:    { name: 'Pro',       monthlyPrice: 247.00, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', features: ['15 dashboards', '10 fontes de dados', '5 usuários'], trialBadge: true },
  ilimitado: { name: 'Business',  monthlyPrice: 697.00, color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  features: ['Tudo ilimitado'], trialBadge: true },
}

const ADDON_INFO = {
  completo: {
    name: 'Pack Completo',
    price: 49.00,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    features: ['+1 usuário extra', '+5 dashboards', '+3 fontes de dados'],
  },
  dash: {
    name: 'Pack Dashboards',
    price: 29.00,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    features: ['+5 dashboards extras'],
  },
  dataset: {
    name: 'Pack Fontes de Dados',
    price: 19.00,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    features: ['+3 fontes de dados extras'],
  },
  ai: {
    name: 'Pack IA',
    price: 19.00,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    features: ['+50 perguntas de IA por mês', 'Consultas extras ao assistente'],
  },
  rows: {
    name: 'Pack Linhas',
    price: 49.00,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    features: ['+100k linhas por dataset'],
  },
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
    '.Input': { border: '1px solid #e5e7eb', padding: '10px 14px', boxShadow: 'none', transition: 'border-color 0.15s' },
    '.Input:focus': { border: '1px solid #7c3aed', boxShadow: '0 0 0 3px rgba(124,58,237,0.1)', outline: 'none' },
    '.Input--invalid': { border: '1px solid #ef4444' },
    '.Label': { fontWeight: '600', color: '#374151', fontSize: '13px', marginBottom: '6px' },
    '.Error': { color: '#ef4444', fontSize: '12px' },
    '.Tab': { border: '1px solid #e5e7eb', borderRadius: '10px' },
    '.Tab--selected': { border: '1px solid #7c3aed', color: '#7c3aed' },
    '.Tab:hover': { borderColor: '#7c3aed' },
    '.Block': { border: '1px solid #e5e7eb', borderRadius: '12px' },
  },
}

// ─── Formulário de pagamento (etapa 2) ────────────────────────────────────────

function PaymentForm({ onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const toast = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setErrorMsg('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/configuracoes/planos?success=1` },
      redirect: 'if_required',
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Erro ao processar pagamento.')
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      toast('Assinatura ativada com sucesso!', 'success', 8000)
      onSuccess?.()
      router.push('/configuracoes/planos?success=1')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs', defaultValues: { billingDetails: { address: { country: 'BR' } } } }} />

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errorMsg}
        </div>
      )}

      <button type="submit" disabled={loading || !stripe || !elements}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? (
          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processando...</>
        ) : (
          <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Confirmar pagamento</>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Processado pela Stripe com criptografia de ponta a ponta. Cancele a qualquer momento.
      </p>
    </form>
  )
}

// ─── Resumo do produto (coluna esquerda) ─────────────────────────────────────

function ProductSummary({ product, isAddon, monthlyPrice, annualTotal, annual }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">
        {isAddon ? 'Add-on selecionado' : 'Resumo do pedido'}
      </p>

      <div className={`rounded-xl border ${product.border} ${product.bg} px-4 py-4 mb-5`}>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">{isAddon ? 'Pack de expansão' : 'Plano selecionado'}</span>
            <div className={`text-xl font-black mt-0.5 ${product.color}`}>
              {isAddon ? product.name : `Jarbis ${product.name}`}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${product.color}`}>
              R${(isAddon ? product.price : monthlyPrice).toFixed(2).replace('.', ',')}
            </div>
            <div className="text-xs text-gray-400">{!isAddon && annual ? '/mês · anual' : '/mês'}</div>
          </div>
        </div>
        {!isAddon && annual && annualTotal && (
          <div className="mt-3 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 inline-block">
            Total anual: R${annualTotal.toFixed(2).replace('.', ',')} · Economia de 20%
          </div>
        )}
      </div>

      <ul className="space-y-2 mb-5">
        {product.features.map(f => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
            <svg className={`w-4 h-4 flex-shrink-0 ${product.color}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {!isAddon && product.trialBadge && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 mb-4">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span className="text-xs text-emerald-700 font-semibold">7 dias gratuitos para novos cadastros</span>
        </div>
      )}

      {isAddon && (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3.5 py-2.5 mb-4">
          <svg className="w-4 h-4 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
          <span className="text-xs text-violet-700 font-semibold">Adicionado ao seu plano atual. Cancele a qualquer momento.</span>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3.5 py-2.5">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        <span>Pagamento 100% seguro processado pela Stripe. Cancele a qualquer momento sem multa.</span>
      </div>
    </div>
  )
}

// ─── Conteúdo principal ───────────────────────────────────────────────────────

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()

  const planKey  = searchParams.get('plan')
  const addonKey = searchParams.get('addon')
  const annual   = searchParams.get('annual') === 'true'
  const isAddon  = !!addonKey

  const product = isAddon ? ADDON_INFO[addonKey] : PLAN_INFO[planKey]

  const [step, setStep]               = useState('details')
  const [billingName, setBillingName] = useState('')
  const [couponCode, setCouponCode]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [stripeInstance, setStripeInstance] = useState(null)
  const [clientSecret, setClientSecret]     = useState(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
    if (!token) router.replace('/login')
  }, [])

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Produto não encontrado. <Link href="/configuracoes/planos" className="text-violet-600 underline">Voltar aos planos</Link></p>
      </div>
    )
  }

  const monthlyPrice = !isAddon && annual ? +(product.monthlyPrice * 0.8).toFixed(2) : (product.monthlyPrice ?? product.price)
  const annualTotal  = !isAddon && annual ? +(monthlyPrice * 12).toFixed(2) : null

  async function handleDetailsSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setDetailsError('')
    try {
      const nameToSave = billingName.trim().toUpperCase() || 'JARBIS.CC'
      await api.billing.setBillingName(nameToSave)

      const payload = isAddon
        ? { addon: addonKey, coupon_code: couponCode.trim() }
        : { plan: planKey, annual, coupon_code: couponCode.trim() }

      const intent = await api.billing.subscriptionIntent(payload)

      const pk = intent.publishable_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      if (!pk) throw new Error('Chave Stripe não configurada. Entre em contato com o suporte.')

      const stripe = await loadStripe(pk)
      if (!stripe) throw new Error('Não foi possível carregar o formulário de pagamento.')

      setStripeInstance(stripe)
      setClientSecret(intent.client_secret)
      setStep('payment')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const msg = err.message || 'Erro ao processar. Tente novamente.'
      setDetailsError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-[#0B0A1A] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/configuracoes/planos"><LogoWithText size={28} light /></Link>
          <Link href="/configuracoes/planos" className="text-gray-400 hover:text-gray-200 transition-colors text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Voltar aos planos
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-900">
            {step === 'details' ? (isAddon ? 'Adicionar pack' : 'Finalizar assinatura') : 'Dados de pagamento'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'details'
              ? 'Revise os detalhes e aplique um cupom antes de prosseguir'
              : 'Insira os dados do cartão para confirmar'}
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {['details', 'payment'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-16 h-px bg-gray-300" />}
              <div className={`flex items-center gap-2 text-sm font-semibold ${step === s ? 'text-violet-600' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step === s ? 'bg-violet-600 text-white' : 'bg-gray-300 text-white'}`}>{i + 1}</span>
                {s === 'details' ? 'Detalhes' : 'Pagamento'}
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">

          {/* Coluna esquerda — resumo */}
          <ProductSummary
            product={product}
            isAddon={isAddon}
            monthlyPrice={monthlyPrice}
            annualTotal={annualTotal}
            annual={annual}
          />

          {/* Coluna direita — formulário */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

            {step === 'details' && (
              <form onSubmit={handleDetailsSubmit} className="space-y-5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Detalhes da assinatura</p>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Cupom de desconto <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                  </label>
                  <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    maxLength={32} placeholder="Ex: JARBIS20"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono tracking-wide uppercase" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nome na fatura do cartão <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                  </label>
                  <input type="text" value={billingName} onChange={e => setBillingName(e.target.value.toUpperCase())}
                    maxLength={22} placeholder="JARBIS.CC"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono tracking-wide uppercase" />
                  <p className="text-xs text-gray-400 mt-1.5">Como aparece na fatura. Padrão: <span className="font-mono font-semibold">JARBIS.CC</span></p>
                </div>

                {detailsError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {detailsError}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Preparando pagamento...</>
                    : 'Continuar para pagamento →'}
                </button>

                <p className="text-center text-xs text-gray-400">No próximo passo você insere os dados do cartão. Cancele a qualquer momento.</p>
              </form>
            )}

            {step === 'payment' && stripeInstance && clientSecret && (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <button onClick={() => { setStep('details'); setClientSecret(null); setStripeInstance(null) }}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 text-sm">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Voltar
                  </button>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Dados do cartão</p>
                </div>
                <Elements stripe={stripeInstance} options={{ clientSecret, appearance: STRIPE_APPEARANCE, locale: 'pt-BR' }}>
                  <PaymentForm onSuccess={() => {}} />
                </Elements>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Jarbis · Desenvolvido pela Mazzel Tech ·{' '}
        <a href="mailto:comercial@jarbis.cc" className="hover:text-gray-600 transition-colors">comercial@jarbis.cc</a>
      </footer>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
