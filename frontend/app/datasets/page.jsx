'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('jarbis_token')
}

function ApiDatasetModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', api_url: '', method: 'GET', headers: '', body: '', refresh_interval_minutes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      let headers = {}
      if (form.headers.trim()) {
        try { headers = JSON.parse(form.headers) } catch { setError('Headers inválidos — use formato JSON'); setLoading(false); return }
      }
      const ds = await api.reports.datasets.createApi({
        name: form.name,
        api_url: form.api_url,
        method: form.method,
        headers,
        body: form.body || null,
        refresh_interval_minutes: form.refresh_interval_minutes ? parseInt(form.refresh_interval_minutes) : null,
      })
      onCreated(ds); onClose()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">Conectar API</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome do dataset</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Vendas por mês" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">URL da API</label>
              <input required type="url" value={form.api_url} onChange={e => setForm(f => ({ ...f, api_url: e.target.value }))} placeholder="https://api.exemplo.com/dados" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Método</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option>GET</option><option>POST</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Headers (JSON opcional)</label>
            <textarea value={form.headers} onChange={e => setForm(f => ({ ...f, headers: e.target.value }))} placeholder={'{"Authorization": "Bearer token"}'} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Atualizar a cada (minutos, opcional)</label>
            <input type="number" min="1" value={form.refresh_interval_minutes} onChange={e => setForm(f => ({ ...f, refresh_interval_minutes: e.target.value }))} placeholder="Ex: 60" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Conectando...' : 'Conectar e sincronizar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [syncingId, setSyncingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    api.reports.datasets.list()
      .then(data => setDatasets(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(file) {
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch(`${API_URL}/reports/datasets/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      })
      if (!response.ok) { const e = await response.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
      const ds = await response.json()
      setDatasets(prev => [ds, ...prev])
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  async function handleSync(id) {
    setSyncingId(id)
    try {
      const updated = await api.reports.datasets.sync(id)
      setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d))
    } catch (err) { alert(err.message) }
    finally { setSyncingId(null) }
  }

  async function handleDelete(id) {
    try {
      await api.reports.datasets.delete(id)
      setDatasets(prev => prev.filter(d => d.id !== id))
      setDeleteConfirmId(null)
    } catch (err) { alert(err.message) }
  }

  function formatRows(n) {
    if (!n && n !== 0) return '—'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M linhas'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K linhas'
    return n + ' linhas'
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Dados</h1>
            <p className="text-sm text-gray-500 mt-1">Datasets conectados aos seus dashboards</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowApiModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-gray-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Conectar API
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              {uploading ? 'Enviando...' : 'Upload CSV/Excel'}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { handleUpload(e.target.files[0]); e.target.value = '' }} />
          </div>
        </div>

        {loading && <div className="text-center py-16 text-gray-400">Carregando...</div>}

        {!loading && datasets.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">🗄️</div>
            <p className="font-semibold text-gray-800 mb-2">Nenhum dataset ainda</p>
            <p className="text-sm text-gray-400 mb-6">Faça upload de um arquivo CSV/Excel ou conecte uma API para começar</p>
            <button onClick={() => fileRef.current?.click()} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              Fazer upload
            </button>
          </div>
        )}

        {!loading && datasets.length > 0 && (
          <div className="flex flex-col gap-3">
            {datasets.map(ds => (
              <div key={ds.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  {ds.type === 'api' ? (
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{ds.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{formatRows(ds.row_count)}</span>
                    {ds.columns && <span className="text-xs text-gray-400">{ds.columns.length} colunas</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{ds.type === 'api' ? 'API' : 'Arquivo'}</span>
                    {ds.last_synced_at && <span className="text-xs text-gray-400">Atualizado {new Date(ds.last_synced_at).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ds.type === 'api' && (
                    <button onClick={() => handleSync(ds.id)} disabled={syncingId === ds.id} title="Sincronizar" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50">
                      <svg className={`w-4 h-4 ${syncingId === ds.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  )}
                  {deleteConfirmId === ds.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(ds.id)} className="text-xs text-red-600 font-semibold px-2 py-1 hover:bg-red-50 rounded">Sim</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-400 px-2 py-1 hover:bg-gray-50 rounded">Não</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(ds.id)} title="Excluir" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showApiModal && <ApiDatasetModal onClose={() => setShowApiModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
    </AppLayout>
  )
}
