'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { BlockConfigPanel, DatasetPanel, CanvasConfigPanel, ColumnsPanel } from '@/components/ReportBuilder'
import DashboardRail from '@/components/DashboardRail'

const ReportBuilder = dynamic(() => import('@/components/ReportBuilder'), { ssr: false })

const BLOCK_TYPE_KEYS = ['kpi','bar','bar_h','area','line','pie','combo','gauge','speedometer','treemap','bubble','scatter','table','text','filter','slider','image']

// Detect auto-generated default page titles across all locales
const DEFAULT_PAGE_TITLE_RE = /^(Página|Page|Seite|Pagina|ページ|页)\s*\d+$/
function normalizePageTitle(title) {
  if (!title || DEFAULT_PAGE_TITLE_RE.test(title)) return ''
  return title
}

const SHARE_LANGS = [
  { code: 'pt-BR', flag: '🇧🇷', label: 'Português' },
  { code: 'en',    flag: '🇺🇸', label: 'English' },
  { code: 'es',    flag: '🇪🇸', label: 'Español' },
  { code: 'fr',    flag: '🇫🇷', label: 'Français' },
  { code: 'de',    flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it',    flag: '🇮🇹', label: 'Italiano' },
  { code: 'zh',    flag: '🇨🇳', label: '中文' },
  { code: 'ja',    flag: '🇯🇵', label: '日本語' },
]

const LANG_CODES = { 'pt-BR': 'pt', en: 'en', es: 'es', fr: 'fr', de: 'de', it: 'it', zh: 'zh-CN', ja: 'ja' }

async function translateOne(text, tl) {
  if (!text) return text
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) return text
  const data = await res.json()
  return data?.[0]?.map(s => s[0]).join('') || text
}

async function translateBatch(texts, targetLang) {
  const tl = LANG_CODES[targetLang]
  if (!tl || tl === 'pt' || !texts.length) return texts
  return Promise.all(texts.map(tx => translateOne(tx, tl).catch(() => tx)))
}

async function buildTranslatedReport(report, lang) {
  const pages = report.pages?.length > 0
    ? report.pages
    : [{ id: 'page_1', title: '', blocks: report.blocks || [] }]
  const texts = [report.title || '']
  pages.forEach(p => {
    texts.push(p.title || '')
    ;(p.blocks || []).forEach(b => texts.push(b.title || ''))
  })
  const translated = await translateBatch(texts, lang)
  let i = 0
  const newReport = { ...report, title: translated[i++] || report.title }
  newReport.pages = pages.map(p => ({
    ...p,
    title: translated[i++] || p.title,
    blocks: (p.blocks || []).map(b => ({ ...b, title: translated[i++] || b.title })),
  }))
  return newReport
}

let counter = 0
function newBlock(type, blockTypes) {
  const isFilter = type === 'filter' || type === 'slider'
  const isNoData = isFilter || type === 'text' || type === 'image'
  const isGauge = type === 'gauge' || type === 'speedometer'
  const col = isFilter ? (counter % 6) * 2 : (counter % 4) * 3
  const w = isFilter ? 2 : isGauge ? 3 : 3
  const h = isFilter ? 2 : isGauge ? 4 : 2
  counter++
  return {
    id: crypto.randomUUID(),
    type,
    title: blockTypes.find(b => b.type === type)?.label || type,
    dataset_id: null,
    ...(type === 'filter' ? { filter_col: null, filter_label: '' } : isNoData ? {} : { label_col: null, value_col: null, agg: 'sum' }),
    config: {},
    layout: { x: col, y: Infinity, w, h },
  }
}

function MiniBarChart({ data }) {
  if (!data?.length) return null
  const top = data.slice(0, 6)
  const maxVal = Math.max(...top.map(d => Math.abs(Number(d.value) || 0)))
  return (
    <div className="mt-2.5 space-y-1.5 border-t border-violet-100 pt-2.5">
      {top.map((d, i) => {
        const pct = maxVal > 0 ? (Math.abs(Number(d.value)) / maxVal) * 100 : 0
        const val = Number(d.value)
        const fmt = val >= 1e6
          ? `${(val / 1e6).toFixed(1)}M`
          : val >= 1e3
            ? `${(val / 1e3).toFixed(1)}K`
            : val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
        return (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="text-gray-600 truncate shrink-0" style={{ width: '7rem' }}>{d.label}</span>
            <div className="flex-1 bg-violet-100 rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-gray-500 tabular-nums shrink-0" style={{ width: '3.5rem', textAlign: 'right' }}>{fmt}</span>
          </div>
        )
      })}
      {data.length > 6 && (
        <p className="text-[10px] text-gray-400 text-center pt-0.5">+{data.length - 6} itens</p>
      )}
    </div>
  )
}

function AiPanel({ datasets, blocks, onClose, onAddBlock, onAddBlocks, onSetDateCol, onShowDateFilter }) {
  const t = useTranslations('dashboardEditor')
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState('generate')
  const [datasetId, setDatasetId] = useState(datasets[0]?.id || '')

  // Generate tab state: 0=idle, 1-3=loading steps, 4=success, -1=error
  const [genStep, setGenStep] = useState(0)
  const [genError, setGenError] = useState(null)
  const [genResult, setGenResult] = useState(null)
  const [objetivo, setObjetivo] = useState('')

  // Ask tab state
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [aiUsage, setAiUsage] = useState(null)
  const [safetyViolation, setSafetyViolation] = useState(null) // { message, incident_count }

  useEffect(() => {
    api.reports.aiUsage().then(setAiUsage).catch(() => {})
  }, [])

  // Ouve evento de violação de segurança disparado pelo apiFetch
  useEffect(() => {
    function handleSafety(e) { setSafetyViolation(e.detail) }
    window.addEventListener('safety-violation', handleSafety)
    return () => window.removeEventListener('safety-violation', handleSafety)
  }, [])

  const selectedDs = datasets.find(d => d.id === datasetId)
  const numCols = Object.entries(selectedDs?.column_types || {}).filter(([, t]) => t === 'number').map(([c]) => c)
  const dimCols = Object.entries(selectedDs?.column_types || {}).filter(([, t]) => t !== 'number').map(([c]) => c)

  const SUGGESTIONS = [
    numCols[0] && t('ai.suggSum', { col: numCols[0] }),
    dimCols[0] && numCols[0] && t('ai.suggTop', { dim: dimCols[0], metric: numCols[0] }),
    numCols[0] && t('ai.suggTrend', { col: numCols[0] }),
    t('ai.suggCategories'),
  ].filter(Boolean).slice(0, 4)

  const GEN_STEPS = [
    'Analisando colunas e métricas...',
    'Identificando padrões relevantes...',
    'Montando estrutura do dashboard...',
  ]

  async function generateDashboard() {
    if (!datasetId || !selectedDs || genStep > 0 || !onAddBlocks) return
    setGenError(null)
    setGenResult(null)
    setGenStep(1)

    const t1 = setTimeout(() => setGenStep(2), 2500)
    const t2 = setTimeout(() => setGenStep(3), 5000)

    try {
      const result = await api.reports.generateDashboard(datasetId, objetivo.trim() || null)
      clearTimeout(t1); clearTimeout(t2)

      const mapped = (result.blocks || []).map(b => ({
        ...b,
        id: b.id || crypto.randomUUID(),
        dataset_id: datasetId,
        config: {
          ...(b.config || {}),
          dim_type: b.label_col
            ? (selectedDs?.column_types?.[b.label_col] === 'date' ? 'date' : 'text')
            : undefined,
          granularity: selectedDs?.column_types?.[b.label_col] === 'date' ? 'month' : undefined,
        },
      }))

      if (!mapped.length) {
        setGenError('A IA não gerou blocos. Tente descrever o objetivo do dashboard.')
        setGenStep(-1)
        return
      }

      // Se a IA detectou coluna de data, adiciona bloco de filtro de data no canvas
      const allBlocks = [...mapped]
      if (result.suggested_date_col) {
        const alreadyHasDateFilter = mapped.some(b => b.type === 'filter' && b.filter_col === result.suggested_date_col)
        if (!alreadyHasDateFilter) {
          allBlocks.unshift({
            id: crypto.randomUUID(),
            type: 'filter',
            title: 'Filtro de Período',
            dataset_id: datasetId,
            filter_col: result.suggested_date_col,
            filter_label: 'Período',
            config: {},
            layout: { x: 0, y: 0, w: 6, h: 2 },
          })
        }
        if (onSetDateCol) onSetDateCol(result.suggested_date_col)
        if (onShowDateFilter) onShowDateFilter(true)
      }

      onAddBlocks(allBlocks)
      setGenResult({
        count: allBlocks.length,
        kpis: mapped.filter(b => b.type === 'kpi').length,
        charts: mapped.filter(b => b.type !== 'kpi').length,
        domain_name: result.domain_name,
        suggested_date_col: result.suggested_date_col,
      })
      setGenStep(4)
      api.reports.aiUsage().then(setAiUsage).catch(() => {})
      setTimeout(onClose, 2800)
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2)
      setGenError(e.message || 'Erro ao gerar dashboard.')
      setGenStep(-1)
    }
  }

  async function ask(q) {
    const qText = q || question.trim()
    if (!datasetId || !qText) return
    setSafetyViolation(null)
    setLoading(true)
    const entry = { id: crypto.randomUUID(), question: qText, answer: null, error: null, safety: false, ts: new Date().toISOString() }
    setHistory(h => [entry, ...h])
    if (!q) setQuestion('')
    try {
      const result = await api.reports.aiQuery(datasetId, qText)
      setHistory(h => h.map(e => e.id === entry.id ? { ...e, answer: result.answer, aiResult: result, datasetId } : e))
      api.reports.aiUsage().then(setAiUsage).catch(() => {})
    } catch (e) {
      const isSafety = e.message && (e.message.includes('bloqueada') || e.message.includes('Termos de Uso'))
      setHistory(h => h.map(e => e.id === entry.id ? { ...e, error: e.message, safety: isSafety } : e))
    } finally { setLoading(false) }
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }

  const isGenerating = genStep >= 1 && genStep <= 3

  if (datasets.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-sm text-gray-500">{t('ai.noDataset')}</p>
          <button onClick={onClose} className="mt-4 text-sm text-violet-600 hover:underline">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden max-h-[88vh]" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-800 text-sm">Jarbis IA</span>
          </div>
          <div className="flex items-center gap-3">
            {aiUsage && aiUsage.limit !== -1 && (
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      aiUsage.remaining === 0 ? 'bg-red-400' :
                      aiUsage.remaining <= 10 ? 'bg-amber-400' : 'bg-violet-500'
                    }`}
                    style={{ width: `${Math.round((aiUsage.remaining / aiUsage.limit) * 100)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium tabular-nums ${
                  aiUsage.remaining === 0 ? 'text-red-500' :
                  aiUsage.remaining <= 10 ? 'text-amber-600' : 'text-gray-400'
                }`}>{aiUsage.remaining}/{aiUsage.limit}</span>
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Banner de violação de segurança ── */}
        {safetyViolation && (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">⛔</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-700 mb-1">Ação bloqueada — Violação de Segurança</p>
                <p className="text-[11px] text-red-600 leading-relaxed whitespace-pre-line">{safetyViolation.message}</p>
                {safetyViolation.incident_count >= 3 && (
                  <p className="text-[11px] font-bold text-red-700 mt-2">
                    Sua conta foi suspensa. Entre em contato: comercial@jarbis.cc
                  </p>
                )}
              </div>
              <button onClick={() => setSafetyViolation(null)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 shrink-0">
          {[
            onAddBlocks && { id: 'generate', icon: '✨', label: 'Gerar Dashboard' },
            { id: 'ask', icon: '💬', label: 'Perguntar' },
          ].filter(Boolean).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-50/40'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════════ TAB: GERAR ════════ */}
          {activeTab === 'generate' && (
            <div className="p-5 flex flex-col gap-4">

              {/* Dataset selector (só aparece se houver mais de 1) */}
              {datasets.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Dataset</label>
                  <select
                    value={datasetId}
                    onChange={e => { setDatasetId(e.target.value); setGenStep(0); setGenError(null); setGenResult(null) }}
                    disabled={isGenerating}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                  >
                    {datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name} ({ds.row_count} linhas)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Estado: idle ou erro */}
              {(genStep === 0 || genStep === -1) && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Contexto <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={objetivo}
                      onChange={e => setObjetivo(e.target.value)}
                      placeholder="Ex: análise de faturamento NFS-e, foco em tendência mensal e top clientes..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                    />
                  </div>

                  {genStep === -1 && genError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-red-600">Erro ao gerar</p>
                        <p className="text-xs text-red-500 mt-0.5">{genError}</p>
                        <button onClick={() => setGenStep(0)} className="text-xs text-violet-600 hover:underline mt-1">Tentar novamente</button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={generateDashboard}
                    disabled={!datasetId}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Gerar Dashboard
                  </button>

                  <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                    O Jarbis analisa todas as colunas, identifica o que é relevante e cria KPIs e gráficos posicionados de forma inteligente.
                  </p>
                </>
              )}

              {/* Estado: gerando (animação de progresso) */}
              {isGenerating && (
                <div className="py-10 flex flex-col items-center gap-6">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 text-violet-100" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <svg className="w-20 h-20 text-violet-500 animate-spin absolute inset-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                      </svg>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-violet-700">{GEN_STEPS[genStep - 1]}</p>
                    <p className="text-xs text-gray-400 mt-1.5">Usando IA avançada para criar um dashboard relevante</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {GEN_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-full transition-all duration-500 ${
                          i < genStep ? 'w-6 h-1.5 bg-violet-500' : 'w-2 h-2 bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Estado: sucesso */}
              {genStep === 4 && genResult && (
                <div className="py-6 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-base">Dashboard criado!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {[
                        genResult.kpis > 0 && `${genResult.kpis} KPI${genResult.kpis > 1 ? 's' : ''}`,
                        genResult.charts > 0 && `${genResult.charts} gráfico${genResult.charts > 1 ? 's' : ''}`,
                      ].filter(Boolean).join(' + ')}
                    </p>
                    {genResult.domain_name && (
                      <p className="text-xs text-violet-600 mt-1 font-medium">Domínio: {genResult.domain_name}</p>
                    )}
                  </div>
                  {genResult.suggested_date_col && (
                    <div className="text-xs bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-violet-700">
                      Filtro de data configurado automaticamente: <b>{genResult.suggested_date_col}</b>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Fechando em instantes...</p>
                </div>
              )}

            </div>
          )}

          {/* ════════ TAB: PERGUNTAR ════════ */}
          {activeTab === 'ask' && (
            <div className="p-5 flex flex-col gap-4">

              {/* Dataset selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('ai.datasetLabel')}</label>
                <select
                  value={datasetId}
                  onChange={e => setDatasetId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id}>{ds.name} ({t('ai.rowsCount', { n: ds.row_count })})</option>
                  ))}
                </select>
                {selectedDs && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {t('ai.colsInfo', { n: selectedDs.columns?.length })}: {selectedDs.columns?.slice(0,5).join(', ')}
                    {(selectedDs.columns?.length || 0) > 5 ? '...' : ''}
                  </p>
                )}
              </div>

              {/* Sugestões */}
              {SUGGESTIONS.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('ai.suggestions')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => ask(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && ask()}
                  placeholder={t('ai.askPlaceholder')}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  autoFocus
                  disabled={loading}
                />
                <button
                  onClick={() => ask()}
                  disabled={loading || !datasetId || !question.trim()}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors shrink-0"
                >
                  {loading
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : t('ai.send')
                  }
                </button>
              </div>

              {/* Histórico */}
              {history.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('ai.history')}</p>
                    <button onClick={() => setHistory([])} className="text-[10px] text-gray-400 hover:text-gray-600 font-medium">
                      {t('ai.clearHistory')}
                    </button>
                  </div>
                  {history.map(entry => (
                    <div key={entry.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-700 flex-1">{entry.question}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{fmtDate(entry.ts)}</span>
                      </div>
                      {entry.answer ? (
                        <div className="px-3 py-2.5 bg-violet-50">
                          <p className="text-sm text-violet-900 leading-relaxed">{entry.answer}</p>
                          {entry.aiResult?.data?.length > 0 && (
                            <MiniBarChart data={entry.aiResult.data} />
                          )}
                          {entry.aiResult?.suggested_chart_type && onAddBlock && (
                            <button
                              onClick={() => {
                                onAddBlock({
                                  id: crypto.randomUUID(),
                                  type: entry.aiResult.suggested_chart_type || 'bar',
                                  title: entry.aiResult.suggested_title || 'Gráfico IA',
                                  dataset_id: entry.datasetId || null,
                                  label_col: entry.aiResult.query?.label_col || null,
                                  value_col: entry.aiResult.query?.value_col || null,
                                  agg: entry.aiResult.query?.agg || 'sum',
                                  config: {},
                                  layout: { x: 0, y: 999, w: 6, h: 4 },
                                })
                                onClose()
                              }}
                              className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-xs font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                              </svg>
                              Adicionar ao dashboard
                            </button>
                          )}
                        </div>
                      ) : entry.error ? (
                        <div className={`px-3 py-2.5 ${entry.safety ? 'bg-red-50 border-t border-red-100' : 'bg-red-50'}`}>
                          {entry.safety ? (
                            <div className="flex items-start gap-2">
                              <span className="text-base shrink-0">⛔</span>
                              <p className="text-xs text-red-700 font-medium leading-relaxed">
                                Pergunta bloqueada por violar os Termos de Uso. Esta ocorrência foi registrada.
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-red-600">{entry.error}</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-violet-50 px-3 py-2.5 flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span className="text-xs text-violet-400">{t('ai.analyzing')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function DiagnosticoPanel({ reportId, datasets, onClose, onAddBlock, onExportInsights }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(null) // null = tela de escolha | 'analise' | 'perguntar' | 'tecnico'
  const [addedBlocks, setAddedBlocks] = useState(new Set())
  const [exported, setExported] = useState(false)

  // Histórico
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  // Pergunta livre
  const [question, setQuestion] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    api.reports.diagnoseHistory(reportId)
      .then(data => {
        setHistory(data)
        // Se existe análise anterior, carrega automaticamente a mais recente
        if (data?.length > 0) {
          loadSnapshot(data[0])
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [reportId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  function handleGenerateAuto() {
    setTab('analise')
    if (result || loading) return
    setLoading(true)
    api.reports.diagnoseDashboard(reportId)
      .then(r => { setResult(r); setHistory(h => [{ id: 'new', created_at: new Date().toISOString(), health_score: r.health_score, domain_name: r.domain_name, visual_insights: r.visual_insights, missing_blocks: r.missing_blocks, suggestions: r.suggestions }, ...h]) })
      .catch(e => setError(e.message || 'Erro ao diagnosticar'))
      .finally(() => setLoading(false))
  }

  function loadSnapshot(snap) {
    setResult({
      domain_name: snap.domain_name,
      health_score: snap.health_score,
      visual_insights: snap.visual_insights,
      missing_blocks: snap.missing_blocks,
      suggestions: snap.suggestions,
      technical: null,
      previous: null,
    })
    setTab('analise')
  }

  async function handleDeleteSnapshot(e, snapId) {
    e.stopPropagation()
    setDeletingId(snapId)
    try {
      await api.reports.deleteSnapshot(reportId, snapId)
      setHistory(h => h.filter(s => s.id !== snapId))
      if (result && snapId === 'new') setResult(null)
    } catch {}
    setDeletingId(null)
  }

  const score = result?.health_score ?? 0
  const scoreColor = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'
  const scoreRing = score >= 75 ? 'stroke-green-500' : score >= 50 ? 'stroke-amber-400' : 'stroke-red-400'
  const scoreLabel = score >= 75 ? 'Ótimo' : score >= 50 ? 'Em evolução' : 'Incompleto'

  const prev = result?.previous
  const delta = prev?.delta

  function handleAddBlock(mb) {
    if (!onAddBlock) return
    // Usar dataset_id do resultado da análise ou do primeiro dataset disponível
    const dsId = result?.dataset_id || datasets?.[0]?.id || null
    onAddBlock({
      id: crypto.randomUUID(),
      type: mb.type,
      title: mb.title || mb.label || mb.type,
      dataset_id: dsId,
      label_col: mb.label_col || null,
      value_col: mb.value_col || null,
      agg: 'sum',
      config: {},
      layout: { x: 0, y: Infinity, w: mb.type === 'kpi' ? 3 : 6, h: mb.type === 'kpi' ? 2 : 4 },
    })
    setAddedBlocks(s => new Set([...s, mb.type + (mb.title || '')]))
  }

  function handleExport() {
    if (!onExportInsights || !result) return
    const insights = result.visual_insights || []
    const lines = insights.map(i => `• ${i}`).join('\n')
    const text = `Análise — ${result.domain_name || 'Dashboard'}\n\n${lines}`
    onExportInsights(text)
    setExported(true)
    setTimeout(() => setExported(false), 2500)
  }

  const dateStr = result?.previous?.created_at
    ? new Date(result.previous.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  async function handleAsk() {
    const q = question.trim()
    if (!q || askLoading) return
    setAskLoading(true)
    setAskError(null)
    setQuestion('')
    try {
      const res = await api.reports.askDashboard(reportId, q)
      setChatHistory(h => [...h, { question: q, answer: res.answer, exported: false }])
    } catch (e) {
      setAskError(e.message || 'Erro ao processar pergunta')
    } finally {
      setAskLoading(false)
    }
  }

  function handleExportAnswer(idx) {
    if (!onExportInsights) return
    const item = chatHistory[idx]
    if (!item) return
    const text = `Análise — ${item.question}\n\n${item.answer}`
    onExportInsights(text)
    setChatHistory(h => h.map((x, i) => i === idx ? { ...x, exported: true } : x))
    setTimeout(() => setChatHistory(h => h.map((x, i) => i === idx ? { ...x, exported: false } : x)), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-800 text-sm">Análise</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs — só aparecem após escolha */}
        {tab !== null && (
          <div className="flex border-b border-gray-100 shrink-0">
            {[{ id: 'analise', label: 'Visão geral' }, { id: 'perguntar', label: 'Perguntar' }, { id: 'tecnico', label: 'Técnico' }].map(t => (
              <button key={t.id}
                onClick={() => { if (t.id === 'analise') handleGenerateAuto(); else setTab(t.id) }}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t.id ? 'text-violet-700 border-b-2 border-violet-500 bg-violet-50/40' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          {/* Tela de escolha — aparece antes de qualquer ação */}
          {tab === null && (
            <div className="flex flex-col gap-3 py-2">
              <button
                onClick={handleGenerateAuto}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-200 transition-colors">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Gerar análise automática</p>
                  <p className="text-xs text-gray-400 mt-0.5">Análise completa com health score, insights e recomendações</p>
                </div>
              </button>
              <button
                onClick={() => setTab('perguntar')}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-200 transition-colors">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Fazer uma pergunta</p>
                  <p className="text-xs text-gray-400 mt-0.5">Pergunte algo específico — ex: "Como evoluiu o faturamento?"</p>
                </div>
              </button>

              {/* Histórico de análises */}
              {!historyLoading && history.length > 0 && (
                <div className="mt-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Análises anteriores</p>
                  <div className="flex flex-col gap-1.5">
                    {history.map(snap => (
                      <button
                        key={snap.id}
                        onClick={() => loadSnapshot(snap)}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-100 rounded-xl hover:border-violet-200 hover:bg-violet-50/30 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${snap.health_score >= 70 ? 'bg-green-50 text-green-600' : snap.health_score >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                            {snap.health_score}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">{snap.domain_name}</p>
                            <p className="text-[10px] text-gray-400">
                              {new Date(snap.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {' · '}
                              {new Date(snap.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={e => handleDeleteSnapshot(e, snap.id)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
                          title="Apagar análise"
                        >
                          {deletingId === snap.id
                            ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          }
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {historyLoading && (
                <div className="flex items-center justify-center py-3 gap-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Carregando histórico...
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <svg className="w-8 h-8 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-sm text-gray-500">Analisando seus dados...</p>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-600">{error}</div>}

          {result && !loading && tab === 'analise' && (
            <>
              {/* Health Score + De/Para */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none" className={scoreRing} strokeWidth="3"
                      strokeDasharray={`${score} 100`} strokeLinecap="round"/>
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor}`}>{score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-bold ${scoreColor}`}>{scoreLabel}</p>
                    {delta !== null && delta !== undefined && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${delta > 0 ? 'bg-green-100 text-green-700' : delta < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {delta > 0 ? `+${delta}` : delta} {dateStr && <span className="font-normal opacity-70">vs {dateStr}</span>}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{result.domain_name || 'Genérico'}</p>
                  {!prev && <p className="text-[10px] text-gray-300 mt-0.5">Primeira análise — próxima mostrará evolução</p>}
                </div>
              </div>

              {/* De/Para: insights anteriores */}
              {prev?.visual_insights?.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide cursor-pointer list-none flex items-center gap-1.5 hover:text-gray-600">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    Análise anterior ({dateStr})
                  </summary>
                  <div className="mt-2 flex flex-col gap-1.5 pl-4 border-l-2 border-gray-100">
                    {prev.visual_insights.slice(0, 2).map((ins, i) => (
                      <p key={i} className="text-[11px] text-gray-400 italic">{ins}</p>
                    ))}
                  </div>
                </details>
              )}

              {/* Insights de negócio */}
              {(result.visual_insights?.length > 0 || result.insights?.length > 0) && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">O que seus dados mostram</p>
                  <div className="flex flex-col gap-2">
                    {(result.visual_insights || result.insights).map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2.5">
                        <span className="text-blue-400 text-sm mt-0.5 shrink-0">💡</span>
                        <p className="text-xs text-blue-800 leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing blocks com botão + */}
              {result.missing_blocks?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Visualizações recomendadas</p>
                  <div className="flex flex-col gap-2">
                    {result.missing_blocks.map((mb, i) => {
                      const key = mb.type + (mb.title || '')
                      const added = addedBlocks.has(key)
                      return (
                        <div key={i} className="flex items-center gap-3 border border-dashed border-violet-200 rounded-xl px-3 py-2.5 bg-violet-50/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700">{mb.title || mb.label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{mb.reason}</p>
                          </div>
                          {onAddBlock && (
                            <button
                              onClick={() => handleAddBlock(mb)}
                              disabled={added}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${added ? 'bg-green-100 text-green-600' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}
                              title={added ? 'Adicionado!' : 'Adicionar ao dashboard'}
                            >
                              {added
                                ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                              }
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Próximos passos</p>
                  <div className="flex flex-col gap-1.5">
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-amber-400 shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                        <p>{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.missing_blocks?.length === 0 && !result.suggestions?.length && (
                <div className="text-center py-3 text-xs text-green-600 bg-green-50 rounded-xl">
                  Dashboard completo para o domínio detectado!
                </div>
              )}
            </>
          )}

          {/* Tab: Perguntar */}
          {tab === 'perguntar' && (
            <div className="flex flex-col gap-3 flex-1">
              {/* Histórico de perguntas/respostas */}
              {chatHistory.length === 0 && !askLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Pergunte sobre seus dados</p>
                    <p className="text-[11px] text-gray-400 mt-1">Ex: "Como evoluiu o faturamento mês a mês?"</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {[
                      'Qual o produto mais vendido?',
                      'Evolução do faturamento mês a mês',
                      'Quais clientes compram mais?',
                      'Qual período teve melhor desempenho?',
                    ].map(sugestao => (
                      <button
                        key={sugestao}
                        onClick={() => setQuestion(sugestao)}
                        className="text-[10px] px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-500 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                      >
                        {sugestao}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  {/* Pergunta */}
                  <div className="flex justify-end">
                    <div className="bg-violet-600 text-white text-xs px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed">
                      {item.question}
                    </div>
                  </div>
                  {/* Resposta */}
                  <div className="flex flex-col gap-1">
                    <div className="bg-gray-50 border border-gray-100 text-xs px-3 py-2.5 rounded-2xl rounded-tl-sm text-gray-700 leading-relaxed max-w-[95%] whitespace-pre-wrap">
                      {item.answer}
                    </div>
                    {onExportInsights && (
                      <button
                        onClick={() => handleExportAnswer(idx)}
                        className={`self-start flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all ${item.exported ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50'}`}
                      >
                        {item.exported
                          ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> Adicionado!</>
                          : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> Adicionar ao dashboard</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {askLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                  <svg className="w-4 h-4 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Analisando...
                </div>
              )}

              {askError && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">{askError}</div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}

          {result && !loading && tab === 'tecnico' && (
            <>
              {/* Métricas técnicas */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Registros', value: result.technical?.total_rows?.toLocaleString('pt-BR') ?? '—' },
                  { label: 'Colunas', value: result.technical?.total_cols ?? '—' },
                  { label: 'Domínio', value: result.domain_name ?? '—' },
                  { label: 'Health Score', value: result.health_score ?? '—' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-bold text-gray-700 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Tipos de bloco */}
              {result.technical?.block_types && Object.keys(result.technical.block_types).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Blocos no dashboard</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(result.technical.block_types).map(([type, count]) => (
                      <span key={type} className="text-[11px] px-2 py-1 bg-violet-50 text-violet-700 rounded-full font-medium">
                        {type} ×{count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Colunas a adicionar */}
              {result.technical?.missing_columns?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Enriqueça sua planilha</p>
                  <div className="flex flex-col gap-2">
                    {result.technical.missing_columns.map((mc, i) => (
                      <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2.5">
                        <span className="text-amber-500 text-xs font-bold mt-0.5 shrink-0">+</span>
                        <div>
                          <p className="text-xs font-semibold text-amber-800">{mc.col}</p>
                          <p className="text-[11px] text-amber-600">{mc.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Adicione estas colunas na sua planilha para análises mais completas.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — varia por tab */}
        {tab === 'perguntar' ? (
          <div className="px-3 py-3 border-t border-gray-100 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 leading-relaxed placeholder:text-gray-300"
                placeholder="O que você quer analisar?"
                rows={2}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || askLoading}
                className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Enviar (Enter)"
              >
                {askLoading
                  ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/></svg>
                }
              </button>
            </div>
          </div>
        ) : (result && !loading && onExportInsights && tab === 'analise') ? (
          <div className="px-4 py-3 border-t border-gray-100 shrink-0">
            <button
              onClick={handleExport}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${exported ? 'bg-green-100 text-green-700' : 'bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100'}`}
            >
              {exported
                ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> Adicionado ao dashboard!</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> Adicionar análise ao dashboard</>
              }
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FiltersPanel({ blocks, datasets, globalDateFilter, onGlobalDateFilterChange, filterSummary = {}, onClearDatasetFilters }) {
  const t = useTranslations('dashboardEditor')
  const filterBlocks = blocks.filter(b => b.type === 'filter' || b.type === 'slider')
  const hasDateFilter = !!(globalDateFilter.dateFrom || globalDateFilter.dateTo)
  const dateColOptions = [...new Set(datasets.flatMap(ds =>
    Object.entries(ds.column_types || {}).filter(([, t]) => t === 'date').map(([c]) => c)
  ))].sort()

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('filters.title')}</p>

      {/* Filtro de data global */}
      <div className={`rounded-xl border p-3 space-y-2.5 ${hasDateFilter ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
            {t('filters.dateFilterLabel')}
          </span>
          {hasDateFilter && (
            <button onClick={() => onGlobalDateFilterChange({ dateCol: globalDateFilter.dateCol, dateFrom: '', dateTo: '' })} className="text-[10px] text-red-400 hover:text-red-600 font-medium">{t('filters.clearDate')}</button>
          )}
        </div>
        <select
          value={globalDateFilter.dateCol || ''}
          onChange={e => onGlobalDateFilterChange({ ...globalDateFilter, dateCol: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          <option value="">{t('filters.dateColPlaceholder')}</option>
          {dateColOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={globalDateFilter.dateFrom || ''} onChange={e => onGlobalDateFilterChange({ ...globalDateFilter, dateFrom: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
          <span className="text-xs text-gray-400 self-center">{t('dateTo')}</span>
          <input type="date" value={globalDateFilter.dateTo || ''} onChange={e => onGlobalDateFilterChange({ ...globalDateFilter, dateTo: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'today', fn: () => { const d = new Date().toISOString().slice(0,10); return { dateFrom: d, dateTo: d } } },
            { key: '7d', fn: () => { const d = new Date(); const f = new Date(d); f.setDate(f.getDate()-6); return { dateFrom: f.toISOString().slice(0,10), dateTo: d.toISOString().slice(0,10) } } },
            { key: '30d', fn: () => { const d = new Date(); const f = new Date(d); f.setDate(f.getDate()-29); return { dateFrom: f.toISOString().slice(0,10), dateTo: d.toISOString().slice(0,10) } } },
            { key: 'month', fn: () => { const d = new Date(); return { dateFrom: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, dateTo: d.toISOString().slice(0,10) } } },
            { key: 'year', fn: () => { const d = new Date(); return { dateFrom: `${d.getFullYear()}-01-01`, dateTo: d.toISOString().slice(0,10) } } },
          ].map(p => (
            <button key={p.key} onClick={() => onGlobalDateFilterChange({ ...globalDateFilter, ...p.fn() })} className="px-2 py-1 text-[10px] font-medium rounded-lg border border-gray-200 bg-white hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">{t(`filters.presets.${p.key}`)}</button>
          ))}
        </div>

        {/* Comparação de período */}
        {hasDateFilter && (
          <div className="border-t border-violet-100 pt-2.5 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => onGlobalDateFilterChange({ ...globalDateFilter, comparePrevious: !globalDateFilter.comparePrevious })}
                className={`w-8 h-4 rounded-full transition-colors relative ${globalDateFilter.comparePrevious ? 'bg-violet-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${globalDateFilter.comparePrevious ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-700 font-medium">{t('filters.comparePrevious')}</span>
            </label>
            {globalDateFilter.comparePrevious && (
              <p className="text-[10px] text-violet-600">{t('filters.autoDeltaHint')}</p>
            )}
          </div>
        )}
      </div>

      {/* Filtros ativos por dataset */}
      {Object.keys(filterSummary).length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Filtros ativos</p>
          {Object.entries(filterSummary).map(([dsId, count]) => {
            const ds = datasets.find(d => d.id === dsId)
            return (
              <div key={dsId} className="flex items-center justify-between bg-white rounded-lg border border-violet-100 px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-600 rounded-full w-5 h-5 flex items-center justify-center shrink-0">{count}</span>
                  <span className="text-xs text-gray-700 truncate">{ds?.name || 'Dataset'}</span>
                </div>
                <button
                  onClick={() => onClearDatasetFilters?.(dsId)}
                  className="text-[10px] text-red-400 hover:text-red-600 font-medium shrink-0 ml-2"
                >
                  Limpar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Blocos de filtro configurados */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Blocos de filtro</p>
        {filterBlocks.length === 0 ? (
          <div className="text-center py-6 px-2">
            <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
            <p className="text-xs text-gray-400 font-medium">Nenhum bloco de filtro</p>
            <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Adicione um bloco "Filtro" ou "Slider" ao dashboard para filtrar dados interativamente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filterBlocks.map(block => {
              const ds = datasets.find(d => d.id === block.dataset_id)
              const isSlider = block.type === 'slider'
              const col = isSlider ? (block.config?.range_col || block.config?.filter_col) : block.config?.filter_col
              const dsActive = (filterSummary[block.dataset_id] || 0) > 0
              return (
                <div key={block.id} className={`rounded-lg border p-2.5 transition-colors ${dsActive ? 'border-violet-200 bg-violet-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-800 truncate">{block.title || (isSlider ? 'Slider' : 'Filtro')}</span>
                    {dsActive && (
                      <button
                        onClick={() => onClearDatasetFilters?.(block.dataset_id)}
                        className="text-[10px] text-red-400 hover:text-red-600 font-medium shrink-0"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isSlider ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>
                      {isSlider ? 'Slider' : 'Filtro'}
                    </span>
                    {col && <span className="text-[10px] text-gray-500 truncate">coluna: <span className="font-medium text-gray-700">{col}</span></span>}
                  </div>
                  {ds && <p className="text-[10px] text-gray-400 mt-1 truncate">{ds.name}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentsPanel({ blocks, onBlocksChange }) {
  const t = useTranslations('dashboardEditor')
  const locale = useLocale()
  const [text, setText] = useState('')
  const [targetBlockId, setTargetBlockId] = useState('')

  const dataBlocks = blocks.filter(b => !['filter', 'slider', 'image'].includes(b.type))
  const allAnnotations = blocks.flatMap(b =>
    (b.config?.annotations || []).map(a => ({ ...a, blockId: b.id, blockTitle: b.title }))
  ).sort((a, b) => new Date(b.ts) - new Date(a.ts))

  function addComment() {
    const tid = targetBlockId || dataBlocks[0]?.id
    if (!text.trim() || !tid) return
    const annotation = { id: crypto.randomUUID(), text: text.trim(), ts: new Date().toISOString() }
    onBlocksChange(blocks.map(b => b.id === tid
      ? { ...b, config: { ...(b.config || {}), annotations: [...(b.config?.annotations || []), annotation] } }
      : b
    ))
    setText('')
  }

  function deleteComment(blockId, annotationId) {
    onBlocksChange(blocks.map(b => b.id === blockId
      ? { ...b, config: { ...(b.config || {}), annotations: (b.config?.annotations || []).filter(a => a.id !== annotationId) } }
      : b
    ))
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('comments.title')}</p>

      {/* Add comment form */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
        <select
          value={targetBlockId || dataBlocks[0]?.id || ''}
          onChange={e => setTargetBlockId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          <option value="">{t('comments.selectBlock')}</option>
          {dataBlocks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && addComment()}
          placeholder={t('comments.placeholder')}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white resize-none"
        />
        <button
          onClick={addComment}
          disabled={!text.trim()}
          className="w-full py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          {t('comments.addBtn')}
        </button>
      </div>

      {/* Comments list */}
      {allAnnotations.length === 0 ? (
        <div className="text-center py-6">
          <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>
          <p className="text-xs text-gray-400">{t('comments.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allAnnotations.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-violet-600 truncate flex-1">{a.blockTitle}</span>
                <button
                  onClick={() => deleteComment(a.blockId, a.id)}
                  className="text-gray-300 hover:text-red-400 shrink-0 transition-colors"
                  title={t('comments.removeNote')}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{a.text}</p>
              <p className="text-[10px] text-gray-400 mt-1.5">{fmtDate(a.ts)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AddBlockDialog — "O que quer ver aqui?" (text-to-block) ──────────────────
function AddBlockDialog({ datasets, onClose, onAddBlock }) {
  const [dsId, setDsId] = useState(datasets[0]?.id || '')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showBlankMenu, setShowBlankMenu] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const selectedDs = datasets.find(d => d.id === dsId)
  const numCols = Object.entries(selectedDs?.column_types || {}).filter(([, t]) => t === 'number').map(([c]) => c)
  const dimCols = Object.entries(selectedDs?.column_types || {}).filter(([, t]) => t !== 'number').map(([c]) => c)

  const SUGGESTIONS = [
    numCols[0] && dimCols[0] && `${numCols[0]} por ${dimCols[0]}`,
    numCols[0] && dimCols[0] && `top 10 ${dimCols[0]} por ${numCols[0]}`,
    numCols[0] && `total de ${numCols[0]}`,
    numCols[1] && dimCols[0] && `${numCols[1]} ao longo do tempo`,
  ].filter(Boolean).slice(0, 4)

  const BLANK_TYPES = [
    { type: 'kpi', label: 'KPI' },
    { type: 'bar', label: 'Barras' },
    { type: 'line', label: 'Linha' },
    { type: 'pie', label: 'Pizza' },
    { type: 'table', label: 'Tabela' },
    { type: 'text', label: 'Texto' },
  ]

  async function createWithAI() {
    const q = text.trim()
    if (!q || !dsId) return
    setError(null)
    setLoading(true)
    try {
      const result = await api.reports.aiQuery(dsId, q)
      const type = result.suggested_chart_type || 'bar'
      const isGauge = type === 'gauge' || type === 'speedometer'
      onAddBlock({
        id: crypto.randomUUID(),
        type,
        title: result.suggested_title || q,
        dataset_id: dsId,
        label_col: result.query?.label_col || null,
        value_col: result.query?.value_col || null,
        agg: result.query?.agg || 'sum',
        config: {},
        layout: { x: 0, y: Infinity, w: type === 'kpi' ? 3 : isGauge ? 3 : 6, h: type === 'kpi' ? 2 : isGauge ? 4 : 4 },
      })
      onClose()
    } catch (e) {
      setError(e.message || 'Erro ao criar bloco com IA.')
    } finally {
      setLoading(false)
    }
  }

  function createBlank(type) {
    const isFilter = type === 'filter' || type === 'slider'
    const isNoData = isFilter || type === 'text' || type === 'image'
    const isGauge = type === 'gauge' || type === 'speedometer'
    onAddBlock({
      id: crypto.randomUUID(),
      type,
      title: '',
      dataset_id: isNoData ? null : dsId,
      ...(isNoData ? {} : { label_col: null, value_col: null, agg: 'sum' }),
      config: {},
      layout: { x: 0, y: Infinity, w: isFilter ? 4 : isGauge ? 3 : type === 'kpi' ? 3 : 6, h: isFilter ? 2 : isGauge ? 4 : type === 'kpi' ? 2 : 4 },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-800 text-sm">Adicionar bloco</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Dataset selector (only if multiple) */}
          {datasets.length > 1 && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Dataset</label>
              <select
                value={dsId}
                onChange={e => setDsId(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 bg-white outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              >
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Text input */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">O que quer ver aqui?</label>
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); createWithAI() } }}
              placeholder="Ex: faturamento por mês, top 10 clientes, distribuição por categoria..."
              rows={2}
              className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 resize-none outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-gray-300"
            />
          </div>

          {/* Suggestions */}
          {SUGGESTIONS.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors border border-violet-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={createWithAI}
              disabled={loading || !text.trim() || !dsId}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              )}
              {loading ? 'Criando...' : 'Criar com IA'}
            </button>

            {/* Blank block dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBlankMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Em branco
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {showBlankMenu && (
                <div className="absolute bottom-full right-0 mb-1.5 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 grid grid-cols-2 gap-1">
                  {BLANK_TYPES.map(bt => (
                    <button
                      key={bt.type}
                      onClick={() => { createBlank(bt.type); setShowBlankMenu(false) }}
                      className="text-xs text-left px-2.5 py-2 rounded-lg hover:bg-violet-50 hover:text-violet-700 text-gray-700 transition-colors font-medium"
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Left Data Tray — painel esquerdo de datasets/colunas no modo de edição ──
function LeftDataTray({ datasets, onDragStart, onDragEnd, onManageDatasets, onQuickAdd }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(true)
  const [expandedDatasets, setExpandedDatasets] = useState(() => new Set())
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set())

  const TYPE_GROUPS = [
    { key: 'number', label: 'Números', badge: '#', bgClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' },
    { key: 'date',   label: 'Datas',   badge: '~', bgClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' },
    { key: 'text',   label: 'Texto',   badge: 'A', bgClass: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
  ]

  const grouped = datasets.map(ds => {
    const allCols = (ds.columns || []).filter(col => !search || col.toLowerCase().includes(search.toLowerCase()))
    const byType = { number: [], date: [], text: [] }
    allCols.forEach(col => {
      const t = ds.column_types?.[col] === 'number' ? 'number' : ds.column_types?.[col] === 'date' ? 'date' : 'text'
      byType[t].push({ col, colType: t })
    })
    return { ...ds, byType, totalFiltered: allCols.length }
  }).filter(ds => ds.totalFiltered > 0 || !search)

  useEffect(() => {
    if (datasets.length > 0 && expandedDatasets.size === 0) {
      setExpandedDatasets(new Set([datasets[0].id]))
    }
  }, [datasets]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDataset(id) {
    setExpandedDatasets(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function toggleGroup(key) {
    setCollapsedGroups(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })
  }

  function ColItem({ col, colType, dsId, badgeBg }) {
    return (
      <div
        draggable
        onDragStart={e => {
          e.dataTransfer.effectAllowed = 'copy'
          e.dataTransfer.setData('text/plain', JSON.stringify({ col, colType, datasetId: dsId }))
          onDragStart(col, colType, dsId)
        }}
        onDragEnd={onDragEnd}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg mx-1 cursor-grab active:cursor-grabbing hover:bg-violet-50 dark:hover:bg-violet-900/20 group transition-colors"
      >
        <span className="text-[9px] select-none text-gray-200 dark:text-gray-600 group-hover:text-violet-300 shrink-0">⠿</span>
        <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${badgeBg}`}>
          {colType === 'number' ? '#' : colType === 'date' ? '~' : 'A'}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400 truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors flex-1">{col}</span>
        {onQuickAdd && (
          <button
            draggable={false}
            onClick={e => { e.stopPropagation(); onQuickAdd(col, colType, dsId) }}
            title={`Criar bloco com "${col}"`}
            className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-opacity"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col transition-all duration-200 ${collapsed ? 'w-10' : 'w-56'} hidden sm:flex`}>
      <div className="flex items-center justify-between px-2 py-2.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {!collapsed && <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Dados</span>}
        <button onClick={() => setCollapsed(c => !c)} className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="px-2 py-2 shrink-0">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar coluna..."
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
          </div>

          <div className="flex-1 overflow-y-auto pb-2 min-h-0">
            {grouped.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-gray-400 mb-3">Nenhum dataset ainda</p>
                <button onClick={onManageDatasets} className="text-xs text-violet-600 hover:text-violet-700 font-semibold">+ Adicionar dados</button>
              </div>
            )}
            {grouped.map(ds => (
              <div key={ds.id} className="mb-0.5">
                {/* Dataset header */}
                <button onClick={() => toggleDataset(ds.id)} className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                  <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform duration-150 ${expandedDatasets.has(ds.id) ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate flex-1 text-left">{ds.name}</span>
                  <span className="text-[9px] text-gray-300 dark:text-gray-600 shrink-0">{ds.totalFiltered}</span>
                </button>

                {expandedDatasets.has(ds.id) && (
                  <div className="pb-1">
                    {TYPE_GROUPS.map(({ key, label, badgeBg }) => {
                      const cols = ds.byType[key] || []
                      if (cols.length === 0) return null
                      const groupKey = `${ds.id}_${key}`
                      const isCollapsed = collapsedGroups.has(groupKey)
                      return (
                        <div key={key}>
                          {/* Type group header */}
                          <button
                            onClick={() => toggleGroup(groupKey)}
                            className="w-full flex items-center gap-1.5 px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                          >
                            <svg className={`w-2.5 h-2.5 text-gray-300 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex-1 text-left">{label}</span>
                            <span className="text-[9px] text-gray-300">{cols.length}</span>
                          </button>
                          {!isCollapsed && cols.map(({ col, colType }) => (
                            <ColItem key={col} col={col} colType={colType} dsId={ds.id} badgeBg={badgeBg} />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-2 shrink-0">
            <button onClick={onManageDatasets} className="w-full flex items-center justify-center gap-1.5 text-[10px] text-violet-600 hover:text-violet-700 font-semibold py-1.5 rounded-lg hover:bg-violet-50 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Gerenciar dados
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const t = useTranslations('dashboardEditor')
  const locale = useLocale()

  const BLOCK_TYPES = BLOCK_TYPE_KEYS.map(key => ({
    type: key,
    label: t(`blockTypes.${key}.label`),
    desc: t(`blockTypes.${key}.desc`),
  }))

  const [report, setReport] = useState(null)
  const [displayReport, setDisplayReport] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('view')
  const [pages, setPages] = useState([])
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState([])
  const [activePageId, setActivePageId] = useState(null)
  // Undo/Redo history for pages state in edit mode
  const [pagesHistory, setPagesHistory] = useState([])
  const [pagesHistoryIndex, setPagesHistoryIndex] = useState(-1)
  const MAX_HISTORY = 20
  const [renamingPageId, setRenamingPageId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [shareData, setShareData] = useState(null)
  const [sharingLoading, setSharingLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareLanguage, setShareLanguage] = useState('pt-BR')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidePanel, setSidePanel] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddBlockDialog, setShowAddBlockDialog] = useState(false)
  const [canvasConfig, setCanvasConfig] = useState({ bgColor: '', sheetBgColor: '' })
  const [globalDateFilter, setGlobalDateFilter] = useState({ dateCol: '', dateFrom: '', dateTo: '' })
  const [filterSummary, setFilterSummary] = useState({})
  const [filterResetTrigger, setFilterResetTrigger] = useState(null)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [showDiagnostico, setShowDiagnostico] = useState(false)
  const [suggestingBlocks, setSuggestingBlocks] = useState(false)
  const [nearLimit, setNearLimit] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState(null) // { col, colType, datasetId }
  const [exportingPDF, setExportingPDF] = useState(false)
  const addMenuRef = useRef()

  function clearDatasetFilters(datasetId) {
    setFilterResetTrigger({ datasetId, ts: Date.now() })
  }

  useEffect(() => {
    Promise.all([api.reports.get(id), api.reports.datasets.list()])
      .then(([r, ds]) => {
        setReport(r); setDatasets(ds)
        const rawPs = (r.pages && r.pages.length > 0) ? r.pages : [{ id: 'page_1', title: '', blocks: r.blocks || [] }]
        // Resolve o placeholder '__onboarding__' para o UUID real do dataset demo do tenant
        const onboardingDs = ds.find(d => d.is_demo)
        const ps = rawPs.map(p => ({
          ...p,
          title: normalizePageTitle(p.title),
          blocks: (p.blocks || []).map(b =>
            b.dataset_id === '__onboarding__' && onboardingDs
              ? { ...b, dataset_id: onboardingDs.id }
              : b
          ),
        }))
        setPages(ps); setActivePageId(ps[0].id)
        if (r.language) setCanvasConfig(prev => ({ ...prev, language: r.language }))
      })
      .catch(err => {
        if (err.message?.toLowerCase().includes('não encontrado') || err.message?.toLowerCase().includes('not found')) {
          router.replace('/dashboards')
        } else {
          console.error(err)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!report) return
    if (locale === 'pt-BR' || mode === 'edit') {
      setDisplayReport(report)
      return
    }
    setTranslating(true)
    buildTranslatedReport(report, locale)
      .then(r => setDisplayReport(r))
      .catch(() => setDisplayReport(report))
      .finally(() => setTranslating(false))
  }, [report, locale])

  useEffect(() => {
    function handleClickOutside(e) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Undo/Redo keyboard handler
  useEffect(() => {
    if (mode !== 'edit') return
    function handleKey(e) {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const ctrl = isMac ? e.metaKey : e.ctrlKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        setPagesHistoryIndex(prev => {
          const nextIdx = prev - 1
          if (nextIdx >= 0 && pagesHistory[nextIdx]) {
            setPages(JSON.parse(JSON.stringify(pagesHistory[nextIdx])))
            return nextIdx
          }
          return prev
        })
      }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        setPagesHistoryIndex(prev => {
          const nextIdx = prev + 1
          if (nextIdx < pagesHistory.length && pagesHistory[nextIdx]) {
            setPages(JSON.parse(JSON.stringify(pagesHistory[nextIdx])))
            return nextIdx
          }
          return prev
        })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode, pagesHistory, pagesHistoryIndex])

  useEffect(() => {
    api.billing.status().then(data => {
      if (!data?.usage || !data?.limits) return
      const near = ['dashboards', 'datasets'].some(k => {
        const limit = data.limits[k]
        return limit > 0 && data.usage[k] / limit >= 0.9
      })
      setNearLimit(near)
    }).catch(() => {})
  }, [])

  const blocks = pages.find(p => p.id === activePageId)?.blocks || []

  function setBlocks(newBlocks) {
    setPages(prev => {
      const next = prev.map(p => p.id === activePageId ? { ...p, blocks: newBlocks } : p)
      // Push to undo history whenever blocks change
      setPagesHistory(h => {
        const trimmed = h.slice(0, pagesHistoryIndex + 1)
        return [...trimmed, JSON.parse(JSON.stringify(next))].slice(-MAX_HISTORY)
      })
      setPagesHistoryIndex(i => Math.min(i + 1, MAX_HISTORY - 1))
      return next
    })
  }

  function handleAutoLayout() {
    if (!blocks.length) return

    const SIZE = {
      filter:  b => b.config?.date_mode ? { w: 4, h: 2 } : { w: 3, h: 4 },
      slider:  () => ({ w: 3, h: 2 }),
      kpi:     () => ({ w: 3, h: 2 }),
      line:    () => ({ w: 6, h: 4 }),
      area:    () => ({ w: 6, h: 4 }),
      bar:     () => ({ w: 6, h: 4 }),
      bar_h:   () => ({ w: 6, h: 4 }),
      scatter: () => ({ w: 6, h: 4 }),
      bubble:  () => ({ w: 6, h: 4 }),
      pie:     () => ({ w: 4, h: 4 }),
      combo:   () => ({ w: 6, h: 4 }),
      treemap: () => ({ w: 6, h: 4 }),
      gauge:   () => ({ w: 3, h: 3 }),
      table:   () => ({ w: 12, h: 5 }),
      text:    () => ({ w: 6, h: 3 }),
      image:   () => ({ w: 4, h: 4 }),
    }

    // Separar em grupos — cada grupo ocupa linhas próprias
    const groups = [
      blocks.filter(b => b.type === 'filter' && b.config?.date_mode),   // date filter (linha própria)
      blocks.filter(b => b.type === 'filter' && !b.config?.date_mode),  // category filters
      blocks.filter(b => b.type === 'slider'),
      blocks.filter(b => b.type === 'kpi'),
      blocks.filter(b => ['line','area','bar','bar_h','scatter','bubble','combo','treemap'].includes(b.type)),
      blocks.filter(b => b.type === 'pie' || b.type === 'gauge'),
      blocks.filter(b => b.type === 'table'),
      blocks.filter(b => b.type === 'text' || b.type === 'image'),
      blocks.filter(b => !SIZE[b.type]),                                 // tipos desconhecidos
    ]

    let curY = 0
    const laid = []

    for (const group of groups) {
      if (!group.length) continue
      let curX = 0, rowH = 0

      // Date filter: ocupa a linha inteira (w=12)
      if (group[0].type === 'filter' && group[0].config?.date_mode && group.length === 1) {
        const { h } = SIZE.filter(group[0])
        laid.push({ ...group[0], layout: { x: 0, y: curY, w: 12, h } })
        curY += h
        continue
      }

      for (const b of group) {
        const { w, h } = SIZE[b.type] ? SIZE[b.type](b) : { w: 6, h: 4 }
        if (curX + w > 12) { curY += rowH; curX = 0; rowH = 0 }
        laid.push({ ...b, layout: { x: curX, y: curY, w, h } })
        curX += w
        rowH = Math.max(rowH, h)
      }
      curY += rowH
    }

    setBlocks(laid)
  }

  // Dataset primário (mais blocos apontam para ele)
  const primaryDatasetId = useMemo(() => {
    const count = {}
    blocks.forEach(b => { if (b.dataset_id) count[b.dataset_id] = (count[b.dataset_id] || 0) + 1 })
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || datasets[0]?.id || null
  }, [blocks, datasets])

  // Colunas do dataset primário que nenhum bloco usa
  const unusedCols = useMemo(() => {
    if (!primaryDatasetId || !datasets.length) return []
    const ds = datasets.find(d => d.id === primaryDatasetId)
    if (!ds?.columns?.length) return []
    const used = new Set(blocks.flatMap(b => [b.label_col, b.value_col, b.filter_col].filter(Boolean)))
    return ds.columns.filter(c => !used.has(c))
  }, [primaryDatasetId, datasets, blocks])

  // Blocos com colunas que não existem mais no dataset
  const brokenBlockIds = useMemo(() => {
    const dsMap = Object.fromEntries(datasets.map(d => [d.id, new Set(d.columns || [])]))
    return new Set(blocks.filter(b => {
      if (!b.dataset_id || b.type === 'filter' || b.type === 'text' || b.type === 'image') return false
      const cols = dsMap[b.dataset_id]
      if (!cols?.size) return false
      if (b.label_col && !cols.has(b.label_col)) return true
      if (b.value_col && !cols.has(b.value_col)) return true
      return false
    }).map(b => b.id))
  }, [datasets, blocks])

  function enterEditMode() {
    if (!report) return
    const rawPs = (report.pages && report.pages.length > 0) ? JSON.parse(JSON.stringify(report.pages)) : [{ id: 'page_1', title: '', blocks: JSON.parse(JSON.stringify(report.blocks || [])) }]
    const ps = rawPs.map(p => ({ ...p, title: normalizePageTitle(p.title) }))
    setPages(ps); setActivePageId(ps[0].id)
    // Reset undo/redo history on enter edit
    setPagesHistory([JSON.parse(JSON.stringify(ps))])
    setPagesHistoryIndex(0)
    setEditTitle(report.title); setEditDescription(report.description || '')
    setSelectedBlockId(null); setSidebarOpen(false); setSidePanel(null); setMode('edit')
  }

  function cancelEdit() { setMode('view'); setSelectedBlockId(null); setSidebarOpen(false); setSidePanel(null) }

  async function loadVersions() {
    try {
      const data = await api.fetch(`/reports/${id}/versions`)
      setVersions(data || [])
      setShowVersions(true)
    } catch (err) { console.error(err) }
  }

  async function saveVersion() {
    try {
      await api.fetch(`/reports/${id}/versions`, { method: 'POST' })
    } catch (err) { console.error(err) }
  }

  async function restoreVersion(versionId) {
    if (!confirm('Restaurar esta versão? As mudanças atuais serão perdidas.')) return
    try {
      await api.fetch(`/reports/${id}/versions/${versionId}/restore`, { method: 'POST' })
      const r = await api.reports.get(id)
      setReport(r)
      const rawPs = (r.pages && r.pages.length > 0) ? r.pages : [{ id: 'page_1', title: '', blocks: r.blocks || [] }]
      const ps = rawPs.map(p => ({ ...p, title: normalizePageTitle(p.title) }))
      setPages(ps)
      setShowVersions(false)
    } catch (err) { console.error(err) }
  }

  function addPage() {
    const newId = `page_${Date.now()}`
    setPages(prev => [...prev, { id: newId, title: '', blocks: [] }])
    setActivePageId(newId); setSelectedBlockId(null)
  }

  function removePage(pageId) {
    if (pages.length <= 1) return
    const idx = pages.findIndex(p => p.id === pageId)
    const newPages = pages.filter(p => p.id !== pageId)
    setPages(newPages)
    if (activePageId === pageId) setActivePageId(newPages[Math.max(0, idx - 1)].id)
    setSelectedBlockId(null)
  }

  function renamePage(pageId, title) {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title } : p))
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  function sanitizeBlocks(blocks) {
    return blocks.map(b => ({
      ...b,
      id: UUID_RE.test(b.id) ? b.id : crypto.randomUUID(),
      dataset_id: UUID_RE.test(b.dataset_id) ? b.dataset_id : null,
    }))
  }

  async function aiImproveBlock(blockId) {
    const block = blocks.find(b => b.id === blockId)
    if (!block?.dataset_id) return
    try {
      const result = await api.reports.aiQuery(block.dataset_id, block.title || 'melhore este gráfico')
      setBlocks(blocks.map(b => b.id === blockId ? {
        ...b,
        type: result.suggested_chart_type || b.type,
        label_col: result.query?.label_col || b.label_col,
        value_col: result.query?.value_col || b.value_col,
        agg: result.query?.agg || b.agg,
      } : b))
    } catch (e) { console.error('[aiImproveBlock]', e) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const cleanPages = pages.map(p => ({ ...p, blocks: sanitizeBlocks(p.blocks || []) }))
      const updated = await api.reports.update(id, { title: editTitle, description: editDescription || null, blocks: cleanPages[0]?.blocks || [], pages: cleanPages, language: canvasConfig.language || 'pt-BR' })
      await saveVersion()
      setReport(updated); setMode('view')
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    try { await api.reports.delete(id); router.push('/dashboards') }
    catch (err) { console.error(err) }
  }

  async function handleShare() {
    setSharingLoading(true)
    try {
      const data = await api.reports.share(id)
      const url = `${window.location.origin}/r/${data.token}`
      setShareData({ ...data, share_url: url })
      setShareLanguage(canvasConfig.language || 'pt-BR')
    } catch (err) { console.error(err) }
    finally { setSharingLoading(false) }
  }

  function addBlock(type) {
    const block = newBlock(type, BLOCK_TYPES)
    const bottomY = blocks.reduce((m, b) => Math.max(m, (b.layout?.y ?? 0) + (b.layout?.h ?? 2)), 0)
    const placed = { ...block, layout: { ...block.layout, y: bottomY } }
    setBlocks([...blocks, placed])
    setSelectedBlockId(placed.id)
    setSidePanel('config'); setSidebarOpen(true)
  }

  function addBlockObject(block) {
    const bottomY = blocks.reduce((m, b) => Math.max(m, (b.layout?.y ?? 0) + (b.layout?.h ?? 2)), 0)
    const placed = block.layout?.y != null ? block : { ...block, layout: { ...block.layout, x: 0, y: bottomY } }
    setBlocks([...blocks, placed])
    setSelectedBlockId(placed.id)
    setSidePanel('config'); setSidebarOpen(true)
  }

  function exportInsightsToDashboard(text) {
    const block = {
      id: crypto.randomUUID(),
      type: 'text',
      title: 'Análise',
      dataset_id: null,
      config: { text: text, is_ai_insight: true },
      layout: { x: 0, y: Infinity, w: 12, h: 3 },
    }
    setBlocks([...blocks, block])
    setShowDiagnostico(false)
  }

  function addMultipleBlocks(newBlocks) {
    if (!newBlocks?.length) return
    // Ordem: filtros → KPIs → gráficos
    const filters = newBlocks.filter(b => b.type === 'filter' || b.type === 'slider')
    const kpis = newBlocks.filter(b => b.type === 'kpi')
    const charts = newBlocks.filter(b => b.type !== 'kpi' && b.type !== 'filter' && b.type !== 'slider')
    const ordered = [...filters, ...kpis, ...charts]
    // Começa a partir do final do layout existente para não sobrepor blocos
    const startY = blocks.reduce((m, b) => Math.max(m, (b.layout?.y ?? 0) + (b.layout?.h ?? 2)), 0)
    let curX = 0, curY = startY, rowH = 0
    const withLayout = ordered.map((b) => {
      const isKpi = b.type === 'kpi'
      // Usa sugestão de tamanho da IA se disponível, senão aplica padrão por tipo
      const w = b.layout?.w || (isKpi ? 3 : 6)
      const h = b.layout?.h || (isKpi ? 2 : 4)
      if (curX + w > 12) { curY += rowH; curX = 0; rowH = 0 }
      const layout = { x: curX, y: curY, w, h }
      curX += w
      rowH = Math.max(rowH, h)
      return { id: b.id || crypto.randomUUID(), ...b, layout }
    })
    setBlocks([...blocks, ...withLayout])
    setSelectedBlockId(withLayout[0]?.id || null)
  }

  async function handleSuggestBlocks() {
    if (!report?.id || !primaryDatasetId || suggestingBlocks) return
    setSuggestingBlocks(true)
    try {
      const result = await api.reports.suggestBlocks(report.id, primaryDatasetId)
      if (result.blocks?.length) {
        addMultipleBlocks(result.blocks)
      } else {
        alert(result.message || 'Nenhuma sugestão disponível.')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSuggestingBlocks(false)
    }
  }

  async function exportPDF() {
    const canvas = document.querySelector('.report-canvas')
    if (!canvas) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    setExportingPDF(true)
    try {
      const canvasEl = await html2canvas(canvas, {
        scale: 1.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: canvas.scrollWidth,
        windowHeight: canvas.scrollHeight,
      })
      const imgData = canvasEl.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvasEl.width > canvasEl.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvasEl.width / 1.5, canvasEl.height / 1.5],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvasEl.width / 1.5, canvasEl.height / 1.5)
      pdf.save(`${(displayReport ?? report)?.title || 'dashboard'}.pdf`)
    } finally {
      setExportingPDF(false)
    }
  }

  function updateActiveBlock(updated) {
    setBlocks(blocks.map(b => b.id === updated.id ? updated : b))
  }

  function togglePanel(panel) {
    if (sidePanel === panel && sidebarOpen) { setSidebarOpen(false); setSidePanel(null) }
    else { setSidePanel(panel); setSidebarOpen(true) }
  }

  const activeBlock = blocks.find(b => b.id === selectedBlockId)

  // Binding Mode: ativo quando painel "dados" está aberto
  const bindingMode = sidePanel === 'dados' && sidebarOpen

  // Filter Targeting Mode: ativo quando bloco filtro/slider está selecionado
  const isFilterBlock = activeBlock && ['filter', 'slider'].includes(activeBlock.type)
  const filterTargetMode = !!(isFilterBlock && selectedBlockId)

  function handleAssignColumn(col, type, granularity, datasetId) {
    if (!selectedBlockId) return
    const block = blocks.find(b => b.id === selectedBlockId)
    if (!block) return
    let patch = {}
    if (type === 'number') {
      patch = { value_col: col }
    } else if (type === 'date') {
      patch = {
        label_col: col,
        config: { ...(block.config || {}), dim_type: 'date', granularity: granularity || 'month' },
      }
    } else {
      patch = {
        label_col: col,
        config: { ...(block.config || {}), dim_type: 'text', granularity: null },
      }
    }
    if (datasetId && (!block.dataset_id || block.dataset_id === '__onboarding__')) patch.dataset_id = datasetId
    updateActiveBlock({ ...block, ...patch })
  }

  function handleDropColumn(blockId, slot, { col, colType, datasetId }) {
    // Caso especial: arrastar para canvas vazio → cria bloco automaticamente
    if (blockId === '__create__') {
      const suggestedType = colType === 'number' ? 'kpi' : colType === 'date' ? 'line' : 'table'
      const newB = newBlock(suggestedType, BLOCK_TYPES)
      const patch = {
        dataset_id: datasetId,
        ...(colType === 'number' ? { value_col: col } : { label_col: col }),
        ...(colType === 'date' ? { config: { dim_type: 'date', granularity: 'month' } } : {}),
      }
      setBlocks([...blocks, { ...newB, ...patch }])
      setSelectedBlockId(newB.id)
      setDraggedColumn(null)
      return
    }
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    let patch = {}
    if (slot === 'value_col') {
      patch.value_col = col
    } else {
      patch.label_col = col
      patch.config = {
        ...(block.config || {}),
        dim_type: colType === 'date' ? 'date' : 'text',
        granularity: colType === 'date' ? 'month' : null,
      }
    }
    if (datasetId && (!block.dataset_id || block.dataset_id === '__onboarding__')) patch.dataset_id = datasetId
    setSelectedBlockId(blockId)
    updateActiveBlock({ ...block, ...patch })
    setDraggedColumn(null)
  }

  function toggleFilterTarget(filterBlockId, targetBlockId) {
    const fb = blocks.find(b => b.id === filterBlockId)
    if (!fb) return
    const targets = fb.config?.target_block_ids
    let newTargets
    if (targets == null) {
      const allDataIds = blocks
        .filter(b => !['filter', 'slider'].includes(b.type) && b.id !== filterBlockId)
        .map(b => b.id)
        .filter(id => id !== targetBlockId)
      newTargets = allDataIds
    } else if (targets.includes(targetBlockId)) {
      newTargets = targets.filter(id => id !== targetBlockId)
    } else {
      newTargets = [...targets, targetBlockId]
    }
    setBlocks(blocks.map(b => b.id === filterBlockId
      ? { ...b, config: { ...(b.config || {}), target_block_ids: newTargets } }
      : b
    ))
  }

  if (loading) return <AppLayout><div className="p-8 text-center text-gray-400">{t('loading')}</div></AppLayout>
  if (!report) return <AppLayout><div className="p-8 text-center text-red-500">{t('notFound')}</div></AppLayout>

  // EDIT MODE
  if (mode === 'edit') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#f5f5f7] dark:bg-gray-950">
        {canvasConfig?.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: canvasConfig.custom_css }} />
        )}
        {/* Editor top bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200/80 dark:border-gray-700 px-4 h-12 flex items-center gap-2 shrink-0 shadow-sm">
          {/* Left: back + title + add */}
          <button onClick={cancelEdit} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors pr-2 border-r border-gray-200 dark:border-gray-600 mr-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 5l-7 7 7 7" /></svg>
            <span className="hidden sm:inline font-medium">{t('backEdit')}</span>
          </button>

          <button onClick={() => router.push('/dashboards/novo')} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 9h16M4 13h10" /></svg>
            <span className="hidden sm:inline">{t('templates')}</span>
          </button>

          <button
            onClick={() => datasets.length > 0 ? setShowAddBlockDialog(true) : setShowAddMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16M4 12h16" /></svg>
            {t('addItem')}
          </button>

          {/* Gerar dashboard com IA */}
          {datasets.length > 0 && (
            <button
              onClick={() => setShowAiPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 hover:border-violet-300 transition-colors"
              title="Gerar dashboard automaticamente"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span className="hidden sm:inline">Gerar Dashboard</span>
            </button>
          )}

          {/* Análise IA */}
          {blocks.length > 0 && (
            <button
              onClick={() => setShowDiagnostico(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 hover:border-violet-300 transition-colors"
              title="Análise do dashboard"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span className="hidden sm:inline">Análise</span>
            </button>
          )}

          {/* Undo / Redo buttons */}
          <button
            title="Desfazer (Ctrl+Z)"
            onClick={() => {
              const nextIdx = pagesHistoryIndex - 1
              if (nextIdx >= 0 && pagesHistory[nextIdx]) {
                setPages(JSON.parse(JSON.stringify(pagesHistory[nextIdx])))
                setPagesHistoryIndex(nextIdx)
              }
            }}
            disabled={pagesHistoryIndex <= 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          <button
            title="Refazer (Ctrl+Y)"
            onClick={() => {
              const nextIdx = pagesHistoryIndex + 1
              if (nextIdx < pagesHistory.length && pagesHistory[nextIdx]) {
                setPages(JSON.parse(JSON.stringify(pagesHistory[nextIdx])))
                setPagesHistoryIndex(nextIdx)
              }
            }}
            disabled={pagesHistoryIndex >= pagesHistory.length - 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
          </button>

          <button
            onClick={loadVersions}
            title="Histórico de versões"
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-gray-200 hover:border-violet-300"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="hidden sm:inline">Versões</span>
          </button>

          {/* Dashboard title in center */}
          <div className="flex-1 flex justify-center min-w-0 px-4">
            <input
              className="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-transparent outline-none border-b-2 border-transparent focus:border-violet-400 text-center max-w-xs truncate transition-colors"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              title={editTitle}
            />
          </div>

          {/* Right: date filter → opens filters panel + share + cancel + save */}
          <button
            onClick={() => togglePanel('filtros')}
            title={t('titleFilters')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'filtros' && sidebarOpen || globalDateFilter.dateFrom || globalDateFilter.dateTo ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
          </button>

          <button onClick={handleShare} disabled={sharingLoading} title={t('titleShare')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

          <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {t('cancel')}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm shadow-violet-200">
            {saving ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            )}
            {saving ? t('saving') : t('save')}
          </button>
        </div>

        {/* Barra de status do filtro de data ativo */}
        {(globalDateFilter.dateFrom || globalDateFilter.dateTo) && (
          <div className="bg-violet-50 border-b border-violet-100 px-4 py-1.5 flex items-center gap-2 shrink-0">
            <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
            <span className="text-[11px] text-violet-700 font-medium flex-1">
              {t('dateFilterActive')} {globalDateFilter.dateFrom && <b>{globalDateFilter.dateFrom}</b>} {globalDateFilter.dateTo && <> {t('dateTo')} <b>{globalDateFilter.dateTo}</b></>}
            </span>
            <button onClick={() => setGlobalDateFilter(f => ({ ...f, dateFrom: '', dateTo: '' }))} className="text-[10px] text-violet-500 hover:text-violet-700 font-semibold shrink-0">{t('clear')}</button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden relative">

          <div className="flex-1 overflow-auto p-3 sm:p-6 min-w-0" style={{ backgroundColor: canvasConfig.bgColor || '#f3f4f6' }} onClick={() => setSelectedBlockId(null)}>
            <div className="flex items-center gap-1 mb-4 flex-wrap" onClick={e => e.stopPropagation()}>
              {pages.map((page, pageIdx) => (
                <div key={page.id} className={`group flex items-center gap-1 rounded-lg border transition-colors ${activePageId === page.id ? 'bg-white dark:bg-gray-700 border-violet-300 shadow-sm' : 'bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}>
                  {renamingPageId === page.id ? (
                    <input autoFocus className="text-xs font-medium px-2 py-1.5 bg-transparent outline-none w-24" placeholder={t('pageName', { n: pageIdx + 1 })} value={page.title} onChange={e => renamePage(page.id, e.target.value)} onBlur={() => setRenamingPageId(null)} onKeyDown={e => e.key === 'Enter' && setRenamingPageId(null)} />
                  ) : (
                    <button className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${activePageId === page.id ? 'text-violet-700 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`} onClick={() => { setActivePageId(page.id); setSelectedBlockId(null) }} onDoubleClick={() => setRenamingPageId(page.id)}>
                      {page.title || t('pageName', { n: pageIdx + 1 })}
                    </button>
                  )}
                  {pages.length > 1 && <button onClick={() => removePage(page.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-500 hover:text-red-400 pr-1 text-xs">×</button>}
                </div>
              ))}
              <button onClick={addPage} className="flex items-center justify-center w-7 h-7 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-violet-400 hover:text-violet-500 transition-colors text-sm">+</button>
            </div>



            {/* Banner: blocos com colunas inválidas */}
            {brokenBlockIds.size > 0 && (
              <div className="mb-3 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-red-700 flex-1">
                  <b>{brokenBlockIds.size}</b> bloco{brokenBlockIds.size > 1 ? 's' : ''} com colunas que não existem no dataset. Reconfigure-{brokenBlockIds.size > 1 ? 'os' : 'o'} ou regenere o dashboard.
                </span>
              </div>
            )}

            <ReportBuilder blocks={blocks} onChange={setBlocks} readOnly={false} selectedBlockId={selectedBlockId} onSelectBlock={id => setSelectedBlockId(id)} onBlockAction={(id, action) => { setSelectedBlockId(id); setSidePanel(action); setSidebarOpen(true) }} datasets={datasets} sheetConfig={{ bgColor: canvasConfig.sheetBgColor }} globalDateFilter={globalDateFilter} onGlobalDateFilterChange={setGlobalDateFilter} bindingMode={bindingMode} filterTargetMode={filterTargetMode} filterBlockId={filterTargetMode ? selectedBlockId : null} onToggleFilterTarget={toggleFilterTarget} draggedColumn={draggedColumn} onDropColumn={handleDropColumn} onFiltersChange={setFilterSummary} filterResetTrigger={filterResetTrigger} onAiImprove={aiImproveBlock} />
          </div>

          {/* Backdrop mobile para o sidebar */}
          {sidebarOpen && sidePanel && (
            <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <aside className={`
            fixed inset-y-0 right-0 w-[280px] z-50
            sm:static sm:inset-auto sm:z-auto
            ${sidebarOpen && sidePanel ? 'translate-x-0 sm:w-72' : 'translate-x-full sm:w-0'}
            bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800
            flex flex-col shrink-0 overflow-hidden
            transition-transform sm:transition-[width] duration-200`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">
                {sidePanel === 'dados' ? t('sidePanel.dados') :
                 sidePanel === 'filtros' ? t('sidePanel.filtros') :
                 sidePanel === 'comentarios' ? t('sidePanel.comentarios') :
                 sidePanel === 'config' && activeBlock ? t('sidePanel.config') :
                 t('sidePanel.settings')}
              </span>
              <button onClick={() => { setSidebarOpen(false); setSidePanel(null) }} className="text-gray-400 hover:text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sidePanel === 'dados' && <ColumnsPanel datasets={datasets} selectedBlockId={selectedBlockId} onAssignColumn={handleAssignColumn} onDatasetsChange={setDatasets} onColumnDragStart={(col, colType, datasetId) => setDraggedColumn({ col, colType, datasetId })} onColumnDragEnd={() => setDraggedColumn(null)} onAddPreset={addMultipleBlocks} />}
              {sidePanel === 'config' && (activeBlock
                ? <BlockConfigPanel block={activeBlock} onChange={updateActiveBlock} datasets={datasets} />
                : <CanvasConfigPanel config={canvasConfig} onChange={setCanvasConfig} />
              )}
              {sidePanel === 'filtros' && (
                <FiltersPanel
                  blocks={blocks}
                  datasets={datasets}
                  globalDateFilter={globalDateFilter}
                  onGlobalDateFilterChange={setGlobalDateFilter}
                  filterSummary={filterSummary}
                  onClearDatasetFilters={clearDatasetFilters}
                />
              )}
              {sidePanel === 'comentarios' && (
                <CommentsPanel blocks={blocks} onBlocksChange={setBlocks} />
              )}
            </div>
          </aside>

          <DashboardRail
            blocks={blocks}
            globalDateFilter={globalDateFilter}
            sidePanel={sidePanel}
            sidebarOpen={sidebarOpen}
            selectedBlockId={selectedBlockId}
            togglePanel={togglePanel}
            setSidebarOpen={setSidebarOpen}
            setSidePanel={setSidePanel}
            setShowAiPanel={setShowAiPanel}
            onAutoLayout={handleAutoLayout}
          />
        </div>
        {showAiPanel && <AiPanel datasets={datasets} blocks={blocks} onClose={() => setShowAiPanel(false)} onAddBlock={addBlockObject} onAddBlocks={addMultipleBlocks} onSetDateCol={(col) => setGlobalDateFilter(f => ({ ...f, dateCol: col }))} onShowDateFilter={setShowDateFilter} />}
        {showDiagnostico && <DiagnosticoPanel reportId={report.id} datasets={datasets} onClose={() => setShowDiagnostico(false)} onAddBlock={addBlockObject} onExportInsights={exportInsightsToDashboard} />}
        {showAddBlockDialog && <AddBlockDialog datasets={datasets} onClose={() => setShowAddBlockDialog(false)} onAddBlock={addBlockObject} />}

        {showVersions && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1" onClick={() => setShowVersions(false)} />
            <div className="w-80 bg-white shadow-2xl border-l flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Histórico de versões</h2>
                <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {versions.length === 0 && <p className="text-sm text-gray-400 text-center mt-8">Nenhuma versão salva ainda.<br/>Edite e salve para criar snapshots.</p>}
                {versions.map(v => (
                  <div key={v.id} className="border rounded-lg p-3 hover:border-purple-300 transition-colors">
                    <p className="text-sm font-medium text-gray-800">{v.label || v.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(v.created_at).toLocaleString('pt-BR')}</p>
                    <button
                      onClick={() => restoreVersion(v.id)}
                      className="mt-2 text-xs text-purple-600 hover:underline"
                    >
                      Restaurar esta versão →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // VIEW MODE
  return (
    <AppLayout>
      {canvasConfig?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: canvasConfig.custom_css }} />
      )}
      {nearLimit && (
        <div className="px-6 py-2.5 text-sm font-medium flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border-b border-amber-100 relative">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Você está próximo do limite do seu plano.</span>
          <a href="/configuracoes/planos" className="underline font-bold whitespace-nowrap">Ver planos</a>
          <button onClick={() => setNearLimit(false)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:opacity-60 transition-opacity" aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <div className="p-3 sm:p-6 max-w-screen-xl mx-auto">
        <div className="flex items-start justify-between mb-4 sm:mb-6 gap-3 flex-wrap">
          <div className="min-w-0">
            <button onClick={() => router.push('/dashboards')} className="text-sm text-gray-400 hover:text-gray-700 mb-2 block">← {t('back')}</button>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 truncate">{(displayReport ?? report).title}</h1>
            {(displayReport ?? report).description && <p className="text-sm text-gray-500 mt-1">{(displayReport ?? report).description}</p>}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={exportPDF}
              disabled={exportingPDF}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl hover:border-gray-300 transition-colors disabled:opacity-50"
              title="Exportar como PDF"
            >
              {exportingPDF ? (
                <span className="text-xs text-gray-500">Gerando...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>PDF</span>
                </>
              )}
            </button>
            <button onClick={enterEditMode} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">{t('edit')}</button>
            <button onClick={() => setShowAiPanel(true)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl hover:border-gray-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              {t('ask')}
            </button>
            {blocks.length > 0 && (
              <button onClick={() => setShowDiagnostico(true)} className="flex items-center gap-1.5 px-3 py-2 border border-violet-200 bg-violet-50 text-violet-700 text-sm rounded-xl hover:bg-violet-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Análise
              </button>
            )}
            <button onClick={handleShare} disabled={sharingLoading} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl hover:border-gray-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              {sharingLoading ? t('sharing') : t('share')}
            </button>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="px-3 py-2 text-sm text-red-500 hover:text-red-700 transition-colors">{t('delete')}</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">{t('confirm')}</span>
                <button onClick={handleDelete} className="text-sm text-red-600 font-semibold">{t('yes')}</button>
                <button onClick={() => setDeleteConfirm(false)} className="text-sm text-gray-400">{t('no')}</button>
              </div>
            )}
          </div>
        </div>

        {shareData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-medium shrink-0">{t('shareLinkLang')}</span>
              {SHARE_LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setShareLanguage(l.code)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${shareLanguage === l.code ? 'bg-violet-100 text-violet-700 font-semibold' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <span>{l.flag}</span>
                  <span className="hidden sm:inline">{l.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input readOnly value={`${shareData.share_url}?lang=${shareLanguage}`} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 focus:outline-none font-mono text-gray-600 dark:text-gray-300" />
              <button
                onClick={async () => { await navigator.clipboard.writeText(`${shareData.share_url}?lang=${shareLanguage}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors shrink-0"
              >
                {copied ? t('copied') : t('copyLink')}
              </button>
            </div>
          </div>
        )}


        {translating && (
          <div className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {t('translating')}
          </div>
        )}

        {((displayReport ?? report).pages || pages).length > 1 && (
          <div className="flex items-center gap-1 mb-4 flex-wrap border-b border-gray-100 dark:border-gray-700 pb-3">
            {((displayReport ?? report).pages || pages).map((page, pageIdx) => (
              <button key={page.id} onClick={() => setActivePageId(page.id)} className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${activePageId === page.id ? 'bg-violet-600 text-white font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {page.title || t('pageName', { n: pageIdx + 1 })}
              </button>
            ))}
          </div>
        )}

        <ReportBuilder blocks={((displayReport ?? report).pages || pages).find(p => p.id === activePageId)?.blocks || (displayReport ?? report).blocks || []} readOnly={true} datasets={datasets} globalDateFilter={globalDateFilter} onGlobalDateFilterChange={setGlobalDateFilter} />
      </div>
      {showAiPanel && <AiPanel datasets={datasets} blocks={blocks} onClose={() => setShowAiPanel(false)} onSetDateCol={(col) => setGlobalDateFilter(f => ({ ...f, dateCol: col }))} />}
      {showDiagnostico && <DiagnosticoPanel reportId={report.id} onClose={() => setShowDiagnostico(false)} />}
    </AppLayout>
  )
}
