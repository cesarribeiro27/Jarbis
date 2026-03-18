'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations, useLocale } from 'next-intl'

const OPERATOR_VALUES = ['gt', 'gte', 'lt', 'lte', 'eq']
const AGG_VALUES = ['sum', 'count', 'avg', 'max', 'min']

function StatusBadge({ status }) {
  const t = useTranslations('alerts')
  if (!status) return <span className="inline-flex items-center gap-1 text-xs text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" />{t('status.pending')}</span>
  if (status === 'triggered') return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{t('status.triggered')}</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{t('status.ok')}</span>
}

function CreateModal({ datasets, onClose, onCreated }) {
  const t = useTranslations('alerts')
  const [form, setForm] = useState({ name: '', dataset_id: datasets[0]?.id || '', value_col: '', agg: 'sum', operator: 'lt', threshold: '', filter_col: '', filter_val: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectedDs = datasets.find(d => d.id === form.dataset_id)
  const columns = selectedDs?.columns || []

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const alert = await api.reports.alerts.create({
        name: form.name, dataset_id: form.dataset_id, value_col: form.value_col,
        agg: form.agg, operator: form.operator, threshold: parseFloat(form.threshold),
        filter_col: form.filter_col || null, filter_val: form.filter_val || null,
      })
      onCreated(alert); onClose()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('modal.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.nameLabel')}</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('modal.namePlaceholder')} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.datasetLabel')}</label>
            <select required value={form.dataset_id} onChange={e => setForm(f => ({ ...f, dataset_id: e.target.value, value_col: '' }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.columnLabel')}</label>
              <select required value={form.value_col} onChange={e => setForm(f => ({ ...f, value_col: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">{t('modal.selectDefault')}</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.aggLabel')}</label>
              <select value={form.agg} onChange={e => setForm(f => ({ ...f, agg: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                {AGG_VALUES.map(v => <option key={v} value={v}>{t(`aggregations.${v}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.conditionLabel')}</label>
              <select value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                {OPERATOR_VALUES.map(v => <option key={v} value={v}>{t(`operators.${v}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.thresholdLabel')}</label>
              <input required type="number" step="any" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} placeholder={t('modal.thresholdPlaceholder')} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? t('modal.creating') : t('modal.createBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AlertasPage() {
  const t = useTranslations('alerts')
  const locale = useLocale()
  const toast = useToast()
  const [alerts, setAlerts] = useState([])
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [checkingId, setCheckingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => {
    Promise.all([api.reports.alerts.list(), api.reports.datasets.list()])
      .then(([al, ds]) => { setAlerts(al); setDatasets(ds) })
      .catch(() => toast(t('toast.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function checkAlert(id) {
    setCheckingId(id)
    try {
      const updated = await api.reports.alerts.check(id)
      setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a))
      const status = updated.last_status === 'triggered' ? 'warn' : 'success'
      toast(updated.last_status === 'triggered' ? t('toast.triggered') : t('toast.ok'), status)
    } catch (e) { toast(e.message, 'error') }
    finally { setCheckingId(null) }
  }

  async function toggleAlert(a) {
    try {
      const updated = await api.reports.alerts.toggle(a.id, !a.is_active)
      setAlerts(prev => prev.map(x => x.id === updated.id ? updated : x))
      toast(updated.is_active ? t('toast.enabled') : t('toast.paused'), 'info')
    } catch (e) { toast(e.message, 'error') }
  }

  async function deleteAlert(id) {
    try {
      await api.reports.alerts.delete(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
      setDeleteConfirmId(null)
      toast(t('toast.deleted'), 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  const triggered = alerts.filter(a => a.last_status === 'triggered' && a.is_active).length

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
              {t('title')}
              {triggered > 0 && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{t('badge', { count: triggered })}</span>}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {alerts.some(a => a.is_active) && (
              <button onClick={() => alerts.filter(a => a.is_active).forEach(a => checkAlert(a.id))} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {t('checkAllBtn')}
              </button>
            )}
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
              {t('newBtn')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">{t('loading')}</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('empty.title')}</p>
            <p className="text-sm text-gray-400 mb-6">{t('empty.desc')}</p>
            <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">{t('empty.cta')}</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map(alert => {
              const ds = datasets.find(d => d.id === alert.dataset_id)
              const isChecking = checkingId === alert.id
              return (
                <div key={alert.id} className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 flex items-center gap-4 transition-all ${alert.last_status === 'triggered' && alert.is_active ? 'border-red-200 dark:border-red-800 shadow-sm shadow-red-100' : 'border-gray-100 dark:border-gray-700'} ${!alert.is_active ? 'opacity-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.last_status === 'triggered' && alert.is_active ? 'bg-red-100' : alert.last_status === 'ok' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <svg className={`w-5 h-5 ${alert.last_status === 'triggered' && alert.is_active ? 'text-red-500' : alert.last_status === 'ok' ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{alert.name}</p>
                      <StatusBadge status={alert.is_active ? alert.last_status : null} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ds?.name || '—'} · {t(`aggregations.${alert.agg}`)}({alert.value_col}) {t(`operators.${alert.operator}`).split(' ')[0]} {alert.threshold?.toLocaleString(locale)}
                    </p>
                    {alert.last_value != null && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t('lastValue')} <span className={`font-semibold ${alert.last_status === 'triggered' ? 'text-red-600' : 'text-green-600'}`}>{alert.last_value.toLocaleString(locale, { maximumFractionDigits: 2 })}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => checkAlert(alert.id)} disabled={isChecking} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50">
                      <svg className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => toggleAlert(alert)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${alert.is_active ? 'text-green-500 hover:bg-red-50 hover:text-red-400' : 'text-gray-300 hover:bg-green-50 hover:text-green-500'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={alert.is_active ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                    </button>
                    {deleteConfirmId === alert.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteAlert(alert.id)} className="text-xs text-red-600 font-semibold px-2 py-1 hover:bg-red-50 rounded">{t('yes')}</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-400 px-2 py-1 hover:bg-gray-50 rounded">{t('no')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(alert.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && datasets.length > 0 && <CreateModal datasets={datasets} onClose={() => setShowCreate(false)} onCreated={alert => setAlerts(prev => [alert, ...prev])} />}
      {showCreate && datasets.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mx-4 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2 font-semibold">{t('noDataset.title')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('noDataset.desc')}</p>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
