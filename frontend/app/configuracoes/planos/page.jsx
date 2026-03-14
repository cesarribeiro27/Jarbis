'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

const PLANS = [
  {
    key: 'free',
    name: 'Gratuito',
    price: 'R$0',
    period: '',
    desc: 'Para explorar a plataforma',
    color: 'bg-gray-50 border-gray-200',
    features: [
      '2 dashboards',
      '1 dataset',
      '1 usuário',
      'Embed básico (iframe)',
      'Link público',
    ],
    missing: ['Alertas', 'IA em português', 'White-label', 'Suporte'],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 'R$197',
    period: '/mês',
    desc: 'Para times em crescimento',
    color: 'bg-white border-violet-300',
    priceKey: 'NEXT_PUBLIC_STRIPE_PRICE_STARTER',
    features: [
      '10 dashboards',
      '5 datasets',
      '3 usuários',
      '5 alertas',
      'Embed avançado',
      'Link público',
    ],
    missing: ['IA em português', 'White-label'],
  },
  {
    key: 'professional',
    name: 'Pro',
    price: 'R$597',
    period: '/mês',
    desc: 'Para empresas que escalam',
    highlight: true,
    color: 'border-violet-600',
    priceKey: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
    features: [
      'Dashboards ilimitados',
      'Datasets ilimitados',
      'Usuários ilimitados',
      'Alertas ilimitados',
      'IA em português',
      'White-label',
      'Embed avançado',
      'Suporte prioritário',
    ],
    missing: [],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'R$1.497',
    period: '/mês',
    desc: 'Para grandes operações',
    color: 'bg-gray-50 border-gray-200',
    priceKey: 'NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE',
    features: [
      'Tudo do Pro',
      'SLA garantido',
      'Onboarding dedicado',
      'Gerente de conta',
      'Contrato anual com desconto',
    ],
    missing: [],
  },
]

const PRICE_IDS = {
  starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  professional: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
}

function PlanosContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setToast({ type: 'success', msg: 'Assinatura ativada com sucesso! Seu plano foi atualizado.' })
    } else if (searchParams.get('canceled') === '1') {
      setToast({ type: 'info', msg: 'Checkout cancelado. Nenhuma cobrança foi realizada.' })
    }
    api.fetch('/billing/status')
      .then(setStatus)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(plan) {
    const priceId = PRICE_IDS[plan.key]
    if (!priceId) {
      setToast({ type: 'error', msg: 'Pagamentos em configuração. Tente novamente em breve.' })
      return
    }
    setUpgrading(plan.key)
    try {
      const data = await api.fetch('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ price_id: priceId }),
      })
      window.location.href = data.checkout_url
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Erro ao iniciar checkout.' })
      setUpgrading(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const data = await api.fetch('/billing/portal', { method: 'POST' })
      window.location.href = data.portal_url
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Erro ao abrir portal.' })
      setPortalLoading(false)
    }
  }

  const currentPlan = status?.plan || 'free'
  const isPaid = currentPlan !== 'free'

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Toast */}
        {toast && (
          <div className={`mb-6 rounded-xl px-5 py-4 flex items-center justify-between gap-4 ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            toast.type === 'error' ? 'bg-red-50 border border-red-100 text-red-700' :
            'bg-blue-50 border border-blue-100 text-blue-700'
          }`}>
            <span className="text-sm font-medium">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="text-current opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Planos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Plano atual: <span className="font-semibold text-violet-700">{status?.plan_name || 'Gratuito'}</span>
              {status?.trial_days_remaining > 0 && (
                <span className="ml-2 text-amber-600">· {status.trial_days_remaining} dias de trial restantes</span>
              )}
            </p>
          </div>
          {isPaid && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura →'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Carregando...</div>
        ) : (
          <>
            {/* Uso atual */}
            {status && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Dashboards', used: status.usage.dashboards, max: status.limits.dashboards },
                  { label: 'Datasets', used: status.usage.datasets, max: status.limits.datasets },
                  { label: 'Usuários', used: status.usage.users, max: status.limits.users },
                  { label: 'Alertas', used: status.usage.alerts, max: status.limits.alerts },
                ].map(item => {
                  const pct = item.max === -1 ? 0 : Math.min(100, (item.used / item.max) * 100)
                  const atLimit = item.max !== -1 && item.used >= item.max
                  return (
                    <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                        <span className={`text-xs font-bold ${atLimit ? 'text-red-500' : 'text-gray-700'}`}>
                          {item.used}{item.max === -1 ? '' : `/${item.max}`}
                        </span>
                      </div>
                      {item.max !== -1 && (
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div
                            className={`h-1.5 rounded-full transition-all ${atLimit ? 'bg-red-400' : 'bg-violet-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {item.max === -1 && (
                        <div className="text-xs text-emerald-600 font-semibold">Ilimitado</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Cards de plano */}
            <div className="grid md:grid-cols-4 gap-5">
              {PLANS.map(plan => {
                const isCurrent = plan.key === currentPlan
                const isHigher = ['free', 'starter', 'professional', 'enterprise']
                  .indexOf(plan.key) > ['free', 'starter', 'professional', 'enterprise'].indexOf(currentPlan)

                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                      plan.highlight
                        ? 'border-violet-600 shadow-lg shadow-violet-100'
                        : isCurrent
                        ? 'border-violet-300 bg-violet-50/30'
                        : plan.color
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                        Mais popular
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                        Plano atual
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-sm font-bold text-gray-500 mb-1">{plan.name}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                        <span className="text-gray-400 text-sm">{plan.period}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{plan.desc}</p>
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-violet-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {f}
                        </li>
                      ))}
                      {plan.missing.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="text-center py-2.5 text-sm text-gray-400 font-medium border border-gray-200 rounded-full">
                        Plano atual
                      </div>
                    ) : plan.key === 'free' ? (
                      <div className="text-center py-2.5 text-sm text-gray-400 font-medium">
                        —
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan)}
                        disabled={!!upgrading}
                        className={`w-full py-2.5 rounded-full font-bold text-sm transition-all ${
                          plan.highlight
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-gray-900 text-white hover:bg-gray-700'
                        } disabled:opacity-50`}
                      >
                        {upgrading === plan.key ? 'Redirecionando...' : isHigher ? `Fazer upgrade →` : 'Mudar para este plano'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-center text-sm text-gray-400 mt-6">
              Todos os planos incluem 7 dias de teste gratuito · Cancele quando quiser · Sem taxas escondidas
            </p>
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default function PlanosPage() {
  return (
    <Suspense fallback={null}>
      <PlanosContent />
    </Suspense>
  )
}
