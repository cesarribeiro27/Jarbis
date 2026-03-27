'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslations } from 'next-intl'
import CheckoutModal from '@/components/CheckoutModal'

// ─── Dados dos planos ─────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'free',
    monthlyPrice: 0,
    featureKeys: ['plans.free.f1', 'plans.free.f2', 'plans.free.f3', 'plans.free.f4'],
    color: 'border-gray-200',
    accentColor: 'text-gray-500',
    highlight: false,
    enterprise: false,
    trialBadge: false,
  },
  {
    key: 'essential',
    monthlyPrice: 97.00,
    featureKeys: ['plans.essential.f1', 'plans.essential.f2', 'plans.essential.f3', 'plans.essential.f4', 'plans.essential.f5', 'plans.essential.f6'],
    color: 'border-blue-200',
    accentColor: 'text-blue-600',
    highlight: false,
    enterprise: false,
    trialBadge: false,
  },
  {
    key: 'pro',
    monthlyPrice: 247.00,
    featureKeys: ['plans.pro.f1', 'plans.pro.f2', 'plans.pro.f3', 'plans.pro.f4', 'plans.pro.f5', 'plans.pro.f6'],
    color: 'border-violet-600',
    accentColor: 'text-violet-600',
    highlight: true,
    enterprise: false,
    trialBadge: false,
  },
  {
    key: 'business',
    monthlyPrice: 697.00,
    featureKeys: ['plans.business.f1', 'plans.business.f2', 'plans.business.f3', 'plans.business.f4', 'plans.business.f5', 'plans.business.f6', 'plans.business.f7'],
    color: 'border-amber-400',
    accentColor: 'text-amber-600',
    highlight: false,
    enterprise: false,
    trialBadge: false,
  },
  {
    key: 'enterprise',
    monthlyPrice: null,
    featureKeys: ['plans.enterprise.f1', 'plans.enterprise.f2', 'plans.enterprise.f3', 'plans.enterprise.f4', 'plans.enterprise.f5'],
    color: 'border-gray-700',
    accentColor: 'text-amber-400',
    highlight: false,
    enterprise: true,
    trialBadge: false,
  },
]

// Mapeamento de chaves legadas para as novas (para lookup de rank de plano atual)
const LEGACY_PLAN_MAP = {
  solo:         'essential',
  equipe:       'pro',
  ilimitado:    'business',
  starter:      'essential',
  professional: 'pro',
}

const PLAN_ORDER = ['free', 'essential', 'pro', 'business', 'enterprise']

function normalizeKey(key) {
  return LEGACY_PLAN_MAP[key] || key
}

function planRank(key) {
  const idx = PLAN_ORDER.indexOf(normalizeKey(key))
  return idx === -1 ? 0 : idx
}

// ─── Componente principal ─────────────────────────────────────────────────────

function PlanosContent() {
  const t = useTranslations('planos')
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const [status, setStatus]             = useState(null)
  const [loading, setLoading]           = useState(true)
  const [upgrading, setUpgrading]       = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [annual, setAnnual]             = useState(false)
  const [checkoutModal, setCheckoutModal] = useState(null) // { plan, annual }

  // ─── Add-ons ──────────────────────────────────────────────────────────────
  const ADDONS = [
    {
      key: 'completo',
      price: 49,
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
      featureKeys: ['addon.completo.feature1', 'addon.completo.feature2', 'addon.completo.feature3'],
      activeCount: () => status?.addon_packs,
      activeKey: 'addon.completo.active',
    },
    {
      key: 'dash',
      price: 29,
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      featureKeys: ['addon.dash.feature'],
      activeCount: () => status?.addon_dashboards,
      activeKey: 'addon.dash.active',
    },
    {
      key: 'dataset',
      price: 19,
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
      featureKeys: ['addon.dataset.feature'],
      activeCount: () => status?.addon_datasets,
      activeKey: 'addon.dataset.active',
    },
    {
      key: 'ai',
      price: 19,
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>,
      featureKeys: ['addon.ai.feature1', 'addon.ai.feature2'],
      activeCount: () => status?.addon_ai_queries,
      activeKey: 'addon.ai.active',
    },
    {
      key: 'rows',
      price: 49,
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M3 12h18M3 18h18"/><rect x="2" y="3" width="20" height="18" rx="2"/></svg>,
      featureKeys: ['addon.rows.feature1', 'addon.rows.feature2'],
      activeCount: () => status?.addon_rows_packs,
      activeKey: 'addon.rows.active',
    },
  ]

  function handleAddonCheckout(key) {
    router.push(`/checkout?addon=${key}`)
  }

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

  function handleUpgrade(plan) {
    if (status?.has_active_subscription) {
      // Assinante ativo com subscription real no Stripe — usa modal de proration
      setCheckoutModal({ plan, annual })
    } else {
      // Sem assinatura ativa — redireciona para página de checkout
      router.push(`/checkout?plan=${plan.key}&annual=${annual}`)
    }
  }

  function handleCheckoutSuccess() {
    // Recarrega o status após upgrade imediato (proration)
    setStatus(null)
    api.billing.status().then(setStatus).catch(() => {})
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
  const isPaid      = status?.plan && status.plan !== 'free'
  const hasStripe   = status?.has_stripe

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
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
            <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${!annual ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {t('monthly')}
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${annual ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {t('annual')}
                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
            {isPaid && hasStripe && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {portalLoading ? t('opening') : t('manageSubscription')}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-80 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Uso atual */}
            {status && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
                {[
                  { label: t('usage.dashboards'), used: status.usage.dashboards, max: status.limits.dashboards },
                  { label: t('usage.datasets'),   used: status.usage.datasets,   max: status.limits.datasets },
                  { label: t('usage.users'),       used: status.usage.users,      max: status.limits.users },
                  { label: t('usage.alerts'),      used: status.usage.alerts,     max: status.limits.alerts },
                  { label: t('usage.rows'),         used: status.usage.rows,       max: status.limits.rows, fmt: v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(0)}k` : String(v) },
                  { label: 'Campanhas de Links', used: status.usage.link_campaigns ?? 0, max: status.limits.link_campaigns ?? 1 },
                ].map(item => {
                  const pct = item.max === -1 ? 0 : Math.min(100, (item.used / item.max) * 100)
                  const atLimit = item.max !== -1 && item.used >= item.max
                  return (
                    <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.label}</span>
                        <span className={`text-xs font-bold ${atLimit ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.fmt ? item.fmt(item.used) : item.used}{item.max === -1 ? '' : `/${item.fmt ? item.fmt(item.max) : item.max}`}
                        </span>
                      </div>
                      {item.max !== -1 ? (
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full">
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
                const isCurrent = plan.key === currentPlan || plan.key === normalizeKey(currentPlan)
                const isUpgrade = planRank(plan.key) > planRank(currentPlan)
                const price     = calcPrice(plan.monthlyPrice)

                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all ${
                      isCurrent
                        ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20'
                        : plan.highlight
                        ? 'border-violet-600 shadow-lg shadow-violet-100 dark:shadow-violet-900/20 bg-white dark:bg-gray-800'
                        : plan.enterprise
                        ? 'border-gray-700 bg-gray-900'
                        : `${plan.color} dark:border-gray-600 bg-white dark:bg-gray-800`
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
                        <span className={`font-black text-base ${plan.enterprise ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                          {t('priceOnRequest')}
                        </span>
                      ) : price === 0 ? (
                        <span className="font-black text-3xl text-gray-900 dark:text-gray-100">{t('priceFree')}</span>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className={`font-black text-2xl ${plan.enterprise ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            R${price.toFixed(2).replace('.', ',')}
                          </span>
                          <span className={`text-xs ${plan.enterprise ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{t('perMonth')}</span>
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
                      {plan.featureKeys.map(fk => (
                        <li key={fk} className="flex items-center gap-2 text-xs">
                          <svg
                            className={`w-3.5 h-3.5 flex-shrink-0 ${plan.enterprise ? 'text-amber-400' : plan.accentColor}`}
                            viewBox="0 0 20 20" fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className={plan.enterprise ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}>{t(fk)}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isCurrent ? (
                      <div className="text-center py-2.5 text-xs text-gray-400 dark:text-gray-500 font-semibold border border-gray-200 dark:border-gray-600 rounded-full">
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
                        className={`w-full py-2.5 rounded-full font-bold text-xs transition-colors ${
                          plan.highlight
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-gray-900 text-white hover:bg-gray-700'
                        }`}
                      >
                        {isUpgrade ? t('doUpgrade') : t('changePlan')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mb-8">
              {annual ? t('annualNote') : t('monthlyNote')}
            </p>

            {/* Packs de Expansão — visível apenas em planos pagos */}
            {isPaid && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  <h3 className="font-black text-gray-900 dark:text-gray-100">{t('addon.sectionTitle')}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('addon.sectionDesc')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {ADDONS.map(addon => {
                    const activeCount = addon.activeCount()
                    return (
                      <div
                        key={addon.key}
                        className="bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-700/50 rounded-2xl p-5 flex flex-col"
                      >
                        <div className="flex items-center gap-2 mb-1 text-violet-600">
                          {addon.icon}
                          <span className="font-black text-gray-900 dark:text-gray-100 text-sm">{t(`addon.${addon.key}.title`)}</span>
                        </div>
                        <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                          R${addon.price}<span className="text-xs text-gray-400 font-normal">/mês</span>
                        </p>
                        <ul className="mt-3 space-y-1 flex-1">
                          {addon.featureKeys.map(fk => (
                            <li key={fk} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                              <svg className="w-3 h-3 text-violet-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              {t(fk)}
                            </li>
                          ))}
                        </ul>
                        {activeCount > 0 && (
                          <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold mt-2">
                            ✓ {activeCount} {t(addon.activeKey)}
                          </p>
                        )}
                        <button
                          onClick={() => handleAddonCheckout(addon.key)}
                          className="mt-4 w-full py-2 bg-violet-600 text-white font-bold text-xs rounded-full hover:bg-violet-700 transition-colors"
                        >
                          {t('addon.addPack')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </>
        )}
      </div>
      {checkoutModal && (
        <CheckoutModal
          plan={checkoutModal.plan}
          annual={checkoutModal.annual}
          hasActiveSubscription={!!status?.has_active_subscription}
          onClose={() => setCheckoutModal(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
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
