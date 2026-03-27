'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations, useLocale } from 'next-intl'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function SheetQualityBadge({ type, suggested }) {
  if (type === 'data' && suggested) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Banco de dados</span>
  if (type === 'summary') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Resumo</span>
  if (type === 'empty') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">Vazia</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Indefinido</span>
}

function ExcelSheetPickerModal({ sheets, sheetsMeta = [], onConfirm, onClose }) {
  const suggested = sheetsMeta.find(s => s.suggested)
  const [selected, setSelected] = useState(suggested?.name || sheets[0] || '')
  const hasAnyData = sheetsMeta.some(s => s.type === 'data')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Selecionar aba</h2>
        <p className="text-xs text-gray-400 mb-3">O arquivo contém {sheets.length} {sheets.length === 1 ? 'aba' : 'abas'}. Escolha qual importar.</p>

        {!hasAnyData && sheetsMeta.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            Nenhuma aba parece conter um banco de dados estruturado.{' '}
            <a href="/datasets/boas-praticas" target="_blank" className="underline font-medium">Ver como estruturar seus dados</a>
          </div>
        )}

        <div className="flex flex-col gap-1.5 mb-4">
          {sheets.map((s, i) => {
            const meta = sheetsMeta[i] || {}
            const isSelected = selected === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelected(s)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-violet-300 hover:bg-violet-50/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-violet-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{s}</span>
                  {meta.suggested && <span className="text-[9px] text-emerald-600 shrink-0">✦ sugerida</span>}
                </div>
                {meta.type && <SheetQualityBadge type={meta.type} suggested={meta.suggested} />}
              </button>
            )
          })}
        </div>

        {selected && sheetsMeta.find(s => s.name === selected)?.reason && (
          <p className="text-[11px] text-gray-400 mb-3">{sheetsMeta.find(s => s.name === selected).reason}</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onConfirm(selected)} className="flex-1 bg-violet-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-violet-700">Importar</button>
        </div>
      </div>
    </div>
  )
}

function ApiDatasetModal({ onClose, onCreated }) {
  const t = useTranslations('datasets')
  const toast = useToast()
  const [tab, setTab] = useState('sheets') // 'sheets' | 'api'
  const [form, setForm] = useState({ name: '', api_url: '', method: 'GET', headers: '', body: '', refresh_interval_minutes: '', sync_mode: 'replace' })
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sheets, setSheets] = useState([])
  const [sheetsMeta, setSheetsMeta] = useState([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [sheetsLoading, setSheetsLoading] = useState(false)

  // Auto-fetch abas quando URL Google Sheets é colada
  useEffect(() => {
    const isSheets = sheetsUrl.includes('docs.google.com/spreadsheets')
    if (!isSheets || !sheetsUrl.trim()) {
      setSheets([])
      setSelectedSheet('')
      return
    }
    setSheetsLoading(true)
    setError(null)
    const timer = setTimeout(async () => {
      try {
        const result = await api.reports.datasets.fetchGoogleSheets(sheetsUrl)
        const meta = result.sheets_meta || []
        setSheets(result.sheets || [])
        setSheetsMeta(meta)
        const suggested = meta.find(s => s.suggested)
        setSelectedSheet(suggested?.name || result.sheets?.[0] || '')
      } catch (e) {
        setError(e.message)
      } finally {
        setSheetsLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [sheetsUrl])

  function normalizeUrl(url, sheet) {
    const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    if (!m) return url
    const id = m[1]
    if (sheet) {
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&sheet=${encodeURIComponent(sheet)}`
    }
    const gidM = url.match(/[#&?]gid=(\d+)/)
    const gid = gidM ? gidM[1] : '0'
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
  }

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      if (tab === 'sheets') {
        const finalUrl = normalizeUrl(sheetsUrl, selectedSheet)
        const ds = await api.reports.datasets.createApi({
          name: form.name, api_url: finalUrl, method: 'GET',
          headers: {}, body: null,
          refresh_interval_minutes: form.refresh_interval_minutes ? parseInt(form.refresh_interval_minutes) : null,
          sync_mode: form.sync_mode || 'replace',
        })
        onCreated(ds)
        onClose()
        toast(t('toast.connected'), 'success')
      } else {
        let headers = {}
        if (form.headers.trim()) {
          try { headers = JSON.parse(form.headers) } catch { setError(t('toast.headersInvalid')); setLoading(false); return }
        }
        const ds = await api.reports.datasets.createApi({
          name: form.name, api_url: form.api_url, method: form.method,
          headers, body: form.body || null,
          refresh_interval_minutes: form.refresh_interval_minutes ? parseInt(form.refresh_interval_minutes) : null,
          sync_mode: form.sync_mode || 'replace',
        })
        onCreated(ds)
        onClose()
        toast(t('toast.connected'), 'success')
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Conectar fonte de dados</h2>
            <p className="text-xs text-gray-400 mt-0.5">Importe dados de uma planilha ou endpoint REST</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6 pt-4">
          <button
            type="button"
            onClick={() => setTab('sheets')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-colors mr-6 ${tab === 'sheets' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Google Sheets
          </button>
          <button
            type="button"
            onClick={() => setTab('api')}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${tab === 'api' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            API REST
          </button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.nameLabel')}</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('modal.namePlaceholder')} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" autoFocus />
          </div>

          {tab === 'sheets' ? (
            <>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-medium text-gray-500">URL do Google Sheets</label>
                  <div className="relative group">
                    <button type="button" className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 hover:bg-violet-100 hover:text-violet-600 text-[10px] font-bold flex items-center justify-center transition-colors">?</button>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white rounded-xl p-3 shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity text-left">
                      <p className="text-[11px] font-semibold mb-2 text-violet-300">Como obter o link do Google Sheets:</p>
                      <ol className="text-[11px] text-gray-300 space-y-1.5 list-none">
                        <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">1.</span>Abra a planilha no Google Sheets</li>
                        <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">2.</span>Clique em <span className="text-white font-medium">Compartilhar</span> (canto superior direito)</li>
                        <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">3.</span>Em "Acesso geral", selecione <span className="text-white font-medium">"Qualquer pessoa com o link"</span></li>
                        <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">4.</span>Clique em <span className="text-white font-medium">Copiar link</span> e cole aqui</li>
                      </ol>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                    </div>
                  </div>
                </div>
                <div className={`relative rounded-lg transition-all ${sheetsUrl.includes('docs.google.com/spreadsheets') ? 'ring-2 ring-emerald-400' : ''}`}>
                  {sheetsUrl.includes('docs.google.com/spreadsheets') && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                  )}
                  <input
                    required={tab === 'sheets'}
                    type="url"
                    value={sheetsUrl}
                    onChange={e => setSheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className={`w-full border rounded-lg py-2 text-sm focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${sheetsUrl.includes('docs.google.com/spreadsheets') ? 'pl-9 pr-3 border-emerald-300 bg-emerald-50 focus:ring-2 focus:ring-emerald-400' : 'px-3 border-gray-200 focus:ring-2 focus:ring-violet-400'}`}
                  />
                </div>
                {sheetsLoading && (
                  <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    Buscando abas...
                  </p>
                )}
              </div>

              {sheets.length > 0 && (
                <div className="flex flex-col gap-1">
                  {!sheetsMeta.some(s => s.suggested) && sheetsMeta.length > 0 && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
                      Nenhuma aba parece ser um banco de dados.{' '}
                      <a href="/datasets/boas-praticas" target="_blank" className="underline">Ver boas práticas</a>
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-500 mb-1">{sheets.length} aba{sheets.length > 1 ? 's' : ''} encontrada{sheets.length > 1 ? 's' : ''} - escolha qual importar:</p>
                  {sheets.map((s, i) => {
                    const meta = sheetsMeta[i] || {}
                    const isSelected = selectedSheet === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSheet(s)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                          isSelected ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-violet-500' : 'bg-gray-300'}`} />
                          <span className="text-xs text-gray-800 truncate">{s}</span>
                          {meta.suggested && <span className="text-[9px] text-emerald-600 shrink-0">✦ sugerida</span>}
                        </div>
                        {meta.type === 'data' && <span className="text-[10px] text-emerald-600 shrink-0">banco de dados</span>}
                        {meta.type === 'summary' && <span className="text-[10px] text-amber-600 shrink-0">resumo</span>}
                        {meta.type === 'empty' && <span className="text-[10px] text-gray-400 shrink-0">vazia</span>}
                      </button>
                    )
                  })}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.intervalLabel')}</label>
                <input type="number" min="1" value={form.refresh_interval_minutes} onChange={e => setForm(f => ({ ...f, refresh_interval_minutes: e.target.value }))} placeholder={t('modal.intervalPlaceholder')} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modo de sincronização</label>
                <select value={form.sync_mode || 'replace'} onChange={e => setForm(f => ({ ...f, sync_mode: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="replace">Substituir (replace) — apaga e reimporta tudo</option>
                  <option value="append">Acumular (append) — adiciona novas linhas</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.urlLabel')}</label>
                  <input required={tab === 'api'} type="url" value={form.api_url} onChange={e => setForm(f => ({ ...f, api_url: e.target.value }))}
                    placeholder={t('modal.urlPlaceholder')}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
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
                <select value={form.sync_mode || 'replace'} onChange={e => setForm(f => ({ ...f, sync_mode: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="replace">Substituir (replace) — apaga e reimporta tudo</option>
                  <option value="append">Acumular (append) — adiciona novas linhas</option>
                </select>
              </div>
            </>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading || (tab === 'sheets' && sheetsLoading)} className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? t('modal.connecting') : t('modal.connectBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}

function GADatasetModal({ onClose }) {
  const [form, setForm] = useState({
    name: 'Google Analytics',
    property_id: '',
    dimensions: 'date,sessionDefaultChannelGrouping,country',
    metrics: 'sessions,activeUsers,bounceRate',
    date_range_days: 30,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.fetch('/reports/datasets/google-analytics/auth', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          dimensions: form.dimensions.split(',').map(s => s.trim()).filter(Boolean),
          metrics: form.metrics.split(',').map(s => s.trim()).filter(Boolean),
          date_range_days: parseInt(form.date_range_days),
        }),
      })
      window.location.href = res.auth_url
    } catch (e) {
      setError(e.message || 'Erro ao iniciar conexão.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Conectar Google Analytics
        </h2>
        <p className="text-xs text-gray-500 mb-4">Você será redirecionado para autorizar o acesso com sua conta Google.</p>
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
            <p className="text-xs text-gray-400 mt-0.5">Google Analytics → Administrador → Propriedade → ID da propriedade</p>
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
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
          <button onClick={handleConnect} disabled={loading || !form.property_id}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 text-gray-700">
            {loading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
            {loading ? 'Redirecionando...' : 'Continuar com Google'}
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

function LinksDatasetModal({ onClose, onCreated }) {
  const toast = useToast()
  const [campaigns, setCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [form, setForm] = useState({ name: '', campaign_id: '', days: 30 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.links.listCampaigns()
      .then(data => {
        setCampaigns(data || [])
        if (data?.length === 1) {
          setForm(f => ({ ...f, campaign_id: data[0].id, name: `Links - ${data[0].name}` }))
        }
      })
      .catch(() => setError('Erro ao carregar campanhas'))
      .finally(() => setLoadingCampaigns(false))
  }, [])

  function handleCampaignChange(e) {
    const id = e.target.value
    const camp = campaigns.find(c => c.id === id)
    setForm(f => ({
      ...f,
      campaign_id: id,
      name: f.name || (camp ? `Links - ${camp.name}` : ''),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.campaign_id) { setError('Selecione uma campanha'); return }
    setLoading(true); setError(null)
    try {
      const ds = await api.reports.datasets.createLinksDataset(form.campaign_id, form.name, form.days)
      onCreated(ds)
      onClose()
      toast('Dataset de Links criado com sucesso!', 'success')
    } catch (e) {
      setError(e.message || 'Erro ao criar dataset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Dataset de Links</h2>
              <p className="text-xs text-gray-400">Importe analytics de uma campanha de links</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome do dataset</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Links - Campanha Black Friday"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Campanha</label>
            {loadingCampaigns ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 animate-pulse bg-gray-50">Carregando campanhas...</div>
            ) : campaigns.length === 0 ? (
              <div className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-sm text-amber-700">
                Nenhuma campanha encontrada. Crie uma campanha em <strong>Links</strong> primeiro.
              </div>
            ) : (
              <select
                required
                value={form.campaign_id}
                onChange={handleCampaignChange}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
              >
                <option value="">Selecione uma campanha...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Periodo de dados</label>
            <select
              value={form.days}
              onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value) }))}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            >
              <option value={7}>Ultimos 7 dias</option>
              <option value={30}>Ultimos 30 dias</option>
              <option value={60}>Ultimos 60 dias</option>
              <option value={90}>Ultimos 90 dias</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-semibold">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || loadingCampaigns || campaigns.length === 0}
              className="flex-1 bg-teal-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Criando...' : 'Criar dataset'}
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
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [syncingId, setSyncingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [excelSheetPicker, setExcelSheetPicker] = useState(null) // { file, sheets }
  const fileRef = useRef()
  const newMenuRef = useRef()

  useEffect(() => {
    api.reports.datasets.list()
      .then(data => setDatasets(data || []))
      .catch(() => toast(t('toast.loadError'), 'error'))
      .finally(() => setLoading(false))

    // Retorno do fluxo OAuth do Google Analytics
    const params = new URLSearchParams(window.location.search)
    if (params.get('ga_success')) {
      const name = params.get('ga_name') || 'Google Analytics'
      toast(`Dataset "${name}" conectado com sucesso!`, 'success')
      window.history.replaceState({}, '', window.location.pathname)
      api.reports.datasets.list().then(data => setDatasets(data || [])).catch(() => {})
    } else if (params.get('ga_error')) {
      const erros = { acesso_negado: 'Acesso negado pelo usuário.', sessao_expirada: 'Sessão expirada. Tente novamente.', falha_token: 'Erro ao obter token do Google.', sem_refresh_token: 'Permissão offline não concedida. Tente novamente.', falha_dados: 'Erro ao buscar dados do Google Analytics.' }
      const detail = params.get('ga_detail') ? ` (${decodeURIComponent(params.get('ga_detail'))})` : ''
      toast((erros[params.get('ga_error')] || 'Erro ao conectar Google Analytics.') + detail, 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
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

  async function handleUpload(file, sheetName) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast(t('toast.invalidFormat'), 'error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast(t('toast.fileTooLarge'), 'error')
      return
    }
    // Para Excel com múltiplas abas, mostrar picker antes de fazer upload
    if (['xlsx', 'xls'].includes(ext) && sheetName === undefined) {
      try {
        const fd = new FormData(); fd.append('file', file)
        const result = await api.reports.datasets.getExcelSheets(fd)
        if (result.sheets && result.sheets.length > 1) {
          setExcelSheetPicker({ file, sheets: result.sheets, sheetsMeta: result.sheets_meta || [] })
          return
        }
      } catch { /* falha silenciosa — faz upload direto */ }
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    if (sheetName) formData.append('sheet_name', sheetName)
    try {
      const ds = await api.reports.datasets.upload(formData)
      setDatasets(prev => [ds, ...prev])
      toast(t('toast.uploadSuccess', { name: ds.name, rows: ds.row_count?.toLocaleString(locale) || 0 }), 'success')
    } catch (err) {
      toast(err.message || t('toast.uploadError'), 'error')
    } finally { setUploading(false) }
  }

  async function handleExcelSheetConfirm(sheetName) {
    const { file } = excelSheetPicker
    setExcelSheetPicker(null)
    await handleUpload(file, sheetName)
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

  async function handleLinksSync(id) {
    setSyncingId(id)
    try {
      const updated = await api.reports.datasets.syncLinks(id)
      setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d))
      toast('Links atualizados com sucesso!', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao sincronizar links', 'error')
    } finally { setSyncingId(null) }
  }

  async function handleGASync(id) {
    setSyncingId(id)
    try {
      const result = await api.reports.datasets.syncGA(id)
      setDatasets(prev => prev.map(d => d.id === id ? { ...d, row_count: result.row_count } : d))
      toast(`Google Analytics sincronizado — ${result.row_count?.toLocaleString() || 0} linhas`, 'success')
    } catch (err) {
      toast(err.message || 'Erro ao sincronizar Google Analytics', 'error')
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
      <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
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
              className="pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
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
            {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-20 animate-pulse" />)}
          </div>
        )}

        {!loading && datasets.length === 0 && (
          <div
            className={`bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${dragOver ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-600'}`}
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
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{dragOver ? t('dropRelease') : t('empty.title')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">{t('empty.desc')}</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mb-6">{t('empty.hint')}</p>
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
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
                Google Analytics
              </button>
              <button onClick={() => setShowLinksModal(true)} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                Links
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
                className="bg-white dark:bg-gray-800 border-2 border-dashed border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-500 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-violet-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <span className="font-semibold text-gray-400 dark:text-gray-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors text-sm">Novo dataset</span>
              </div>
              {showNewMenu && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg w-52 py-1">
                  <button
                    onClick={() => { setShowNewMenu(false); fileRef.current?.click() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                    </svg>
                    Upload arquivo
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setShowApiModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                    Conectar API
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setShowDbModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                    </svg>
                    Conectar banco de dados
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setShowGaModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                    </svg>
                    Google Analytics
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setShowLinksModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                    Links
                  </button>
                </div>
              )}
            </div>

            {/* Lista de datasets */}
            {filtered.map(ds => (
              <div
                key={ds.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all group ${selected.has(ds.id) ? 'border-violet-300 bg-violet-50/30 dark:bg-violet-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm'}`}
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
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ds.type === 'api' ? 'bg-blue-50' : ds.type === 'database' ? 'bg-emerald-50' : ds.type === 'google-analytics' ? 'bg-orange-50' : ds.type === 'links' ? 'bg-teal-50' : 'bg-violet-50'}`}>
                    {ds.type === 'api' ? (
                      <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    ) : ds.type === 'database' ? (
                      <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
                    ) : ds.type === 'google-analytics' ? (
                      <svg className="w-4.5 h-4.5 text-orange-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    ) : ds.type === 'links' ? (
                      <svg className="w-4.5 h-4.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    )}
                  </div>

                  {/* Info — clique navega para detalhe */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/datasets/${ds.id}`)}>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm hover:text-violet-700 dark:hover:text-violet-400 transition-colors">{ds.name}</p>
                      {ds.is_demo && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">DEMO</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{formatRows(ds.row_count)}</span>
                      {ds.columns && <span className="text-xs text-gray-400">{ds.columns.length} {t('columns')}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ds.type === 'api' ? 'bg-blue-50 text-blue-600' : ds.type === 'database' ? 'bg-emerald-50 text-emerald-700' : ds.type === 'google-analytics' ? 'bg-orange-50 text-orange-600' : ds.type === 'links' ? 'bg-teal-50 text-teal-700' : 'bg-violet-50 text-violet-600'}`}>
                        {ds.type === 'api' ? t('typeApi') : ds.type === 'database' ? 'DB' : ds.type === 'google-analytics' ? 'Analytics' : ds.type === 'links' ? 'Links' : t('typeFile')}
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
                    {ds.type === 'links' && (
                      <button
                        onClick={() => handleLinksSync(ds.id)}
                        disabled={syncingId === ds.id}
                        title="Atualizar dados de links"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50"
                      >
                        <svg className={`w-4 h-4 ${syncingId === ds.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                      </button>
                    )}
                    {ds.type === 'google-analytics' && (
                      <button
                        onClick={() => handleGASync(ds.id)}
                        disabled={syncingId === ds.id}
                        title="Buscar dados atualizados do Google Analytics"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50"
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
              className={`border-2 border-dashed rounded-2xl py-4 text-center text-sm transition-all ${dragOver ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' : 'border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600'}`}
            >
              {dragOver ? t('dropRelease') : t('dropHint')}
            </div>
          </div>
        )}
      </div>

      {showApiModal && <ApiDatasetModal onClose={() => setShowApiModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
      {showDbModal && <DbDatasetModal onClose={() => setShowDbModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
      {showGaModal && <GADatasetModal onClose={() => setShowGaModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
      {showLinksModal && <LinksDatasetModal onClose={() => setShowLinksModal(false)} onCreated={ds => setDatasets(prev => [ds, ...prev])} />}
      {excelSheetPicker && (
        <ExcelSheetPickerModal
          sheets={excelSheetPicker.sheets}
          sheetsMeta={excelSheetPicker.sheetsMeta || []}
          onConfirm={handleExcelSheetConfirm}
          onClose={() => setExcelSheetPicker(null)}
        />
      )}
    </AppLayout>
  )
}
