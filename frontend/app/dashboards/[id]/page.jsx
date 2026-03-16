'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { BlockConfigPanel, DatasetPanel, CanvasConfigPanel } from '@/components/ReportBuilder'
import DashboardRail from '@/components/DashboardRail'

const ReportBuilder = dynamic(() => import('@/components/ReportBuilder'), { ssr: false })

const BLOCK_TYPES = [
  { type: 'kpi',         label: 'KPI',          desc: 'Número em destaque' },
  { type: 'bar',         label: 'Barras',        desc: 'Comparar categorias' },
  { type: 'bar_h',       label: 'Barras H',      desc: 'Barras horizontais' },
  { type: 'area',        label: 'Área',          desc: 'Evolução acumulada' },
  { type: 'line',        label: 'Linhas',        desc: 'Evolução no tempo' },
  { type: 'pie',         label: 'Pizza',         desc: 'Distribuição %' },
  { type: 'combo',       label: 'Combo',         desc: 'Barra + linha' },
  { type: 'gauge',       label: 'Gauge',         desc: 'Indicador circular' },
  { type: 'speedometer', label: 'Velocímetro',   desc: 'Indicador semicircular' },
  { type: 'treemap',     label: 'Treemap',       desc: 'Hierarquia por área' },
  { type: 'bubble',      label: 'Bolhas',        desc: 'Dispersão por volume' },
  { type: 'scatter',     label: 'Dispersão',     desc: 'Correlação XY' },
  { type: 'table',       label: 'Tabela',        desc: 'Dados em linhas' },
  { type: 'text',        label: 'Texto',         desc: 'Comentários' },
  { type: 'filter',      label: 'Filtro',        desc: 'Filtrar dados' },
  { type: 'slider',      label: 'Slider',        desc: 'Filtro por faixa' },
  { type: 'image',       label: 'Imagem',        desc: 'Foto ou logo' },
]

let counter = 0
function newBlock(type) {
  const isFilter = type === 'filter' || type === 'slider'
  const isNoData = isFilter || type === 'text' || type === 'image'
  const isGauge = type === 'gauge' || type === 'speedometer'
  const col = isFilter ? (counter % 6) * 2 : (counter % 4) * 3
  const w = isFilter ? 2 : isGauge ? 3 : 3
  const h = isFilter ? 2 : isGauge ? 4 : 2
  return {
    id: crypto.randomUUID(),
    type,
    title: BLOCK_TYPES.find(b => b.type === type)?.label || type,
    dataset_id: null,
    ...(type === 'filter' ? { filter_col: null, filter_label: '' } : isNoData ? {} : { label_col: null, value_col: null, agg: 'sum' }),
    config: {},
    layout: { x: col, y: Infinity, w, h },
  }
}

function AiPanel({ datasets, blocks, onClose, onAddBlock }) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id || '')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const historyRef = useRef(null)

  const selectedDs = datasets.find(d => d.id === datasetId)
  const numCols = Object.entries(selectedDs?.column_types || {}).filter(([, t]) => t === 'number').map(([c]) => c)
  const dimCols = Object.entries(selectedDs?.column_types || {}).filter(([, t]) => t !== 'number').map(([c]) => c)

  const SUGGESTIONS = [
    numCols[0] && `Qual é a soma de ${numCols[0]}?`,
    dimCols[0] && numCols[0] && `Qual ${dimCols[0]} tem maior ${numCols[0]}?`,
    numCols[0] && `Mostre a tendência de ${numCols[0]} ao longo do tempo`,
    `Quais são as principais categorias?`,
    `Há alguma anomalia nos dados?`,
  ].filter(Boolean).slice(0, 4)

  async function ask(q) {
    const qText = q || question.trim()
    if (!datasetId || !qText) return
    setLoading(true); setError(null)
    const entry = { id: crypto.randomUUID(), question: qText, answer: null, error: null, ts: new Date().toISOString() }
    setHistory(h => [entry, ...h])
    if (!q) setQuestion('')
    try {
      const result = await api.reports.aiQuery(datasetId, qText)
      setHistory(h => h.map(e => e.id === entry.id ? { ...e, answer: result.answer } : e))
    } catch (e) {
      setHistory(h => h.map(e => e.id === entry.id ? { ...e, error: e.message } : e))
      setError(e.message)
    } finally { setLoading(false) }
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            IA — Exploração de dados
          </span>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={() => setHistory([])} className="text-[10px] text-gray-400 hover:text-gray-600 font-medium">Limpar</button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" ref={historyRef}>
          {datasets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">Nenhum dataset disponível. Adicione dados primeiro.</p>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-4">
              {/* Dataset selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Dataset</label>
                <select value={datasetId} onChange={e => setDatasetId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.row_count} linhas)</option>)}
                </select>
                {selectedDs && (
                  <p className="text-[10px] text-gray-400 mt-1">{selectedDs.columns?.length} colunas: {selectedDs.columns?.slice(0,5).join(', ')}{(selectedDs.columns?.length || 0) > 5 ? '...' : ''}</p>
                )}
              </div>

              {/* Sugestões */}
              {SUGGESTIONS.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sugestões</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
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
                  placeholder="Faça uma pergunta sobre os dados..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  autoFocus
                  disabled={loading}
                />
                <button onClick={() => ask()} disabled={loading || !datasetId || !question.trim()} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors shrink-0">
                  {loading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : 'Enviar'}
                </button>
              </div>

              {/* Histórico */}
              {history.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Histórico</p>
                  {history.map(entry => (
                    <div key={entry.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-700 flex-1">{entry.question}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{fmtDate(entry.ts)}</span>
                      </div>
                      {entry.answer ? (
                        <div className="bg-violet-50 px-3 py-2.5">
                          <p className="text-sm text-violet-900 leading-relaxed">{entry.answer}</p>
                        </div>
                      ) : entry.error ? (
                        <div className="bg-red-50 px-3 py-2.5">
                          <p className="text-xs text-red-600">{entry.error}</p>
                        </div>
                      ) : (
                        <div className="bg-violet-50 px-3 py-2.5 flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          <span className="text-xs text-violet-400">Analisando...</span>
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

function FiltersPanel({ blocks, datasets, globalDateFilter, onGlobalDateFilterChange }) {
  const filterBlocks = blocks.filter(b => b.type === 'filter' || b.type === 'slider')
  const hasDateFilter = !!(globalDateFilter.dateFrom || globalDateFilter.dateTo)
  const dateColOptions = [...new Set(datasets.flatMap(ds =>
    Object.entries(ds.column_types || {}).filter(([, t]) => t === 'date').map(([c]) => c)
  ))].sort()

  // Chips de filtros ativos
  const activeChips = []
  if (hasDateFilter) {
    const label = [globalDateFilter.dateFrom, globalDateFilter.dateTo].filter(Boolean).join(' → ')
    activeChips.push({ key: 'date', label: `📅 ${label}`, onRemove: () => onGlobalDateFilterChange({ ...globalDateFilter, dateFrom: '', dateTo: '' }) })
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtros do dashboard</p>

      {/* Chips de filtros ativos */}
      {activeChips.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ativos</p>
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map(chip => (
              <span key={chip.key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded-full font-medium">
                {chip.label}
                <button onClick={chip.onRemove} className="text-violet-400 hover:text-violet-700 ml-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
            <button onClick={() => onGlobalDateFilterChange({ dateCol: globalDateFilter.dateCol, dateFrom: '', dateTo: '' })}
              className="text-[10px] text-red-400 hover:text-red-600 font-medium px-2 py-1">
              Limpar todos
            </button>
          </div>
        </div>
      )}

      {/* Filtro de data global */}
      <div className={`rounded-xl border p-3 space-y-2.5 ${hasDateFilter ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
            Filtro de data
          </span>
          {hasDateFilter && (
            <button onClick={() => onGlobalDateFilterChange({ dateCol: globalDateFilter.dateCol, dateFrom: '', dateTo: '' })} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Limpar</button>
          )}
        </div>
        <select
          value={globalDateFilter.dateCol || ''}
          onChange={e => onGlobalDateFilterChange({ ...globalDateFilter, dateCol: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          <option value="">Coluna de data...</option>
          {dateColOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={globalDateFilter.dateFrom || ''} onChange={e => onGlobalDateFilterChange({ ...globalDateFilter, dateFrom: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
          <span className="text-xs text-gray-400 self-center">até</span>
          <input type="date" value={globalDateFilter.dateTo || ''} onChange={e => onGlobalDateFilterChange({ ...globalDateFilter, dateTo: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { l: 'Hoje', fn: () => { const t = new Date().toISOString().slice(0,10); return { dateFrom: t, dateTo: t } } },
            { l: '7d', fn: () => { const t = new Date(); const f = new Date(t); f.setDate(f.getDate()-6); return { dateFrom: f.toISOString().slice(0,10), dateTo: t.toISOString().slice(0,10) } } },
            { l: '30d', fn: () => { const t = new Date(); const f = new Date(t); f.setDate(f.getDate()-29); return { dateFrom: f.toISOString().slice(0,10), dateTo: t.toISOString().slice(0,10) } } },
            { l: 'Mês', fn: () => { const t = new Date(); return { dateFrom: `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`, dateTo: t.toISOString().slice(0,10) } } },
            { l: 'Ano', fn: () => { const t = new Date(); return { dateFrom: `${t.getFullYear()}-01-01`, dateTo: t.toISOString().slice(0,10) } } },
          ].map(p => (
            <button key={p.l} onClick={() => onGlobalDateFilterChange({ ...globalDateFilter, ...p.fn() })} className="px-2 py-1 text-[10px] font-medium rounded-lg border border-gray-200 bg-white hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">{p.l}</button>
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
              <span className="text-xs text-gray-700 font-medium">Comparar com período anterior</span>
            </label>
            {globalDateFilter.comparePrevious && (
              <p className="text-[10px] text-violet-600">Blocos KPI com "delta automático" mostrarão variação em relação ao período equivalente anterior.</p>
            )}
          </div>
        )}
      </div>

      {/* Blocos de filtro */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Blocos de filtro ({filterBlocks.length})</p>
        {filterBlocks.length === 0 ? (
          <div className="text-center py-6">
            <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
            <p className="text-xs text-gray-400">Adicione blocos do tipo "Filtro" ou "Slider" ao dashboard</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filterBlocks.map(block => {
              const ds = datasets.find(d => d.id === block.dataset_id)
              return (
                <div key={block.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 truncate flex-1">{block.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2 shrink-0 ${block.type === 'slider' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>{block.type === 'slider' ? 'SLIDER' : 'FILTRO'}</span>
                  </div>
                  {block.filter_col && <p className="text-[10px] text-gray-400">Coluna: <span className="font-mono">{block.filter_col}</span></p>}
                  {ds && <p className="text-[10px] text-gray-400">Dataset: {ds.name}</p>}
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
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comentários e notas</p>

      {/* Add comment form */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
        <select
          value={targetBlockId || dataBlocks[0]?.id || ''}
          onChange={e => setTargetBlockId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          <option value="">Selecione um bloco...</option>
          {dataBlocks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && addComment()}
          placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white resize-none"
        />
        <button
          onClick={addComment}
          disabled={!text.trim()}
          className="w-full py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          Adicionar nota
        </button>
      </div>

      {/* Comments list */}
      {allAnnotations.length === 0 ? (
        <div className="text-center py-6">
          <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>
          <p className="text-xs text-gray-400">Nenhuma nota ainda. Adicione comentários aos blocos.</p>
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
                  title="Remover nota"
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

export default function DashboardDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('view')
  const [pages, setPages] = useState([])
  const [activePageId, setActivePageId] = useState(null)
  const [renamingPageId, setRenamingPageId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [shareData, setShareData] = useState(null)
  const [sharingLoading, setSharingLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidePanel, setSidePanel] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [canvasConfig, setCanvasConfig] = useState({ bgColor: '', sheetBgColor: '' })
  const [globalDateFilter, setGlobalDateFilter] = useState({ dateCol: '', dateFrom: '', dateTo: '' })
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const addMenuRef = useRef()

  useEffect(() => {
    Promise.all([api.reports.get(id), api.reports.datasets.list()])
      .then(([r, ds]) => {
        setReport(r); setDatasets(ds)
        const ps = (r.pages && r.pages.length > 0) ? r.pages : [{ id: 'page_1', title: 'Página 1', blocks: r.blocks || [] }]
        setPages(ps); setActivePageId(ps[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    function handleClickOutside(e) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const blocks = pages.find(p => p.id === activePageId)?.blocks || []

  function setBlocks(newBlocks) {
    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, blocks: newBlocks } : p))
  }

  function enterEditMode() {
    if (!report) return
    const ps = (report.pages && report.pages.length > 0) ? JSON.parse(JSON.stringify(report.pages)) : [{ id: 'page_1', title: 'Página 1', blocks: JSON.parse(JSON.stringify(report.blocks || [])) }]
    setPages(ps); setActivePageId(ps[0].id)
    setEditTitle(report.title); setEditDescription(report.description || '')
    setSelectedBlockId(null); setSidebarOpen(false); setSidePanel(null); setMode('edit')
  }

  function cancelEdit() { setMode('view'); setSelectedBlockId(null); setSidebarOpen(false); setSidePanel(null) }

  function addPage() {
    const newId = `page_${Date.now()}`
    setPages(prev => [...prev, { id: newId, title: `Página ${prev.length + 1}`, blocks: [] }])
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

  async function handleSave() {
    setSaving(true)
    try {
      const cleanPages = pages.map(p => ({ ...p, blocks: sanitizeBlocks(p.blocks || []) }))
      const updated = await api.reports.update(id, { title: editTitle, description: editDescription || null, blocks: cleanPages[0]?.blocks || [], pages: cleanPages })
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
    } catch (err) { console.error(err) }
    finally { setSharingLoading(false) }
  }

  function addBlock(type) {
    const block = newBlock(type)
    setBlocks([...blocks, block])
    setSelectedBlockId(block.id)
  }

  function updateActiveBlock(updated) {
    setBlocks(blocks.map(b => b.id === updated.id ? updated : b))
  }

  function togglePanel(panel) {
    if (sidePanel === panel && sidebarOpen) { setSidebarOpen(false); setSidePanel(null) }
    else { setSidePanel(panel); setSidebarOpen(true) }
  }

  const activeBlock = blocks.find(b => b.id === selectedBlockId)

  if (loading) return <AppLayout><div className="p-8 text-center text-gray-400">Carregando...</div></AppLayout>
  if (!report) return <AppLayout><div className="p-8 text-center text-red-500">Dashboard não encontrado</div></AppLayout>

  // EDIT MODE
  if (mode === 'edit') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#f5f5f7]">
        {/* Luzmo-style top bar */}
        <div className="bg-white border-b border-gray-200/80 px-4 h-12 flex items-center gap-2 shrink-0 shadow-sm">
          {/* Left: back + title + add */}
          <button onClick={cancelEdit} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors pr-2 border-r border-gray-200 mr-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 5l-7 7 7 7" /></svg>
            <span className="hidden sm:inline font-medium">Voltar</span>
          </button>

          <button onClick={() => router.push('/dashboards/novo')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors border border-gray-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 9h16M4 13h10" /></svg>
            <span className="hidden sm:inline">Templates</span>
          </button>

          <div className="relative" ref={addMenuRef}>
            <button onClick={() => setShowAddMenu(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16M4 12h16" /></svg>
              Adicionar item
              <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 9l6 6 6-6" /></svg>
            </button>
            {showAddMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 grid grid-cols-2 gap-0.5">
                {BLOCK_TYPES.map(bt => (
                  <button key={bt.type} onClick={() => { addBlock(bt.type); setShowAddMenu(false) }} className="flex flex-col items-start px-2.5 py-2 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-colors text-left group">
                    <p className="text-xs font-semibold text-gray-800 group-hover:text-violet-700">{bt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{bt.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dashboard title in center */}
          <div className="flex-1 flex justify-center min-w-0 px-4">
            <input
              className="text-sm font-semibold text-gray-700 bg-transparent outline-none border-b-2 border-transparent focus:border-violet-400 text-center max-w-xs truncate transition-colors"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              title={editTitle}
            />
          </div>

          {/* Right: date filter → opens filters panel + share + cancel + save */}
          <button
            onClick={() => togglePanel('filtros')}
            title="Filtros"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'filtros' && sidebarOpen || globalDateFilter.dateFrom || globalDateFilter.dateTo ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
          </button>

          <button onClick={handleShare} disabled={sharingLoading} title="Compartilhar" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm shadow-violet-200">
            {saving ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            )}
            {saving ? 'Salvando...' : 'Salvar dashboard'}
          </button>
        </div>

        {/* Barra de status do filtro de data ativo */}
        {(globalDateFilter.dateFrom || globalDateFilter.dateTo) && (
          <div className="bg-violet-50 border-b border-violet-100 px-4 py-1.5 flex items-center gap-2 shrink-0">
            <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
            <span className="text-[11px] text-violet-700 font-medium flex-1">
              Filtro de data ativo: {globalDateFilter.dateFrom && <b>{globalDateFilter.dateFrom}</b>} {globalDateFilter.dateTo && <> até <b>{globalDateFilter.dateTo}</b></>}
            </span>
            <button onClick={() => setGlobalDateFilter(f => ({ ...f, dateFrom: '', dateTo: '' }))} className="text-[10px] text-violet-500 hover:text-violet-700 font-semibold shrink-0">Limpar</button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-6 min-w-0" style={{ backgroundColor: canvasConfig.bgColor || '#f3f4f6' }} onClick={() => setSelectedBlockId(null)}>
            <div className="flex items-center gap-1 mb-4 flex-wrap" onClick={e => e.stopPropagation()}>
              {pages.map(page => (
                <div key={page.id} className={`group flex items-center gap-1 rounded-lg border transition-colors ${activePageId === page.id ? 'bg-white border-violet-300 shadow-sm' : 'bg-transparent border-transparent hover:border-gray-200'}`}>
                  {renamingPageId === page.id ? (
                    <input autoFocus className="text-xs font-medium px-2 py-1.5 bg-transparent outline-none w-24" value={page.title} onChange={e => renamePage(page.id, e.target.value)} onBlur={() => setRenamingPageId(null)} onKeyDown={e => e.key === 'Enter' && setRenamingPageId(null)} />
                  ) : (
                    <button className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${activePageId === page.id ? 'text-violet-700' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => { setActivePageId(page.id); setSelectedBlockId(null) }} onDoubleClick={() => setRenamingPageId(page.id)}>
                      {page.title}
                    </button>
                  )}
                  {pages.length > 1 && <button onClick={() => removePage(page.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 pr-1 text-xs">×</button>}
                </div>
              ))}
              <button onClick={addPage} className="flex items-center justify-center w-7 h-7 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors text-sm">+</button>
            </div>


            <ReportBuilder blocks={blocks} onChange={setBlocks} readOnly={false} selectedBlockId={selectedBlockId} onSelectBlock={id => setSelectedBlockId(id)} onBlockAction={(id, action) => { setSelectedBlockId(id); setSidePanel(action); setSidebarOpen(true) }} datasets={datasets} sheetConfig={{ bgColor: canvasConfig.sheetBgColor }} globalDateFilter={globalDateFilter} />
          </div>

          <aside className={`${sidebarOpen && sidePanel ? 'w-72' : 'w-0'} bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden transition-[width] duration-200`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">
                {sidePanel === 'dados' ? 'Dados' :
                 sidePanel === 'filtros' ? 'Filtros' :
                 sidePanel === 'comentarios' ? 'Comentários' :
                 sidePanel === 'config' && activeBlock ? 'Configurar bloco' :
                 'Configurações'}
              </span>
              <button onClick={() => { setSidebarOpen(false); setSidePanel(null) }} className="text-gray-400 hover:text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sidePanel === 'dados' && <DatasetPanel datasets={datasets} onDatasetsChange={setDatasets} />}
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
          />
        </div>
        {showAiPanel && <AiPanel datasets={datasets} blocks={blocks} onClose={() => setShowAiPanel(false)} />}
      </div>
    )
  }

  // VIEW MODE
  return (
    <AppLayout>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <button onClick={() => router.push('/dashboards')} className="text-sm text-gray-400 hover:text-gray-700 mb-2 block">← Dashboards</button>
            <h1 className="text-2xl font-black text-gray-900">{report.title}</h1>
            {report.description && <p className="text-sm text-gray-500 mt-1">{report.description}</p>}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={enterEditMode} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors">Editar</button>
            <button onClick={() => setShowAiPanel(true)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 text-sm rounded-xl hover:border-gray-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              Perguntar
            </button>
            <button onClick={handleShare} disabled={sharingLoading} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 text-sm rounded-xl hover:border-gray-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              {sharingLoading ? 'Gerando...' : 'Compartilhar'}
            </button>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="px-3 py-2 text-sm text-red-500 hover:text-red-700 transition-colors">Excluir</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Confirmar?</span>
                <button onClick={handleDelete} className="text-sm text-red-600 font-semibold">Sim</button>
                <button onClick={() => setDeleteConfirm(false)} className="text-sm text-gray-400">Não</button>
              </div>
            )}
          </div>
        </div>

        {shareData && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex items-center gap-3">
            <input readOnly value={shareData.share_url} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none" />
            <button onClick={async () => { await navigator.clipboard.writeText(shareData.share_url); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors shrink-0">
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>
        )}

        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowDateFilter(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border transition-colors ${showDateFilter || globalDateFilter.dateFrom || globalDateFilter.dateTo ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
            Filtro de data
          </button>
          {showDateFilter && (
            <>
              <select value={globalDateFilter.dateCol} onChange={e => setGlobalDateFilter(f => ({ ...f, dateCol: e.target.value }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">Coluna de data...</option>
                {[...new Set(datasets.flatMap(ds => ds.columns || []))].sort().map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <input type="date" value={globalDateFilter.dateFrom} onChange={e => setGlobalDateFilter(f => ({ ...f, dateFrom: e.target.value }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              <span className="text-sm text-gray-400">até</span>
              <input type="date" value={globalDateFilter.dateTo} onChange={e => setGlobalDateFilter(f => ({ ...f, dateTo: e.target.value }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              <button onClick={() => setGlobalDateFilter({ dateCol: '', dateFrom: '', dateTo: '' })} className="text-sm text-gray-400 hover:text-gray-700">Limpar</button>
            </>
          )}
        </div>

        {pages.length > 1 && (
          <div className="flex items-center gap-1 mb-4 flex-wrap border-b border-gray-100 pb-3">
            {pages.map(page => (
              <button key={page.id} onClick={() => setActivePageId(page.id)} className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${activePageId === page.id ? 'bg-violet-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
                {page.title}
              </button>
            ))}
          </div>
        )}

        <ReportBuilder blocks={pages.find(p => p.id === activePageId)?.blocks || report.blocks || []} readOnly={true} datasets={datasets} globalDateFilter={globalDateFilter} />
      </div>
      {showAiPanel && <AiPanel datasets={datasets} blocks={blocks} onClose={() => setShowAiPanel(false)} />}
    </AppLayout>
  )
}
