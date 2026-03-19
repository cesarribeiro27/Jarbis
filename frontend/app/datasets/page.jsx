'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations, useLocale } from 'next-intl'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function ApiDatasetModal({ onClose, onCreated }) {
  const t = useTranslations('datasets')
  const toast = useToast()
  const [form, setForm] = useState({ name: '', api_url: '', method: 'GET', headers: '', body: '', refresh_interval_minutes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      let headers = {}
      if (form.headers.trim()) {
        try { headers = JSON.parse(form.headers) } catch { setError(t('toast.headersInvalid')); setLoading(false); return }
      }
      const ds = await api.reports.datasets.createApi({
        name: form.name, api_url: form.api_url, method: form.method,
        headers, body: form.body || null,
        refresh_interval_minutes: form.refresh_interval_minutes ? parseInt(form.refresh_interval_minutes) : null,
      })
      onCreated(ds)
      onClose()
      toast(t('toast.connected'), 'success')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('modal.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('modal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.nameLabel')}</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('modal.namePlaceholder')} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.urlLabel')}</label>
              <input required type="url" value={form.api_url} onChange={e => setForm(f => ({ ...f, api_url: e.target.value }))} placeholder={t('modal.urlPlaceholder')} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.methodLabel')}</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option>GET</option><option>POST</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.headersLabel')}</label>
            <textarea value={form.headers} onChange={e => setForm(f => ({ ...f, headers: e.target.value }))} placeholder={'{"Authorization": "Bearer token"}'} rows={2} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.intervalLabel')}</label>
            <input type="number" min="1" value={form.refresh_interval_minutes} onChange={e => setForm(f => ({ ...f, refresh_interval_minutes: e.target.value }))} placeholder={t('modal.intervalPlaceholder')} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? t('modal.connecting') : t('modal.connectBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DatasetsPage() {
  const t = useTranslations('datasets')
  const locale = useLocale()
  const toast = useToast()
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [syncingId, setSyncingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    api.reports.datasets.list()
      .then(data => setDatasets(data || []))
      .catch(() => toast(t('toast.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast(t('toast.invalidFormat'), 'error')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast(t('toast.fileTooLarge'), 'error')
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch(`${API_URL}/reports/datasets/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!response.ok) { const e = await response.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
      const ds = await response.json()
      setDatasets(prev => [ds, ...prev])
      toast(t('toast.uploadSuccess', { name: ds.name, rows: ds.row_count?.toLocaleString(locale) || 0 }), 'success')
    } catch (err) {
      toast(err.message || t('toast.uploadError'), 'error')
    } finally { setUploading(false) }
  }

  async function handleSync(id) {
    setSyncingId(id)
    try {
      const updated = await api.reports.datasets.sync(id)
      setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d))
      toast(t('toast.syncSuccess'), 'success')
    } catch (err) {
      toast(err.message || t('toast.syncError'), 'error')
    } finally { setSyncingId(null) }
  }

  async function handleDelete(id) {
    try {
      await api.reports.datasets.delete(id)
      setDatasets(prev => prev.filter(d => d.id !== id))
      setDeleteConfirmId(null)
      toast(t('toast.deleteSuccess'), 'success')
    } catch (err) {
      toast(err.message || t('toast.deleteError'), 'error')
    }
  }

  function formatRows(n) {
    if (!n && n !== 0) return '—'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + t('rowsM')
    if (n >= 1000) return (n / 1000).toFixed(1) + t('rowsK')
    return n.toLocaleString(locale) + ' ' + t('rows')
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {datasets.length > 0 ? t('subtitle', { count: datasets.length }) : t('subtitleEmpty')}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setShowApiModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              {t('connectBtn')}
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm shadow-violet-200">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              {uploading ? t('uploading') : t('uploadBtn')}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { handleUpload(e.target.files[0]); e.target.value = '' }} />
          </div>
        </div>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-20 animate-pulse" />)}
          </div>
        )}

        {!loading && datasets.length === 0 && (
          <div
            className={`bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 dark:border-gray-700'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{dragOver ? t('dropRelease') : t('empty.title')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">{t('empty.desc')}</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mb-6">{t('empty.hint')}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => fileRef.current?.click()} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
                {t('uploadBtn2')}
              </button>
              <button onClick={() => setShowApiModal(true)} className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {t('connectBtn')}
              </button>
            </div>
          </div>
        )}

        {!loading && datasets.length > 0 && (
          <div
            className={`flex flex-col gap-3 ${dragOver ? 'ring-2 ring-violet-400 ring-offset-4 rounded-2xl' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {datasets.map(ds => (
              <div key={ds.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  {/* Ícone */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ds.type === 'api' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                    {ds.type === 'api' ? (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{ds.name}</p>
                      {ds.is_demo && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">DEMO</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">{formatRows(ds.row_count)}</span>
                      {ds.columns && <span className="text-xs text-gray-400">{ds.columns.length} {t('columns')}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ds.type === 'api' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {ds.type === 'api' ? t('typeApi') : t('typeFile')}
                      </span>
                      {ds.type === 'api' && ds.refresh_interval_minutes && (
                        <span className="text-xs text-gray-400 hidden sm:inline">{t('autoRefresh', { interval: ds.refresh_interval_minutes })}</span>
                      )}
                    </div>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    {ds.type === 'api' && (
                      <button
                        onClick={() => handleSync(ds.id)}
                        disabled={syncingId === ds.id}
                        title={t('refreshBtn')}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
                      >
                        <svg className={`w-4 h-4 ${syncingId === ds.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                    )}
                    {deleteConfirmId === ds.id ? (
                      <div className="flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1">
                        <span className="text-xs text-gray-500 hidden sm:inline mr-1">{t('deleteConfirm')}</span>
                        <button onClick={() => handleDelete(ds.id)} className="text-xs text-red-600 font-bold hover:underline">{t('yes')}</button>
                        <span className="text-gray-300">·</span>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-400 hover:underline">{t('no')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(ds.id)} title="Excluir" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Drop zone quando já tem datasets */}
            <div
              className={`border-2 border-dashed rounded-2xl py-4 text-center text-sm transition-all ${dragOver ? 'border-violet-400 bg-violet-50 text-violet-600' : 'border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600'}`}
            >
              {dragOver ? t('dropRelease') : t('dropHint')}
            </div>
          </div>
        )}
      </div>

      {showApiModal && <ApiDatasetModal onClose={() => setShowApiModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
    </AppLayout>
  )
}
