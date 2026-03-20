'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations, useLocale } from 'next-intl'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function ApiDatasetModal({ onClose, onCreated }) {
  const t = useTranslations('datasets')
  const toast = useToast()
  const [form, setForm] = useState({ name: '', api_url: '', method: 'GET', headers: '', body: '', refresh_interval_minutes: '', sync_mode: 'replace' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function normalizeUrl(url) {
    const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    if (!m) return url
    const id = m[1]
    const gidM = url.match(/[#&?]gid=(\d+)/)
    const gid = gidM ? gidM[1] : '0'
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
  }

  const isGoogleSheets = form.api_url.includes('docs.google.com/spreadsheets')
  const normalizedUrl = isGoogleSheets ? normalizeUrl(form.api_url) : form.api_url

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      let headers = {}
      if (form.headers.trim()) {
        try { headers = JSON.parse(form.headers) } catch { setError(t('toast.headersInvalid')); setLoading(false); return }
      }
      const ds = await api.reports.datasets.createApi({
        name: form.name, api_url: normalizedUrl, method: form.method,
        headers, body: form.body || null,
        refresh_interval_minutes: form.refresh_interval_minutes ? parseInt(form.refresh_interval_minutes) : null,
        sync_mode: form.sync_mode || 'replace',
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
              {isGoogleSheets && (
                <p className="mt-1 text-[11px] text-violet-600 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Google Sheets detectado — será convertido para CSV automaticamente
                </p>
              )}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modo de sincronização</label>
            <select
              value={form.sync_mode || 'replace'}
              onChange={e => setForm(f => ({ ...f, sync_mode: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="replace">Substituir (replace) — apaga e reimporta tudo</option>
              <option value="append">Acumular (append) — adiciona novas linhas</option>
            </select>
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

function GADatasetModal({ onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: 'Google Analytics',
    property_id: '',
    api_key: '',
    date_range_days: 30,
    dimensions: 'date,sessionDefaultChannelGrouping,country',
    metrics: 'sessions,activeUsers,bounceRate',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const ds = await api.fetch('/reports/datasets/google-analytics', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          dimensions: form.dimensions.split(',').map(s => s.trim()).filter(Boolean),
          metrics: form.metrics.split(',').map(s => s.trim()).filter(Boolean),
          date_range_days: parseInt(form.date_range_days),
        }),
      })
      onCreated(ds)
      onClose()
      toast('Dataset do Google Analytics criado com sucesso!', 'success')
    } catch (e) {
      setError(e.message || 'Erro ao conectar ao Google Analytics.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📊</span> Conectar Google Analytics
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome do dataset</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Property ID (GA4)</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="ex: 123456789"
              value={form.property_id} onChange={e => setForm(f => ({...f, property_id: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key do Google Cloud</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              type="password" placeholder="AIza..."
              value={form.api_key} onChange={e => setForm(f => ({...f, api_key: e.target.value}))} />
            <p className="text-xs text-gray-400 mt-0.5">Google Cloud Console → APIs → Analytics Data API → Credentials</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dimensões (separadas por vírgula)</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              value={form.dimensions} onChange={e => setForm(f => ({...f, dimensions: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Métricas (separadas por vírgula)</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              value={form.metrics} onChange={e => setForm(f => ({...f, metrics: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Período (dias)</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.date_range_days} onChange={e => setForm(f => ({...f, date_range_days: e.target.value}))}>
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={365}>Último ano</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || !form.property_id || !form.api_key}
            className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
            {loading ? 'Conectando...' : 'Importar dados'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DbDatasetModal({ onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: '',
    db_type: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    query: 'SELECT * FROM tabela LIMIT 1000',
  })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [testResult, setTestResult] = useState(null)

  function handleDbTypeChange(db_type) {
    setForm(f => ({ ...f, db_type, port: db_type === 'mysql' ? 3306 : 5432 }))
    setTestResult(null)
  }

  async function handleTest(e) {
    e.preventDefault()
    setTesting(true)
    setError(null)
    setTestResult(null)
    try {
      const token = localStorage.getItem('jarbis_token')
      const resp = await fetch(`${API_URL}/reports/datasets/database/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name || 'test',
          db_type: form.db_type,
          host: form.host,
          port: Number(form.port),
          database: form.database,
          username: form.username,
          password: form.password,
          query: form.query,
        }),
      })
      const result = await resp.json()
      setTestResult(result)
    } catch (e) {
      setTestResult({ ok: false, error: e.message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('jarbis_token')
      const resp = await fetch(`${API_URL}/reports/datasets/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          db_type: form.db_type,
          host: form.host,
          port: Number(form.port),
          database: form.database,
          username: form.username,
          password: form.password,
          query: form.query,
        }),
      })
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({ detail: 'Erro ao salvar' }))
        throw new Error(e.detail || 'Erro ao salvar dataset')
      }
      const ds = await resp.json()
      onCreated(ds)
      onClose()
      toast('Dataset de banco criado com sucesso!', 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Conectar banco de dados</h2>
            <p className="text-xs text-gray-400 mt-0.5">PostgreSQL ou MySQL externo</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form className="p-6 flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo de banco</label>
            <select value={form.db_type} onChange={e => handleDbTypeChange(e.target.value)} className={inputCls}>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
            </select>
          </div>

          {/* Nome do dataset */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome do dataset</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Vendas Produção"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Host + Porta */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Host</label>
              <input
                required
                value={form.host}
                onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                placeholder="db.exemplo.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Porta</label>
              <input
                required
                type="number"
                value={form.port}
                onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Nome do banco */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome do banco</label>
            <input
              required
              value={form.database}
              onChange={e => setForm(f => ({ ...f, database: e.target.value }))}
              placeholder="meu_banco"
              className={inputCls}
            />
          </div>

          {/* Usuário + Senha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Usuário</label>
              <input
                required
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="postgres"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Senha</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className={inputCls}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Query SQL */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Query SQL</label>
            <textarea
              required
              value={form.query}
              onChange={e => setForm(f => ({ ...f, query: e.target.value }))}
              placeholder="SELECT * FROM tabela LIMIT 1000"
              rows={4}
              className={`${inputCls} font-mono resize-none`}
            />
            <p className="text-[11px] text-gray-400 mt-1">Apenas queries SELECT são permitidas. LIMIT será adicionado automaticamente se ausente.</p>
          </div>

          {/* Resultado do teste */}
          {testResult && (
            <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${testResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              {testResult.ok ? (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Conexão bem-sucedida!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  {testResult.error}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !form.host || !form.database || !form.username}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {testing ? 'Testando...' : 'Testar conexão'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !form.name || !form.host || !form.database || !form.username || !form.query}
              className="flex-1 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DatasetsPage() {
  const t = useTranslations('datasets')
  const locale = useLocale()
  const toast = useToast()
  const router = useRouter()
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [showDbModal, setShowDbModal] = useState(false)
  const [showGaModal, setShowGaModal] = useState(false)
  const [syncingId, setSyncingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const fileRef = useRef()
  const newMenuRef = useRef()

  useEffect(() => {
    api.reports.datasets.list()
      .then(data => setDatasets(data || []))
      .catch(() => toast(t('toast.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  // Fecha menu "Novo" ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) setShowNewMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleBulkDelete() {
    if (selected.size === 0) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selected].map(id => api.reports.datasets.delete(id)))
      setDatasets(prev => prev.filter(d => !selected.has(d.id)))
      toast(`${selected.size} dataset(s) excluído(s)`, 'success')
      setSelected(new Set())
    } catch (e) {
      toast(e.message || 'Erro ao excluir', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const filtered = datasets.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  )

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

  async function handleDbSync(id) {
    setSyncingId(id)
    try {
      const token = localStorage.getItem('jarbis_token')
      const resp = await fetch(`${API_URL}/reports/datasets/${id}/database/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({ detail: 'Erro ao sincronizar' }))
        throw new Error(e.detail || 'Erro ao sincronizar')
      }
      const result = await resp.json()
      setDatasets(prev => prev.map(d => d.id === id ? { ...d, row_count: result.row_count } : d))
      toast(`Dados atualizados — ${result.row_count?.toLocaleString(locale) || 0} linhas`, 'success')
    } catch (err) {
      toast(err.message || 'Erro ao sincronizar banco', 'error')
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {datasets.length > 0 ? t('subtitle', { count: datasets.length }) : t('subtitleEmpty')}
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { handleUpload(e.target.files[0]); e.target.value = '' }} />
        </div>

        {/* Barra de busca */}
        {!loading && datasets.length > 0 && (
          <div className="relative mb-4">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar datasets..."
              className="pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white shadow-sm"
            />
          </div>
        )}

        {/* Banner seleção em massa */}
        {selected.size > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
            <span className="text-sm font-semibold text-violet-700">{selected.size} selecionado(s)</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              {bulkDeleting ? 'Excluindo...' : 'Excluir selecionados'}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-violet-500 hover:text-violet-700">Cancelar</button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 animate-pulse" />)}
          </div>
        )}

        {!loading && datasets.length === 0 && (
          <div
            className={`bg-white rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-800 mb-2">{dragOver ? t('dropRelease') : t('empty.title')}</p>
            <p className="text-sm text-gray-400 mb-1">{t('empty.desc')}</p>
            <p className="text-xs text-gray-300 mb-6">{t('empty.hint')}</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={() => fileRef.current?.click()} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">
                {t('uploadBtn2')}
              </button>
              <button onClick={() => setShowApiModal(true)} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                {t('connectBtn')}
              </button>
              <button onClick={() => setShowDbModal(true)} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                </svg>
                Conectar banco de dados
              </button>
              <button onClick={() => setShowGaModal(true)} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                <span className="text-base leading-none">📊</span>
                Google Analytics
              </button>
            </div>
          </div>
        )}

        {!loading && datasets.length > 0 && (
          <div
            className={`flex flex-col gap-2 ${dragOver ? 'ring-2 ring-violet-400 ring-offset-4 rounded-2xl' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {/* Item fixo "Novo dataset" */}
            <div ref={newMenuRef} className="relative">
              <div
                onClick={() => setShowNewMenu(v => !v)}
                className="bg-white border-2 border-dashed border-violet-200 hover:border-violet-400 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-violet-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <span className="font-semibold text-gray-400 group-hover:text-violet-600 transition-colors text-sm">Novo dataset</span>
              </div>
              {showNewMenu && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg w-52 py-1">
                  <button
                    onClick={() => { setShowNewMenu(false); fileRef.current?.click() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                    </svg>
                    Upload arquivo
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setShowApiModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                    Conectar API
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setShowDbModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                    </svg>
                    Conectar banco de dados
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setShowGaModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="text-base leading-none">📊</span>
                    Google Analytics
                  </button>
                </div>
              )}
            </div>

            {/* Lista de datasets */}
            {filtered.map(ds => (
              <div
                key={ds.id}
                className={`bg-white rounded-2xl border transition-all group ${selected.has(ds.id) ? 'border-violet-300 bg-violet-50/30' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-3 p-4 sm:p-4">
                  {/* Checkbox */}
                  <div className="shrink-0">
                    <input
                      type="checkbox"
                      checked={selected.has(ds.id)}
                      onChange={() => toggleSelect(ds.id)}
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400 cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>

                  {/* Ícone */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ds.type === 'api' ? 'bg-blue-50' : ds.type === 'database' ? 'bg-emerald-50' : 'bg-violet-50'}`}>
                    {ds.type === 'api' ? (
                      <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    ) : ds.type === 'database' ? (
                      <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    )}
                  </div>

                  {/* Info — clique navega para detalhe */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/datasets/${ds.id}`)}>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate text-sm hover:text-violet-700 transition-colors">{ds.name}</p>
                      {ds.is_demo && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">DEMO</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{formatRows(ds.row_count)}</span>
                      {ds.columns && <span className="text-xs text-gray-400">{ds.columns.length} {t('columns')}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ds.type === 'api' ? 'bg-blue-50 text-blue-600' : ds.type === 'database' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-600'}`}>
                        {ds.type === 'api' ? t('typeApi') : ds.type === 'database' ? 'DB' : t('typeFile')}
                      </span>
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
                        <svg className={`w-4 h-4 ${syncingId === ds.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                      </button>
                    )}
                    {ds.type === 'database' && (
                      <button
                        onClick={() => handleDbSync(ds.id)}
                        disabled={syncingId === ds.id}
                        title="Re-executar query e atualizar dados"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        <svg className={`w-4 h-4 ${syncingId === ds.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-2xl py-4 text-center text-sm transition-all ${dragOver ? 'border-violet-400 bg-violet-50 text-violet-600' : 'border-gray-100 text-gray-300'}`}
            >
              {dragOver ? t('dropRelease') : t('dropHint')}
            </div>
          </div>
        )}
      </div>

      {showApiModal && <ApiDatasetModal onClose={() => setShowApiModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
      {showDbModal && <DbDatasetModal onClose={() => setShowDbModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
      {showGaModal && <GADatasetModal onClose={() => setShowGaModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
    </AppLayout>
  )
}
