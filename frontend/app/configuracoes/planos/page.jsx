'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslations } from 'next-intl'

// ─── Dados dos planos ─────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'free',
    name: 'Gratuito',
    monthlyPrice: 0,
    desc: 'Para experimentar',
    features: ['2 dashboards', '2 fontes de dados', '1 usuário', 'Link público'],
    color: 'border-gray-200',
    accentColor: 'text-gray-500',
    highlight: false,
    enterprise: false,
    trialBadge: false,
  },
  {
    key: 'solo',
    name: 'Solo',
    monthlyPrice: 79.90,
    desc: 'Para autônomos e MEIs',
    features: ['8 dashboards', '8 fontes de dados', '1 usuário', '5 alertas', 'Incorporar no site'],
    color: 'border-blue-200',
    accentColor: 'text-blue-600',
    highlight: false,
    enterprise: false,
    trialBadge: false,
    stripePriceKey: 'NEXT_PUBLIC_STRIPE_PRICE_SOLO',
  },
  {
    key: 'equipe',
    name: 'Profissional',
    monthlyPrice: 189.90,
    desc: 'Para pequenas empresas',
    features: ['20 dashboards', '15 fontes de dados', '1 usuário', '15 alertas', 'IA em português', 'Incorporar no site'],
    color: 'border-violet-600',
    accentColor: 'text-violet-600',
    highlight: true,
    enterprise: false,
    trialBadge: false,
    stripePriceKey: 'NEXT_PUBLIC_STRIPE_PRICE_EQUIPE',
  },
  {
    key: 'ilimitado',
    name: 'Ilimitado',
    monthlyPrice: 599.90,
    desc: 'Para empresas em crescimento',
    features: ['50 dashboards', '30 fontes de dados', '5 usuários', '50 alertas', 'IA em português', 'Marca própria', 'Incorporar no site'],
    color: 'border-amber-400',
    accentColor: 'text-amber-600',
    highlight: false,
    enterprise: false,
    trialBadge: false,
    stripePriceKey: 'NEXT_PUBLIC_STRIPE_PRICE_ILIMITADO',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    desc: 'Para grandes operações',
    features: ['Tudo do Ilimitado', 'Usuários ilimitados', 'SLA garantido em contrato', 'Gerente de conta dedicado', 'Onboarding personalizado'],
    color: 'border-gray-700',
    accentColor: 'text-amber-400',
    highlight: false,
    enterprise: true,
    trialBadge: false,
  },
]

const PRICE_IDS = {
  solo:      process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO,
  equipe:    process.env.NEXT_PUBLIC_STRIPE_PRICE_EQUIPE,
  ilimitado: process.env.NEXT_PUBLIC_STRIPE_PRICE_ILIMITADO,
  // legados
  starter:      process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  professional: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
}

const PLAN_ORDER = ['free', 'solo', 'equipe', 'ilimitado', 'enterprise',
                    'starter', 'professional'] // legados ao final

function planRank(key) {
  const idx = PLAN_ORDER.indexOf(key)
  return idx === -1 ? 0 : idx
}

// ─── Componente principal ─────────────────────────────────────────────────────

function PlanosContent() {
  const t = useTranslations('planos')
  const searchParams = useSearchParams()
  const toast = useToast()
  const [status, setStatus]             = useState(null)
  const [loading, setLoading]           = useState(true)
  const [upgrading, setUpgrading]       = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [annual, setAnnual]             = useState(false)
  const [addonLoading, setAddonLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast(t('toast.success'), 'success', 6000)
    } else if (searchParams.get('addon') === '1') {
      toast(t('toast.addon'), 'success', 6000)
    } else if (searchParams.get('canceled') === '1') {
      toast(t('toast.canceled'), 'info')
    }
    api.billing.status()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(plan) {
    const priceId = PRICE_IDS[plan.key]
    if (!priceId) {
      toast(t('toast.noPayment'), 'warn')
      return
    }
    setUpgrading(plan.key)
    try {
      const data = await api.billing.checkout(priceId)
      window.location.href = data.checkout_url
    } catch (err) {
      toast(err.message || t('toast.checkoutError'), 'error')
      setUpgrading(null)
    }
  }

  async function handleAddon() {
    setAddonLoading(true)
    try {
      const data = await api.billing.addonCheckout()
      window.location.href = data.checkout_url
    } catch (err) {
      toast(err.message || t('toast.addonError'), 'warn')
      setAddonLoading(false)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const data = await api.billing.portal()
      window.location.href = data.portal_url
    } catch (err) {
      toast(err.message || t('toast.portalError'), 'error')
      setPortalLoading(false)
    }
  }

  const currentPlan = status?.plan || 'free'
  const isPaid      = currentPlan !== 'free'

  function calcPrice(monthly) {
    if (monthly === null || monthly === 0) return monthly
    return annual ? +(monthly * 0.8).toFixed(2) : monthly
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('currentPlan')}{' '}
              <span className="font-semibold text-violet-700">{status?.plan_name || t('plans.free.name')}</span>
              {status?.trial_days_remaining > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  {t('trialRemaining', { days: status.trial_days_remaining })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {/* Toggle anual/mensal */}
            <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${!annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {t('monthly')}
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {t('annual')}
                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
            {isPaid && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {portalLoading ? t('opening') : t('manageSubscription')}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-80 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Uso atual */}
            {status && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  { label: t('usage.dashboards'), used: status.usage.dashboards, max: status.limits.dashboards },
                  { label: t('usage.datasets'),   used: status.usage.datasets,   max: status.limits.datasets },
                  { label: t('usage.users'),       used: status.usage.users,      max: status.limits.users },
                  { label: t('usage.alerts'),      used: status.usage.alerts,     max: status.limits.alerts },
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
                      {item.max !== -1 ? (
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div
                            className={`h-1.5 rounded-full transition-all ${atLimit ? 'bg-red-400' : 'bg-violet-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 font-semibold">{t('unlimited')}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Cards de plano */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {PLANS.map(plan => {
                const isCurrent = plan.key === currentPlan
                const isUpgrade = planRank(plan.key) > planRank(currentPlan)
                const price     = calcPrice(plan.monthlyPrice)

                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all ${
                      isCurrent
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : plan.highlight
                        ? 'border-violet-600 shadow-lg shadow-violet-100 bg-white'
                        : plan.enterprise
                        ? 'border-gray-700 bg-gray-900'
                        : `${plan.color} bg-white`
                    }`}
                  >
                    {/* Badge topo */}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap">
                        {t('planCurrentBadge')}
                      </div>
                    )}
                    {plan.highlight && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap">
                        {t('planPopularBadge')}
                      </div>
                    )}
                    {plan.enterprise && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap">
                        {t('planEnterpriseBadge')}
                      </div>
                    )}

                    {/* Cabeçalho do plano */}
                    <div className="mb-4">
                      <p className={`text-xs font-bold mb-1 ${plan.enterprise ? 'text-gray-400' : plan.accentColor}`}>
                        {t(`plans.${plan.key}.name`, { defaultValue: plan.name })}
                      </p>

                      {price === null ? (
                        <span className={`font-black text-base ${plan.enterprise ? 'text-white' : 'text-gray-900'}`}>
                          {t('priceOnRequest')}
                        </span>
                      ) : price === 0 ? (
                        <span className="font-black text-3xl text-gray-900">{t('priceFree')}</span>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className={`font-black text-2xl ${plan.enterprise ? 'text-white' : 'text-gray-900'}`}>
                            R${price.toFixed(2).replace('.', ',')}
                          </span>
                          <span className={`text-xs ${plan.enterprise ? 'text-gray-500' : 'text-gray-400'}`}>{t('perMonth')}</span>
                        </div>
                      )}

                      {annual && plan.monthlyPrice && plan.monthlyPrice > 0 && (
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          {t('billedAnnually', { price: (price * 12).toFixed(2).replace('.', ',') })}
                        </p>
                      )}

                      {plan.trialBadge && !isCurrent && (
                        <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {t('trialBadge')}
                        </div>
                      )}

                      <p className={`text-xs mt-2 ${plan.enterprise ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t(`plans.${plan.key}.desc`, { defaultValue: plan.desc })}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs">
                          <svg
                            className={`w-3.5 h-3.5 flex-shrink-0 ${plan.enterprise ? 'text-amber-400' : plan.accentColor}`}
                            viewBox="0 0 20 20" fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className={plan.enterprise ? 'text-gray-300' : 'text-gray-700'}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isCurrent ? (
                      <div className="text-center py-2.5 text-xs text-gray-400 font-semibold border border-gray-200 rounded-full">
                        {t('planCurrentCta')}
                      </div>
                    ) : plan.key === 'free' ? (
                      <div className="text-center py-2.5 text-xs text-gray-300">—</div>
                    ) : plan.enterprise ? (
                      <a
                        href="mailto:comercial@jarbis.cc?subject=Interesse no plano Enterprise"
                        className="block text-center py-2.5 rounded-full font-bold text-xs bg-amber-500 text-white hover:bg-amber-400 transition-colors"
                      >
                        {t('contactSales')}
                      </a>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan)}
                        disabled={!!upgrading}
                        className={`w-full py-2.5 rounded-full font-bold text-xs transition-colors disabled:opacity-50 ${
                          plan.highlight
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-gray-900 text-white hover:bg-gray-700'
                        }`}
                      >
                        {upgrading === plan.key
                          ? t('redirecting')
                          : isUpgrade ? t('doUpgrade') : t('changePlan')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs text-gray-400 mb-8">
              {annual ? t('annualNote') : t('monthlyNote')}
            </p>

            {/* Card de add-on — visível apenas em planos pagos */}
            {isPaid && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">📦</span>
                      <h3 className="font-black text-gray-900">{t('addon.title')}</h3>
                      <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {t('addon.price')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('addon.desc')}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { icon: '👤', label: t('addon.users') },
                        { icon: '📊', label: t('addon.dashboards') },
                        { icon: '🗄️', label: t('addon.datasets') },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-violet-100 rounded-lg px-2.5 py-1.5">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {status?.addon_packs > 0 && (
                      <p className="text-xs text-violet-700 font-semibold mt-3">
                        ✓ Você tem {status.addon_packs} pack{status.addon_packs > 1 ? 's' : ''} ativo{status.addon_packs > 1 ? 's' : ''}{' '}
                        (+{status.addon_packs} usuário{status.addon_packs > 1 ? 's' : ''},{' '}
                        +{status.addon_packs * 5} dashboards,{' '}
                        +{status.addon_packs * 3} fontes de dados)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleAddon}
                    disabled={addonLoading}
                    className="sm:flex-shrink-0 px-5 py-2.5 bg-violet-600 text-white font-bold text-sm rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {addonLoading ? t('addon.adding') : t('addon.addPack')}
                  </button>
                </div>
              </div>
            )}

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
