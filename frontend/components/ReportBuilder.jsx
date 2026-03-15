'use client'

import { useEffect, useRef, useState } from 'react'
import GridLayout from 'react-grid-layout'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, ZAxis,
  ComposedChart, Treemap,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'
import 'react-grid-layout/css/styles.css'
import { api } from '@/lib/api'

const COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#f43f5e', '#f59e0b', '#8b5cf6']
const COLORS_SOFT = ['#e0e7ff', '#d1fae5', '#e0f2fe', '#ffe4e6', '#fef3c7', '#ede9fe']

const BLOCK_TYPES = [
  { type: 'kpi',     label: 'KPI',      desc: 'Número em destaque' },
  { type: 'bar',     label: 'Barras',   desc: 'Comparar categorias' },
  { type: 'bar_h',   label: 'Barras H', desc: 'Barras horizontais' },
  { type: 'area',    label: 'Área',     desc: 'Evolução acumulada' },
  { type: 'line',    label: 'Linhas',   desc: 'Evolução no tempo' },
  { type: 'pie',         label: 'Pizza',       desc: 'Distribuição %' },
  { type: 'scatter',     label: 'Dispers.',    desc: 'Correlação XY' },
  { type: 'combo',       label: 'Combo',       desc: 'Barras + Linha' },
  { type: 'bubble',      label: 'Bolhas',      desc: 'Scatter com tamanho' },
  { type: 'treemap',     label: 'Treemap',     desc: 'Hierarquia em blocos' },
  { type: 'gauge',       label: 'Gauge',       desc: 'Indicador circular' },
  { type: 'speedometer', label: 'Velocímetro', desc: 'Gauge semicircular' },
  { type: 'table',       label: 'Tabela',      desc: 'Dados em linhas' },
  { type: 'text',        label: 'Texto',       desc: 'Comentários' },
  { type: 'filter',      label: 'Filtro',      desc: 'Filtrar dados' },
  { type: 'slider',      label: 'Slider',      desc: 'Filtrar por range' },
  { type: 'image',       label: 'Imagem',      desc: 'Foto ou logo' },
]

const TYPE_ICONS = {
  kpi:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>,
  bar:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  bar_h:   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h7M4 12h12M4 18h5" /></svg>,
  area:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L12 7l5 6 3-3" /></svg>,
  line:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  pie:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>,
  scatter: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7" cy="17" r="1.5" fill="currentColor"/><circle cx="12" cy="10" r="1.5" fill="currentColor"/><circle cx="17" cy="14" r="1.5" fill="currentColor"/><circle cx="5" cy="8" r="1.5" fill="currentColor"/></svg>,
  table:   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 6v12M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>,
  text:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>,
  filter:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>,
  image:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15l-5-5L5 21" /></svg>,
  combo:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm6 0v-4a2 2 0 00-2-2h-2m8-8l-4 4-4-4" /></svg>,
  bubble:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="6" cy="17" r="2" fill="currentColor" opacity=".5"/><circle cx="14" cy="10" r="3.5" fill="currentColor" opacity=".7"/><circle cx="19" cy="16" r="1.5" fill="currentColor" opacity=".5"/></svg>,
  treemap:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="9" height="12" rx="1" strokeWidth={2}/><rect x="13" y="2" width="9" height="6" rx="1" strokeWidth={2}/><rect x="13" y="10" width="9" height="4" rx="1" strokeWidth={2}/><rect x="2" y="16" width="20" height="6" rx="1" strokeWidth={2}/></svg>,
  gauge:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0 0v-8" /></svg>,
  speedometer: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10zm0 10l-3-5" /></svg>,
  slider:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></svg>,
}

const AGG_OPTIONS = [
  { value: 'sum',   label: 'Soma' },
  { value: 'count', label: 'Contagem' },
  { value: 'avg',   label: 'Média' },
  { value: 'max',   label: 'Máximo' },
  { value: 'min',   label: 'Mínimo' },
  { value: 'none',  label: 'Primeiro valor' },
]

function fmt(value, format, config = {}) {
  if (value == null) return '—'
  const { prefix = '', suffix = '' } = config
  let formatted
  if (format === 'currency') {
    formatted = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  } else if (format === 'percent') {
    formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
  } else if (format === 'compact') {
    if (Math.abs(value) >= 1_000_000) formatted = (value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'M'
    else if (Math.abs(value) >= 1_000) formatted = (value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'K'
    else formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  } else {
    formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  }
  return `${prefix}${formatted}${suffix}`
}

function fmtCompactCurrency(value) {
  if (value == null) return '—'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return 'R$ ' + (value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'M'
  if (abs >= 1_000) return 'R$ ' + (value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'K'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// Merge filter blocks (activeFilters) + cross-filter clicks (crossFilters)
// crossFilters take priority when both are set for the same dataset
function mergeFilters(activeFilters, crossFilters) {
  const result = {}
  const allKeys = new Set([...Object.keys(activeFilters), ...Object.keys(crossFilters)])
  allKeys.forEach(dsId => {
    if (crossFilters[dsId]) {
      result[dsId] = crossFilters[dsId]
    } else if (activeFilters[dsId]) {
      const entries = Object.entries(activeFilters[dsId]).filter(([, v]) => v)
      if (entries.length > 0) result[dsId] = { col: entries[0][0], val: entries[0][1] }
    }
  })
  return result
}

function useBlockData(block, mergedFilters = {}, globalDateFilter = {}, drilldown = null, shareToken = null) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const filter = mergedFilters[block.dataset_id]
  const { dateCol, dateFrom, dateTo } = globalDateFilter

  // When drilldown is active: use drilldown_col as label and original label_col as filter
  const effectiveLabelCol = drilldown ? (block.config?.drilldown_col || block.label_col) : block.label_col
  const effectiveFilterCol = drilldown ? block.label_col : (filter?.col || null)
  const effectiveFilterVal = drilldown ? drilldown.val : (filter?.val || null)

  const key = JSON.stringify({ d: block.dataset_id, l: effectiveLabelCol, v: block.value_col, a: block.agg, fc: effectiveFilterCol, fv: effectiveFilterVal, dc: dateCol, df: dateFrom, dt: dateTo, st: shareToken })

  useEffect(() => {
    if (block.type === 'text' || block.type === 'filter' || block.type === 'slider') return
    // Use static sample data if no dataset connected
    if (block.static_data && !block.dataset_id) { setData(block.static_data); return }
    if (!block.dataset_id || !effectiveLabelCol || !block.value_col) { setData(null); return }
    setLoading(true); setError(null)
    const queryFn = shareToken
      ? api.reports.publicQuery(shareToken, block.dataset_id, effectiveLabelCol, block.value_col, block.agg || 'sum', effectiveFilterCol, effectiveFilterVal, dateCol || null, dateFrom || null, dateTo || null)
      : api.reports.datasets.query(block.dataset_id, effectiveLabelCol, block.value_col, block.agg || 'sum', effectiveFilterCol, effectiveFilterVal, dateCol || null, dateFrom || null, dateTo || null)
    queryFn.then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [key, block.type])

  return { data, loading, error }
}

// Filter block: renders a dropdown with unique values from filter_col
function FilterBlockPreview({ block, activeFilters, onFilterChange }) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const currentVal = activeFilters[block.dataset_id]?.[block.filter_col] || ''

  useEffect(() => {
    if (!block.dataset_id || !block.filter_col) return
    setLoading(true)
    api.reports.datasets.query(block.dataset_id, block.filter_col, '__count__', 'count')
      .then(rows => setOptions(rows.map(r => r.label).filter(Boolean).sort()))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [block.dataset_id, block.filter_col])

  if (!block.dataset_id || !block.filter_col) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-300">Configure no painel lateral</div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full gap-1.5 px-1">
      <label className="text-xs text-gray-400 font-medium">{block.filter_label || block.filter_col}</label>
      {loading ? (
        <div className="text-xs text-gray-400">Carregando...</div>
      ) : (
        <select
          value={currentVal}
          onChange={e => onFilterChange(block.dataset_id, block.filter_col, e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Todos</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  )
}

function SliderBlockPreview({ block, rangeFilters, onRangeChange }) {
  const dsId = block.dataset_id
  const col = block.config?.slider_col
  const absMin = block.config?.slider_min ?? 0
  const absMax = block.config?.slider_max ?? 100
  const label = block.filter_label || col || 'Range'
  const current = rangeFilters?.[dsId]
  const curMin = current?.min ?? absMin
  const curMax = current?.max ?? absMax

  if (!dsId || !col) {
    return <div className="flex items-center justify-center h-full text-xs text-gray-300">Configure no painel lateral</div>
  }

  return (
    <div className="flex flex-col justify-center h-full gap-2 px-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 font-medium">{label}</label>
        <span className="text-xs text-violet-600 font-mono tabular-nums">{curMin} — {curMax}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-6 shrink-0">Min</span>
          <input type="range" min={absMin} max={absMax} value={curMin} step={(absMax - absMin) / 100 || 1}
            onChange={e => onRangeChange?.(dsId, col, +e.target.value, curMax)}
            className="flex-1 accent-violet-600 h-1.5 cursor-pointer" />
          <input type="number" value={curMin} onChange={e => onRangeChange?.(dsId, col, +e.target.value, curMax)}
            className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-violet-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-6 shrink-0">Max</span>
          <input type="range" min={absMin} max={absMax} value={curMax} step={(absMax - absMin) / 100 || 1}
            onChange={e => onRangeChange?.(dsId, col, curMin, +e.target.value)}
            className="flex-1 accent-violet-600 h-1.5 cursor-pointer" />
          <input type="number" value={curMax} onChange={e => onRangeChange?.(dsId, col, curMin, +e.target.value)}
            className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-violet-400" />
        </div>
      </div>
    </div>
  )
}

function BlockPreview({ block, readOnly, onTextChange, mergedFilters, onCrossFilter, activeFilters, onFilterChange, globalDateFilter, shareToken, rangeFilters = {}, onRangeChange }) {
  const [drilldown, setDrilldown] = useState(null) // { val: string } when active
  const { data, loading, error } = useBlockData(block, mergedFilters, globalDateFilter, drilldown, shareToken)
  const activeCrossVal = drilldown ? null : mergedFilters[block.dataset_id]?.val
  const hasDrilldown = !!block.config?.drilldown_col

  if (block.type === 'text') {
    return <textarea className="w-full h-full text-sm resize-none bg-transparent outline-none" style={{ color: block.config?.text_color || '#4b5563' }} placeholder="Escreva um comentário..." value={block.config?.text || ''} readOnly={readOnly} onChange={e => !readOnly && onTextChange(e.target.value)} />
  }

  if (block.type === 'filter') {
    return <FilterBlockPreview block={block} activeFilters={activeFilters} onFilterChange={onFilterChange} />
  }

  if (block.type === 'slider') {
    return <SliderBlockPreview block={block} rangeFilters={rangeFilters} onRangeChange={onRangeChange} />
  }

  if (block.type === 'image') {
    const src = block.config?.image_src
    if (!src) return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15l-5-5L5 21" /></svg>
        <p className="text-xs">Configure a imagem no painel</p>
      </div>
    )
    return (
      <img
        src={src}
        alt={block.title}
        className="w-full h-full"
        style={{ objectFit: block.config?.object_fit || 'contain' }}
      />
    )
  }

  const isSampleData = block.static_data && !block.dataset_id
  if (!isSampleData && (!block.dataset_id || !block.label_col || !block.value_col)) {
    return <div className="flex items-center justify-center h-full text-center px-3"><p className="text-xs text-gray-300">Configure a fonte de dados<br/>no painel lateral</p></div>
  }

  if (loading) return <div className="flex items-center justify-center h-full text-xs text-gray-400">Carregando...</div>
  if (error) return <div className="flex items-center justify-center h-full text-xs text-red-400 px-2 text-center">{error}</div>
  if (!data || data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {drilldown && (
        <button onClick={() => setDrilldown(null)} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors">
          ← {drilldown.val}
        </button>
      )}
      <span className="text-xs text-gray-300">Sem dados</span>
    </div>
  )

  const color = block.config?.color || COLORS[0]
  const format = block.config?.format || 'number'
  const config = block.config || {}
  const palette = config.colors
    ? config.colors.split(',').map(c => c.trim()).filter(Boolean)
    : COLORS

  const handleClick = (label) => {
    if (hasDrilldown && !drilldown) {
      setDrilldown({ val: label })
    } else if (!hasDrilldown && onCrossFilter) {
      onCrossFilter(block.dataset_id, block.label_col, label)
    }
  }

  const getOpacity = (label) => {
    if (!activeCrossVal) return 1
    return label === activeCrossVal ? 1 : 0.25
  }

  // Drilldown breadcrumb chip
  const DrillChip = drilldown ? (
    <button
      onClick={() => setDrilldown(null)}
      className="flex items-center gap-1 self-start mb-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-medium hover:bg-purple-200 transition-colors shrink-0"
    >
      ← {block.label_col}: {drilldown.val}
    </button>
  ) : null

  if (block.type === 'kpi') {
    const total = data.reduce((s, d) => s + (d.value || 0), 0)
    const accentColor = config.accent_color || '#6366f1'
    let valueColor = accentColor
    if (config.threshold_warn != null && config.threshold_warn !== '' && total < parseFloat(config.threshold_warn)) valueColor = '#ef4444'
    else if (config.threshold_ok != null && config.threshold_ok !== '' && total >= parseFloat(config.threshold_ok)) valueColor = '#10b981'
    const autoFormat = (format === 'currency' && Math.abs(total) >= 10000) ? 'compact_currency' : format
    return (
      <div className="h-full flex flex-col justify-center gap-2.5 px-3 py-2" style={{ background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 60%)` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: accentColor + '18' }}>
          <svg className="w-[18px] h-[18px]" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <p className="text-3xl font-black leading-none tracking-tight" style={{ color: valueColor }}>
            {autoFormat === 'compact_currency' ? fmtCompactCurrency(total) : fmt(total, format, config)}
          </p>
          <div className="h-[3px] rounded-full w-8 mt-2" style={{ backgroundColor: accentColor }} />
        </div>
      </div>
    )
  }

  if (block.type === 'bar') return (
    <div className="flex flex-col h-full">
      {DrillChip}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => fmt(v, format, config)} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} onClick={entry => handleClick(entry.label)} style={{ cursor: hasDrilldown && !drilldown ? 'zoom-in' : 'pointer' }}>
              {data.map((d, i) => <Cell key={i} fill={palette[i % palette.length]} opacity={getOpacity(d.label)} />)}
            </Bar>
            {config.reference_value != null && config.reference_value !== '' && (
              <ReferenceLine y={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || 'Meta', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'bar_h') return (
    <div className="flex flex-col h-full">
      {DrillChip}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 40, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#f0f0f0" strokeDasharray="0" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: '#9ca3af' }} width={80} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => fmt(v, format, config)} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32} onClick={entry => handleClick(entry.label)} style={{ cursor: hasDrilldown && !drilldown ? 'zoom-in' : 'pointer' }}>
              {data.map((d, i) => <Cell key={i} fill={palette[i % palette.length]} opacity={getOpacity(d.label)} />)}
            </Bar>
            {config.reference_value != null && config.reference_value !== '' && (
              <ReferenceLine x={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || 'Meta', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'area') return (
    <div className="flex flex-col h-full">
      {DrillChip}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
            <defs>
              <linearGradient id={`grad_${block.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => fmt(v, format, config)} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#grad_${block.id})`}
              dot={{ r: 3, fill: 'white', stroke: color, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2, onClick: (_, payload) => handleClick(payload?.payload?.label) }}
            />
            {config.reference_value != null && config.reference_value !== '' && (
              <ReferenceLine y={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || 'Meta', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'line') return (
    <div className="flex flex-col h-full">
      {DrillChip}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => fmt(v, format, config)} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'white', stroke: color, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2, onClick: (_, payload) => handleClick(payload?.payload?.label) }}
            />
            {config.reference_value != null && config.reference_value !== '' && (
              <ReferenceLine y={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || 'Meta', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'pie') return (
    <div className="flex flex-col h-full">
      {DrillChip}
      <div style={{ flex: 1 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="label"
            cx="50%" cy="45%" outerRadius="38%" innerRadius="20%"
            labelLine={false}
            onClick={entry => handleClick(entry.label)}
            style={{ cursor: hasDrilldown && !drilldown ? 'zoom-in' : 'pointer' }}
          >
            {data.map((d, i) => <Cell key={i} fill={palette[i % palette.length]} opacity={getOpacity(d.label)} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => fmt(v, format, config)} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ fontSize: 10, color: '#6b7280' }}>{value}</span>}
            wrapperStyle={{ paddingTop: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'scatter') {
    const scatterData = data.map(d => ({ x: parseFloat(d.label) || 0, y: d.value }))
    return (
      <div className="flex flex-col h-full">
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
              <XAxis dataKey="x" type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} name={block.label_col} axisLine={false} tickLine={false} />
              <YAxis dataKey="y" type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} name={block.value_col} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ strokeDasharray: '3 3' }} formatter={v => fmt(v, format, config)} />
              <Scatter data={scatterData} fill={color} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'combo') return (
    <div className="flex flex-col h-full">
      {DrillChip}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => fmt(v, format, config)} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            <Bar dataKey="value" name={block.value_col || 'Valor'} fill={palette[0]} radius={[4, 4, 0, 0]} opacity={0.85} />
            <Line type="monotone" dataKey="value" name="" stroke={palette[1] || '#ef4444'} strokeWidth={2} dot={{ r: 2 }} legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'bubble') {
    const bubbleData = data.map(d => ({ x: parseFloat(d.label) || 0, y: d.value, z: Math.abs(d.value) || 1 }))
    return (
      <div className="flex flex-col h-full">
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
              <XAxis dataKey="x" type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} name={block.label_col} axisLine={false} tickLine={false} />
              <YAxis dataKey="y" type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} name={block.value_col} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
              <ZAxis dataKey="z" range={[40, 600]} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ strokeDasharray: '3 3' }} formatter={v => fmt(v, format, config)} />
              <Scatter data={bubbleData}>
                {bubbleData.map((d, i) => <Cell key={i} fill={palette[i % palette.length]} opacity={0.72} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'treemap') {
    const treeData = data.map((d, i) => ({ name: d.label, size: Math.abs(d.value) || 1, fill: palette[i % palette.length] }))
    return (
      <div className="flex flex-col h-full">
        {DrillChip}
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={treeData} dataKey="size" stroke="#fff" strokeWidth={2} content={({ x, y, width, height, name, fill }) => (
              <g>
                <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />
                {width > 40 && height > 20 && (
                  <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fontSize={Math.min(11, width / 6)} fill="#fff" fontWeight={600} style={{ pointerEvents: 'none' }}>
                    {name.length > 14 ? name.slice(0, 13) + '…' : name}
                  </text>
                )}
              </g>
            )} />
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'gauge') {
    const total = data.reduce((s, d) => s + (d.value || 0), 0)
    const maxVal = parseFloat(config.gauge_max) || 100
    const pct = Math.min(Math.max(total / maxVal, 0), 1) * 100
    const gaugeData = [{ name: block.title || 'Valor', value: pct }]
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <ResponsiveContainer width="100%" height={150}>
          <RadialBarChart innerRadius="55%" outerRadius="85%" data={gaugeData} startAngle={90} endAngle={-270} barSize={20}>
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f3f4f6' }} fill={color} />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="text-2xl font-black -mt-12" style={{ color }}>{fmt(total, format, config)}</p>
        <p className="text-xs text-gray-400 mt-1">{Math.round(pct)}%</p>
      </div>
    )
  }

  if (block.type === 'speedometer') {
    const total = data.reduce((s, d) => s + (d.value || 0), 0)
    const maxVal = parseFloat(config.gauge_max) || 100
    const pct = Math.min(Math.max(total / maxVal, 0), 1)
    const cx = 100, cy = 88, r = 68
    const valAngleRad = (180 - 180 * pct) * Math.PI / 180
    const vx = (cx + r * Math.cos(valAngleRad)).toFixed(2)
    const vy = (cy - r * Math.sin(valAngleRad)).toFixed(2)
    const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`
    const valPath = pct > 0.001 ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 0 ${vx} ${vy}` : null
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <svg viewBox="0 0 200 115" className="w-full" style={{ maxHeight: 130 }}>
          <path d={bgPath} fill="none" stroke="#f3f4f6" strokeWidth="15" strokeLinecap="round" />
          {valPath && <path d={valPath} fill="none" stroke={color} strokeWidth="15" strokeLinecap="round" />}
          <line x1={cx} y1={cy} x2={vx} y2={vy} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="5" fill="#374151" />
          <text x={cx} y={cy + 20} textAnchor="middle" fontSize="15" fontWeight="800" fill={color}>{fmt(total, format, config)}</text>
          <text x={cx - r + 2} y={cy + 16} fontSize="8" fill="#9ca3af">0</text>
          <text x={cx + r - 10} y={cy + 16} fontSize="8" fill="#9ca3af">{config.gauge_max || 100}</text>
        </svg>
      </div>
    )
  }

  if (block.type === 'table') {
    const maxVal = Math.max(...data.map(d => Math.abs(d.value || 0)), 1)
    return (
      <div className="overflow-auto h-full" style={{ borderRadius: '0 0 16px 16px' }}>
        <table className="min-w-full text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-[11px] tracking-wide" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>{block.label_col || 'Label'}</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[11px] tracking-wide" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>{block.value_col || 'Valor'}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const barPct = Math.round((Math.abs(row.value || 0) / maxVal) * 100)
              let rowHighlight = false
              if (config.highlight_threshold != null && config.highlight_threshold !== '') {
                const threshold = parseFloat(config.highlight_threshold)
                if (config.highlight_operator === 'lt') rowHighlight = row.value < threshold
                else rowHighlight = row.value > threshold
              }
              return (
                <tr
                  key={i}
                  className="group cursor-pointer transition-colors"
                  style={{ opacity: getOpacity(row.label), backgroundColor: rowHighlight ? (config.highlight_color || '#fef3c7') : 'transparent' }}
                  onClick={() => handleClick(row.label)}
                >
                  <td className="px-4 py-2 text-gray-700 truncate max-w-[140px] font-medium group-hover:bg-violet-50 transition-colors border-b border-gray-50">{row.label}</td>
                  <td className="px-4 py-2 text-right group-hover:bg-violet-50 transition-colors border-b border-gray-50">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[60px]">
                        <div className="h-full rounded-full bg-violet-400" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="tabular-nums text-gray-600 font-medium whitespace-nowrap">{fmt(row.value, format, config)}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}

function ColorPicker({ label, value, onChange, placeholder = '#6366f1' }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1.5">{label}</label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        {value && (
          <button onClick={() => onChange('')} className="text-gray-300 hover:text-gray-500 shrink-0" title="Remover">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}

function ConfigSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
      >
        <span>{title}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <div className="space-y-3 pb-3">{children}</div>}
    </div>
  )
}

export function BlockConfigPanel({ block, onChange, datasets = [] }) {
  function upd(field, value) { onChange({ ...block, [field]: value }) }
  function updConfig(field, value) { onChange({ ...block, config: { ...(block.config || {}), [field]: value } }) }
  const selectedDataset = datasets.find(d => d.id === block.dataset_id)
  const columns = selectedDataset?.columns || []
  const hasData = !['text', 'filter', 'image', 'slider'].includes(block.type)
  const hasVisual = ['kpi', 'bar', 'bar_h', 'area', 'line', 'table', 'scatter', 'combo', 'bubble', 'treemap', 'gauge', 'speedometer'].includes(block.type)

  return (
    <div className="divide-y divide-gray-100">

      {/* GERAL */}
      <ConfigSection title="Geral">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Título</label>
          <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.title} onChange={e => upd('title', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Tipo de bloco</label>
          <div className="grid grid-cols-5 gap-1">
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} onClick={() => upd('type', bt.type)} title={bt.desc} className={`flex flex-col items-center p-2 rounded-lg border text-[10px] transition-all ${block.type === bt.type ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-400' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                <span className="mb-0.5">{TYPE_ICONS[bt.type]}</span>{bt.label}
              </button>
            ))}
          </div>
        </div>
      </ConfigSection>

      {/* IMAGEM */}
      {block.type === 'image' && (
        <ConfigSection title="Imagem">
          <div>
            <label className="block text-xs text-gray-500 mb-1">URL da imagem</label>
            <input
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              placeholder="https://..."
              value={block.config?.image_src || ''}
              onChange={e => updConfig('image_src', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ou fazer upload</label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-xs text-gray-500">Clique para selecionar</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => updConfig('image_src', ev.target.result)
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ajuste</label>
            <div className="flex gap-1">
              {[{ v: 'contain', l: 'Conter' }, { v: 'cover', l: 'Cobrir' }, { v: 'fill', l: 'Esticar' }].map(o => (
                <button key={o.v} onClick={() => updConfig('object_fit', o.v)}
                  className={`flex-1 px-2 py-1 rounded border text-xs font-medium transition-all ${(block.config?.object_fit || 'contain') === o.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </ConfigSection>
      )}

      {/* DADOS — for filter blocks */}
      {block.type === 'filter' && (
        <ConfigSection title="Filtro">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fonte de dados</label>
            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.dataset_id || ''} onChange={e => onChange({ ...block, dataset_id: e.target.value || null, filter_col: null })}>
              <option value="">Selecione um dataset...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna para filtrar</label>
              <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.filter_col || ''} onChange={e => upd('filter_col', e.target.value || null)}>
                <option value="">Selecione...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label de exibição</label>
            <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder={block.filter_col || 'ex: Filtrar por Meio'} value={block.filter_label || ''} onChange={e => upd('filter_label', e.target.value)} />
          </div>
        </ConfigSection>
      )}

      {/* SLIDER config */}
      {block.type === 'slider' && (
        <ConfigSection title="Slider de Range">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fonte de dados</label>
            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.dataset_id || ''} onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}), slider_col: null } })}>
              <option value="">Selecione um dataset...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna numérica</label>
              <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.config?.slider_col || ''} onChange={e => updConfig('slider_col', e.target.value || null)}>
                <option value="">Selecione...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label de exibição</label>
            <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder={block.config?.slider_col || 'ex: Faixa de Valor'} value={block.filter_label || ''} onChange={e => upd('filter_label', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Faixa (mín / máx)</label>
            <div className="flex gap-2">
              <input type="number" step="any" value={block.config?.slider_min ?? ''} onChange={e => updConfig('slider_min', e.target.value === '' ? 0 : +e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
              <input type="number" step="any" value={block.config?.slider_max ?? ''} onChange={e => updConfig('slider_max', e.target.value === '' ? 100 : +e.target.value)} placeholder="100" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          </div>
        </ConfigSection>
      )}

      {/* DADOS — for chart/table blocks */}
      {hasData && (
        <ConfigSection title="Dados">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fonte de dados</label>
            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.dataset_id || ''} onChange={e => onChange({ ...block, dataset_id: e.target.value || null, label_col: null, value_col: null })}>
              <option value="">Selecione um dataset...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.row_count} linhas)</option>)}
            </select>
            {datasets.length === 0 && <p className="text-xs text-amber-600 mt-1">Sem datasets — adicione na aba "Dados"</p>}
          </div>
          {selectedDataset && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Coluna de categoria (eixo X)</label>
                <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.label_col || ''} onChange={e => upd('label_col', e.target.value || null)}>
                  <option value="">Selecione...</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Coluna de valor (eixo Y)</label>
                <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.value_col || ''} onChange={e => upd('value_col', e.target.value || null)}>
                  <option value="">Selecione...</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agregação</label>
                <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.agg || 'sum'} onChange={e => upd('agg', e.target.value)}>
                  {AGG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </>
          )}
        </ConfigSection>
      )}

      {/* VISUAL */}
      {hasVisual && (
        <ConfigSection title="Visual">
          {['kpi', 'bar', 'bar_h', 'area', 'line', 'table'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Formato do valor</label>
              <div className="flex gap-1">
                {[{ v: 'number', l: '1.234' }, { v: 'currency', l: 'R$' }, { v: 'percent', l: '%' }, { v: 'compact', l: '1.2K' }].map(f => (
                  <button key={f.v} onClick={() => updConfig('format', f.v)} className={`flex-1 px-2 py-1 rounded border text-xs font-medium transition-all ${(block.config?.format || 'number') === f.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{f.l}</button>
                ))}
              </div>
            </div>
          )}
          {['kpi', 'table'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Prefixo / Sufixo</label>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Prefixo" value={block.config?.prefix || ''} onChange={e => updConfig('prefix', e.target.value)} />
                <input className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Sufixo" value={block.config?.suffix || ''} onChange={e => updConfig('suffix', e.target.value)} />
              </div>
            </div>
          )}
          {block.type === 'kpi' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tamanho do número</label>
                <div className="flex gap-1">
                  {[{ v: 'lg', l: 'P' }, { v: 'xl', l: 'M' }, { v: '2xl', l: 'G' }, { v: '4xl', l: 'XG' }].map(s => (
                    <button key={s.v} onClick={() => updConfig('size', s.v)} className={`flex-1 px-2 py-1 rounded border text-xs font-bold transition-all ${(block.config?.size || '4xl') === s.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{s.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ícone / Emoji</label>
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                  placeholder="🚀  📈  💰  ✅  ..."
                  value={block.config?.icon || ''}
                  onChange={e => updConfig('icon', e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1">Cole qualquer emoji ou símbolo</p>
              </div>
              <ColorPicker label="Cor do número" value={block.config?.accent_color || ''} onChange={v => updConfig('accent_color', v)} />
            </>
          )}
          {['gauge', 'speedometer'].includes(block.type) && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valor máximo do indicador</label>
                <input type="number" step="any" value={block.config?.gauge_max ?? ''} onChange={e => updConfig('gauge_max', e.target.value === '' ? null : +e.target.value)} placeholder="100" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
              </div>
              <ColorPicker label="Cor do arco" value={block.config?.color || ''} onChange={v => updConfig('color', v)} />
            </>
          )}
          {['bar', 'bar_h', 'area', 'line', 'scatter', 'combo', 'gauge', 'speedometer'].includes(block.type) && !['gauge', 'speedometer'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Cor principal (linha / série única)</label>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => updConfig('color', c)} className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${block.config?.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}
          {['bar', 'bar_h', 'pie', 'scatter', 'combo', 'bubble', 'treemap'].includes(block.type) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-500">Paleta de cores</label>
                {block.config?.colors && (
                  <button onClick={() => updConfig('colors', '')} className="text-[10px] text-gray-400 hover:text-gray-600">↺ Padrão</button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 6 }, (_, i) => {
                  const arr = block.config?.colors
                    ? block.config.colors.split(',').map(c => c.trim())
                    : [...COLORS]
                  const c = arr[i] || COLORS[i] || '#cccccc'
                  return (
                    <input
                      key={i}
                      type="color"
                      value={c}
                      onChange={e => {
                        const next = block.config?.colors
                          ? block.config.colors.split(',').map(c => c.trim())
                          : [...COLORS]
                        while (next.length < 6) next.push(COLORS[next.length] || '#cccccc')
                        next[i] = e.target.value
                        updConfig('colors', next.join(','))
                      }}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      title={`Cor ${i + 1}`}
                    />
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Cada cor representa uma categoria diferente</p>
            </div>
          )}
        </ConfigSection>
      )}

      {/* APARÊNCIA */}
      <ConfigSection title="Aparência" defaultOpen={false}>
        <ColorPicker label="Cor de fundo do bloco" value={block.config?.bg_color || ''} onChange={v => updConfig('bg_color', v)} placeholder="#ffffff" />
        {block.type === 'text' && (
          <ColorPicker label="Cor do texto" value={block.config?.text_color || ''} onChange={v => updConfig('text_color', v)} placeholder="#4b5563" />
        )}
      </ConfigSection>

      {/* INTERATIVIDADE */}
      {hasData && block.type !== 'scatter' && (
        <ConfigSection title="Interatividade" defaultOpen={false}>
          {/* Drilldown */}
          {['bar', 'bar_h', 'pie', 'area', 'line'].includes(block.type) && selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Drilldown (coluna de detalhe)</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.drilldown_col || ''}
                onChange={e => updConfig('drilldown_col', e.target.value || null)}
              >
                <option value="">Sem drilldown</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Ao clicar em uma barra/fatia, filtra por ela e agrupa por esta coluna.</p>
            </div>
          )}
          {/* Cross-filter — só ativo quando sem drilldown */}
          {!block.config?.drilldown_col && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => updConfig('crossFilterEnabled', !(block.config?.crossFilterEnabled ?? true))}
                  className={`w-8 h-4 rounded-full transition-colors relative ${(block.config?.crossFilterEnabled ?? true) ? 'bg-violet-500' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${(block.config?.crossFilterEnabled ?? true) ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-gray-600">Cross-filtering ativo</span>
              </label>
              <p className="text-[10px] text-gray-400">Ao clicar em um elemento, filtra os outros blocos do mesmo dataset.</p>
            </>
          )}
        </ConfigSection>
      )}

      {/* FORMATAÇÃO CONDICIONAL — KPI */}
      {block.type === 'kpi' && (
        <ConfigSection title="Formatação condicional" defaultOpen={false}>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Valor mínimo (verde se ≥)</label>
            <input type="number" step="any" value={block.config?.threshold_ok ?? ''} onChange={e => onChange({ ...block, config: { ...block.config, threshold_ok: e.target.value === '' ? null : e.target.value } })} placeholder="Ex: 50000" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Valor de alerta (vermelho se &lt;)</label>
            <input type="number" step="any" value={block.config?.threshold_warn ?? ''} onChange={e => onChange({ ...block, config: { ...block.config, threshold_warn: e.target.value === '' ? null : e.target.value } })} placeholder="Ex: 20000" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
          </div>
        </ConfigSection>
      )}

      {/* FORMATAÇÃO CONDICIONAL — TABELA */}
      {block.type === 'table' && (
        <ConfigSection title="Destaque de linha" defaultOpen={false}>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Destacar quando valor</label>
            <div className="flex gap-2">
              <select value={block.config?.highlight_operator || 'gt'} onChange={e => onChange({ ...block, config: { ...block.config, highlight_operator: e.target.value } })} className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400">
                <option value="gt">&gt; maior que</option>
                <option value="lt">&lt; menor que</option>
              </select>
              <input type="number" step="any" value={block.config?.highlight_threshold ?? ''} onChange={e => onChange({ ...block, config: { ...block.config, highlight_threshold: e.target.value === '' ? null : e.target.value } })} placeholder="Limite" className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          </div>
          <ColorPicker label="Cor de destaque" value={block.config?.highlight_color || ''} onChange={v => onChange({ ...block, config: { ...block.config, highlight_color: v } })} placeholder="#fef3c7" />
        </ConfigSection>
      )}

      {/* LINHA DE REFERÊNCIA */}
      {['bar', 'bar_h', 'line', 'area'].includes(block.type) && (
        <ConfigSection title="Linha de referência" defaultOpen={false}>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Valor (deixe vazio para ocultar)</label>
            <input
              type="number"
              step="any"
              value={block.config?.reference_value ?? ''}
              onChange={e => onChange({ ...block, config: { ...block.config, reference_value: e.target.value === '' ? null : e.target.value } })}
              placeholder="Ex: 100000"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Rótulo</label>
            <input
              type="text"
              value={block.config?.reference_label || ''}
              onChange={e => onChange({ ...block, config: { ...block.config, reference_label: e.target.value } })}
              placeholder="Ex: Meta"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
        </ConfigSection>
      )}

      {/* ID DO BLOCO */}
      <ConfigSection title="ID do bloco" defaultOpen={false}>
        <div className="flex items-center gap-1">
          <code className="flex-1 text-[10px] text-gray-400 font-mono truncate bg-gray-50 px-2 py-1.5 rounded border border-gray-100">{block.id}</code>
          <button
            onClick={() => navigator.clipboard.writeText(block.id)}
            title="Copiar ID"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded border border-gray-100 bg-gray-50 shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400">Use este ID para referenciar o bloco em relatórios futuros.</p>
      </ConfigSection>

    </div>
  )
}

export function CanvasConfigPanel({ config, onChange }) {
  function upd(field, value) { onChange(prev => ({ ...prev, [field]: value })) }

  function SwatchPicker({ field, colors, placeholder }) {
    return (
      <div>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {colors.map(c => (
            <button key={c} onClick={() => upd(field, c)}
              className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${config[field] === c ? 'border-violet-500 scale-110' : 'border-gray-200'}`}
              style={{ backgroundColor: c }} title={c}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={config[field] || placeholder}
            onChange={e => upd(field, e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5 shrink-0" />
          <input type="text" value={config[field] || ''} onChange={e => upd(field, e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-400" />
          {config[field] && (
            <button onClick={() => upd(field, '')} className="text-gray-300 hover:text-gray-500 shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ambiente do dashboard</p>
      <p className="text-[10px] text-gray-400 -mt-2">A grade milimetrada aparece ao arrastar blocos.</p>

      {/* Sheet */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Cor da folha</label>
        <SwatchPicker
          field="sheetBgColor"
          colors={['#ffffff', '#f8fafc', '#fafafa', '#fffbeb', '#f0fdf4', '#eef2ff', '#1e1e2e']}
          placeholder="#ffffff"
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Cor de fundo do canvas</label>
        <SwatchPicker
          field="bgColor"
          colors={['#f3f4f6', '#e5e7eb', '#dbeafe', '#ede9fe', '#dcfce7', '#fef3c7', '#18181b']}
          placeholder="#f3f4f6"
        />
      </div>
    </div>
  )
}

export function DatasetPanel({ datasets, onDatasetsChange }) {
  const [tab, setTab] = useState('upload')
  const [uploading, setUploading] = useState(false)
  const [apiForm, setApiForm] = useState({ name: '', api_url: '', api_headers: '', api_data_path: '' })
  const [apiSaving, setApiSaving] = useState(false)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [scheduleSaving, setScheduleSaving] = useState(null)
  const fileRef = useRef()

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const ds = await api.reports.datasets.upload(fd)
      onDatasetsChange([ds, ...datasets])
    } catch (err) { setError(err.message) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleApiCreate(e) {
    e.preventDefault(); setApiSaving(true); setError(null)
    try {
      let headers = null
      if (apiForm.api_headers.trim()) {
        try { headers = JSON.parse(apiForm.api_headers) } catch { throw new Error('Headers inválidos — use JSON: {"Authorization":"Bearer token"}') }
      }
      const ds = await api.reports.datasets.createApi({ name: apiForm.name, api_url: apiForm.api_url, api_headers: headers, api_data_path: apiForm.api_data_path || null })
      onDatasetsChange([ds, ...datasets])
      setApiForm({ name: '', api_url: '', api_headers: '', api_data_path: '' })
    } catch (err) { setError(err.message) }
    finally { setApiSaving(false) }
  }

  async function handleSync(id) {
    setSyncing(id)
    try {
      const updated = await api.reports.datasets.sync(id)
      onDatasetsChange(datasets.map(d => d.id === id ? updated : d))
    } catch (err) { setError(err.message) }
    finally { setSyncing(null) }
  }

  async function handleDelete(id) {
    await api.reports.datasets.delete(id)
    onDatasetsChange(datasets.filter(d => d.id !== id))
  }

  async function handleSchedule(id, intervalMinutes) {
    setScheduleSaving(id)
    try {
      const result = await api.reports.datasets.setSchedule(id, intervalMinutes)
      onDatasetsChange(datasets.map(d => d.id === id ? { ...d, refresh_interval_minutes: result.refresh_interval_minutes, next_refresh_at: result.next_refresh_at } : d))
    } catch (err) { setError(err.message) }
    finally { setScheduleSaving(null) }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Fontes de Dados</p>

      {datasets.length > 0 && (
        <div className="space-y-2">
          {datasets.map(ds => (
            <div key={ds.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{ds.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ds.type === 'api' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{ds.type.toUpperCase()}</span>
                    <span className="text-xs text-gray-400">{ds.row_count} linhas · {ds.columns?.length} colunas</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {ds.type === 'api' && (
                    <button onClick={() => handleSync(ds.id)} disabled={syncing === ds.id} title="Sincronizar" className="p-1 text-gray-400 hover:text-blue-600 rounded">
                      <svg className={`w-3.5 h-3.5 ${syncing === ds.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  )}
                  <button onClick={() => handleDelete(ds.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              {ds.columns?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ds.columns.slice(0, 6).map(c => <span key={c} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-500">{c}</span>)}
                  {ds.columns.length > 6 && <span className="text-xs text-gray-400">+{ds.columns.length - 6}</span>}
                </div>
              )}
              {ds.type === 'api' && (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={ds.refresh_interval_minutes ?? ''}
                    disabled={scheduleSaving === ds.id}
                    onChange={e => handleSchedule(ds.id, e.target.value === '' ? null : parseInt(e.target.value))}
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                    title="Refresh automático"
                  >
                    <option value="">Sem refresh</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 hora</option>
                    <option value="240">4 horas</option>
                    <option value="1440">24 horas</option>
                  </select>
                  {ds.next_refresh_at && (
                    <span className="text-[10px] text-gray-400 shrink-0" title="Próximo refresh">
                      ↻ {new Date(ds.next_refresh_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-100">
          {['upload', 'api'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === t ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}>
              {t === 'upload' ? 'Upload arquivo' : 'Integrar API'}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 border-b border-red-100">{error}</p>}

        {tab === 'upload' && (
          <div className="p-3">
            <p className="text-xs text-gray-400 mb-2">Suporta CSV e Excel (.xlsx)</p>
            <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-xs text-gray-500">{uploading ? 'Carregando...' : 'Clique para selecionar'}</span>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}

        {tab === 'api' && (
          <form onSubmit={handleApiCreate} className="p-3 space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome do dataset</label>
              <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Ex: Vendas Mensais" value={apiForm.name} onChange={e => setApiForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">URL da API (GET)</label>
              <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="https://api.exemplo.com/dados" value={apiForm.api_url} onChange={e => setApiForm(f => ({ ...f, api_url: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Headers (JSON opcional)</label>
              <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono" placeholder='{"Authorization":"Bearer token"}' value={apiForm.api_headers} onChange={e => setApiForm(f => ({ ...f, api_headers: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Caminho no JSON (opcional)</label>
              <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono" placeholder="data.items" value={apiForm.api_data_path} onChange={e => setApiForm(f => ({ ...f, api_data_path: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">{'Se o JSON for {"data":[...]}, use "data"'}</p>
            </div>
            <button type="submit" disabled={apiSaving} className="w-full py-2 bg-violet-600 text-white text-xs font-semibold rounded hover:bg-violet-700 disabled:opacity-50 mt-1">{apiSaving ? 'Buscando...' : 'Conectar API'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ReportBuilder({ blocks = [], onChange, readOnly = false, selectedBlockId, onSelectBlock, onBlockAction, datasets = [], sheetConfig = {}, globalDateFilter = {}, shareToken = null }) {
  const [activeFilters, setActiveFilters] = useState({})
  const [crossFilters, setCrossFilters] = useState({})
  const [rangeFilters, setRangeFilters] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredBlockId, setHoveredBlockId] = useState(null)
  const [gridWidth, setGridWidth] = useState(800)
  const sheetRef = useRef(null)

  useEffect(() => {
    if (!sheetRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setGridWidth(entry.contentRect.width)
      }
    })
    observer.observe(sheetRef.current)
    return () => observer.disconnect()
  }, [])

  const mergedFilters = mergeFilters(activeFilters, crossFilters)

  function handleFilterChange(datasetId, col, val) {
    setActiveFilters(prev => ({
      ...prev,
      [datasetId]: { ...(prev[datasetId] || {}), [col]: val },
    }))
  }

  function handleCrossFilter(datasetId, col, val) {
    setCrossFilters(prev => {
      const current = prev[datasetId]
      if (current?.col === col && current?.val === val) {
        const next = { ...prev }
        delete next[datasetId]
        return next
      }
      return { ...prev, [datasetId]: { col, val } }
    })
  }

  function handleRangeChange(datasetId, col, min, max) {
    setRangeFilters(prev => ({ ...prev, [datasetId]: { col, min, max } }))
  }

  function clearCrossFilter(datasetId) {
    setCrossFilters(prev => {
      const next = { ...prev }
      delete next[datasetId]
      return next
    })
  }

  const isMobile = gridWidth < 640
  const layout = isMobile
    ? blocks.map((b, idx) => ({ i: b.id, x: 0, y: idx * (b.layout?.h ?? 3), w: 12, h: b.layout?.h ?? 3, minW: 1, minH: 1 }))
    : blocks.map(b => ({ i: b.id, x: b.layout?.x ?? 0, y: b.layout?.y ?? 0, w: b.layout?.w ?? 6, h: b.layout?.h ?? 3, minW: 1, minH: 1 }))

  function handleLayoutChange(newLayout) {
    if (readOnly || !onChange) return
    onChange(blocks.map(b => { const l = newLayout.find(n => n.i === b.id); return l ? { ...b, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : b }))
  }

  const sheetStyle = {
    backgroundColor: sheetConfig.bgColor || '#f8f7fc',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(109,40,217,0.04), 0 12px 40px rgba(0,0,0,0.08)',
    minHeight: '640px',
    padding: '28px 28px 40px',
    backgroundImage: 'radial-gradient(circle, rgba(109,40,217,0.08) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  }

  if (blocks.length === 0) return (
    <div style={sheetStyle} ref={sheetRef} className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
      <p className="text-sm text-gray-400">Adicione blocos para montar seu dashboard</p>
    </div>
  )

  return (
    <div style={sheetStyle} ref={sheetRef}>
    <GridLayout className="w-full" layout={layout} cols={12} rowHeight={56} width={gridWidth} isDraggable={!readOnly && !isMobile} isResizable={!readOnly && !isMobile} onLayoutChange={handleLayoutChange} draggableHandle=".drag-handle" onDragStart={() => setIsDragging(true)} onDragStop={() => setIsDragging(false)}>
      {blocks.map(block => {
        const activeCross = crossFilters[block.dataset_id]
        const isSelected = selectedBlockId === block.id
        const isHovered = hoveredBlockId === block.id

        // Cross-filter highlight logic
        const anyCrossActive = Object.keys(crossFilters).length > 0
        const hasDataset = !!block.dataset_id
        const isCrossFiltered = anyCrossActive && hasDataset && !!crossFilters[block.dataset_id]
        const isUnrelated = anyCrossActive && hasDataset && !crossFilters[block.dataset_id]

        function cloneBlock() {
          const cloned = {
            ...JSON.parse(JSON.stringify(block)),
            id: `block_${Date.now()}`,
            title: block.title + ' (cópia)',
            layout: { ...block.layout, y: block.layout.y + block.layout.h },
          }
          onChange([...blocks, cloned])
        }

        return (
          <div
            key={block.id}
            className={`group relative rounded-xl flex flex-col transition-all duration-200 ${
              isSelected
                ? 'border-2 border-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)] shadow-violet-100'
                : isCrossFiltered
                ? 'border-2 border-emerald-400 shadow-[0_4px_16px_rgba(52,211,153,0.2)]'
                : isUnrelated
                ? 'border border-gray-200/60 opacity-35'
                : 'border border-gray-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:border-violet-200/60 hover:-translate-y-px'
            }`}
            style={{
              backgroundColor: isCrossFiltered
                ? (block.config?.bg_color ? block.config.bg_color : '#f0fdf4')
                : (block.config?.bg_color || 'white'),
              zIndex: (isSelected || isHovered) ? 100 : undefined,
            }}
            onMouseEnter={() => setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
            onClick={e => { e.stopPropagation(); !readOnly && onSelectBlock?.(block.id) }}
          >
            {/* Header */}
            <div className={`flex items-center gap-2 px-3 pt-3 pb-1.5 shrink-0 ${!readOnly ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}>
              {!readOnly && (
                <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" viewBox="0 0 10 16" fill="currentColor">
                  <circle cx="2" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
                  <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                  <circle cx="2" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                </svg>
              )}
              {readOnly ? (
                <span className="text-xs font-semibold text-gray-600 flex-1 truncate leading-none">{block.title}</span>
              ) : (
                <input
                  className="text-xs font-semibold text-gray-600 flex-1 bg-transparent outline-none min-w-0 leading-none placeholder:text-gray-300"
                  value={block.title}
                  onChange={e => onChange(blocks.map(b => b.id === block.id ? { ...b, title: e.target.value } : b))}
                  onClick={e => e.stopPropagation()}
                />
              )}
              {isCrossFiltered && (
                <button
                  onClick={e => { e.stopPropagation(); clearCrossFilter(block.dataset_id) }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold shrink-0 hover:bg-emerald-100 transition-colors"
                  title="Filtrado — clique para limpar"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="max-w-[70px] truncate">{activeCross.val}</span>
                </button>
              )}
              {block.config?.annotations?.length > 0 && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-md text-[10px] font-medium shrink-0" title={`${block.config.annotations.length} anotação(ões)`}>
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>
                  {block.config.annotations.length}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 px-3 pb-3 pt-0.5 min-h-0 overflow-hidden">
              <BlockPreview
                block={block}
                readOnly={readOnly}
                onTextChange={text => onChange(blocks.map(b => b.id === block.id ? { ...b, config: { ...b.config, text } } : b))}
                mergedFilters={mergedFilters}
                onCrossFilter={handleCrossFilter}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                globalDateFilter={globalDateFilter}
                shareToken={shareToken}
                rangeFilters={rangeFilters}
                onRangeChange={handleRangeChange}
              />
            </div>

            {/* Floating toolbar — modern pill outside-right */}
            {!readOnly && (
              <div
                className={`absolute left-full top-2 ml-2 flex flex-col gap-0.5 p-1 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-150 ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0'}`}
                onClick={e => e.stopPropagation()}
              >
                <button
                  title="Dados"
                  onClick={() => { onSelectBlock?.(block.id); onBlockAction?.(block.id, 'dados') }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM4 15a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button
                  title="Configurar"
                  onClick={() => { onSelectBlock?.(block.id); onBlockAction?.(block.id, 'config') }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
                <button
                  title="Clonar"
                  onClick={() => cloneBlock()}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <div className="h-px bg-gray-100 mx-1" />
                <button
                  title="Excluir"
                  onClick={() => onChange(blocks.filter(b => b.id !== block.id))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            )}
          </div>
        )
      })}
    </GridLayout>
    </div>
  )
}
