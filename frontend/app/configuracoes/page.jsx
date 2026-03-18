'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations } from 'next-intl'

const ROLE_COLORS = {
  owner:  'bg-violet-100 text-violet-700',
  admin:  'bg-blue-100 text-blue-700',
  member: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
}

export default function ConfiguracoesPage() {
  const t = useTranslations('configuracoes')
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [billing, setBilling] = useState(null)

  // Form de perfil
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Form de senha
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    try {
      const u = localStorage.getItem('jarbis_user')
      if (u) {
        const parsed = JSON.parse(u)
        setUser(parsed)
        setEditName(parsed.full_name || '')
      }
    } catch {}
    api.billing.status().then(setBilling).catch(() => {})
  }, [])

  async function handleSaveName(e) {
    e.preventDefault()
    if (!editName.trim() || editName === user?.full_name) return
    setSavingName(true)
    try {
      const updated = await api.fetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: editName.trim() }),
      })
      setUser(updated)
      localStorage.setItem('jarbis_user', JSON.stringify(updated))
      toast(t('toast.nameSaved'), 'success')
    } catch (err) {
      toast(err.message || t('toast.nameError'), 'error')
    } finally {
      setSavingName(false)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    if (pwForm.new !== pwForm.confirm) {
      toast(t('toast.passwordMismatch'), 'error')
      return
    }
    if (pwForm.new.length < 6) {
      toast(t('toast.passwordTooShort'), 'error')
      return
    }
    setSavingPw(true)
    try {
      await api.fetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.new }),
      })
      setPwForm({ current: '', new: '', confirm: '' })
      toast(t('toast.passwordSaved'), 'success')
    } catch (err) {
      toast(err.message || t('toast.passwordError'), 'error')
    } finally {
      setSavingPw(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="mb-2">
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Card — perfil */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-5">{t('profile.title')}</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md shadow-violet-200">
              <span className="text-white font-black text-xl">{initials}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{user?.full_name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${ROLE_COLORS[user?.role] || 'bg-gray-100 text-gray-600'}`}>
                {user?.role ? t(`roles.${user.role}`) : user?.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveName} className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.fullNameLabel')}</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
                placeholder={t('profile.placeholder')}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingName || !editName.trim() || editName === user?.full_name}
                className="px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                {savingName ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          </form>
        </div>

        {/* Card — alterar senha */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-5">{t('password.title')}</h2>

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('password.currentLabel')}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPw
                      ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    }
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('password.newLabel')}</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.new}
                  onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder={t('password.newPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('password.confirmLabel')}</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${pwForm.confirm && pwForm.new !== pwForm.confirm ? 'border-red-300' : 'border-gray-200'}`}
                  placeholder={t('password.confirmPlaceholder')}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingPw || !pwForm.current || !pwForm.new || !pwForm.confirm}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {savingPw ? t('password.changing') : t('password.change')}
            </button>
          </form>
        </div>

        {/* Card — plano */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">{t('plan.title')}</h2>
            <Link href="/configuracoes/planos" className="text-xs text-violet-600 font-semibold hover:underline">
              {t('plan.viewAll')}
            </Link>
          </div>

          {billing ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 text-lg">{billing.plan_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      billing.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      billing.subscription_status === 'past_due' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {billing.subscription_status === 'active' ? t('plan.statusActive') :
                       billing.subscription_status === 'past_due' ? t('plan.statusPastDue') :
                       billing.plan === 'free' ? t('plan.statusTrial') : billing.subscription_status}
                    </span>
                  </div>
                  {billing.trial_days_remaining > 0 && (
                    <p className="text-xs text-amber-600 font-medium mt-1">
                      {t('plan.trialRemaining', { days: billing.trial_days_remaining })}
                    </p>
                  )}
                </div>
                {billing.plan === 'free' ? (
                  <Link href="/configuracoes/planos" className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
                    {t('plan.upgrade')}
                  </Link>
                ) : (
                  <Link href="/configuracoes/planos" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                    {t('plan.manage')}
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('usage.dashboards'), used: billing.usage.dashboards, max: billing.limits.dashboards, color: 'bg-violet-500' },
                  { label: t('usage.datasets'),   used: billing.usage.datasets,   max: billing.limits.datasets,   color: 'bg-blue-500' },
                  { label: t('usage.users'),      used: billing.usage.users,      max: billing.limits.users,      color: 'bg-emerald-500' },
                  { label: t('usage.alerts'),     used: billing.usage.alerts,     max: billing.limits.alerts,     color: 'bg-amber-500' },
                ].map(item => {
                  const unlimited = item.max === -1
                  const pct = unlimited ? 0 : Math.min(100, (item.used / item.max) * 100)
                  const atLimit = !unlimited && item.used >= item.max
                  const nearLimit = !unlimited && !atLimit && pct >= 80
                  return (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                        <span className={`text-xs font-bold ${atLimit ? 'text-red-500' : nearLimit ? 'text-amber-600' : 'text-gray-700'}`}>
                          {item.used}{unlimited ? '' : `/${item.max}`}
                          {nearLimit && <span className="ml-1 font-normal text-amber-500">Próximo do limite</span>}
                        </span>
                      </div>
                      {unlimited ? (
                        <p className="text-xs text-emerald-600 font-semibold">{t('plan.unlimited')}</p>
                      ) : (
                        <div className="h-1.5 bg-gray-200 rounded-full">
                          <div className={`h-1.5 rounded-full transition-all ${atLimit ? 'bg-red-400' : nearLimit ? 'bg-amber-400' : item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-100 rounded w-1/3" />
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
              </div>
            </div>
          )}
        </div>

        {/* Card — API Keys */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">Chaves de API</h2>
              <p className="text-sm text-gray-500 mt-0.5">Integre o Jarbis com outros sistemas via API</p>
            </div>
            <Link
              href="/configuracoes/api-keys"
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Gerenciar
            </Link>
          </div>
        </div>

        {/* Card — Webhooks */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">Webhooks</h2>
              <p className="text-sm text-gray-500 mt-0.5">Receba notificações HTTP quando eventos ocorrerem</p>
            </div>
            <Link
              href="/configuracoes/webhooks"
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Configurar
            </Link>
          </div>
        </div>

        {/* Card — Personalização */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">Personalização</h2>
              <p className="text-sm text-gray-500 mt-0.5">Logo e cores personalizadas (white-label — plano Grupo)</p>
            </div>
            <Link
              href="/configuracoes/personalizacao"
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Personalizar
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
