'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { pack as d3pack, hierarchy as d3hierarchy } from 'd3-hierarchy'
import { useTranslations, useLocale } from 'next-intl'
import GridLayout, { verticalCompactor } from 'react-grid-layout'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, ZAxis,
  ComposedChart, Treemap,
  RadialBarChart, RadialBar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, LabelList, Brush,
} from 'recharts'
import 'react-grid-layout/css/styles.css'
import { api } from '@/lib/api'

// ─── Raw Table Block — mostra linhas brutas do dataset sem precisar configurar colunas ───
function RawTableBlock({ datasetId, columns = [], readOnly }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const limit = 50

  useEffect(() => {
    if (!datasetId) return
    setLoading(true)
    api.reports.datasets.rows(datasetId, limit, page * limit)
      .then(res => { setRows(res.rows || []); setTotal(res.total || 0) })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [datasetId, page])

  if (loading) return <div className="flex items-center justify-center h-full text-xs text-gray-400">Carregando dados...</div>
  if (!rows || rows.length === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-300">Sem dados no dataset</div>

  const cols = columns.length > 0 ? columns : Object.keys(rows[0] || {})

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sortedRows = sortCol
    ? [...rows].sort((a, b) => {
        const va = a[sortCol], vb = b[sortCol]
        const numA = parseFloat(va), numB = parseFloat(vb)
        const isNum = !isNaN(numA) && !isNaN(numB)
        if (isNum) return sortDir === 'asc' ? numA - numB : numB - numA
        return sortDir === 'asc'
          ? String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR')
          : String(vb ?? '').localeCompare(String(va ?? ''), 'pt-BR')
      })
    : rows

  // Detect numeric columns and compute max for sparkbars
  const numColMax = {}
  if (sortedRows.length > 0) {
    cols.forEach(col => {
      const vals = sortedRows.map(r => r[col]).filter(v => v != null && v !== '' && !isNaN(parseFloat(v)))
      if (vals.length / sortedRows.length >= 0.7) {
        const nums = vals.map(v => parseFloat(v))
        const mx = Math.max(...nums)
        if (mx > 0) numColMax[col] = mx
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="min-w-full text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              {cols.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-[11px] text-gray-500 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-violet-600 transition-colors"
                  onClick={() => toggleSort(col)}
                >
                  <span className="flex items-center gap-1">
                    {col}
                    {sortCol === col && (
                      <svg className="w-2.5 h-2.5 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                {cols.map(col => {
                  const isNumCol = numColMax[col] != null
                  const numVal = isNumCol ? parseFloat(row[col]) : NaN
                  const pct = isNumCol && !isNaN(numVal) ? Math.max(0, Math.min(100, (numVal / numColMax[col]) * 100)) : 0
                  return (
                    <td key={col} className="px-3 py-1.5 border-b border-gray-100 whitespace-nowrap max-w-[200px] relative overflow-hidden">
                      {isNumCol && !isNaN(numVal) ? (
                        <>
                          <div className="absolute inset-y-0 left-0 bg-violet-400 opacity-[0.10] pointer-events-none rounded-r" style={{ width: `${pct}%` }} />
                          <span className="relative z-10 tabular-nums text-gray-700 font-medium">{String(row[col])}</span>
                        </>
                      ) : (
                        row[col] == null ? <span className="text-gray-300">—</span> : <span className="text-gray-700 truncate block">{String(row[col])}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > limit && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 bg-gray-50/80 shrink-0">
          <span className="text-[10px] text-gray-400">{page * limit + 1}–{Math.min((page + 1) * limit, total)} de {total}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 text-[10px] rounded border border-gray-200 disabled:opacity-30 hover:bg-violet-50 hover:text-violet-600 transition-colors">‹</button>
            <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 text-[10px] rounded border border-gray-200 disabled:opacity-30 hover:bg-violet-50 hover:text-violet-600 transition-colors">›</button>
          </div>
        </div>
      )}
    </div>
  )
}

const COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#f43f5e', '#f59e0b', '#8b5cf6']
const COLORS_SOFT = ['#e0e7ff', '#d1fae5', '#e0f2fe', '#ffe4e6', '#fef3c7', '#ede9fe']

const VIEWER_STRINGS = {
  'pt-BR': { vsMonth: 'vs. mês ant.', all: 'Todos', noData: 'Sem dados', loading: 'Carregando...', noResults: 'Nenhum resultado', value: 'Valor', refLabel: 'Meta' },
  'en':    { vsMonth: 'vs. prev. month', all: 'All', noData: 'No data', loading: 'Loading...', noResults: 'No results', value: 'Value', refLabel: 'Goal' },
  'es':    { vsMonth: 'vs. mes ant.', all: 'Todos', noData: 'Sin datos', loading: 'Cargando...', noResults: 'Sin resultados', value: 'Valor', refLabel: 'Meta' },
  'fr':    { vsMonth: 'vs. mois préc.', all: 'Tout', noData: 'Aucune donnée', loading: 'Chargement...', noResults: 'Aucun résultat', value: 'Valeur', refLabel: 'Objectif' },
  'de':    { vsMonth: 'vs. Vormonat', all: 'Alle', noData: 'Keine Daten', loading: 'Laden...', noResults: 'Keine Ergebnisse', value: 'Wert', refLabel: 'Ziel' },
  'it':    { vsMonth: 'vs. mese prec.', all: 'Tutti', noData: 'Nessun dato', loading: 'Caricamento...', noResults: 'Nessun risultato', value: 'Valore', refLabel: 'Obiettivo' },
  'zh':    { vsMonth: '对比上月', all: '全部', noData: '暂无数据', loading: '加载中...', noResults: '无结果', value: '数值', refLabel: '目标' },
  'ja':    { vsMonth: '前月比', all: 'すべて', noData: 'データなし', loading: '読み込み中...', noResults: '結果なし', value: '値', refLabel: '目標' },
}

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
  { type: 'funnel',      label: 'Funil',       desc: 'Funil de conversão' },
  { type: 'map',         label: 'Mapa BR',     desc: 'Mapa por estado' },
  { type: 'bar_stacked', label: 'Barras Emp.', desc: 'Barras empilhadas' },
  { type: 'area_stacked',label: 'Área Emp.',   desc: 'Área empilhada' },
  { type: 'heatmap',     label: 'Mapa de Calor', desc: 'Gradiente em grade' },
  { type: 'waterfall',   label: 'Cascata',       desc: 'Contribuições acumuladas' },
  { type: 'radar',       label: 'Radar',         desc: 'Comparação multidimensional' },
  { type: 'pivot',       label: 'Tabela Pivot', desc: 'Agrupamento por 2 dimensões', category: 'chart' },
  { type: 'ai_summary',  label: 'Resumo AI',   desc: 'Resumo inteligente dos dados', category: 'ai' },
  { type: 'histogram',   label: 'Histograma',  desc: 'Distribuição de frequência' },
  { type: 'bullet',      label: 'Bullet',      desc: 'Valor vs meta' },
  { type: 'gantt',       label: 'Gantt',       desc: 'Linha do tempo de tarefas', category: 'chart' },
  { type: 'sankey',      label: 'Sankey',      desc: 'Fluxo entre categorias', category: 'chart' },
  { type: 'candlestick', label: 'Candlestick', desc: 'OHLC financeiro', category: 'chart' },
  { type: 'boxplot',     label: 'Box Plot',    desc: 'Distribuição estatística', category: 'chart' },
  { type: 'text',        label: 'Texto',       desc: 'Comentários' },
  { type: 'filter',      label: 'Filtro',      desc: 'Filtrar dados' },
  { type: 'slider',      label: 'Slider',      desc: 'Filtrar por range' },
  { type: 'image',       label: 'Imagem',      desc: 'Foto ou logo' },
]

// ─── Drop Zone Config — define os slots de dados por tipo de bloco ───────────
// Usado pelo LeftDataTray (drag de colunas para blocos no canvas)
const DROP_ZONE_CONFIG = {
  bar:          [{ slot: 'label_col', label: 'Dimensão (X)', accepts: ['text','date'] }, { slot: 'value_col', label: 'Métrica (Y)',  accepts: ['number'] }],
  bar_h:        [{ slot: 'label_col', label: 'Dimensão (Y)', accepts: ['text','date'] }, { slot: 'value_col', label: 'Métrica (X)',  accepts: ['number'] }],
  line:         [{ slot: 'label_col', label: 'Eixo X',        accepts: ['text','date'] }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  area:         [{ slot: 'label_col', label: 'Eixo X',        accepts: ['text','date'] }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  bar_stacked:  [{ slot: 'label_col', label: 'Dimensão',      accepts: ['text','date'] }, { slot: 'value_col', label: 'Métrica',       accepts: ['number'] }],
  area_stacked: [{ slot: 'label_col', label: 'Dimensão',      accepts: ['text','date'] }, { slot: 'value_col', label: 'Métrica',       accepts: ['number'] }],
  pie:          [{ slot: 'label_col', label: 'Categoria',     accepts: ['text']        }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  combo:        [{ slot: 'label_col', label: 'Eixo X',        accepts: ['text','date'] }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  scatter:      [{ slot: 'label_col', label: 'Eixo X',        accepts: ['number']      }, { slot: 'value_col', label: 'Eixo Y',        accepts: ['number'] }],
  bubble:       [{ slot: 'label_col', label: 'Categoria',     accepts: ['text']        }, { slot: 'value_col', label: 'Tamanho',       accepts: ['number'] }],
  treemap:      [{ slot: 'label_col', label: 'Categoria',     accepts: ['text']        }, { slot: 'value_col', label: 'Tamanho',       accepts: ['number'] }],
  funnel:       [{ slot: 'label_col', label: 'Etapa',         accepts: ['text']        }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  radar:        [{ slot: 'label_col', label: 'Dimensão',      accepts: ['text']        }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  waterfall:    [{ slot: 'label_col', label: 'Etapa',         accepts: ['text']        }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  heatmap:      [{ slot: 'label_col', label: 'Linha',         accepts: ['text']        }, { slot: 'value_col', label: 'Coluna',        accepts: ['text','number'] }],
  kpi:          [{ slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  gauge:        [{ slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  speedometer:  [{ slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  bullet:       [{ slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  histogram:    [{ slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  table:        [{ slot: 'label_col', label: 'Dimensão',      accepts: ['text','date'] }, { slot: 'value_col', label: 'Métrica',       accepts: ['number'] }],
  map:          [{ slot: 'label_col', label: 'UF',            accepts: ['text']        }, { slot: 'value_col', label: 'Valor',         accepts: ['number'] }],
  // text, filter, slider, image, gantt, sankey, candlestick, boxplot, pivot, ai_summary — sem drop zones
}

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
  funnel:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-7 9v7l-4-2v-5L3 4z" /></svg>,
  map:         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  bar_stacked: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="14" width="4" height="7" rx="1" strokeWidth={1.5}/><rect x="3" y="9" width="4" height="5" rx="0" strokeWidth={1.5}/><rect x="10" y="10" width="4" height="11" rx="1" strokeWidth={1.5}/><rect x="10" y="5" width="4" height="5" rx="0" strokeWidth={1.5}/><rect x="17" y="12" width="4" height="9" rx="1" strokeWidth={1.5}/><rect x="17" y="7" width="4" height="5" rx="0" strokeWidth={1.5}/></svg>,
  area_stacked: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 18l4-6 4 3 4-7 4 4v6H3z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13l4-4 4 2 4-5 4 3" opacity=".5"/></svg>,
  heatmap: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="4" height="4" fill="currentColor" opacity="0.9"/>
      <rect x="9" y="3" width="4" height="4" fill="currentColor" opacity="0.4"/>
      <rect x="15" y="3" width="4" height="4" fill="currentColor" opacity="0.7"/>
      <rect x="3" y="9" width="4" height="4" fill="currentColor" opacity="0.5"/>
      <rect x="9" y="9" width="4" height="4" fill="currentColor" opacity="1"/>
      <rect x="15" y="9" width="4" height="4" fill="currentColor" opacity="0.3"/>
      <rect x="3" y="15" width="4" height="4" fill="currentColor" opacity="0.6"/>
      <rect x="9" y="15" width="4" height="4" fill="currentColor" opacity="0.2"/>
      <rect x="15" y="15" width="4" height="4" fill="currentColor" opacity="0.8"/>
    </svg>
  ),
  waterfall: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="10" width="4" height="10" fill="#6d28d9" stroke="none"/>
      <rect x="7" y="6" width="4" height="4" fill="#059669" stroke="none"/>
      <rect x="12" y="4" width="4" height="6" fill="#059669" stroke="none"/>
      <rect x="17" y="8" width="4" height="2" fill="#dc2626" stroke="none"/>
      <line x1="2" y1="10" x2="24" y2="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2"/>
    </svg>
  ),
  radar: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12,3 21,8 21,16 12,21 3,16 3,8" strokeLinejoin="round"/>
      <polygon points="12,7 17,10 17,14 12,17 7,14 7,10" strokeLinejoin="round" opacity="0.6"/>
      <line x1="12" y1="3" x2="12" y2="21" opacity="0.4"/>
      <line x1="3" y1="8" x2="21" y2="16" opacity="0.4"/>
      <line x1="3" y1="16" x2="21" y2="8" opacity="0.4"/>
    </svg>
  ),
  pivot: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="8" height="5" rx="1"/>
      <rect x="12" y="2" width="5" height="5" rx="1"/>
      <rect x="2" y="9" width="8" height="4" rx="1" fill="currentColor" opacity="0.2"/>
      <rect x="12" y="9" width="5" height="4" rx="1"/>
      <rect x="2" y="15" width="8" height="4" rx="1" fill="currentColor" opacity="0.2"/>
      <rect x="12" y="15" width="5" height="4" rx="1"/>
    </svg>
  ),
  ai_summary: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  histogram: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="14" width="4" height="7" rx="0.5" />
      <rect x="7" y="10" width="4" height="11" rx="0.5" />
      <rect x="12" y="6" width="4" height="15" rx="0.5" />
      <rect x="17" y="9" width="4" height="12" rx="0.5" />
    </svg>
  ),
  bullet: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="20" height="5" rx="1" fill="currentColor" opacity="0.15" stroke="none" />
      <rect x="2" y="5" width="13" height="5" rx="1" fill="currentColor" opacity="0.6" stroke="none" />
      <line x1="16" y1="3" x2="16" y2="12" strokeWidth="2" />
      <rect x="2" y="13" width="20" height="5" rx="1" fill="currentColor" opacity="0.15" stroke="none" />
      <rect x="2" y="13" width="10" height="5" rx="1" fill="currentColor" opacity="0.6" stroke="none" />
      <line x1="14" y1="11" x2="14" y2="20" strokeWidth="2" />
    </svg>
  ),
  gantt: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="4" width="8" height="3" rx="1" fill="currentColor" opacity={0.7}/>
      <rect x="6" y="9" width="10" height="3" rx="1" fill="currentColor" opacity={0.8}/>
      <rect x="10" y="14" width="10" height="3" rx="1" fill="currentColor" opacity={0.9}/>
      <line x1="2" y1="2" x2="2" y2="22" strokeWidth={1} opacity={0.3}/>
    </svg>
  ),
  sankey: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 6h5v4H2z" fill="currentColor" opacity={0.6}/>
      <path d="M17 4h5v8h-5z" fill="currentColor" opacity={0.8}/>
      <path d="M7 7 Q12 7 17 6" strokeWidth={3} opacity={0.5}/>
      <path d="M7 9 Q12 12 17 10" strokeWidth={2} opacity={0.4}/>
      <path d="M2 14h5v4H2z" fill="currentColor" opacity={0.6}/>
    </svg>
  ),
  candlestick: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <line x1="6" y1="3" x2="6" y2="21"/>
      <rect x="4" y="7" width="4" height="8" fill="#16a34a"/>
      <line x1="14" y1="4" x2="14" y2="20"/>
      <rect x="12" y="10" width="4" height="7" fill="#dc2626"/>
    </svg>
  ),
  boxplot: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="6" y="7" width="12" height="10" rx="1"/>
      <line x1="12" y1="4" x2="12" y2="7"/>
      <line x1="12" y1="17" x2="12" y2="20"/>
      <line x1="6" y1="12" x2="18" y2="12"/>
      <line x1="9" y1="4" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
    </svg>
  ),
}


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

// Monta um QueryRequest v2 a partir do bloco + estado de filtros
function buildQueryRequest(block, activeFilters, crossFilters, rangeFilters, globalDateFilter, drilldown, drillFilters = []) {
  const dsId = block.dataset_id
  const filters = []

  // Cross-filter (clique em gráfico) — tem prioridade sobre slicers
  const cross = crossFilters[dsId]
  if (cross) {
    filters.push({ column: cross.col, operator: 'eq', value: cross.val })
  } else {
    // Slicer filters — múltiplas colunas por dataset, suporte a multi-select (array)
    const active = activeFilters[dsId] || {}
    Object.entries(active).forEach(([col, val]) => {
      if (val === null || val === undefined || val === '') return
      if (Array.isArray(val)) {
        if (val.length > 0) filters.push({ column: col, operator: 'in', value: val })
      } else {
        filters.push({ column: col, operator: 'eq', value: String(val) })
      }
    })
  }

  // Range filters (slider)
  const range = rangeFilters[dsId]
  if (range?.col) {
    if (range.min != null) filters.push({ column: range.col, operator: 'gte', value: range.min })
    if (range.max != null) filters.push({ column: range.col, operator: 'lte', value: range.max })
  }

  // Drilldown filter (single-level legacy)
  const effectiveLabelCol = drilldown ? (block.config?.drilldown_col || block.label_col) : block.label_col
  if (drilldown) {
    filters.push({ column: block.label_col, operator: 'eq', value: drilldown.val })
  }

  // G11 multi-level drill filters — apply all accumulated filters from drill_columns chain
  if (drillFilters && drillFilters.length > 0) {
    drillFilters.forEach(f => {
      filters.push({ column: f.col, operator: 'eq', value: String(f.value) })
    })
  }

  // Se label_col não estiver definido, dimensions: [] — execute_query agrupa tudo como "Total"
  const dims = effectiveLabelCol ? [{
    column: effectiveLabelCol,
    type: block.config?.dim_type || 'text',
    granularity: block.config?.granularity || null,
  }] : []
  // For stacked charts, add series_col as a second dimension
  if (['bar_stacked', 'area_stacked'].includes(block.type) && block.config?.series_col) {
    dims.push({ column: block.config.series_col, type: 'text', granularity: null })
  }

  const VALID_AGGS = ['sum', 'count', 'count_distinct', 'avg', 'min', 'max', 'none']
  const rawAgg = block.value_col === '__count__' ? 'count' : (block.agg || 'sum')
  const safeAgg = VALID_AGGS.includes(rawAgg) ? rawAgg : 'sum'

  const req = {
    dimensions: dims,
    metrics: [{
      column: block.value_col,
      aggregation: safeAgg,
    }],
    filters,
  }

  // Filtro de data global do dashboard
  const { dateCol, dateFrom, dateTo } = globalDateFilter || {}
  if (dateCol && (dateFrom || dateTo)) {
    req.date_range = { column: dateCol, from: dateFrom || null, to: dateTo || null }
  }

  // Filtro de data fixo no bloco (override do global)
  if (block.config?.date_col && (block.config?.date_from || block.config?.date_to)) {
    req.date_range = { column: block.config.date_col, from: block.config.date_from || null, to: block.config.date_to || null }
  }

  return req
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUUID(v) { return typeof v === 'string' && UUID_RE.test(v) }

// ── Avaliador matemático seguro (sem eval) ─────────────────────────────────
// Suporta: + - * / ( ) números decimais e unário negativo
function safeMath(expr) {
  const s = (expr || '').replace(/\s+/g, '').replace(/,/g, '.')
  let pos = 0
  function parseExpr() {
    let left = parseTerm()
    while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
      const op = s[pos++]; const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }
  function parseTerm() {
    let left = parseFactor()
    while (pos < s.length && (s[pos] === '*' || s[pos] === '/')) {
      const op = s[pos++]; const right = parseFactor()
      left = op === '*' ? left * right : right !== 0 ? left / right : NaN
    }
    return left
  }
  function parseFactor() {
    if (pos < s.length && s[pos] === '(') { pos++; const v = parseExpr(); if (s[pos] === ')') pos++; return v }
    if (pos < s.length && s[pos] === '-') { pos++; return -parseFactor() }
    const start = pos
    while (pos < s.length && /[\d.]/.test(s[pos])) pos++
    return pos > start ? parseFloat(s.slice(start, pos)) || 0 : 0
  }
  try { const r = parseExpr(); return isFinite(r) ? r : NaN } catch { return NaN }
}

// Substitui [NomeColuna] pelos valores agregados e avalia a expressão
function evaluateExpression(expr, values) {
  const withVals = expr.replace(/\[([^\]]+)\]/g, (_, col) => values[col] != null ? String(values[col]) : '0')
  return safeMath(withVals)
}

function useBlockData(block, activeFilters = {}, crossFilters = {}, rangeFilters = {}, globalDateFilter = {}, drilldown = null, shareToken = null, drillFilters = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const req = buildQueryRequest(block, activeFilters, crossFilters, rangeFilters, globalDateFilter, drilldown, drillFilters)
  const pivotCfgKey = block.type === 'pivot' ? JSON.stringify({ rc: block.config?.row_col, cc: block.config?.col_col, vc: block.config?.value_col }) : null
  const ganttCfgKey = block.type === 'gantt' ? JSON.stringify({ tc: block.config?.task_col, sc: block.config?.start_col, ec: block.config?.end_col, gc: block.config?.group_col }) : null
  const key = JSON.stringify({ dsId: block.dataset_id, req, type: block.type, st: shareToken, pk: pivotCfgKey, gk: ganttCfgKey, expr: block.config?.expression || null })

  useEffect(() => {
    if (['text', 'filter', 'slider', 'image', 'ai_summary'].includes(block.type)) return
    if (!isUUID(block.dataset_id)) { setData(block.static_data || null); return }

    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true
        setLoading(false)
        setError('Tempo limite excedido. Recarregue a página.')
      }
    }, 30000)

    // ── Modo fórmula: dois seletores com agregações independentes ───────────
    if (block.type === 'kpi' && block.config?.formula_mode && block.config?.formula_col_a && block.config?.formula_col_b) {
      setLoading(true); setError(null)
      const baseQuery = { dimensions: [], filters: req.filters || [], ...(req.date_range ? { date_range: req.date_range } : {}) }
      Promise.all([
        api.reports.datasets.queryV2(block.dataset_id, { ...baseQuery, metrics: [{ column: block.config.formula_col_a, aggregation: block.config.formula_agg_a || 'sum' }] })
          .then(res => (res?.data || res)?.[0]?.value ?? 0).catch(() => 0),
        api.reports.datasets.queryV2(block.dataset_id, { ...baseQuery, metrics: [{ column: block.config.formula_col_b, aggregation: block.config.formula_agg_b || 'sum' }] })
          .then(res => (res?.data || res)?.[0]?.value ?? 0).catch(() => 0),
      ])
        .then(([a, b]) => {
          if (cancelled) return
          const op = block.config.formula_op || '/'
          let result
          if (op === '+') result = a + b
          else if (op === '-') result = a - b
          else if (op === '*') result = a * b
          else result = b !== 0 ? a / b : 0
          if (block.config.formula_multiply_100) result *= 100
          setData([{ label: 'formula', value: isFinite(result) ? result : 0 }])
        })
        .catch(e => { if (!cancelled) setError(e.message) })
        .finally(() => { if (!cancelled) { clearTimeout(timeoutId); setLoading(false) } })
      return () => { cancelled = true; clearTimeout(timeoutId) }
    }

    // ── Modo expressão: busca cada [coluna] separadamente e avalia ─────────
    if (block.type === 'kpi' && block.config?.expression?.trim()) {
      const expr = block.config.expression.trim()
      const tokens = [...expr.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
      const unique = [...new Set(tokens)]
      if (!unique.length) { clearTimeout(timeoutId); setData([]); return }
      setLoading(true); setError(null)
      const fetches = unique.map(col =>
        api.reports.datasets.queryV2(block.dataset_id, {
          dimensions: [],
          metrics: [{ column: col, aggregation: block.agg || 'sum' }],
          filters: req.filters || [],
          ...(req.date_range ? { date_range: req.date_range } : {}),
        })
        .then(res => ({ col, value: (res?.data || res)?.[0]?.value ?? 0 }))
        .catch(() => ({ col, value: 0 }))
      )
      Promise.all(fetches)
        .then(results => {
          if (cancelled) return
          const vals = Object.fromEntries(results.map(r => [r.col, r.value]))
          const evaluated = evaluateExpression(expr, vals)
          setData([{ label: 'expr', value: isFinite(evaluated) ? evaluated : 0 }])
        })
        .catch(e => { if (!cancelled) setError(e.message) })
        .finally(() => { if (!cancelled) { clearTimeout(timeoutId); setLoading(false) } })
      return () => { cancelled = true; clearTimeout(timeoutId) }
    }

    // For pivot, require at least row_col and value_col configured
    if (block.type === 'pivot') {
      const cfg = block.config || {}
      const rowCol = cfg.row_col || block.label_col
      const valCol = cfg.value_col || block.value_col
      if (!rowCol || !valCol) { clearTimeout(timeoutId); setData(block.static_data || null); return }
    } else if (block.type === 'gantt') {
      const cfg = block.config || {}
      if (!cfg.task_col || !cfg.start_col || !cfg.end_col) { clearTimeout(timeoutId); setData(block.static_data || null); return }
    } else if (block.type === 'table') {
      if (!block.label_col || !block.value_col) { clearTimeout(timeoutId); setData(null); return }
    } else if (block.type === 'sankey') {
      const cfg = block.config || {}
      if (!cfg.source_col || !cfg.target_col || !cfg.value_col) { clearTimeout(timeoutId); setData(block.static_data || null); return }
    } else if (block.type === 'candlestick') {
      const cfg = block.config || {}
      if (!cfg.date_col || !cfg.open_col || !cfg.high_col || !cfg.low_col || !cfg.close_col) { clearTimeout(timeoutId); setData(block.static_data || null); return }
    } else if (block.type === 'boxplot') {
      const cfg = block.config || {}
      if (!cfg.value_col) { clearTimeout(timeoutId); setData(block.static_data || null); return }
    } else if (block.type === 'meta') {
      // Meta: se tem valor manual do realizado, não busca dataset
      if (block.config?.meta_actual != null && block.config.meta_actual !== '') { clearTimeout(timeoutId); setData([]); return }
      if (!block.value_col) { clearTimeout(timeoutId); setData([]); return }
    } else if (['kpi', 'gauge', 'speedometer', 'bullet'].includes(block.type)) {
      // KPI em modo manual (valor fixo): não busca dataset
      if (block.type === 'kpi' && block.config?.manual_value != null && block.config.manual_value !== '') { clearTimeout(timeoutId); setData([]); return }
      if (!block.value_col) { clearTimeout(timeoutId); setData(block.static_data || null); return }
    } else {
      if (!block.label_col || !block.value_col) { clearTimeout(timeoutId); setData(block.static_data || null); return }
    }
    setLoading(true); setError(null)
    // Pivot fetches raw rows (agg=none) with all relevant columns
    const effectiveReq = block.type === 'pivot' ? (() => {
      const cfg = block.config || {}
      const rowCol = cfg.row_col || block.label_col
      const colCol = cfg.col_col
      const valCol = cfg.value_col || block.value_col
      const dims = [{ column: rowCol, type: 'text' }]
      if (colCol) dims.push({ column: colCol, type: 'text' })
      const pivotReq = {
        dimensions: dims,
        metrics: [{ column: valCol, aggregation: 'none' }],
        filters: req.filters || [],
      }
      if (req.date_range) pivotReq.date_range = req.date_range
      return pivotReq
    })() : block.type === 'gantt' ? (() => {
      const cfg = block.config || {}
      // Use all relevant cols as dimensions so their original string values are preserved
      const dims = [
        { column: cfg.task_col, type: 'text' },
        { column: cfg.start_col, type: 'text' },
        { column: cfg.end_col, type: 'text' },
      ]
      if (cfg.group_col) dims.push({ column: cfg.group_col, type: 'text' })
      const ganttReq = {
        dimensions: dims,
        metrics: [{ column: '__count__', aggregation: 'count' }],
        filters: req.filters || [],
      }
      if (req.date_range) ganttReq.date_range = req.date_range
      return ganttReq
    })() : block.type === 'sankey' ? (() => {
      const cfg = block.config || {}
      return {
        dimensions: [{ column: cfg.source_col, type: 'text' }, { column: cfg.target_col, type: 'text' }],
        metrics: [{ column: cfg.value_col, aggregation: 'sum' }],
        filters: req.filters || [],
      }
    })() : block.type === 'candlestick' ? (() => {
      const cfg = block.config || {}
      return {
        dimensions: [{ column: cfg.date_col, type: 'text' }, { column: cfg.open_col, type: 'number' }, { column: cfg.high_col, type: 'number' }, { column: cfg.low_col, type: 'number' }, { column: cfg.close_col, type: 'number' }],
        metrics: [{ column: '__count__', aggregation: 'count' }],
        filters: req.filters || [],
      }
    })() : block.type === 'boxplot' ? (() => {
      const cfg = block.config || {}
      const bpDims = cfg.group_col ? [{ column: cfg.group_col, type: 'text' }, { column: cfg.value_col, type: 'number' }] : [{ column: cfg.value_col, type: 'number' }]
      return { dimensions: bpDims, metrics: [{ column: '__count__', aggregation: 'count' }], filters: req.filters || [] }
    })() : req
    const queryFn = shareToken
      ? api.reports.publicQueryV2(shareToken, block.dataset_id, effectiveReq)
      : api.reports.datasets.queryV2(block.dataset_id, effectiveReq)
    queryFn
      .then(result => {
        if (cancelled) return
        setData(result?.data || result || [])
      })
      .catch(e => {
        if (cancelled) return
        // Se o bloco tem static_data, sempre usa como fallback silencioso quando a query falha
        if (block.static_data) {
          setData(block.static_data)
        } else {
          console.error('[ReportBuilder] query error', block.type, block.dataset_id, block.label_col, block.value_col, '→', e.message)
          setError(e.message)
        }
      })
      .finally(() => { if (!cancelled) { clearTimeout(timeoutId); setLoading(false) } })
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [key, block.type])

  return { data, loading, error }
}

function FilterBlockPreview({ block, activeFilters, onFilterChange, shareToken, locale = 'pt-BR' }) {
  const vs = VIEWER_STRINGS[locale] || VIEWER_STRINGS['pt-BR']
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const dsId = block.dataset_id
  const col = block.filter_col
  const currentVal = activeFilters[dsId]?.[col]
  const selectedVals = Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal] : [])

  // Fecha ao clicar fora e calcula posição do dropdown via portal
  function openDropdown() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 6, left: r.left, width: r.width })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function handleOut(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function handleScroll() { setOpen(false) }
    document.addEventListener('mousedown', handleOut)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOut)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  useEffect(() => {
    if (!isUUID(dsId) || !col) return
    setLoading(true)
    const req = { dimensions: [{ column: col, type: 'text' }], metrics: [{ column: '__count__', aggregation: 'count' }] }
    const queryFn = shareToken
      ? api.reports.publicQueryV2(shareToken, dsId, req)
      : api.reports.datasets.queryV2(dsId, req)
    queryFn
      .then(result => {
        const data = result?.data || result || []
        setRows(data.filter(r => r.label).sort((a, b) => (b.value || 0) - (a.value || 0)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dsId, col, shareToken])

  if (!dsId || !col) {
    return <div className="flex items-center justify-center h-full text-xs text-gray-300">Configure no painel lateral</div>
  }

  const maxVal = rows.length > 0 ? Math.max(...rows.map(r => r.value)) : 1
  const filtered = rows.filter(r => !search || String(r.label).toLowerCase().includes(search.toLowerCase()))
  const hasActive = selectedVals.length > 0
  const label = block.filter_label || col

  function toggleVal(val) {
    const strVal = String(val)
    const next = selectedVals.includes(strVal)
      ? selectedVals.filter(v => v !== strVal)
      : [...selectedVals, strVal]
    onFilterChange(dsId, col, next.length === 0 ? '' : next.length === 1 ? next[0] : next)
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Trigger — compacto, parece controle secundário */}
      <button
        ref={btnRef}
        onClick={() => open ? setOpen(false) : openDropdown()}
        className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-xl border transition-all ${
          hasActive
            ? 'border-violet-300 bg-violet-50 text-violet-700'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <svg className="w-3.5 h-3.5 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="flex-1 text-left truncate text-xs font-medium">{label}</span>
        {hasActive ? (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-full shrink-0">
            {selectedVals.length}
            <svg
              onClick={e => { e.stopPropagation(); onFilterChange(dsId, col, '') }}
              className="w-2.5 h-2.5 cursor-pointer hover:opacity-70"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 shrink-0">{vs.all}</span>
        )}
        <svg
          className={`w-3 h-3 text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown via portal — renderiza no body, acima de qualquer overflow */}
      {open && dropPos && createPortal(
        <div
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        >
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              />
            </div>
          </div>
          {/* List */}
          <div className="max-h-56 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center py-5">
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-4">{vs.noResults}</p>
            ) : filtered.map(row => {
              const isSelected = selectedVals.includes(String(row.label))
              const pct = Math.round(((row.value || 0) / maxVal) * 100)
              return (
                <button
                  key={row.label}
                  onClick={() => toggleVal(row.label)}
                  className={`relative w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group ${
                    isSelected ? 'bg-violet-50 text-violet-800' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {/* barra de proporção ao fundo */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-lg opacity-[0.07] pointer-events-none transition-all ${isSelected ? 'bg-violet-500' : 'bg-gray-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                  <div className={`w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300 group-hover:border-violet-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1 text-xs truncate font-medium relative z-10">{row.label}</span>
                  <span className={`text-[10px] font-mono tabular-nums shrink-0 relative z-10 ${isSelected ? 'text-violet-500' : 'text-gray-400'}`}>
                    {typeof row.value === 'number' ? row.value.toLocaleString('pt-BR') : row.value}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Footer */}
          {hasActive && (
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => { onFilterChange(dsId, col, ''); setOpen(false) }}
                className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}


// ─── Date filter shortcuts ────────────────────────────────────────────────────
const DATE_SHORTCUTS = [
  { key: 'hoje',        label: 'Hoje',             group: 'Dias' },
  { key: 'ontem',       label: 'Ontem',            group: 'Dias' },
  { key: 'esta_semana', label: 'Esta semana',       group: 'Semanas' },
  { key: 'semana_ant',  label: 'Semana passada',    group: 'Semanas' },
  { key: 'este_mes',    label: 'Este mês',          group: 'Meses' },
  { key: 'mes_ant',     label: 'Mês passado',       group: 'Meses' },
  { key: 'ultimos_3m',  label: 'Últimos 3 meses',   group: 'Meses' },
  { key: 'ultimos_6m',  label: 'Últimos 6 meses',   group: 'Meses' },
  { key: 'este_ano',    label: 'Este ano',           group: 'Anos' },
  { key: 'ultimo_ano',  label: 'Último ano',         group: 'Anos' },
  { key: 'todo',        label: 'Todo o período',     group: null },
]

function _getShortcutRange(key) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  const fmt = dt => dt.toISOString().slice(0, 10)
  const ymd = (yr, mo, dy) => fmt(new Date(yr, mo, dy))
  // Início da semana = segunda-feira (visão empresarial)
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // days since monday
  switch (key) {
    case 'hoje':        return { from: ymd(y, m, d),       to: ymd(y, m, d) }
    case 'ontem':       return { from: ymd(y, m, d - 1),   to: ymd(y, m, d - 1) }
    case 'esta_semana': return { from: fmt(new Date(y, m, d - dow)), to: ymd(y, m, d) }
    case 'semana_ant':  return { from: fmt(new Date(y, m, d - dow - 7)), to: fmt(new Date(y, m, d - dow - 1)) }
    case 'este_mes':    return { from: ymd(y, m, 1),       to: ymd(y, m + 1, 0) }
    case 'mes_ant':     return { from: ymd(y, m - 1, 1),   to: ymd(y, m, 0) }
    case 'ultimos_3m':  return { from: ymd(y, m - 3, 1),   to: ymd(y, m + 1, 0) }
    case 'ultimos_6m':  return { from: ymd(y, m - 6, 1),   to: ymd(y, m + 1, 0) }
    case 'este_ano':    return { from: ymd(y, 0, 1),        to: ymd(y, 11, 31) }
    case 'ultimo_ano':  return { from: ymd(y - 1, 0, 1),   to: ymd(y - 1, 11, 31) }
    default:            return { from: '', to: '' }
  }
}

function _findActiveShortcut(from, to) {
  if (!from && !to) return 'todo'
  for (const s of DATE_SHORTCUTS) {
    if (s.key === 'todo') continue
    const r = _getShortcutRange(s.key)
    if (r.from === from && r.to === to) return s.key
  }
  return null
}

function _fmtDate(ds) {
  if (!ds) return ''
  const [y, mo, d] = ds.split('-')
  return `${d}/${mo}/${y}`
}

const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DAY_HEADERS = ['D','S','T','Q','Q','S','S']

function _MiniCalendar({ year, month, from, to, hovering, onDayClick, onDayHover }) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const pad = n => String(n).padStart(2, '0')
  const ds = d => `${year}-${pad(month + 1)}-${pad(d)}`

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="text-[11px] font-bold text-gray-700 text-center mb-2">
        {MONTH_NAMES_SHORT[month].toUpperCase()}. DE {year}
      </div>
      <div className="grid grid-cols-7 text-center">
        {DAY_HEADERS.map((h, i) => (
          <div key={i} className="text-[10px] text-gray-400 pb-1 font-medium">{h}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr = ds(d)
          const isSel = dateStr === from || dateStr === to
          const end = to || hovering
          const inRange = from && end && dateStr > Math.min(from, end) && dateStr < Math.max(from, end)
          return (
            <div
              key={i}
              onClick={() => onDayClick(dateStr)}
              onMouseEnter={() => onDayHover(dateStr)}
              className={`text-[11px] py-1 cursor-pointer transition-colors select-none ${
                isSel    ? 'bg-violet-600 text-white font-semibold rounded-full' :
                inRange  ? 'bg-violet-100 text-violet-800' :
                           'hover:bg-gray-100 text-gray-700 rounded'
              }`}
            >
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DateFilterBlockPreview({ block, globalDateFilter, onGlobalDateFilterChange }) {
  const col = block.filter_col
  const [open, setOpen] = useState(false)
  const [tempFrom, setTempFrom] = useState('')
  const [tempTo,   setTempTo]   = useState('')
  const [hovering, setHovering] = useState('')
  const [customDays, setCustomDays] = useState('')
  const [calYear,  setCalYear]  = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })

  const from = globalDateFilter?.dateFrom || ''
  const to   = globalDateFilter?.dateTo   || ''

  useEffect(() => {
    if (open) { setTempFrom(from); setTempTo(to) }
  }, [open]) // eslint-disable-line

  // Position the portal dropdown below the trigger button
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const applyRange = (f, t) => {
    if (onGlobalDateFilterChange) onGlobalDateFilterChange(prev => ({ ...prev, dateCol: col, dateFrom: f, dateTo: t }))
    setOpen(false)
  }

  const handleShortcut = key => {
    const r = _getShortcutRange(key)
    applyRange(r.from, r.to)
  }

  const handleDayClick = dateStr => {
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(dateStr); setTempTo('')
    } else {
      const [f, t] = tempFrom <= dateStr ? [tempFrom, dateStr] : [dateStr, tempFrom]
      setTempFrom(f); setTempTo(t)
    }
  }

  const prevMonth = calMonth === 0 ? 11 : calMonth - 1
  const prevYear  = calMonth === 0 ? calYear - 1 : calYear

  const activeKey = _findActiveShortcut(from, to)
  const displayLabel = activeKey
    ? DATE_SHORTCUTS.find(s => s.key === activeKey)?.label
    : (from || to) ? `${_fmtDate(from)} — ${_fmtDate(to)}` : 'Todo o período'

  if (!col) return (
    <div className="flex items-center justify-center h-full text-xs text-gray-300">Configure a coluna de data</div>
  )

  // Agrupar shortcuts por categoria
  const shortcutGroups = DATE_SHORTCUTS.reduce((acc, s) => {
    const g = s.group || '__bottom__'
    if (!acc[g]) acc[g] = []
    acc[g].push(s)
    return acc
  }, {})

  const picker = (
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, minWidth: 580 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl flex overflow-hidden"
    >
      {/* Shortcuts list — grupos */}
      <div className="w-48 border-r border-gray-100 py-3 shrink-0 bg-gray-50/60">
        {['Dias', 'Semanas', 'Meses', 'Anos', '__bottom__'].map(group => {
          const items = shortcutGroups[group]
          if (!items) return null
          return (
            <div key={group} className="mb-1">
              {group !== '__bottom__' && (
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-2 pb-1">{group}</p>
              )}
              {group === '__bottom__' && <div className="mx-4 my-2 border-t border-gray-200" />}
              {items.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleShortcut(s.key)}
                  className={`w-full text-left px-4 py-1.5 text-sm transition-colors rounded-none ${
                    activeKey === s.key
                      ? 'text-violet-700 bg-violet-100 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* Calendar area */}
      <div className="p-5 flex-1">
        {/* Range inputs */}
        <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <input type="date" value={tempFrom}
            onChange={e => setTempFrom(e.target.value)}
            className="bg-transparent text-sm text-gray-700 focus:outline-none flex-1 min-w-0"
          />
          <span className="text-gray-300 font-light">→</span>
          <input type="date" value={tempTo}
            onChange={e => setTempTo(e.target.value)}
            className="bg-transparent text-sm text-gray-700 focus:outline-none flex-1 min-w-0"
          />
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex gap-16">
            <span className="text-xs font-semibold text-gray-500">{MONTH_NAMES_SHORT[prevMonth]} {prevYear}</span>
            <span className="text-xs font-semibold text-gray-500">{MONTH_NAMES_SHORT[calMonth]} {calYear}</span>
          </div>
          <button
            onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6" onMouseLeave={() => setHovering('')}>
          <_MiniCalendar year={prevYear} month={prevMonth} from={tempFrom} to={tempTo} hovering={hovering} onDayClick={handleDayClick} onDayHover={setHovering} />
          <_MiniCalendar year={calYear}  month={calMonth}  from={tempFrom} to={tempTo} hovering={hovering} onDayClick={handleDayClick} onDayHover={setHovering} />
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => { applyRange('', ''); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Limpar
          </button>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
            <button
              onClick={() => applyRange(tempFrom, tempTo)}
              disabled={!tempFrom && !tempTo}
              className="px-5 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-semibold disabled:opacity-40 transition-colors shadow-sm"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const hasFilter = from || to

  return (
    <div className="w-full flex items-center px-1">
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all w-full group ${
          hasFilter
            ? 'border-violet-300 bg-violet-50 text-violet-700 hover:border-violet-400'
            : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:bg-violet-50/30'
        }`}
      >
        <svg className={`w-4 h-4 shrink-0 ${hasFilter ? 'text-violet-500' : 'text-gray-400 group-hover:text-violet-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span className={`flex-1 text-left truncate text-sm font-medium ${hasFilter ? 'text-violet-700' : 'text-gray-600'}`}>{displayLabel}</span>
        {hasFilter && (
          <span
            onClick={e => { e.stopPropagation(); applyRange('', '') }}
            className="w-4 h-4 flex items-center justify-center rounded-full bg-violet-200 text-violet-600 hover:bg-violet-300 text-[10px] font-bold shrink-0 cursor-pointer"
            title="Limpar filtro"
          >✕</span>
        )}
        <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${hasFilter ? 'text-violet-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && typeof document !== 'undefined' && createPortal(picker, document.body)}
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

function downloadCSV(data, title) {
  if (!data || data.length === 0) return
  const keys = Object.keys(data[0])
  const rows = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${title || 'export'}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function downloadXLSX(data, title) {
  if (!data || data.length === 0) return
  const cols = Object.keys(data[0])
  const rows = [cols, ...data.map(row => cols.map(c => row[c] ?? ''))]
  const xmlRows = rows.map(row =>
    `<Row>${row.map(cell => `<Cell><Data ss:Type="${typeof cell === 'number' ? 'Number' : 'String'}">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Data></Cell>`).join('')}</Row>`
  ).join('\n')
  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Dados">
    <Table>${xmlRows}</Table>
  </Worksheet>
</Workbook>`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = `${title || 'dados'}.xls`
  a.href = url
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadPNG(blockId, title) {
  const el = document.querySelector(`[data-block-id="${blockId}"]`)
  if (!el) return
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
    const a = document.createElement('a')
    a.download = `${title || 'chart'}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  } catch (e) { console.error('PNG export error:', e) }
}

// Mapa BR — posições aproximadas dos centros de cada estado (% do SVG 100x80)
const BR_STATES = [
  { uf: 'AC', x: 12, y: 52 }, { uf: 'AL', x: 84, y: 43 }, { uf: 'AM', x: 24, y: 38 },
  { uf: 'AP', x: 62, y: 20 }, { uf: 'BA', x: 74, y: 54 }, { uf: 'CE', x: 82, y: 32 },
  { uf: 'DF', x: 61, y: 63 }, { uf: 'ES', x: 80, y: 67 }, { uf: 'GO', x: 57, y: 62 },
  { uf: 'MA', x: 70, y: 33 }, { uf: 'MG', x: 70, y: 68 }, { uf: 'MS', x: 52, y: 74 },
  { uf: 'MT', x: 42, y: 58 }, { uf: 'PA', x: 52, y: 30 }, { uf: 'PB', x: 87, y: 37 },
  { uf: 'PE', x: 82, y: 41 }, { uf: 'PI', x: 75, y: 40 }, { uf: 'PR', x: 57, y: 82 },
  { uf: 'RJ', x: 74, y: 73 }, { uf: 'RN', x: 87, y: 31 }, { uf: 'RO', x: 30, y: 57 },
  { uf: 'RR', x: 30, y: 22 }, { uf: 'RS', x: 54, y: 92 }, { uf: 'SC', x: 58, y: 87 },
  { uf: 'SE', x: 84, y: 48 }, { uf: 'SP', x: 64, y: 76 }, { uf: 'TO', x: 62, y: 47 },
]

function TableBlock({ block, data, config, format, getOpacity, handleClick, vs }) {
  const [sortKey, setSortKey] = useState('value')
  const [sortDir, setSortDir] = useState('desc')
  const maxVal = Math.max(...data.map(d => Math.abs(d.value || 0)), 1)
  const tableMode = config.table_mode || 'bar'
  const accentColor = config.accent_color || '#6366f1'

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'label' ? 'asc' : 'desc') }
  }

  const sorted = [...data].sort((a, b) => {
    if (sortKey === 'label') {
      const cmp = String(a.label ?? '').localeCompare(String(b.label ?? ''), 'pt-BR', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    }
    return sortDir === 'desc' ? (b.value || 0) - (a.value || 0) : (a.value || 0) - (b.value || 0)
  })

  const SortArrow = ({ col }) => sortKey !== col ? null : (
    <svg className="w-3 h-3 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  )

  return (
    <div className="overflow-auto h-full">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th
              className="px-3 py-2 text-left font-semibold text-[11px] text-gray-500 bg-gray-50/90 backdrop-blur-sm border-b border-gray-200 uppercase tracking-wider cursor-pointer select-none hover:text-violet-600 transition-colors"
              onClick={() => toggleSort('label')}
            >
              <span className="flex items-center gap-1">
                {block.label_col || 'Label'}
                <SortArrow col="label" />
              </span>
            </th>
            <th
              className="px-3 py-2 text-right font-semibold text-[11px] text-gray-500 bg-gray-50/90 backdrop-blur-sm border-b border-gray-200 uppercase tracking-wider cursor-pointer select-none hover:text-violet-600 transition-colors"
              onClick={() => toggleSort('value')}
            >
              <span className="flex items-center justify-end gap-1">
                {block.value_col || vs.value}
                <SortArrow col="value" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const barPct = Math.round((Math.abs(row.value || 0) / maxVal) * 100)
            let rowHighlight = false
            if (config.highlight_threshold != null && config.highlight_threshold !== '') {
              const threshold = parseFloat(config.highlight_threshold)
              rowHighlight = config.highlight_operator === 'lt' ? row.value < threshold : row.value > threshold
            }
            const rowBg = rowHighlight
              ? (config.highlight_color || '#fef3c7')
              : i % 2 === 0 ? 'transparent' : 'rgba(249,250,251,0.6)'
            const badgeColor = COLORS[i % COLORS.length]
            return (
              <tr
                key={i}
                className="group cursor-pointer"
                style={{ opacity: getOpacity(row.label), backgroundColor: rowBg }}
                onClick={() => handleClick(row.label)}
              >
                <td className="px-3 py-1.5 text-gray-700 font-medium border-b border-gray-50/80 group-hover:bg-violet-50/60 transition-colors">
                  {tableMode === 'badge' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: badgeColor + '18', color: badgeColor }}>
                      {row.label}
                    </span>
                  ) : (
                    <span className="truncate block max-w-[160px]">{row.label}</span>
                  )}
                </td>
                <td className="px-3 py-1.5 border-b border-gray-50/80 group-hover:bg-violet-50/60 transition-colors relative overflow-hidden">
                  {tableMode === 'heat' ? (
                    <>
                      <div className="absolute inset-0 pointer-events-none transition-all" style={{ backgroundColor: accentColor, opacity: (barPct / 100) * 0.22 }} />
                      <span className="relative z-10 flex justify-end tabular-nums text-gray-700 font-semibold">{fmt(row.value, format, config)}</span>
                    </>
                  ) : tableMode === 'plain' ? (
                    <span className="flex justify-end tabular-nums text-gray-600 font-semibold">{fmt(row.value, format, config)}</span>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[80px]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: accentColor + 'aa' }} />
                      </div>
                      <span className="tabular-nums text-gray-700 font-semibold whitespace-nowrap text-right min-w-[48px]">{fmt(row.value, format, config)}</span>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AISummaryBlock({ block, readOnly }) {
  const cfg = block.config || {}
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  async function generateSummary() {
    if (!cfg.dataset_id && !block.dataset_id) return
    const dsId = cfg.dataset_id || block.dataset_id
    setLoading(true)
    try {
      const question = cfg.prompt || 'Resuma os principais insights desses dados em 3 bullets concisos'
      const data = await api.reports.aiQuery(dsId, question)
      setSummary(data.answer || data.text || '')
      setGenerated(true)
    } catch (e) {
      setSummary('Erro ao gerar resumo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const dsId = cfg.dataset_id || block.dataset_id
    if (dsId && !generated && !loading) generateSummary()
  }, [cfg.dataset_id, block.dataset_id])

  const dsId = cfg.dataset_id || block.dataset_id

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">✨ Resumo AI</span>
        {!readOnly && (
          <button onClick={generateSummary} disabled={loading} className="text-xs text-gray-400 hover:text-purple-600 ml-auto">
            {loading ? '⏳' : '↻ Atualizar'}
          </button>
        )}
      </div>
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!loading && summary && (
        <div className="flex-1 overflow-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</div>
      )}
      {!loading && !summary && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
          <p className="text-sm">Configure um dataset e clique para gerar</p>
          <button onClick={generateSummary} disabled={!dsId} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
            Gerar resumo
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Packed Bubble Chart ─────────────────────────────────────────────────────
function BubblePackChart({ data, palette, fmt, format, config, onClickBubble }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 400, h: 300 })

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.max(width, 80), h: Math.max(height, 80) })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const circles = useMemo(() => {
    if (!data.length) return []
    const { w, h } = size
    const pad = Math.min(w, h) * 0.02
    try {
      const root = d3hierarchy({ children: data })
        .sum(d => Math.abs(d.value) || 0.001)
        .sort((a, b) => b.value - a.value)
      d3pack().size([w - pad * 2, h - pad * 2]).padding(3)(root)
      return root.leaves().map(leaf => ({
        x: leaf.x + pad,
        y: leaf.y + pad,
        r: leaf.r,
        label: String(leaf.data.label ?? ''),
        value: leaf.data.value,
      }))
    } catch { return [] }
  }, [data, size])

  function truncText(text, maxChars) {
    return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text
  }

  function fmtVal(v) {
    if (typeof v !== 'number') return String(v ?? '')
    const a = Math.abs(v)
    if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B'
    if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'
    if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K'
    return v.toLocaleString('pt-BR')
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg width={size.w} height={size.h} style={{ display: 'block' }}>
        {circles.map((c, i) => {
          const color = palette[i % palette.length]
          const fs = Math.max(8, Math.min(13, c.r * 0.32))
          const fsVal = Math.max(7, fs * 0.82)
          const dlCfg = config?.show_data_labels
          const showLabel = dlCfg === true ? c.r > 10 : dlCfg === false ? false : c.r > 18
          const showValue = dlCfg === true ? c.r > 16 : dlCfg === false ? false : c.r > 28
          const maxChars = Math.max(3, Math.floor(c.r * 1.6 / fs))
          return (
            <g key={i} transform={`translate(${c.x},${c.y})`} onClick={() => onClickBubble?.(c.label)} style={{ cursor: onClickBubble ? 'pointer' : 'default' }}>
              <circle r={c.r} fill={color} opacity={0.88} />
              <circle r={c.r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
              {showLabel && (
                <text
                  textAnchor="middle"
                  dy={showValue ? `-${fsVal * 0.6}px` : '0.35em'}
                  fontSize={fs}
                  fontWeight="700"
                  fill="white"
                  style={{ pointerEvents: 'none', userSelect: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {truncText(c.label, maxChars)}
                </text>
              )}
              {showValue && (
                <text
                  textAnchor="middle"
                  dy={`${fs * 0.7}px`}
                  fontSize={fsVal}
                  fontWeight="500"
                  fill="rgba(255,255,255,0.9)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {fmtVal(c.value)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function PivotTableBlock({ block, data, config }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const rowCol = config.row_col || block.label_col
  const colCol = config.col_col
  const valCol = config.value_col || block.value_col
  const agg = config.agg || block.agg || 'sum'

  if (!rowCol || !colCol || !valCol || !data?.length) {
    return <div className="flex items-center justify-center h-full text-[#94A3B8] text-xs">Configure linha, coluna e valor</div>
  }

  const pivotRows = [...new Set(data.map(d => String(d[rowCol] ?? '')))]
  const pivotCols = [...new Set(data.map(d => String(d[colCol] ?? '')))]

  const groups = {}
  for (const d of data) {
    const r = String(d[rowCol] ?? ''), c = String(d[colCol] ?? '')
    const v = parseFloat(d[valCol] ?? 0) || 0
    const k = `${r}|||${c}`
    if (!groups[k]) groups[k] = []
    groups[k].push(v)
  }

  function aggFn(values) {
    if (!values?.length) return null
    if (agg === 'sum') return values.reduce((a, b) => a + b, 0)
    if (agg === 'avg') return values.reduce((a, b) => a + b, 0) / values.length
    if (agg === 'count') return values.length
    if (agg === 'max') return Math.max(...values)
    if (agg === 'min') return Math.min(...values)
    return values[0]
  }

  function fmtCell(v) {
    if (v == null) return '—'
    return typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(v)
  }

  function getRowTotal(r) { return aggFn(pivotCols.flatMap(c => groups[`${r}|||${c}`] || [])) }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sortedRows = [...pivotRows].sort((a, b) => {
    let va, vb
    if (sortCol === '__row__' || !sortCol) {
      return sortDir === 'asc' ? a.localeCompare(b, 'pt-BR') : b.localeCompare(a, 'pt-BR')
    }
    va = sortCol === '__total__' ? (getRowTotal(a) ?? -Infinity) : (aggFn(groups[`${a}|||${sortCol}`]) ?? -Infinity)
    vb = sortCol === '__total__' ? (getRowTotal(b) ?? -Infinity) : (aggFn(groups[`${b}|||${sortCol}`]) ?? -Infinity)
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const colTotals = pivotCols.map(c => aggFn(pivotRows.flatMap(r => groups[`${r}|||${c}`] || [])))
  const grandTotal = aggFn(Object.values(groups).flat())

  const SortArrow = ({ col }) => (
    <svg className={`w-2.5 h-2.5 shrink-0 ${sortCol === col ? 'opacity-70' : 'opacity-15'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortCol === col && sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  )

  return (
    <div className="overflow-auto h-full text-xs">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-[#E2E8F0] bg-[#F8F7FC] p-1.5 text-left font-semibold text-[#6D28D9] min-w-[80px] cursor-pointer select-none hover:bg-violet-50 transition-colors" onClick={() => toggleSort('__row__')}>
              <span className="flex items-center gap-1">{rowCol}<SortArrow col="__row__"/></span>
            </th>
            {pivotCols.map(c => (
              <th key={c} className="border border-[#E2E8F0] bg-[#F8F7FC] p-1.5 text-right font-semibold text-[#6B7280] min-w-[60px] truncate max-w-[100px] cursor-pointer select-none hover:bg-violet-50 hover:text-[#6D28D9] transition-colors" onClick={() => toggleSort(c)}>
                <span className="flex items-center justify-end gap-1">{c}<SortArrow col={c}/></span>
              </th>
            ))}
            <th className="border border-[#E2E8F0] bg-violet-50 p-1.5 text-right font-bold text-[#6D28D9] cursor-pointer select-none hover:bg-violet-100 transition-colors" onClick={() => toggleSort('__total__')}>
              <span className="flex items-center justify-end gap-1">Total<SortArrow col="__total__"/></span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, ri) => (
            <tr key={r} className={ri % 2 === 0 ? 'bg-white' : 'bg-[#F8F7FC]/60'}>
              <td className="border border-[#E2E8F0] p-1.5 font-medium text-[#1A1A2E] truncate max-w-[120px]">{r}</td>
              {pivotCols.map(c => (
                <td key={c} className="border border-[#E2E8F0] p-1.5 text-right text-[#1A1A2E]">{fmtCell(aggFn(groups[`${r}|||${c}`]))}</td>
              ))}
              <td className="border border-[#E2E8F0] bg-violet-50/50 p-1.5 text-right font-semibold text-[#6D28D9]">{fmtCell(getRowTotal(r))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-violet-50 font-bold">
            <td className="border border-[#E2E8F0] p-1.5 text-[#6D28D9]">Total</td>
            {colTotals.map((t, i) => (
              <td key={i} className="border border-[#E2E8F0] p-1.5 text-right text-[#1A1A2E]">{fmtCell(t)}</td>
            ))}
            <td className="border border-[#E2E8F0] bg-violet-100 p-1.5 text-right text-[#6D28D9]">{fmtCell(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function BlockEmptyState({ block, readOnly, onBlockAction }) {
  const BLOCK_LABELS = {
    kpi: 'KPI', bar: 'Barras', bar_h: 'Barras H', line: 'Linha', area: 'Área',
    pie: 'Pizza', table: 'Tabela', scatter: 'Dispersão', combo: 'Combo',
    bubble: 'Bolhas', treemap: 'Treemap', gauge: 'Gauge', speedometer: 'Velocímetro',
    funnel: 'Funil', map: 'Mapa', heatmap: 'Heatmap', waterfall: 'Cascata',
    radar: 'Radar', histogram: 'Histograma', bullet: 'Bullet', meta: 'Meta',
  }
  const BLOCK_HINTS = {
    kpi:         'Selecione um dataset e uma coluna numérica',
    bar:         'Precisa de 1 dimensão (texto/data) + 1 métrica (número)',
    bar_h:       'Precisa de 1 dimensão (texto/data) + 1 métrica (número)',
    line:        'Ideal com uma coluna de data no eixo X',
    area:        'Ideal com uma coluna de data no eixo X',
    pie:         'Precisa de 1 dimensão e 1 métrica numérica',
    table:       'Selecione um dataset — exibe todas as colunas',
    scatter:     'Precisa de 2 colunas numéricas (X e Y)',
    combo:       'Precisa de 1 dimensão + 2 métricas numéricas',
    bubble:      'Precisa de dimensão + 2 colunas numéricas',
    treemap:     'Precisa de 1 dimensão e 1 métrica numérica',
    gauge:       'Selecione uma coluna numérica como valor',
    speedometer: 'Selecione uma coluna numérica como valor',
    funnel:      'Precisa de 1 dimensão e 1 métrica numérica',
    map:         'Precisa de coluna com siglas de estado (SP, RJ...)',
    heatmap:     'Precisa de 2 dimensões e 1 métrica numérica',
    waterfall:   'Precisa de 1 dimensão e 1 métrica numérica',
    radar:       'Precisa de 1 dimensão e 1 métrica numérica',
    histogram:   'Precisa de 1 coluna numérica',
    bullet:      'Selecione uma coluna numérica como valor',
    meta:        'Defina a meta e o valor realizado nas configurações',
  }
  const hint = BLOCK_HINTS[block.type] || 'Selecione um dataset e configure as colunas'
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center select-none">
      <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-dashed border-violet-200 flex items-center justify-center">
        <span className="[&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-violet-300">{TYPE_ICONS[block.type] || <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-0.5">{BLOCK_LABELS[block.type] || block.type} sem dados</p>
        <p className="text-[10px] text-gray-400 leading-snug max-w-[160px]">{hint}</p>
      </div>
      {!readOnly && onBlockAction && (
        <button
          onClick={e => { e.stopPropagation(); onBlockAction(block.id, 'config') }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-semibold text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
          Configurar
        </button>
      )}
    </div>
  )
}

function BlockPreview({ block, readOnly, onTextChange, activeFilters, crossFilters, onCrossFilter, onFilterChange, globalDateFilter, onGlobalDateFilterChange, shareToken, rangeFilters = {}, onRangeChange, locale = 'pt-BR', onBlockAction }) {
  const vs = VIEWER_STRINGS[locale] || VIEWER_STRINGS['pt-BR']
  const [drilldown, setDrilldown] = useState(null) // { val: string } when active (legacy single-level)

  // G11 — multi-level drill state: { level: number, filters: [{col, value}] }
  const [drillState, setDrillState] = useState({ level: 0, filters: [] })

  function handleDrillDown(clickedLabel) {
    const drillCols = block.config?.drill_columns || []
    if (drillState.level >= drillCols.length) return // already at deepest level
    const nextCol = drillCols[drillState.level]
    if (!nextCol) return
    setDrillState(prev => ({
      level: prev.level + 1,
      filters: [...prev.filters, { col: nextCol, value: clickedLabel }]
    }))
  }

  function handleDrillReset() {
    setDrillState({ level: 0, filters: [] })
  }

  const drillFilters = drillState.filters
  const hasDrillColumns = (block.config?.drill_columns || []).length > 0
  const isDrilled = drillFilters.length > 0

  const { data, loading, error } = useBlockData(block, activeFilters, crossFilters, rangeFilters, globalDateFilter, drilldown, shareToken, drillFilters)
  const activeCrossVal = drilldown ? null : crossFilters[block.dataset_id]?.val
  const hasDrilldown = !!block.config?.drilldown_col
  const canExport = data && data.length > 0 && !['text','filter','slider','image','ai_summary'].includes(block.type)

  // Deve ficar ANTES de qualquer return condicional — Regra dos Hooks
  const [mapTooltip, setMapTooltip] = useState(null) // usado pelo bloco tipo 'map'

  const handleCustomEvent = useCallback((eventName, label, value) => {
    if (!eventName) return
    try {
      window.parent.postMessage(
        { type: eventName, label, value, reportId: block.id },
        '*'
      )
    } catch {}
  }, [block.id])

  if (block.type === 'text') {
    if (readOnly) {
      const html = block.config?.text || ''
      const isPlain = !/<[a-z][\s\S]*>/i.test(html)
      return (
        <div
          className="w-full h-full text-sm overflow-auto leading-relaxed whitespace-pre-wrap"
          style={{ color: block.config?.text_color || '#4b5563' }}
          dangerouslySetInnerHTML={isPlain ? undefined : { __html: html }}
        >
          {isPlain ? html : undefined}
        </div>
      )
    }
    return <RichTextEditor block={block} onTextChange={onTextChange} />
  }

  if (block.type === 'filter') {
    if (block.config?.date_mode) {
      return <DateFilterBlockPreview block={block} globalDateFilter={globalDateFilter} onGlobalDateFilterChange={onGlobalDateFilterChange} />
    }
    return <FilterBlockPreview block={block} activeFilters={activeFilters} onFilterChange={onFilterChange} shareToken={shareToken} locale={locale} />
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

  if (block.type === 'ai_summary') {
    return <AISummaryBlock block={block} readOnly={readOnly} />
  }

  const effectiveDatasetId = (block.dataset_id && block.dataset_id !== '__onboarding__') ? block.dataset_id : null
  const isSampleData = block.static_data && !effectiveDatasetId
  // KPI/gauge/speedometer/bullet só precisam de dataset_id + value_col (sem dimensão obrigatória)
  const noLabelRequired = ['kpi', 'gauge', 'speedometer', 'bullet', 'meta', 'pivot', 'gantt', 'sankey', 'candlestick', 'boxplot', 'table'].includes(block.type)
  if (!isSampleData && ['kpi', 'gauge', 'speedometer', 'bullet'].includes(block.type) && (!effectiveDatasetId || !block.value_col) && !(block.type === 'kpi' && block.config?.manual_value != null && block.config.manual_value !== '') && !(block.type === 'kpi' && block.config?.expression?.trim())) {
    return <BlockEmptyState block={block} readOnly={readOnly} onBlockAction={onBlockAction} />
  }
  if (!isSampleData && !noLabelRequired && (!effectiveDatasetId || !block.label_col || !block.value_col)) {
    return <BlockEmptyState block={block} readOnly={readOnly} onBlockAction={onBlockAction} />
  }

  // Table em modo bruto — não depende de data agregada, busca direto do /rows
  if (block.type === 'table') {
    if (!effectiveDatasetId) return <BlockEmptyState block={block} readOnly={readOnly} onBlockAction={onBlockAction} />
    if (!block.label_col || !block.value_col) {
      return <RawTableBlock datasetId={effectiveDatasetId} columns={block.config?.raw_columns || []} readOnly={readOnly} />
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-xs text-gray-400">{vs.loading}</div>
  if (error) {
    const isNotFound = error.includes('not found') || error.includes('não encontrado') || error === 'Erro desconhecido' || error.includes('404')
    if (isNotFound) {
      const hadDataset = block.dataset_id && isUUID(block.dataset_id)
      return (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 px-3">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          {hadDataset
            ? <span className="text-xs text-amber-500 text-center font-medium">Fonte de dados não encontrada<br/><span className="text-gray-400 font-normal">Selecione outro dataset nas configurações</span></span>
            : <span className="text-xs text-gray-400 text-center">Selecione um dataset<br/>nas configurações do bloco</span>
          }
        </div>
      )
    }
    return <div className="flex items-center justify-center h-full text-xs text-red-400 px-2 text-center">{error}</div>
  }
  if (!data || data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-3 text-center">
      {drilldown && (
        <button onClick={() => setDrilldown(null)} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors">
          ← {drilldown.val}
        </button>
      )}
      {block.type === 'table' && block.label_col && !block.value_col ? (
        <>
          <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 6v12M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>
          <p className="text-[10px] text-gray-400 font-medium">Arraste uma coluna <span className="font-bold text-blue-400">#</span> para a tabela</p>
          <p className="text-[9px] text-gray-300">ou clique em <strong>Editar</strong> para configurar</p>
        </>
      ) : (
        <span className="text-xs text-gray-300">{vs.noData}</span>
      )}
    </div>
  )

  const color = block.config?.color || COLORS[0]
  const format = block.config?.format || 'number'
  const config = block.config || {}
  const palette = config.colors
    ? config.colors.split(',').map(c => c.trim()).filter(Boolean)
    : COLORS

  // N24 — Mapeamento de valores: aplica value_mappings sobre os dados antes de renderizar
  function applyMappings(rows, mappings) {
    if (!mappings || !mappings.length) return rows
    return rows.map(row => {
      const newRow = { ...row }
      for (const [key, val] of Object.entries(newRow)) {
        const match = mappings.find(m => String(m.from) === String(val))
        if (match) newRow[key] = match.to
      }
      return newRow
    })
  }
  const displayData = applyMappings(data, config.value_mappings)

  function handleChartClickUrl(label) {
    const clickUrl = block.config?.click_url
    if (!clickUrl) return false
    const url = clickUrl.replace('{label}', encodeURIComponent(label))
    if (url.startsWith('http')) {
      window.open(url, '_blank')
    } else {
      window.location.href = url
    }
    return true
  }

  const handleClick = (label) => {
    // click_url takes priority if set
    if (handleChartClickUrl(label)) return
    // G11 multi-level drill takes priority over legacy drilldown and cross-filter
    if (hasDrillColumns && drillState.level < (block.config?.drill_columns || []).length) {
      handleDrillDown(label)
    } else if (hasDrilldown && !drilldown) {
      setDrilldown({ val: label })
    } else if (!hasDrilldown && onCrossFilter) {
      onCrossFilter(block.dataset_id, block.label_col, label)
    }
  }

  const getOpacity = (label) => {
    if (!activeCrossVal) return 1
    return label === activeCrossVal ? 1 : 0.25
  }

  // Drilldown breadcrumb chip (legacy single-level)
  const DrillChip = drilldown ? (
    <button
      onClick={() => setDrilldown(null)}
      className="flex items-center gap-1 self-start mb-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-medium hover:bg-purple-200 transition-colors shrink-0"
    >
      ← {block.label_col}: {drilldown.val}
    </button>
  ) : null

  // G11 multi-level drill breadcrumb
  const DrillBreadcrumb = isDrilled ? (
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
      <span className="truncate">Drill: {drillState.filters.map(f => `${f.col}=${f.value}`).join(' → ')}</span>
      <button
        onClick={handleDrillReset}
        className="text-purple-600 hover:underline shrink-0"
      >
        ← Voltar
      </button>
    </div>
  ) : null

  // ── Meta block — card comparativo de meta vs realizado ────────────────────
  if (block.type === 'meta') {
    const target = parseFloat(block.config?.meta_target) || 0
    const hasManualActual = block.config?.meta_actual != null && block.config.meta_actual !== ''
    const actual = hasManualActual
      ? parseFloat(block.config.meta_actual) || 0
      : (displayData || []).reduce((s, d) => s + (d.value || 0), 0)
    if (!target && !hasManualActual && !block.value_col) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 px-3 text-center select-none">
          <svg className="w-7 h-7 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-[10px] text-gray-400 font-medium leading-snug">Clique em <strong>Editar</strong> para definir a meta</p>
        </div>
      )
    }
    const achieved = target > 0 ? actual >= target : actual > 0
    const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 999) : 0
    const accentColor = achieved ? (block.config?.color_ok || '#10b981') : (block.config?.color_fail || '#ef4444')
    const unit = block.config?.meta_unit || ''
    const fmtMeta = v => {
      const n = Number(v)
      if (!isFinite(n)) return String(v)
      const s = n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
      return unit ? `${unit}\u00A0${s}` : s
    }
    return (
      <div className="flex flex-col justify-between h-full py-0.5">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide font-semibold">Realizado</p>
          <p className="font-black leading-none tracking-tight tabular-nums" style={{ color: accentColor, fontSize: '28px' }}>
            {fmtMeta(actual)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${achieved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {achieved ? '✓' : '↓'} {pct}%
            </span>
            <span className="text-[10px] text-gray-400 leading-none">da meta</span>
          </div>
        </div>
        <div className="space-y-1.5 mt-2">
          {target > 0 && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: accentColor }} />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400 truncate">{block.config?.meta_label || 'Meta'}</span>
            {target > 0 && <span className="text-[10px] font-semibold text-gray-600 shrink-0">{fmtMeta(target)}</span>}
          </div>
        </div>
      </div>
    )
  }

  if (block.type === 'kpi') {
    const isManualKpi = block.config?.manual_value != null && block.config.manual_value !== ''
    const total = isManualKpi
      ? parseFloat(block.config.manual_value) || 0
      : (displayData || []).reduce((s, d) => s + (d.value || 0), 0)
    const accentColor = config.accent_color || '#6366f1'
    let valueColor = accentColor
    if (config.threshold_warn != null && config.threshold_warn !== '' && total < parseFloat(config.threshold_warn)) valueColor = '#ef4444'
    else if (config.threshold_ok != null && config.threshold_ok !== '' && total >= parseFloat(config.threshold_ok)) valueColor = '#10b981'
    const autoFormat = (format === 'currency' && Math.abs(total) >= 10000) ? 'compact_currency' : format
    const sizeMap = { lg: '18px', xl: '20px', '2xl': '24px', '4xl': '31px' }
    const baseFontSize = parseInt(sizeMap[config.size || '4xl'] || '31px')
    const manualDelta = config.delta != null && config.delta !== '' ? String(config.delta) : null
    const autoDeltaVal = (() => {
      if (!config.auto_delta || isManualKpi) return null
      const d = displayData || []
      if (d.length < 2) return null
      const last = d[d.length - 1]?.value
      const prev = d[d.length - 2]?.value
      return prev != null && prev !== 0 ? ((last - prev) / Math.abs(prev) * 100).toFixed(1) : null
    })()
    const delta = autoDeltaVal ?? manualDelta
    const deltaNum = delta ? parseFloat(delta) : null
    const deltaPositive = deltaNum != null ? deltaNum >= 0 : null
    const isDefaultVsMonth = !config.delta_label ||
      Object.values(VIEWER_STRINGS).some(s => s.vsMonth === config.delta_label)
    const deltaLabel = isDefaultVsMonth ? vs.vsMonth : config.delta_label
    const formattedValue = autoFormat === 'compact_currency' ? fmtCompactCurrency(total) : fmt(total, format, config)
    const charLen = formattedValue.length
    const scaledSize = charLen <= 8 ? baseFontSize
      : charLen <= 11 ? Math.max(16, Math.round(baseFontSize * 0.78))
      : charLen <= 14 ? Math.max(14, Math.round(baseFontSize * 0.62))
      : Math.max(12, Math.round(baseFontSize * 0.52))
    const valueFontSize = `${scaledSize}px`
    const sparkData = !isManualKpi && config.show_sparkline ? (displayData || []) : []
    const sparkTrend = sparkData.length > 1
      ? (sparkData[sparkData.length - 1]?.value > sparkData[0]?.value ? 'up' : 'down')
      : 'flat'
    const sparkColor = sparkTrend === 'up' ? '#10b981' : sparkTrend === 'down' ? '#ef4444' : accentColor
    return (
      <div className="flex flex-col gap-0 pt-0.5 h-full">
        <div className="flex-1 min-h-0">
          <p className="font-black leading-none tracking-tight tabular-nums overflow-hidden" style={{ color: valueColor, fontSize: valueFontSize }}>
            {formattedValue}
          </p>
          {delta && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${deltaPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {deltaPositive ? '↑' : '↓'} {deltaPositive && deltaNum > 0 ? '+' : ''}{delta}%
              </span>
              <span className="text-[10px] text-gray-400 leading-none">{deltaLabel}</span>
            </div>
          )}
          <div className="h-[3px] rounded-full mt-3 shrink-0" style={{ backgroundColor: accentColor, width: '28px' }} />
        </div>
        {sparkData.length > 1 && (
          <div className="mt-1 -mx-0.5" style={{ height: 44 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark_${block.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparkColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={sparkColor} strokeWidth={1.5} fill={`url(#spark_${block.id})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    )
  }

  const tickFmt = v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }
  const tooltipStyle = { fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(109,40,217,0.12)', padding: '6px 10px', background: '#fff' }
  // Annotation markers for charts (vertical lines with label)
  const annotationLines = (config.annotations || []).map((ann, i) => (
    <ReferenceLine key={`ann_${i}`} x={ann.x} stroke={ann.color || '#f59e0b'} strokeDasharray="4 2" strokeWidth={1.5}
      label={{ value: ann.text, position: 'insideTopLeft', fontSize: 9, fill: ann.color || '#f59e0b' }} />
  ))
  const annotationLinesH = (config.annotations || []).map((ann, i) => (
    <ReferenceLine key={`ann_${i}`} y={ann.x} stroke={ann.color || '#f59e0b'} strokeDasharray="4 2" strokeWidth={1.5}
      label={{ value: ann.text, position: 'insideTopLeft', fontSize: 9, fill: ann.color || '#f59e0b' }} />
  ))
  const showMarkers = config.show_markers !== false
  const topN = config.top_n ? parseInt(config.top_n) : null
  const sortBy = config.sort_by // 'asc' | 'desc' | undefined (keep original)
  const processedData = (() => {
    let d = [...displayData]
    if (sortBy === 'desc') d.sort((a, b) => (b.value || 0) - (a.value || 0))
    else if (sortBy === 'asc') d.sort((a, b) => (a.value || 0) - (b.value || 0))
    if (topN) d = d.slice(0, topN)
    return d
  })()

  if (block.type === 'bar') return (
    <div className="flex flex-col h-full">
      {DrillBreadcrumb}
      {DrillChip}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} margin={{ top: config.show_data_labels ? 18 : 8, right: 8, left: 8, bottom: 32 }} style={{ cursor: config.click_url ? 'pointer' : 'default' }} onClick={d => { if (config.click_url && d?.activeLabel) handleChartClickUrl(d.activeLabel); if (config.custom_event && d?.activeLabel) handleCustomEvent(config.custom_event, d.activeLabel, d?.activePayload?.[0]?.value) }}>
            <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
            {config.show_legend && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
            <Bar dataKey="value" name={block.title || vs.value} radius={[6, 6, 0, 0]} maxBarSize={52} onClick={entry => handleClick(entry.label)} style={{ cursor: (hasDrillColumns && drillState.level < (block.config?.drill_columns || []).length) || (hasDrilldown && !drilldown) ? 'zoom-in' : 'pointer' }}>
              {processedData.map((d, i) => <Cell key={i} fill={palette[i % palette.length]} opacity={getOpacity(d.label)} />)}
              {config.show_data_labels && <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: '#374151' }} formatter={v => fmt(v, format, config)} />}
            </Bar>
            {config.reference_value != null && config.reference_value !== '' && (
              <ReferenceLine y={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || vs.refLabel, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
            {annotationLines}
            {config.show_brush && (
              <Brush dataKey="label" height={20} stroke="#7c3aed" fill="#f3f0ff" travellerWidth={6}
                onChange={({ startIndex, endIndex }) => {
                  if (startIndex === 0 && endIndex === processedData.length - 1) {
                    onRangeChange?.(block.dataset_id, block.label_col, null, null)
                  } else {
                    const s = processedData[startIndex]?.label
                    const e = processedData[endIndex]?.label
                    if (s != null && e != null) onRangeChange?.(block.dataset_id, block.label_col, s, e)
                  }
                }}
              />
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
          <BarChart data={processedData} layout="vertical" margin={{ top: 4, right: config.show_data_labels ? 48 : 24, left: 40, bottom: 4 }} style={{ cursor: config.click_url ? 'pointer' : 'default' }} onClick={d => { if (config.click_url && d?.activeLabel) handleChartClickUrl(d.activeLabel) }}>
            <CartesianGrid horizontal={false} stroke="#f3f4f6" strokeDasharray="0" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: '#9ca3af' }} width={80} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
            {config.show_legend && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
            <Bar dataKey="value" name={block.title || vs.value} radius={[0, 6, 6, 0]} maxBarSize={32} onClick={entry => handleClick(entry.label)} style={{ cursor: hasDrilldown && !drilldown ? 'zoom-in' : 'pointer' }}>
              {processedData.map((d, i) => <Cell key={i} fill={palette[i % palette.length]} opacity={getOpacity(d.label)} />)}
              {config.show_data_labels && <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: '#374151' }} formatter={v => fmt(v, format, config)} />}
            </Bar>
            {config.reference_value != null && config.reference_value !== '' && (
              <ReferenceLine x={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || vs.refLabel, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
            {annotationLinesH}
            {config.show_brush && (
              <Brush dataKey="label" height={20} stroke="#7c3aed" fill="#f3f0ff" travellerWidth={6}
                onChange={({ startIndex, endIndex }) => {
                  if (startIndex === 0 && endIndex === processedData.length - 1) {
                    onRangeChange?.(block.dataset_id, block.label_col, null, null)
                  } else {
                    const s = processedData[startIndex]?.label
                    const e = processedData[endIndex]?.label
                    if (s != null && e != null) onRangeChange?.(block.dataset_id, block.label_col, s, e)
                  }
                }}
              />
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
          <AreaChart data={displayData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }} onClick={d => { if (config.click_url && d?.activeLabel) handleChartClickUrl(d.activeLabel); if (config.custom_event && d?.activeLabel) handleCustomEvent(config.custom_event, d.activeLabel, d?.activePayload?.[0]?.value) }}>
            <defs>
              <linearGradient id={`grad_${block.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
            <Area
              type={config.line_curve || (config.smooth ? 'basis' : 'monotone')}
              dataKey="value"
              name={block.title || vs.value}
              stroke={color}
              strokeWidth={config.stroke_width || 2.5}
              fill={`url(#grad_${block.id})`}
              dot={showMarkers ? { r: 3.5, fill: 'white', stroke: color, strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2, onClick: (_, payload) => handleClick(payload?.payload?.label) }}
            >
              {config.show_data_labels && <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: '#374151' }} formatter={v => fmt(v, format, config)} />}
            </Area>
            {config.show_legend && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
            {config.reference_value != null && config.reference_value !== '' && (
              <ReferenceLine y={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || vs.refLabel, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
            {annotationLines}
            {config.show_brush && (
              <Brush dataKey="label" height={20} stroke="#7c3aed" fill="#f3f0ff" travellerWidth={6}
                onChange={({ startIndex, endIndex }) => {
                  if (startIndex === 0 && endIndex === processedData.length - 1) {
                    onRangeChange?.(block.dataset_id, block.label_col, null, null)
                  } else {
                    const s = processedData[startIndex]?.label
                    const e = processedData[endIndex]?.label
                    if (s != null && e != null) onRangeChange?.(block.dataset_id, block.label_col, s, e)
                  }
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'line') {
    const lineType = config.line_curve || (config.smooth ? 'basis' : 'monotone')
    const strokeW = config.stroke_width || 2.5
    const showGrad = !!config.show_gradient
    return (
      <div className="flex flex-col h-full">
        {DrillChip}
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            {showGrad ? (
              <AreaChart data={displayData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
                <defs>
                  <linearGradient id={`linegrad_${block.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
                <Area type={lineType} dataKey="value" name={block.title || vs.value} stroke={color} strokeWidth={strokeW} fill={`url(#linegrad_${block.id})`} dot={showMarkers ? { r: 3.5, fill: 'white', stroke: color, strokeWidth: 2 } : false} activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2, onClick: (_, payload) => handleClick(payload?.payload?.label) }}>
                  {config.show_data_labels && <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: '#374151' }} formatter={v => fmt(v, format, config)} />}
                </Area>
                {config.show_legend && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
                {config.reference_value != null && config.reference_value !== '' && (
                  <ReferenceLine y={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || vs.refLabel, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
                )}
                {annotationLines}
                {config.show_brush && (
                  <Brush dataKey="label" height={20} stroke="#7c3aed" fill="#f3f0ff" travellerWidth={6}
                onChange={({ startIndex, endIndex }) => {
                  if (startIndex === 0 && endIndex === processedData.length - 1) {
                    onRangeChange?.(block.dataset_id, block.label_col, null, null)
                  } else {
                    const s = processedData[startIndex]?.label
                    const e = processedData[endIndex]?.label
                    if (s != null && e != null) onRangeChange?.(block.dataset_id, block.label_col, s, e)
                  }
                }}
              />
                )}
              </AreaChart>
            ) : (
              <LineChart data={displayData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }} onClick={d => { if (config.click_url && d?.activeLabel) handleChartClickUrl(d.activeLabel); if (config.custom_event && d?.activeLabel) handleCustomEvent(config.custom_event, d.activeLabel, d?.activePayload?.[0]?.value) }}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
                <Line type={lineType} dataKey="value" name={block.title || vs.value} stroke={color} strokeWidth={strokeW} dot={showMarkers ? { r: 3.5, fill: 'white', stroke: color, strokeWidth: 2 } : false} activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2, onClick: (_, payload) => handleClick(payload?.payload?.label) }}>
                  {config.show_data_labels && <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: '#374151' }} formatter={v => fmt(v, format, config)} />}
                </Line>
                {config.show_legend && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
                {config.reference_value != null && config.reference_value !== '' && (
                  <ReferenceLine y={parseFloat(config.reference_value)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: config.reference_label || vs.refLabel, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
                )}
                {annotationLines}
                {config.show_brush && (
                  <Brush dataKey="label" height={20} stroke="#7c3aed" fill="#f3f0ff" travellerWidth={6}
                onChange={({ startIndex, endIndex }) => {
                  if (startIndex === 0 && endIndex === processedData.length - 1) {
                    onRangeChange?.(block.dataset_id, block.label_col, null, null)
                  } else {
                    const s = processedData[startIndex]?.label
                    const e = processedData[endIndex]?.label
                    if (s != null && e != null) onRangeChange?.(block.dataset_id, block.label_col, s, e)
                  }
                }}
              />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'pie') {
    const pieInner = config.inner_radius_pct != null && config.inner_radius_pct !== '' ? `${config.inner_radius_pct}%` : '48%'
    const pieOuter = config.outer_radius_pct != null && config.outer_radius_pct !== '' ? `${config.outer_radius_pct}%` : '75%'
    const pieCY = config.pie_cy != null && config.pie_cy !== '' ? `${config.pie_cy}%` : '50%'
    const showLegend = config.show_legend !== false
    const pieTopN = config.top_n ? parseInt(config.top_n) : null
    const pieData = pieTopN
      ? [...displayData].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, pieTopN)
      : displayData
    return (
      <div className="flex flex-col h-full">
        {DrillBreadcrumb}
        {DrillChip}
        <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData} dataKey="value" nameKey="label"
              cx="50%" cy={pieCY} outerRadius={pieOuter} innerRadius={pieInner}
              labelLine={false}
              label={config.show_labels ? ({ cx: pcx, cy: pcy, midAngle, outerRadius: pr, percent }) => {
                const RADIAN = Math.PI / 180
                const radius = pr * 1.2
                const x = pcx + radius * Math.cos(-midAngle * RADIAN)
                const y = pcy + radius * Math.sin(-midAngle * RADIAN)
                return percent > 0.03 ? <text x={x} y={y} textAnchor={x > pcx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 9, fill: '#374151' }}>{`${(percent * 100).toFixed(0)}%`}</text> : null
              } : null}
              onClick={entry => { handleClick(entry.label); if (config.custom_event) handleCustomEvent(config.custom_event, entry.name, entry.value) }}
              style={{ cursor: (hasDrillColumns && drillState.level < (block.config?.drill_columns || []).length) || (hasDrilldown && !drilldown) ? 'zoom-in' : 'pointer' }}
            >
              {pieData.map((d, i) => <Cell key={i} fill={palette[i % palette.length]} opacity={getOpacity(d.label)} onClick={() => { if (config.click_url) handleChartClickUrl(d.label) }} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => [fmt(v, format, config), '']} />
            {showLegend && <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ fontSize: 10, color: '#6b7280' }}>{value}</span>}
              wrapperStyle={{ paddingTop: 4 }}
            />}
          </PieChart>
        </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'scatter') {
    const scatterData = displayData.map(d => ({ x: parseFloat(d.label) || 0, y: d.value }))
    // Linear regression trendline
    const trendData = (() => {
      if (!config.show_trendline || scatterData.length < 2) return null
      const n = scatterData.length
      const sumX = scatterData.reduce((s, d) => s + d.x, 0)
      const sumY = scatterData.reduce((s, d) => s + d.y, 0)
      const sumXY = scatterData.reduce((s, d) => s + d.x * d.y, 0)
      const sumX2 = scatterData.reduce((s, d) => s + d.x * d.x, 0)
      const denom = n * sumX2 - sumX * sumX
      if (denom === 0) return null
      const m = (n * sumXY - sumX * sumY) / denom
      const b = (sumY - m * sumX) / n
      const xs = scatterData.map(d => d.x)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      return [{ x: minX, y: m * minX + b }, { x: maxX, y: m * maxX + b }]
    })()
    return (
      <div className="flex flex-col h-full">
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
              <XAxis dataKey="x" type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} name={block.label_col} axisLine={false} tickLine={false} />
              <YAxis dataKey="y" type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} name={block.value_col} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} formatter={v => fmt(v, format, config)} />
              <Scatter data={scatterData} fill={color} fillOpacity={0.75} />
              {trendData && (
                <Scatter data={trendData} fill="none" line={{ stroke: color, strokeWidth: 1.5, strokeDasharray: '5 3', opacity: 0.6 }} shape={() => null} legendType="none" />
              )}
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
          <ComposedChart data={displayData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => { const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+'M'; if(a>=1e3) return (v/1e3).toFixed(0)+'K'; return v }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={v => fmt(v, format, config)} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            <Bar dataKey="value" name={block.value_col || vs.value} fill={palette[0]} radius={[4, 4, 0, 0]} opacity={0.85} />
            <Line type="monotone" dataKey="value" name="" stroke={palette[1] || '#ef4444'} strokeWidth={2} dot={{ r: 2 }} legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  if (block.type === 'bubble') {
    const bubbleTopN = config.top_n ? parseInt(config.top_n) : null
    const bubbleData = bubbleTopN
      ? [...displayData].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, bubbleTopN)
      : displayData
    return <BubblePackChart data={bubbleData} palette={palette} fmt={fmt} format={format} config={config} onClickBubble={handleClick} />
  }

  if (block.type === 'treemap') {
    const treeTopN = config.top_n ? parseInt(config.top_n) : null
    const treeSource = treeTopN
      ? [...displayData].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, treeTopN)
      : displayData
    const treeData = treeSource.map((d, i) => ({ name: d.label, size: Math.abs(d.value) || 1, fill: palette[i % palette.length] }))
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
    const total = displayData.reduce((s, d) => s + (d.value || 0), 0)
    const maxVal = parseFloat(config.gauge_max) || 100
    const minVal = parseFloat(config.gauge_min) || 0
    const pct = Math.min(Math.max((total - minVal) / (maxVal - minVal), 0), 1)
    // SVG full-circle progress ring — starts at top, fills clockwise
    const cx = 100, cy = 100, r = 68, sw = 16
    const pctAngle = pct * 2 * Math.PI
    const ex = (cx + r * Math.sin(pctAngle)).toFixed(2)
    const ey = (cy - r * Math.cos(pctAngle)).toFixed(2)
    const largeArc = pct > 0.5 ? 1 : 0
    // When pct≈1 both endpoints coincide — offset slightly to avoid degenerate arc
    const valuePath = pct >= 0.999
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`
      : pct > 0.001
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`
      : null
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <svg viewBox="0 0 200 200" className="w-full" style={{ maxHeight: 160 }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
          {valuePath && <path d={valuePath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />}
          <text x={cx} y={cy + 7} textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>{fmt(total, format, config)}</text>
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize="11" fill="#9ca3af">{Math.round(pct * 100)}%</text>
        </svg>
      </div>
    )
  }

  if (block.type === 'speedometer') {
    const total = displayData.reduce((s, d) => s + (d.value || 0), 0)
    const maxVal = parseFloat(config.gauge_max) || 100
    const minVal = parseFloat(config.gauge_min) || 0
    const pct = Math.min(Math.max((total - minVal) / (maxVal - minVal), 0), 1)
    const cx = 100, cy = 90, r = 68
    const valAngleRad = (180 - 180 * pct) * Math.PI / 180
    const vx = (cx + r * Math.cos(valAngleRad)).toFixed(2)
    const vy = (cy - r * Math.sin(valAngleRad)).toFixed(2)
    const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`
    // large-arc is always 0 for upper-semicircle: the arc from left to any point on top is always ≤180°
    // For pct≈1 both endpoints land on horizontal axis — use full bgPath to avoid degenerate arc
    const valPath = pct >= 0.999
      ? bgPath
      : pct > 0.001
      ? `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${vx} ${vy}`
      : null
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <svg viewBox="0 0 200 118" className="w-full" style={{ maxHeight: 130 }}>
          <path d={bgPath} fill="none" stroke="#f3f4f6" strokeWidth="15" strokeLinecap="round" />
          {valPath && <path d={valPath} fill="none" stroke={color} strokeWidth="15" strokeLinecap="round" />}
          <line x1={cx} y1={cy} x2={vx} y2={vy} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="5" fill="#374151" />
          <text x={cx} y={cy + 22} textAnchor="middle" fontSize="15" fontWeight="800" fill={color}>{fmt(total, format, config)}</text>
          <text x={cx - r + 4} y={cy + 14} fontSize="8" fill="#9ca3af">{config.gauge_min ?? 0}</text>
          <text x={cx + r - 4} y={cy + 14} textAnchor="end" fontSize="8" fill="#9ca3af">{config.gauge_max ?? 100}</text>
        </svg>
      </div>
    )
  }

  if (block.type === 'funnel') {
    if (!displayData || displayData.length === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-400">{vs.noData}</div>
    const maxVal = Math.max(...displayData.map(d => d.value || 0), 1)
    return (
      <div className="flex flex-col h-full gap-1 py-1 overflow-hidden">
        {displayData.map((d, i) => {
          const pct = d.value / maxVal
          const convPct = i > 0 && displayData[i - 1]?.value > 0 ? Math.round((d.value / displayData[i - 1].value) * 100) : null
          const c = palette[i % palette.length]
          const leftPad = ((1 - pct) * 28).toFixed(1)
          return (
            <div key={i} className="flex-1 flex items-center min-h-0" style={{ paddingLeft: `${leftPad}%`, paddingRight: `${leftPad}%` }}>
              <div className="w-full h-full min-h-[20px] rounded flex items-center justify-between px-2.5 gap-1" style={{ backgroundColor: c }}>
                <span className="text-white text-[11px] font-semibold truncate">{d.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-white text-[11px] font-bold">{fmt(d.value, format, config)}</span>
                  {convPct !== null && <span className="text-white/75 text-[10px]">({convPct}%)</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (block.type === 'map') {
    if (!displayData || displayData.length === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-400">{vs.noData}</div>
    const byUF = {}
    displayData.forEach(d => { byUF[String(d.label).toUpperCase()] = d.value })
    const vals = Object.values(byUF).filter(v => v != null && !isNaN(v))
    const minV = vals.length ? Math.min(...vals) : 0
    const maxV = vals.length ? Math.max(...vals) : 1
    const baseColor = config.color || '#6D28D9'
    function hexToRgb(h) { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? [parseInt(r[1],16),parseInt(r[2],16),parseInt(r[3],16)] : [109,40,217] }
    const [br,bg,bb] = hexToRgb(baseColor)
    function stateColor(v) {
      if (v == null) return '#f3f4f6'
      const t = maxV > minV ? (v - minV) / (maxV - minV) : 0.5
      return `rgba(${Math.round(br)},${Math.round(bg)},${Math.round(bb)},${(0.15 + t * 0.85).toFixed(2)})`
    }
    return (
      <div className="relative flex items-center justify-center h-full w-full overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ maxHeight: '100%' }}>
          {/* Silhueta simplificada do Brasil */}
          <ellipse cx="52" cy="55" rx="36" ry="40" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.6"/>
          {BR_STATES.map(s => {
            const v = byUF[s.uf]
            const r = v != null ? 4.5 : 3
            return (
              <g key={s.uf}
                onMouseEnter={() => setMapTooltip({ uf: s.uf, v, x: s.x, y: s.y })}
                onMouseLeave={() => setMapTooltip(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={s.x} cy={s.y} r={r} fill={stateColor(v)} stroke={v != null ? baseColor : '#d1d5db'} strokeWidth="0.4" opacity="0.9" />
                <text x={s.x} y={s.y + 0.8} textAnchor="middle" fontSize="2.2" fill={v != null ? 'white' : '#9ca3af'} fontWeight="600">{s.uf}</text>
              </g>
            )
          })}
          {mapTooltip && (
            <g>
              <rect x={Math.min(mapTooltip.x + 3, 75)} y={mapTooltip.y - 8} width="20" height="9" rx="1.5" fill="white" stroke="#e5e7eb" strokeWidth="0.5" filter="url(#shadow)"/>
              <text x={Math.min(mapTooltip.x + 13, 85)} y={mapTooltip.y - 4.5} textAnchor="middle" fontSize="2.5" fill="#374151" fontWeight="700">{mapTooltip.uf}</text>
              <text x={Math.min(mapTooltip.x + 13, 85)} y={mapTooltip.y - 1} textAnchor="middle" fontSize="2" fill="#6b7280">{mapTooltip.v != null ? fmt(mapTooltip.v, format, config) : 'sem dados'}</text>
            </g>
          )}
        </svg>
      </div>
    )
  }

  if (block.type === 'table') {
    if (!effectiveDatasetId) return <BlockEmptyState block={block} readOnly={readOnly} onBlockAction={onBlockAction} />
    // Modo bruto: dataset definido mas sem dimensão+métrica → mostra linhas brutas imediatamente
    if (!block.label_col || !block.value_col) {
      const cols = block.config?.raw_columns || []
      return <RawTableBlock datasetId={effectiveDatasetId} columns={cols} readOnly={readOnly} />
    }
    return <TableBlock block={block} data={displayData} config={config} format={format} getOpacity={getOpacity} handleClick={handleClick} vs={vs} />
  }

  if (block.type === 'heatmap') {
    const rowCol = config.row_col || block.label_col
    const colCol = config.col_col
    const valCol = config.value_col || block.value_col
    if (!rowCol || !colCol || !valCol || !displayData?.length) {
      return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Configure linha, coluna e valor</div>
    }
    const chartData = displayData
    const rows = [...new Set(chartData.map(d => String(d[rowCol] ?? '')))]
    const cols = [...new Set(chartData.map(d => String(d[colCol] ?? '')))]
    const valueMap = {}
    for (const d of chartData) {
      valueMap[`${d[rowCol]}|${d[colCol]}`] = parseFloat(d[valCol] ?? d.value ?? 0) || 0
    }
    const allVals = Object.values(valueMap)
    const maxVal = Math.max(...allVals, 1)
    const minVal = Math.min(...allVals, 0)
    const baseColor = config.color || '#7c3aed'
    const r = parseInt(baseColor.slice(1, 3), 16)
    const g = parseInt(baseColor.slice(3, 5), 16)
    const b = parseInt(baseColor.slice(5, 7), 16)
    const cellW = Math.max(24, Math.floor(200 / Math.max(cols.length, 1)))
    const cellH = 28
    return (
      <div className="overflow-auto h-full">
        <div className="inline-block min-w-full">
          <div className="flex" style={{ marginLeft: 60 }}>
            {cols.map(c => (
              <div key={c} className="text-xs text-gray-500 text-center truncate" style={{ width: cellW, flexShrink: 0 }}>{c}</div>
            ))}
          </div>
          {rows.map(row => (
            <div key={row} className="flex items-center">
              <div className="text-xs text-gray-500 truncate" style={{ width: 56, flexShrink: 0 }}>{row}</div>
              {cols.map(col => {
                const v = valueMap[`${row}|${col}`] ?? 0
                const intensity = maxVal === minVal ? 0.5 : (v - minVal) / (maxVal - minVal)
                return (
                  <div
                    key={col}
                    title={`${row} × ${col}: ${v}`}
                    onClick={() => handleClick(row)}
                    style={{
                      width: cellW,
                      height: cellH,
                      flexShrink: 0,
                      backgroundColor: `rgba(${r},${g},${b},${0.1 + intensity * 0.9})`,
                      margin: 1,
                      borderRadius: 2,
                      cursor: config.click_url ? 'pointer' : 'default',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'waterfall') {
    const chartData = processedData
    let running = 0
    const waterfallData = chartData.map((d, i) => {
      const val = d.value ?? 0
      const base = i === 0 ? 0 : running
      running += (chartData[i - 1]?.value ?? 0)
      const isPositive = val >= 0
      return {
        label: d.label,
        base: Math.min(base, base + val),
        value: Math.abs(val),
        isPositive,
        rawVal: val,
      }
    })
    return (
      <div className="flex flex-col h-full">
        {DrillChip}
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} barSize={32} margin={{ top: 8, right: 8, left: 8, bottom: 32 }} style={{ cursor: config.click_url ? 'pointer' : 'default' }}
              onClick={d => { if (d?.activePayload?.[0]?.payload?.label) handleClick(d.activePayload[0].payload.label) }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name, props) => {
                  if (name === 'base') return null
                  const raw = props.payload?.rawVal ?? 0
                  return [fmt(raw, format, config), '']
                }}
              />
              <Bar dataKey="base" stackId="wf" fill="transparent" legendType="none" />
              <Bar dataKey="value" stackId="wf" radius={[3, 3, 0, 0]} legendType="none">
                {waterfallData.map((entry, i) => (
                  <Cell key={i} fill={entry.isPositive ? '#059669' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'radar') {
    const radarData = displayData.map(d => ({ subject: String(d.label ?? ''), value: d.value ?? 0 }))
    return (
      <div className="flex flex-col h-full">
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'bar_stacked' || block.type === 'area_stacked') {
    const seriesCol = config.series_col
    if (!seriesCol) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 px-3 text-center">
          <p className="text-[10px] text-gray-300">Configure a Coluna de Série no painel lateral</p>
        </div>
      )
    }
    // pivot: label_col → { label, [seriesValue]: sumOfValueCol }
    const pivotMap = {}
    for (const row of displayData) {
      const label = String(row.label ?? '')
      const series = String(row[seriesCol] ?? row.series ?? '')
      const val = parseFloat(row.value ?? 0) || 0
      if (!pivotMap[label]) pivotMap[label] = { label }
      pivotMap[label][series] = (pivotMap[label][series] || 0) + val
    }
    const pivotData = Object.values(pivotMap)
    const seriesValues = [...new Set(displayData.map(r => String(r[seriesCol] ?? r.series ?? '')))]

    if (block.type === 'bar_stacked') return (
      <div className="flex flex-col h-full">
        {DrillChip}
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pivotData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              {seriesValues.map((s, i) => (
                <Bar key={s} dataKey={s} stackId="a" fill={palette[i % palette.length]} radius={i === seriesValues.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={52} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )

    if (block.type === 'area_stacked') return (
      <div className="flex flex-col h-full">
        {DrillChip}
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pivotData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v, format, config)} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              {seriesValues.map((s, i) => (
                <Area key={s} type="monotone" dataKey={s} stackId="a" stroke={palette[i % palette.length]} fill={palette[i % palette.length]} fillOpacity={0.6} strokeWidth={1.5} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (block.type === 'pivot') {
    return <PivotTableBlock block={block} data={displayData} config={config} />
  }

  if (block.type === 'histogram') {
    const vals = data.map(r => parseFloat(r[config.value_col])).filter(v => !isNaN(v))
    if (!vals.length) return <div className="text-gray-400 text-sm p-4">Sem dados</div>
    const min = Math.min(...vals), max = Math.max(...vals)
    const bins = config.bins || 10
    const width = (max - min) / bins || 1
    const buckets = Array.from({ length: bins }, (_, i) => ({
      range: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`,
      count: vals.filter(v => v >= min + i * width && v < min + (i + 1) * width).length,
    }))
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" tick={{ fontSize: 10 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill={config.color || '#7c3aed'} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (block.type === 'bullet') {
    const rows = data.slice(0, 8)
    return (
      <div className="flex flex-col gap-3 p-3 h-full overflow-auto">
        {rows.map((row, i) => {
          const label = row[config.label_col] || `Item ${i + 1}`
          const value = parseFloat(row[config.value_col]) || 0
          const target = parseFloat(row[config.target_col]) || 0
          const maxVal = parseFloat(row[config.max_col]) || Math.max(value, target) * 1.2 || 100
          const valuePct = Math.min((value / maxVal) * 100, 100)
          const targetPct = Math.min((target / maxVal) * 100, 100)
          const isOk = value >= target
          return (
            <div key={i}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span className="font-medium">{label}</span>
                <span>{value.toLocaleString('pt-BR')} / meta {target.toLocaleString('pt-BR')}</span>
              </div>
              <div className="relative h-6 bg-gray-200 rounded overflow-hidden">
                <div className="absolute inset-0 bg-gray-100" />
                <div
                  className="absolute left-0 top-1 bottom-1 rounded"
                  style={{ width: `${valuePct}%`, backgroundColor: isOk ? '#16a34a' : '#dc2626' }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-800"
                  style={{ left: `${targetPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (block.type === 'gantt') {
    const rows = displayData.slice(0, 20);
    if (!rows.length) return <div className="text-gray-400 text-sm p-4">Sem dados</div>;

    const parseDate = (v) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d) ? null : d;
    };

    const tasks = rows
      .map(r => ({
        task: r.label || r[config.task_col] || '?',
        group: r[config.group_col] || '',
        start: parseDate(r[config.start_col]),
        end: parseDate(r[config.end_col]),
      }))
      .filter(t => t.start && t.end);

    if (!tasks.length) return <div className="text-gray-400 text-sm p-4">Configure task_col, start_col e end_col com datas válidas.</div>;

    const minDate = new Date(Math.min(...tasks.map(t => t.start)));
    const maxDate = new Date(Math.max(...tasks.map(t => t.end)));
    const totalMs = maxDate - minDate || 1;

    const GANTT_COLORS = ['#7c3aed','#2563eb','#16a34a','#d97706','#dc2626','#0891b2','#7c3aed','#9333ea'];

    return (
      <div className="flex flex-col h-full overflow-auto p-3">
        {/* Header com datas */}
        <div className="flex mb-1 text-xs text-gray-400 pl-32">
          <span>{minDate.toLocaleDateString('pt-BR')}</span>
          <span className="ml-auto">{maxDate.toLocaleDateString('pt-BR')}</span>
        </div>
        {tasks.map((t, i) => {
          const leftPct = ((t.start - minDate) / totalMs) * 100;
          const widthPct = Math.max(((t.end - t.start) / totalMs) * 100, 2);
          const ganttColor = GANTT_COLORS[i % GANTT_COLORS.length];
          return (
            <div key={i} className="flex items-center mb-1.5 gap-2">
              <div className="w-28 flex-shrink-0 text-xs text-gray-600 truncate text-right pr-2" title={t.task}>
                {t.task}
              </div>
              <div className="flex-1 relative h-5 bg-gray-100 rounded overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded text-white text-[10px] flex items-center px-1 overflow-hidden"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: ganttColor,
                    minWidth: '4px',
                  }}
                  title={`${t.start.toLocaleDateString('pt-BR')} → ${t.end.toLocaleDateString('pt-BR')}`}
                >
                  {widthPct > 8 && t.group}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (block.type === 'sankey') {
    const rows = displayData
    if (!rows.length || !config.source_col || !config.target_col || !config.value_col) {
      return <div className="text-gray-400 text-sm p-4">Configure source_col, target_col e value_col</div>
    }
    const links = rows.map(r => ({
      source: String(r[config.source_col]),
      target: String(r[config.target_col]),
      value: parseFloat(r[config.value_col]) || 0,
    })).filter(l => l.value > 0)
    const nodeNames = [...new Set([...links.map(l => l.source), ...links.map(l => l.target)])]
    const nodeTotals = {}
    nodeNames.forEach(n => { nodeTotals[n] = 0 })
    links.forEach(l => {
      nodeTotals[l.source] = (nodeTotals[l.source] || 0) + l.value
      nodeTotals[l.target] = (nodeTotals[l.target] || 0) + l.value
    })
    const skSources = [...new Set(links.map(l => l.source))]
    const skTargets = [...new Set(links.map(l => l.target))]
    const W = 400, H = 280, pad = 16, nodeW = 16
    const leftX = pad + 40, rightX = W - pad - nodeW - 40
    const leftNodes = skSources.map(n => ({ name: n, x: leftX, total: nodeTotals[n] }))
    const rightNodes = skTargets.map(n => ({ name: n, x: rightX, total: nodeTotals[n] }))
    const maxTotal = Math.max(...[...leftNodes, ...rightNodes].map(n => n.total)) || 1
    const scaleH = v => Math.max((v / maxTotal) * (H - pad * 2 * (leftNodes.length || 1)), 8)
    let leftY = pad
    leftNodes.forEach(n => { n.y = leftY; n.h = scaleH(n.total); leftY += n.h + 8 })
    let rightY = pad
    rightNodes.forEach(n => { n.y = rightY; n.h = scaleH(n.total); rightY += n.h + 8 })
    const SK_COLORS = ['#7c3aed','#2563eb','#16a34a','#d97706','#dc2626','#0891b2']
    const leftOffsets = Object.fromEntries(leftNodes.map(n => [n.name, n.y]))
    const rightOffsets = Object.fromEntries(rightNodes.map(n => [n.name, n.y]))
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {links.map((l, i) => {
          const src = leftNodes.find(n => n.name === l.source)
          const tgt = rightNodes.find(n => n.name === l.target)
          if (!src || !tgt) return null
          const linkH = scaleH(l.value)
          const sy = leftOffsets[l.source]
          const ty = rightOffsets[l.target]
          leftOffsets[l.source] += linkH
          rightOffsets[l.target] += linkH
          const skColor = SK_COLORS[skSources.indexOf(l.source) % SK_COLORS.length]
          return (
            <path key={i} d={`M${leftX + nodeW},${sy} C${leftX + 80},${sy} ${rightX - 80},${ty} ${rightX},${ty} L${rightX},${ty + linkH} C${rightX - 80},${ty + linkH} ${leftX + 80},${sy + linkH} ${leftX + nodeW},${sy + linkH} Z`} fill={skColor} opacity={0.35} />
          )
        })}
        {leftNodes.map((n, i) => (
          <g key={n.name}>
            <rect x={leftX} y={n.y} width={nodeW} height={n.h} fill={SK_COLORS[i % SK_COLORS.length]} rx={2}/>
            <text x={leftX - 4} y={n.y + n.h / 2} textAnchor="end" fontSize={9} dominantBaseline="middle" fill="#374151">{n.name}</text>
          </g>
        ))}
        {rightNodes.map((n, i) => (
          <g key={n.name}>
            <rect x={rightX} y={n.y} width={nodeW} height={n.h} fill={SK_COLORS[(skSources.length + i) % SK_COLORS.length]} rx={2}/>
            <text x={rightX + nodeW + 4} y={n.y + n.h / 2} textAnchor="start" fontSize={9} dominantBaseline="middle" fill="#374151">{n.name}</text>
          </g>
        ))}
      </svg>
    )
  }

  if (block.type === 'candlestick') {
    const rows = displayData.slice(0, 60)
    if (!rows.length) return <div className="text-gray-400 text-sm p-4">Sem dados</div>
    const toNum = v => parseFloat(v) || 0
    const candles = rows.map(r => ({
      date: r[config.date_col] || '',
      open: toNum(r[config.open_col]),
      high: toNum(r[config.high_col]),
      low: toNum(r[config.low_col]),
      close: toNum(r[config.close_col]),
    }))
    const allVals = candles.flatMap(c => [c.high, c.low]).filter(v => v > 0)
    if (!allVals.length) return <div className="text-gray-400 text-sm p-4">Configure as colunas OHLC.</div>
    const cdMinV = Math.min(...allVals), cdMaxV = Math.max(...allVals)
    const cdRange = cdMaxV - cdMinV || 1
    const W = 400, H = 240, padT = 16, padB = 24, padL = 40, padR = 8
    const chartH = H - padT - padB
    const chartW = W - padL - padR
    const candleW = Math.max(Math.floor(chartW / candles.length) - 2, 2)
    const toY = v => padT + chartH - ((v - cdMinV) / cdRange) * chartH
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {[0, 0.5, 1].map(p => {
          const v = cdMinV + p * cdRange
          const y = toY(v)
          return (
            <g key={p}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth={0.5}/>
              <text x={padL - 4} y={y} textAnchor="end" fontSize={8} dominantBaseline="middle" fill="#9ca3af">
                {v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(1)}
              </text>
            </g>
          )
        })}
        {candles.map((c, i) => {
          const x = padL + (i / candles.length) * chartW + candleW / 2
          const isUp = c.close >= c.open
          const cdColor = isUp ? '#16a34a' : '#dc2626'
          const bodyTop = toY(Math.max(c.open, c.close))
          const bodyBot = toY(Math.min(c.open, c.close))
          const bodyH = Math.max(bodyBot - bodyTop, 1)
          return (
            <g key={i}>
              <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={cdColor} strokeWidth={1}/>
              <rect x={x - candleW/2} y={bodyTop} width={candleW} height={bodyH} fill={cdColor} opacity={0.85}/>
            </g>
          )
        })}
        {candles.filter((_, i) => i % Math.max(Math.floor(candles.length / 5), 1) === 0).map((c, i) => (
          <text key={i} x={padL + (candles.indexOf(c) / candles.length) * chartW + candleW/2} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {String(c.date).slice(0, 10)}
          </text>
        ))}
      </svg>
    )
  }

  if (block.type === 'boxplot') {
    const rows = displayData
    if (!rows.length) return <div className="text-gray-400 text-sm p-4">Sem dados</div>
    const bpGroups = {}
    rows.forEach(r => {
      const g = config.group_col ? String(r[config.group_col]) : 'Todos'
      const v = parseFloat(r[config.value_col])
      if (!isNaN(v)) {
        if (!bpGroups[g]) bpGroups[g] = []
        bpGroups[g].push(v)
      }
    })
    const calcStats = vals => {
      const sorted = [...vals].sort((a, b) => a - b)
      const q = p => {
        const idx = p * (sorted.length - 1)
        const lo = Math.floor(idx), hi = Math.ceil(idx)
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
      }
      return { min: sorted[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: sorted[sorted.length - 1] }
    }
    const groupNames = Object.keys(bpGroups).slice(0, 8)
    const stats = groupNames.map(g => ({ name: g, ...calcStats(bpGroups[g]) }))
    const allBpVals = stats.flatMap(s => [s.min, s.max])
    const bpMinV = Math.min(...allBpVals), bpMaxV = Math.max(...allBpVals)
    const bpRange = bpMaxV - bpMinV || 1
    const W = 400, H = 260, padT = 16, padB = 32, padL = 48, padR = 16
    const chartH = H - padT - padB
    const chartW = W - padL - padR
    const colW = chartW / groupNames.length
    const boxW = Math.min(colW * 0.5, 40)
    const toY = v => padT + chartH - ((v - bpMinV) / bpRange) * chartH
    const BP_COLORS = ['#7c3aed','#2563eb','#16a34a','#d97706','#dc2626','#0891b2','#9333ea','#059669']
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {[0, 0.5, 1].map(p => {
          const v = bpMinV + p * bpRange
          return (
            <g key={p}>
              <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke="#e5e7eb" strokeWidth={0.5}/>
              <text x={padL - 4} y={toY(v)} textAnchor="end" fontSize={8} dominantBaseline="middle" fill="#9ca3af">
                {v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(1)}
              </text>
            </g>
          )
        })}
        {stats.map((s, i) => {
          const cx = padL + (i + 0.5) * colW
          const bpColor = BP_COLORS[i % BP_COLORS.length]
          return (
            <g key={s.name}>
              <line x1={cx} y1={toY(s.min)} x2={cx} y2={toY(s.max)} stroke={bpColor} strokeWidth={1} strokeDasharray="3 2"/>
              <line x1={cx - boxW/3} y1={toY(s.min)} x2={cx + boxW/3} y2={toY(s.min)} stroke={bpColor} strokeWidth={1.5}/>
              <line x1={cx - boxW/3} y1={toY(s.max)} x2={cx + boxW/3} y2={toY(s.max)} stroke={bpColor} strokeWidth={1.5}/>
              <rect x={cx - boxW/2} y={toY(s.q3)} width={boxW} height={Math.max(toY(s.q1) - toY(s.q3), 1)} fill={bpColor} opacity={0.25} stroke={bpColor} strokeWidth={1.5} rx={2}/>
              <line x1={cx - boxW/2} y1={toY(s.median)} x2={cx + boxW/2} y2={toY(s.median)} stroke={bpColor} strokeWidth={2}/>
              <text x={cx} y={H - padB + 12} textAnchor="middle" fontSize={9} fill="#374151">{s.name}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  return null
}

function ColorPicker({ label, value, onChange, placeholder = '#6366f1' }) {
  const t = useTranslations('dashboardEditor')
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
          <button onClick={() => onChange('')} className="text-gray-300 hover:text-gray-500 shrink-0" title={t('block.tooltipRemoveImage')}>
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

export function BlockConfigPanel({ block: rawBlock, onChange, datasets = [] }) {
  const block = rawBlock?.config ? rawBlock : { ...rawBlock, config: rawBlock?.config ?? {} }
  const t = useTranslations('dashboardEditor')
  const AGG_OPTIONS = [
    { value: 'sum',   label: t('agg.sum') },
    { value: 'count', label: t('agg.count') },
    { value: 'avg',   label: t('agg.avg') },
    { value: 'max',   label: t('agg.max') },
    { value: 'min',   label: t('agg.min') },
    { value: 'none',  label: t('agg.none') },
  ]
  const [colTypes, setColTypes] = useState({})
  const [colSemantics, setColSemantics] = useState({})

  useEffect(() => {
    const ds = datasets.find(d => d.id === block.dataset_id)
    if (!isUUID(block.dataset_id) || !ds) { setColTypes({}); setColSemantics({}); return }
    // Usa column_types que já vem no DatasetSummary da API
    if (ds.column_types && Object.keys(ds.column_types).length > 0) {
      setColTypes(ds.column_types)
      setColSemantics(ds.column_semantics || {})
      return
    }
    // Fallback: busca do endpoint dedicado se não veio no summary
    api.reports.datasets.columns(block.dataset_id)
      .then(res => {
        const types = {}
        res.columns?.forEach(c => { types[c.name] = c.type })
        setColTypes(types)
      })
      .catch(() => {})
  }, [block.dataset_id, datasets])

  function upd(field, value) { onChange({ ...block, [field]: value }) }
  function updConfig(field, value) { onChange({ ...block, config: { ...(block.config || {}), [field]: value } }) }

  function selectLabelCol(col) {
    const detectedType = colTypes[col] || 'text'
    onChange({ ...block, label_col: col || null, config: { ...(block.config || {}), dim_type: detectedType, granularity: detectedType === 'date' ? (block.config?.granularity || 'month') : null } })
  }

  function selectValueCol(col) {
    // Sugere agregação padrão baseada na semântica: identifier → count_distinct, metric → sum
    const semantic = colSemantics[col]
    const suggestedAgg = semantic === 'identifier' ? 'count_distinct' : semantic === 'boolean' ? 'count' : undefined
    onChange({ ...block, value_col: col || null, ...(suggestedAgg ? { agg: suggestedAgg } : {}) })
  }

  const selectedDataset = datasets.find(d => d.id === block.dataset_id)
  const columns = selectedDataset?.columns || []
  const dimColumns = columns.filter(c => colTypes[c] !== 'number')
  const metricColumns = columns.filter(c => colTypes[c] === 'number' || !colTypes[c])
  const hasData = !['text', 'filter', 'image', 'slider', 'pivot', 'ai_summary', 'histogram', 'bullet', 'gantt', 'sankey', 'candlestick', 'boxplot'].includes(block.type)
  const hasVisual = ['kpi', 'bar', 'bar_h', 'area', 'line', 'table', 'scatter', 'combo', 'bubble', 'treemap', 'gauge', 'speedometer', 'bar_stacked', 'area_stacked', 'heatmap', 'waterfall', 'radar'].includes(block.type)
  const isDimDate = block.config?.dim_type === 'date' || (block.label_col && colTypes[block.label_col] === 'date')

  // Ícone semântico para seletores de coluna
  const SEMANTIC_ICON = { metric: '#', identifier: '⊞', category: 'Abc', date: '📅', boolean: '◎' }
  const getColLabel = (col) => {
    const sem = colSemantics[col]
    return sem ? `${SEMANTIC_ICON[sem] || ''} ${col}` : col
  }

  const COL_TYPE_BADGE = { text: 'Aa', number: '#', date: '📅' }
  const [configTab, setConfigTab] = useState(() => block.dataset_id ? 'visual' : 'dados')

  // Reseta para aba "dados" quando muda o bloco sem dados
  useEffect(() => {
    if (!block.dataset_id) setConfigTab('dados')
  }, [block.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Abas: Dados | Visual | Avançado */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 -mx-4 px-4 mb-0 shrink-0">
        {[{k:'dados',l:'Dados'},{k:'visual',l:'Visual'},{k:'avancado',l:'Avançado'}].map(tab => (
          <button key={tab.k} onClick={() => setConfigTab(tab.k)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              configTab === tab.k
                ? 'border-violet-500 text-violet-700 dark:text-violet-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}>{tab.l}</button>
        ))}
      </div>

      {/* ABA: DADOS */}
      {configTab === 'dados' && <div className="divide-y divide-gray-100 dark:divide-gray-800">

      {/* GERAL */}
      <ConfigSection title={t('block.sectionGeneral')}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('block.labelTitle')}</label>
          <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.title} onChange={e => upd('title', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelBlockType')}</label>
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
        <ConfigSection title={t('block.sectionImage')}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelImageUrl')}</label>
            <input
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              placeholder="https://..."
              value={block.config?.image_src || ''}
              onChange={e => updConfig('image_src', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelUpload')}</label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-xs text-gray-500">{t('block.uploadClick')}</span>
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
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelAdjust')}</label>
            <div className="flex gap-1">
              {[{ v: 'contain', l: t('block.btnContain') }, { v: 'cover', l: t('block.btnCover') }, { v: 'fill', l: t('block.btnStretch') }].map(o => (
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
        <ConfigSection title={t('block.sectionFilter')}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelDataSource')}</label>
            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.dataset_id || ''} onChange={e => onChange({ ...block, dataset_id: e.target.value || null, filter_col: null })}>
              <option value="">{t('block.placeholderDataset')}</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('block.labelFilterCol')}</label>
              <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.filter_col || ''} onChange={e => upd('filter_col', e.target.value || null)}>
                <option value="">{t('block.placeholderSelect')}</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelDisplayLabel')}</label>
            <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder={block.filter_col || 'ex: Filtrar por Meio'} value={block.filter_label || ''} onChange={e => upd('filter_label', e.target.value)} />
          </div>
        </ConfigSection>
      )}

      {/* SLIDER config */}
      {block.type === 'slider' && (
        <ConfigSection title={t('block.sectionSlider')}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelDataSource')}</label>
            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.dataset_id || ''} onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}), slider_col: null } })}>
              <option value="">{t('block.placeholderDataset')}</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('block.labelNumericCol')}</label>
              <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" value={block.config?.slider_col || ''} onChange={e => updConfig('slider_col', e.target.value || null)}>
                <option value="">{t('block.placeholderSelect')}</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelDisplayLabel')}</label>
            <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder={block.config?.slider_col || 'ex: Faixa de Valor'} value={block.filter_label || ''} onChange={e => upd('filter_label', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelRange')}</label>
            <div className="flex gap-2">
              <input type="number" step="any" value={block.config?.slider_min ?? ''} onChange={e => updConfig('slider_min', e.target.value === '' ? 0 : +e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
              <input type="number" step="any" value={block.config?.slider_max ?? ''} onChange={e => updConfig('slider_max', e.target.value === '' ? 100 : +e.target.value)} placeholder="100" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          </div>
        </ConfigSection>
      )}

      {/* DADOS — for chart/table blocks — modelo Looker Studio */}
      {hasData && (
        <ConfigSection title={t('block.sectionData')}>

          {/* 1. Fonte de dados */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Fonte de dados</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.dataset_id || ''}
              onChange={e => {
                const newVal = e.target.value || null
                const newDs = newVal ? datasets.find(d => d.id === newVal) : null
                const updates = { ...block, dataset_id: newVal, label_col: null, value_col: null, config: { ...(block.config || {}), dim_type: null, granularity: null } }
                if (newDs?.columns?.length > 0) {
                  const dsColTypes = newDs.column_types || {}
                  const textCol = newDs.columns.find(c => dsColTypes[c] !== 'number')
                  if (textCol) updates.label_col = textCol
                  const numCol = newDs.columns.find(c => dsColTypes[c] === 'number')
                  if (numCol) { updates.value_col = numCol; updates.agg = 'sum' }
                }
                onChange(updates)
              }}
            >
              <option value="">— Selecione uma fonte —</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}{d.row_count ? ` (${d.row_count.toLocaleString()} linhas)` : ''}</option>)}
            </select>
            {datasets.length === 0 && <p className="text-xs text-amber-600 mt-1">Nenhum dado conectado ainda.</p>}
          </div>

          {/* 2. Dimensão + 3. Métrica — só aparecem quando tem dataset */}
          {selectedDataset && (
            <>
              {/* Dimensão */}
              {block.type !== 'table' && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Dimensão <span className="font-normal text-gray-400">(agrupar por)</span>
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={block.label_col || ''}
                    onChange={e => selectLabelCol(e.target.value || '')}
                  >
                    <option value="">— Selecione —</option>
                    {dimColumns.map(c => <option key={c} value={c}>{getColLabel(c)}</option>)}
                  </select>
                  {isDimDate && (
                    <div className="flex gap-1 mt-1.5">
                      {[{ v: 'day', l: 'Dia' }, { v: 'week', l: 'Semana' }, { v: 'month', l: 'Mês' }, { v: 'quarter', l: 'Trimestre' }, { v: 'year', l: 'Ano' }].map(g => (
                        <button key={g.v} onClick={() => updConfig('granularity', g.v)}
                          className={`flex-1 py-0.5 rounded border text-[10px] font-semibold transition-all ${(block.config?.granularity || 'month') === g.v ? 'border-violet-500 bg-violet-100 text-violet-700' : 'border-gray-200 text-gray-400 hover:border-violet-300'}`}>
                          {g.l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Métrica */}
              {block.type !== 'table' && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Métrica <span className="font-normal text-gray-400">(o que medir)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                      value={block.value_col || ''}
                      onChange={e => e.target.value ? selectValueCol(e.target.value) : upd('value_col', null)}
                    >
                      <option value="">— Selecione —</option>
                      <option value="__count__">Contagem de linhas</option>
                      {metricColumns.map(c => <option key={c} value={c}>{getColLabel(c)}</option>)}
                    </select>
                    {block.value_col && block.value_col !== '__count__' && (
                      <select
                        className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                        value={block.agg || 'sum'}
                        onChange={e => upd('agg', e.target.value)}
                      >
                        {AGG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Para tabela: apenas informa que mostra todos os dados */}
              {block.type === 'table' && (
                <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-violet-700 font-medium">Tabela de dados completa</p>
                  <p className="text-[11px] text-violet-500 mt-0.5">Exibe todas as linhas e colunas da fonte selecionada.</p>
                </div>
              )}
            </>
          )}
        </ConfigSection>
      )}

      {/* HEATMAP — colunas de linha e coluna */}
      {block.type === 'heatmap' && selectedDataset && (
        <ConfigSection title="Mapa de Calor">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Coluna de Linha</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.config?.row_col || ''}
              onChange={e => updConfig('row_col', e.target.value || null)}
            >
              <option value="">— selecionar —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Coluna de Coluna</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.config?.col_col || ''}
              onChange={e => updConfig('col_col', e.target.value || null)}
            >
              <option value="">— selecionar —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <p className="text-[10px] text-gray-400">A coluna de valor é definida na seção Dados (Métrica)</p>
        </ConfigSection>
      )}

      {/* PIVOT TABLE — configuração */}
      {block.type === 'pivot' && (
        <ConfigSection title="Tabela Pivot">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fonte de dados</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}) } })}
            >
              <option value="">— selecionar dataset —</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {selectedDataset && (<>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dimensão de linha</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.config?.row_col || ''}
              onChange={e => updConfig('row_col', e.target.value || null)}
            >
              <option value="">— selecionar —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dimensão de coluna</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.config?.col_col || ''}
              onChange={e => updConfig('col_col', e.target.value || null)}
            >
              <option value="">— selecionar —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Métrica (valor)</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.config?.value_col || ''}
              onChange={e => updConfig('value_col', e.target.value || null)}
            >
              <option value="">— selecionar —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Agregação</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.config?.agg || 'sum'}
              onChange={e => updConfig('agg', e.target.value)}
            >
              <option value="sum">Soma</option>
              <option value="count">Contagem</option>
              <option value="avg">Média</option>
              <option value="max">Máximo</option>
              <option value="min">Mínimo</option>
            </select>
          </div>
          </>)}
        </ConfigSection>
      )}

      {/* AI SUMMARY — configuração */}
      {block.type === 'ai_summary' && (
        <ConfigSection title="Resumo AI">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dataset a resumir</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.config?.dataset_id || block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}), dataset_id: e.target.value || null } })}
            >
              <option value="">— selecionar —</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prompt personalizado (opcional)</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              rows={3}
              placeholder="Resuma os principais insights desses dados em 3 bullets concisos"
              value={block.config?.prompt || ''}
              onChange={e => updConfig('prompt', e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Deixe em branco para usar o prompt padrão</p>
          </div>
        </ConfigSection>
      )}

      {/* HISTOGRAM — configuração */}
      {block.type === 'histogram' && (
        <ConfigSection title="Histograma">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fonte de dados</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}) } })}
            >
              <option value="">— selecionar dataset —</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna de valor</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.value_col || ''}
                onChange={e => updConfig('value_col', e.target.value || null)}
              >
                <option value="">— selecionar —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Número de bins: {block.config?.bins || 10}</label>
            <input
              type="range"
              min="5"
              max="50"
              value={block.config?.bins || 10}
              onChange={e => updConfig('bins', parseInt(e.target.value, 10))}
              className="w-full accent-violet-600"
            />
          </div>
        </ConfigSection>
      )}

      {/* BULLET CHART — configuração */}
      {block.type === 'bullet' && (
        <ConfigSection title="Bullet Chart">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fonte de dados</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}) } })}
            >
              <option value="">— selecionar dataset —</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {selectedDataset && (<>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna de label</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.label_col || ''}
                onChange={e => updConfig('label_col', e.target.value || null)}
              >
                <option value="">— selecionar —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna de valor</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.value_col || ''}
                onChange={e => updConfig('value_col', e.target.value || null)}
              >
                <option value="">— selecionar —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna de meta</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.target_col || ''}
                onChange={e => updConfig('target_col', e.target.value || null)}
              >
                <option value="">— selecionar —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna de máximo (opcional)</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.max_col || ''}
                onChange={e => updConfig('max_col', e.target.value || null)}
              >
                <option value="">— automático —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </>)}
        </ConfigSection>
      )}

      </div>}{/* fim aba dados */}

      {/* ABA: VISUAL */}
      {configTab === 'visual' && <div className="divide-y divide-gray-100 dark:divide-gray-800">

      {/* VISUAL */}
      {hasVisual && (
        <ConfigSection title={t('block.sectionVisual')}>
          {['kpi', 'bar', 'bar_h', 'area', 'line', 'table'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelValueFormat')}</label>
              <div className="flex gap-1">
                {[{ v: 'number', l: '1.234' }, { v: 'currency', l: 'R$' }, { v: 'percent', l: '%' }, { v: 'compact', l: '1.2K' }].map(f => (
                  <button key={f.v} onClick={() => updConfig('format', f.v)} className={`flex-1 px-2 py-1 rounded border text-xs font-medium transition-all ${(block.config?.format || 'number') === f.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{f.l}</button>
                ))}
              </div>
            </div>
          )}
          {['kpi', 'table'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelPrefixSuffix')}</label>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder={t('block.placeholderPrefix')} value={block.config?.prefix || ''} onChange={e => updConfig('prefix', e.target.value)} />
                <input className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder={t('block.placeholderSuffix')} value={block.config?.suffix || ''} onChange={e => updConfig('suffix', e.target.value)} />
              </div>
            </div>
          )}
          {block.type === 'kpi' && (
            <>
              {/* ── Valor fixo (manual) ─────────────────────────────────────── */}
              <div className="border border-violet-100 bg-violet-50/60 rounded-xl p-3 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => updConfig('manual_value', block.config?.manual_value != null ? null : 0)}
                    className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${block.config?.manual_value != null ? 'bg-violet-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.manual_value != null ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 leading-none">Valor fixo</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Sem dataset — você digita o número</p>
                  </div>
                </label>
                {block.config?.manual_value != null && (
                  <input
                    type="number" step="any"
                    value={block.config.manual_value}
                    onChange={e => updConfig('manual_value', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full border border-violet-200 bg-white rounded-lg px-3 py-2 text-base font-bold focus:outline-none focus:ring-1 focus:ring-violet-400 tabular-nums"
                  />
                )}
              </div>

              {/* ── Cálculo entre colunas / Expressão ── */}
              {block.config?.manual_value == null && (
                <>
                  {/* Modo fórmula: dois seletores com agg independentes */}
                  <div className="border border-gray-100 rounded-xl p-3 space-y-2.5 bg-gray-50/60">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => updConfig('formula_mode', !block.config?.formula_mode)} className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${block.config?.formula_mode ? 'bg-violet-500' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.formula_mode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 leading-none">Cálculo entre colunas</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Ex: Receita ÷ Pedidos = Ticket médio</p>
                      </div>
                    </label>

                    {block.config?.formula_mode && (
                      <div className="space-y-2 pt-1">
                        {/* Coluna A */}
                        <div className="flex gap-1.5">
                          <select value={block.config?.formula_col_a || ''} onChange={e => updConfig('formula_col_a', e.target.value || null)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
                            <option value="">Coluna A</option>
                            {metricColumns.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select value={block.config?.formula_agg_a || 'sum'} onChange={e => updConfig('formula_agg_a', e.target.value)}
                            className="w-16 border border-gray-200 rounded-lg px-1.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
                            {AGG_OPTIONS.filter(o => o.value !== 'none').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>

                        {/* Operador */}
                        <div className="flex gap-1 justify-center">
                          {[{ sym: '+', val: '+' }, { sym: '-', val: '-' }, { sym: '×', val: '*' }, { sym: '÷', val: '/' }].map(({ sym, val }) => (
                            <button key={val} onClick={() => updConfig('formula_op', val)}
                              className={`w-9 h-9 rounded-xl text-base font-bold border transition-all ${(block.config?.formula_op || '/') === val ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-violet-300 bg-white'}`}>
                              {sym}
                            </button>
                          ))}
                        </div>

                        {/* Coluna B */}
                        <div className="flex gap-1.5">
                          <select value={block.config?.formula_col_b || ''} onChange={e => updConfig('formula_col_b', e.target.value || null)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
                            <option value="">Coluna B</option>
                            {metricColumns.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select value={block.config?.formula_agg_b || 'sum'} onChange={e => updConfig('formula_agg_b', e.target.value)}
                            className="w-16 border border-gray-200 rounded-lg px-1.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
                            {AGG_OPTIONS.filter(o => o.value !== 'none').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>

                        {/* ×100 para porcentagem */}
                        <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                          <div onClick={() => updConfig('formula_multiply_100', !block.config?.formula_multiply_100)} className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${block.config?.formula_multiply_100 ? 'bg-violet-500' : 'bg-gray-200'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.formula_multiply_100 ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </div>
                          <span className="text-xs text-gray-600">Multiplicar por 100 (resultado em %)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Expressão livre — só quando não está em modo fórmula */}
                  {!block.config?.formula_mode && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Expressão calculada</label>
                      <input
                        type="text"
                        value={block.config?.expression || ''}
                        onChange={e => updConfig('expression', e.target.value || null)}
                        placeholder="[Vendas] / [Meta] * 100"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Use [NomeColuna] para referenciar colunas. Suporta + - * / ( )</p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelAlignment')}</label>
                <div className="flex gap-1">
                  {[{ v: 'left', l: '⬛◻◻' }, { v: 'center', l: '◻⬛◻' }, { v: 'right', l: '◻◻⬛' }].map(a => (
                    <button key={a.v} onClick={() => updConfig('align', a.v)}
                      className={`flex-1 px-2 py-1.5 rounded border text-xs font-medium transition-all ${(block.config?.align || 'left') === a.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {a.v === 'left' ? t('block.btnLeft') : a.v === 'center' ? t('block.btnCenter') : t('block.btnRight')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelNumberSize')}</label>
                <div className="flex gap-1">
                  {[{ v: 'lg', l: t('block.btnSizeS') }, { v: 'xl', l: t('block.btnSizeM') }, { v: '2xl', l: t('block.btnSizeL') }, { v: '4xl', l: t('block.btnSizeXL') }].map(s => (
                    <button key={s.v} onClick={() => updConfig('size', s.v)} className={`flex-1 px-2 py-1 rounded border text-xs font-bold transition-all ${(block.config?.size || '4xl') === s.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{s.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('block.labelSubtitle')}</label>
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                  placeholder={t('block.placeholderSubtitle')}
                  value={block.config?.subtitle || ''}
                  onChange={e => updConfig('subtitle', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('block.labelIcon')}</label>
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                  placeholder={t('block.placeholderIcon')}
                  value={block.config?.icon || ''}
                  onChange={e => updConfig('icon', e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1">{t('block.hintIcon')}</p>
              </div>
              <ColorPicker label={t('block.labelNumberColor')} value={block.config?.accent_color || ''} onChange={v => updConfig('accent_color', v)} />
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelDelta')}</label>
                <div className="flex gap-2">
                  <input
                    type="number" step="any"
                    value={block.config?.delta ?? ''}
                    onChange={e => updConfig('delta', e.target.value === '' ? null : e.target.value)}
                    placeholder={t('block.placeholderDeltaValue')}
                    className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <input
                    type="text"
                    value={block.config?.delta_label ?? ''}
                    onChange={e => updConfig('delta_label', e.target.value)}
                    placeholder={t('block.placeholderDeltaLabel')}
                    className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{t('block.hintDelta')}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => updConfig('auto_delta', !block.config?.auto_delta)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.auto_delta ? 'bg-violet-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.auto_delta ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-gray-600">{t('block.labelAutoDelta')}</span>
              </label>
              {block.config?.auto_delta && (
                <p className="text-[10px] text-gray-400 -mt-1">{t('block.hintAutoDelta')}</p>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => updConfig('show_sparkline', !block.config?.show_sparkline)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_sparkline ? 'bg-violet-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_sparkline ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-gray-600">Mini gráfico de tendência</span>
              </label>
            </>
          )}
          {block.type === 'meta' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valor da meta</label>
                <input
                  type="number" step="any"
                  value={block.config?.meta_target ?? ''}
                  onChange={e => updConfig('meta_target', e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder="Ex: 100000"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Label da meta</label>
                  <input
                    type="text"
                    value={block.config?.meta_label || ''}
                    onChange={e => updConfig('meta_label', e.target.value)}
                    placeholder="Ex: Meta Q1"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Unidade</label>
                  <input
                    type="text"
                    value={block.config?.meta_unit || ''}
                    onChange={e => updConfig('meta_unit', e.target.value)}
                    placeholder="R$, %, un."
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Valor realizado</p>
                <label className="flex items-center gap-2.5 cursor-pointer mb-2">
                  <div
                    onClick={() => updConfig('meta_actual', block.config?.meta_actual != null ? null : 0)}
                    className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${block.config?.meta_actual != null ? 'bg-violet-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.meta_actual != null ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 leading-none">Valor manual</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Desativa busca no dataset</p>
                  </div>
                </label>
                {block.config?.meta_actual != null ? (
                  <input
                    type="number" step="any"
                    value={block.config.meta_actual}
                    onChange={e => updConfig('meta_actual', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                ) : (
                  <p className="text-[10px] text-gray-400">O valor realizado vem do dataset via coluna selecionada acima.</p>
                )}
              </div>
            </>
          )}
          {['gauge', 'speedometer'].includes(block.type) && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">{t('block.labelMin')}</label>
                  <input type="number" step="any" value={block.config?.gauge_min ?? ''} onChange={e => updConfig('gauge_min', e.target.value === '' ? null : +e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">{t('block.labelMax')}</label>
                  <input type="number" step="any" value={block.config?.gauge_max ?? ''} onChange={e => updConfig('gauge_max', e.target.value === '' ? null : +e.target.value)} placeholder="100" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
                </div>
              </div>
              <ColorPicker label={t('block.labelArcColor')} value={block.config?.color || ''} onChange={v => updConfig('color', v)} />
            </>
          )}
          {['heatmap', 'radar'].includes(block.type) && (
            <ColorPicker label="Cor principal" value={block.config?.color || ''} onChange={v => updConfig('color', v)} />
          )}
          {['bar', 'bar_h', 'area', 'line', 'scatter', 'combo', 'gauge', 'speedometer'].includes(block.type) && !['gauge', 'speedometer'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelMainColor')}</label>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => updConfig('color', c)} className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${block.config?.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}
          {/* Coluna de série — bar_stacked / area_stacked */}
          {['bar_stacked', 'area_stacked'].includes(block.type) && selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coluna de Série (cor)</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.series_col || ''}
                onChange={e => updConfig('series_col', e.target.value || null)}
              >
                <option value="">— selecionar —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Coluna com os valores que separam as séries (ex: produto, região)</p>
            </div>
          )}
          {['bar', 'bar_h', 'pie', 'scatter', 'combo', 'bubble', 'treemap'].includes(block.type) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-500">{t('block.labelColorPalette')}</label>
                {block.config?.colors && (
                  <button onClick={() => updConfig('colors', '')} className="text-[10px] text-gray-400 hover:text-gray-600">{t('block.btnResetColors')}</button>
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
              <p className="text-[10px] text-gray-400 mt-1">{t('block.hintColors')}</p>
            </div>
          )}
        </ConfigSection>
      )}

      </div>}{/* fim aba visual */}

      {/* ABA: AVANÇADO */}
      {configTab === 'avancado' && <div className="divide-y divide-gray-100 dark:divide-gray-800">

      {/* APARÊNCIA */}
      <ConfigSection title={t('block.sectionAppearance')} defaultOpen={false}>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => updConfig('hide_header', !block.config?.hide_header)}
            className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.hide_header ? 'bg-violet-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.hide_header ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs text-gray-600">{t('block.toggleHideHeader')}</span>
        </label>
        <ColorPicker label={t('block.labelBlockBg')} value={block.config?.bg_color || ''} onChange={v => updConfig('bg_color', v)} placeholder="#ffffff" />
        {block.type === 'text' && (
          <ColorPicker label={t('block.labelTextColor')} value={block.config?.text_color || ''} onChange={v => updConfig('text_color', v)} placeholder="#4b5563" />
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelBorder')}</label>
          <div className="flex gap-2">
            <ColorPicker value={block.config?.border_color || ''} onChange={v => updConfig('border_color', v)} placeholder="#e5e7eb" />
            <div className="flex-1 min-w-0">
              <input type="number" min="1" max="10" value={block.config?.border_width ?? ''} onChange={e => updConfig('border_width', e.target.value === '' ? null : +e.target.value)} placeholder="Px" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" title={t('block.labelBorderWidth')} />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelCornerRadius')}</label>
          <input type="number" min="0" max="32" value={block.config?.border_radius ?? ''} onChange={e => updConfig('border_radius', e.target.value === '' ? null : +e.target.value)} placeholder="12" className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelShadow')}</label>
          <div className="flex gap-1">
            {[{ v: '', l: t('block.btnShadowAuto') }, { v: 'none', l: t('block.btnShadowNone') }, { v: 'sm', l: t('block.btnShadowLight') }, { v: 'md', l: t('block.btnShadowMedium') }, { v: 'lg', l: t('block.btnShadowStrong') }, { v: 'xl', l: t('block.btnShadowIntense') }].map(o => (
              <button key={o.v} onClick={() => updConfig('shadow', o.v || undefined)} className={`flex-1 px-1 py-1 rounded border text-[10px] font-medium transition-all ${(block.config?.shadow || '') === o.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{o.l}</button>
            ))}
          </div>
        </div>
      </ConfigSection>

      {/* GRÁFICO — opções de visualização */}
      {['bar', 'bar_h', 'line', 'area', 'combo'].includes(block.type) && (
        <ConfigSection title={t('block.sectionChart')} defaultOpen={false}>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => updConfig('show_data_labels', !block.config?.show_data_labels)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_data_labels ? 'bg-violet-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_data_labels ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">{t('block.toggleShowValues')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => updConfig('show_legend', !block.config?.show_legend)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_legend ? 'bg-violet-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_legend ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">{t('block.toggleShowLegend')}</span>
          </label>
          {['bar', 'bar_h', 'combo'].includes(block.type) && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => updConfig('stacked', !block.config?.stacked)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.stacked ? 'bg-violet-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.stacked ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-600">{t('block.toggleStacked')}</span>
            </label>
          )}
          {['line', 'area'].includes(block.type) && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => updConfig('smooth', !block.config?.smooth)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.smooth ? 'bg-violet-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.smooth ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-600">{t('block.toggleSmooth')}</span>
            </label>
          )}
          {block.type === 'area' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelFillOpacity')}</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" value={Math.round((block.config?.fill_opacity ?? 0.3) * 100)} onChange={e => updConfig('fill_opacity', +e.target.value / 100)} className="flex-1 accent-violet-600" />
                <span className="text-xs text-gray-500 w-10 text-right">{Math.round((block.config?.fill_opacity ?? 0.3) * 100)}%</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelYAxisLimits')}</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input type="number" step="any" value={block.config?.y_min ?? ''} onChange={e => updConfig('y_min', e.target.value === '' ? null : +e.target.value)} placeholder={t('block.placeholderYMin')} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
              </div>
              <div className="flex-1">
                <input type="number" step="any" value={block.config?.y_max ?? ''} onChange={e => updConfig('y_max', e.target.value === '' ? null : +e.target.value)} placeholder={t('block.placeholderYMax')} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelYAxisTitle')}</label>
            <input type="text" value={block.config?.y_axis_title || ''} onChange={e => updConfig('y_axis_title', e.target.value)} placeholder={t('block.placeholderYAxisTitle')} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('block.labelXAxisTitle')}</label>
            <input type="text" value={block.config?.x_axis_title || ''} onChange={e => updConfig('x_axis_title', e.target.value)} placeholder={t('block.placeholderXAxisTitle')} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
          </div>
          {/* Interpolação — line/area */}
          {['line', 'area'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Interpolação</label>
              <div className="flex gap-1">
                {[{ v: 'monotone', l: 'Suave' }, { v: 'linear', l: 'Linear' }, { v: 'step', l: 'Degrau' }, { v: 'basis', l: 'Curva' }].map(o => (
                  <button key={o.v} onClick={() => updConfig('line_curve', o.v)}
                    className={`flex-1 px-1.5 py-1 rounded border text-[10px] font-medium transition-all ${(block.config?.line_curve || 'monotone') === o.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Espessura — line/area */}
          {['line', 'area'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Espessura da linha</label>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="6" step="0.5" value={block.config?.stroke_width || 2.5} onChange={e => updConfig('stroke_width', +e.target.value)} className="flex-1 accent-violet-600" />
                <span className="text-xs text-gray-500 w-8 text-right">{block.config?.stroke_width || 2.5}px</span>
              </div>
            </div>
          )}
          {/* Gradiente sob a linha — só line */}
          {block.type === 'line' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => updConfig('show_gradient', !block.config?.show_gradient)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_gradient ? 'bg-violet-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_gradient ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-600">Gradiente sob a linha</span>
            </label>
          )}
          {/* Brush filter — line, area, bar, bar_h */}
          {['line', 'area', 'bar', 'bar_h'].includes(block.type) && (
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={block.config?.show_brush || false}
                onChange={e => onChange({ ...block, config: { ...(block.config || {}), show_brush: e.target.checked } })}
                className="rounded"
              />
              Brush filter (seleção de intervalo)
            </label>
          )}
        </ConfigSection>
      )}

      {/* PIZZA — opções específicas */}
      {block.type === 'pie' && (
        <ConfigSection title={t('block.sectionPie')} defaultOpen={false}>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelInnerRadius')}</label>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="45" value={block.config?.inner_radius_pct ?? 22} onChange={e => updConfig('inner_radius_pct', +e.target.value)} className="flex-1 accent-violet-600" />
              <span className="text-xs text-gray-500 w-10 text-right">{block.config?.inner_radius_pct ?? 22}%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelOuterRadius')}</label>
            <div className="flex items-center gap-3">
              <input type="range" min="20" max="60" value={block.config?.outer_radius_pct ?? 35} onChange={e => updConfig('outer_radius_pct', +e.target.value)} className="flex-1 accent-violet-600" />
              <span className="text-xs text-gray-500 w-10 text-right">{block.config?.outer_radius_pct ?? 35}%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelCenterY')}</label>
            <div className="flex items-center gap-3">
              <input type="range" min="30" max="70" value={block.config?.pie_cy ?? 54} onChange={e => updConfig('pie_cy', +e.target.value)} className="flex-1 accent-violet-600" />
              <span className="text-xs text-gray-500 w-10 text-right">{block.config?.pie_cy ?? 54}%</span>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => updConfig('show_labels', !block.config?.show_labels)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_labels ? 'bg-violet-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_labels ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">{t('block.toggleShowPercent')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => updConfig('show_legend', block.config?.show_legend === false ? undefined : false)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_legend !== false ? 'bg-violet-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_legend !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">{t('block.toggleShowLegend')}</span>
          </label>
        </ConfigSection>
      )}

      {/* BOLHAS — opções específicas */}
      {block.type === 'bubble' && (
        <ConfigSection title="Bolhas" defaultOpen={false}>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => updConfig('show_data_labels', block.config?.show_data_labels === true ? false : block.config?.show_data_labels === false ? undefined : true)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_data_labels === true ? 'bg-violet-500' : block.config?.show_data_labels === false ? 'bg-red-300' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_data_labels === true ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">
              {block.config?.show_data_labels === true ? 'Labels sempre visíveis' : block.config?.show_data_labels === false ? 'Labels ocultos' : 'Labels automáticos (por tamanho)'}
            </span>
          </label>
        </ConfigSection>
      )}

      {/* INTERATIVIDADE */}
      {hasData && block.type !== 'scatter' && (
        <ConfigSection title={t('block.sectionInteractivity')} defaultOpen={false}>
          {/* Drilldown */}
          {['bar', 'bar_h', 'pie', 'area', 'line'].includes(block.type) && selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('block.labelDrilldown')}</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={block.config?.drilldown_col || ''}
                onChange={e => updConfig('drilldown_col', e.target.value || null)}
              >
                <option value="">{t('block.optionNoDrilldown')}</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">{t('block.hintDrilldown')}</p>
            </div>
          )}
          {/* G11 — drill_columns: multi-level drill for bar and pie */}
          {['bar', 'pie'].includes(block.type) && selectedDataset && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Colunas de drill-down</label>
              <p className="text-[10px] text-gray-400 mb-2">Clique em uma barra/fatia para detalhar o próximo nível</p>
              {(block.config?.drill_columns || []).map((col, idx) => (
                <div key={idx} className="flex items-center gap-1 mb-1">
                  <span className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 truncate">{col}</span>
                  <button
                    onClick={() => {
                      const next = (block.config?.drill_columns || []).filter((_, i) => i !== idx)
                      updConfig('drill_columns', next.length > 0 ? next : undefined)
                    }}
                    className="text-gray-400 hover:text-red-400 text-xs px-1 py-1 leading-none"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
              ))}
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                value=""
                onChange={e => {
                  const col = e.target.value
                  if (!col) return
                  const current = block.config?.drill_columns || []
                  if (!current.includes(col)) {
                    updConfig('drill_columns', [...current, col])
                  }
                }}
              >
                <option value="">+ Adicionar coluna...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
                <span className="text-xs text-gray-600">{t('block.toggleCrossFilter')}</span>
              </label>
              <p className="text-[10px] text-gray-400">{t('block.hintCrossFilter')}</p>
            </>
          )}
          {/* Ação ao clicar — URL */}
          {['bar', 'bar_h', 'line', 'area', 'pie', 'heatmap', 'waterfall', 'radar', 'table', 'treemap', 'funnel', 'map'].includes(block.type) && (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ação ao clicar</label>
              <input
                type="text"
                value={block.config?.click_url || ''}
                onChange={e => updConfig('click_url', e.target.value)}
                placeholder="https://... ou /dashboards/{label}"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
              <p className="text-xs text-gray-400 mt-0.5">Use {"{label}"} para inserir o valor clicado</p>
            </div>
          )}
          {/* N28 — Custom Event (embed postMessage) */}
          {['bar', 'bar_h', 'line', 'area', 'pie', 'scatter', 'combo', 'bubble', 'treemap', 'gauge', 'speedometer', 'funnel', 'map', 'waterfall', 'radar', 'bar_stacked', 'area_stacked', 'heatmap', 'table'].includes(block.type) && (
            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">Custom Event (embed)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs"
                placeholder="ex: dashboard:click"
                value={block.config?.custom_event || ''}
                onChange={e => updConfig('custom_event', e.target.value)}
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Envia window.postMessage ao clicar em um ponto do gráfico.</p>
            </div>
          )}
        </ConfigSection>
      )}

      {/* FORMATAÇÃO CONDICIONAL — KPI */}
      {block.type === 'kpi' && (
        <ConfigSection title={t('block.sectionConditional')} defaultOpen={false}>
          <p className="text-[10px] text-gray-400 -mt-1">{t('block.hintConditional')}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-1">{t('block.labelOkThreshold')}</label>
                <input type="number" step="any" value={block.config?.threshold_ok ?? ''} onChange={e => onChange({ ...block, config: { ...block.config, threshold_ok: e.target.value === '' ? null : e.target.value } })} placeholder={t('block.placeholderOk')} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
              </div>
              <div className="shrink-0 mt-4">
                <input type="color" value={block.config?.color_ok || '#16a34a'} onChange={e => onChange({ ...block, config: { ...block.config, color_ok: e.target.value } })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5" title={t('block.titleColorOk')} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-1">{t('block.labelAlertThreshold')}</label>
                <input type="number" step="any" value={block.config?.threshold_warn ?? ''} onChange={e => onChange({ ...block, config: { ...block.config, threshold_warn: e.target.value === '' ? null : e.target.value } })} placeholder={t('block.placeholderAlert')} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
              </div>
              <div className="shrink-0 mt-4">
                <input type="color" value={block.config?.color_warn || '#d97706'} onChange={e => onChange({ ...block, config: { ...block.config, color_warn: e.target.value } })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5" title={t('block.titleColorAlert')} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-1">{t('block.labelCritical')}</label>
                <div className="h-8 flex items-center px-2 border border-gray-100 rounded bg-gray-50 text-[10px] text-gray-400">{t('block.labelAutomatic')}</div>
              </div>
              <div className="shrink-0 mt-4">
                <input type="color" value={block.config?.color_critical || '#dc2626'} onChange={e => onChange({ ...block, config: { ...block.config, color_critical: e.target.value } })} className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5" title={t('block.titleColorCritical')} />
              </div>
            </div>
          </div>
        </ConfigSection>
      )}

      {/* MODO DE TABELA */}
      {block.type === 'table' && (
        <ConfigSection title={t('block.sectionTable')}>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelValueCol')}</label>
            <div className="flex gap-1">
              {[{ v: 'bar', l: t('block.btnBar') }, { v: 'heat', l: 'Heat' }, { v: 'badge', l: t('block.btnBadge') }, { v: 'plain', l: t('block.btnSimple') }].map(o => (
                <button key={o.v} onClick={() => onChange({ ...block, config: { ...block.config, table_mode: o.v } })}
                  className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${(block.config?.table_mode || 'bar') === o.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <ColorPicker label={t('block.labelBarColor')} value={block.config?.accent_color || ''} onChange={v => onChange({ ...block, config: { ...block.config, accent_color: v } })} />
          {selectedDataset && columns.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelHiddenCols')}</label>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {columns.map(col => {
                  const hidden = (block.config?.hidden_cols || []).includes(col)
                  return (
                    <label key={col} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={hidden}
                        onChange={() => {
                          const cur = block.config?.hidden_cols || []
                          updConfig('hidden_cols', hidden ? cur.filter(c => c !== col) : [...cur, col])
                        }}
                        className="accent-violet-600 w-3.5 h-3.5"
                      />
                      <span className={`text-xs ${hidden ? 'line-through text-gray-300' : 'text-gray-600'}`}>{col}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => updConfig('paginate', !block.config?.paginate)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.paginate ? 'bg-violet-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.paginate ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">{t('block.togglePagination')}</span>
          </label>
          {block.config?.paginate && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('block.labelRowsPerPage')}</label>
              <input type="number" min="5" max="100" value={block.config?.page_size ?? 10} onChange={e => updConfig('page_size', +e.target.value || 10)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          )}
        </ConfigSection>
      )}

      {/* FORMATAÇÃO CONDICIONAL — TABELA */}
      {block.type === 'table' && (
        <ConfigSection title={t('block.sectionRowHighlight')} defaultOpen={false}>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelHighlightWhen')}</label>
            <div className="flex gap-2">
              <select value={block.config?.highlight_operator || 'gt'} onChange={e => onChange({ ...block, config: { ...block.config, highlight_operator: e.target.value } })} className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400">
                <option value="gt">{t('block.optionGreater')}</option>
                <option value="lt">{t('block.optionLess')}</option>
              </select>
              <input type="number" step="any" value={block.config?.highlight_threshold ?? ''} onChange={e => onChange({ ...block, config: { ...block.config, highlight_threshold: e.target.value === '' ? null : e.target.value } })} placeholder={t('block.placeholderThreshold')} className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          </div>
          <ColorPicker label={t('block.labelHighlightColor')} value={block.config?.highlight_color || ''} onChange={v => onChange({ ...block, config: { ...block.config, highlight_color: v } })} placeholder="#fef3c7" />
        </ConfigSection>
      )}

      {/* ORDENAÇÃO E RANKING */}
      {['bar', 'bar_h', 'pie', 'bubble', 'treemap'].includes(block.type) && (
        <ConfigSection title={t('block.sectionSorting')} defaultOpen={false}>
          {['bar', 'bar_h'].includes(block.type) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelSortBy')}</label>
              <div className="flex gap-1">
                {[{ v: '', l: t('block.btnOriginal') }, { v: 'desc', l: t('block.btnDesc') }, { v: 'asc', l: t('block.btnAsc') }].map(o => (
                  <button key={o.v} onClick={() => onChange({ ...block, config: { ...block.config, sort_by: o.v || undefined } })}
                    className={`flex-1 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${(block.config?.sort_by || '') === o.v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelTopN')}</label>
            <input type="number" min="0" value={block.config?.top_n ?? ''} onChange={e => onChange({ ...block, config: { ...block.config, top_n: e.target.value || undefined } })} placeholder={t('block.placeholderTopN')} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
          </div>
        </ConfigSection>
      )}

      {/* MARCADORES — line/area */}
      {['line', 'area'].includes(block.type) && (
        <ConfigSection title={t('block.sectionLine')} defaultOpen={false}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={block.config?.show_markers !== false} onChange={e => onChange({ ...block, config: { ...block.config, show_markers: e.target.checked } })} className="accent-violet-600" />
            <span className="text-xs text-gray-600">{t('block.toggleShowDots')}</span>
          </label>
        </ConfigSection>
      )}

      {/* ANOTAÇÕES */}
      {['bar', 'bar_h', 'line', 'area', 'area_stacked', 'combo'].includes(block.type) && (
        <ConfigSection title="Anotações" defaultOpen={false}>
          <p className="text-[10px] text-gray-400 -mt-1 mb-2">Marque pontos do eixo X com uma linha e texto</p>
          {(block.config?.annotations || []).map((ann, i) => (
            <div key={i} className="flex gap-1.5 items-center mb-1.5">
              <input
                type="text"
                placeholder="Label (ex: Jan)"
                value={ann.x || ''}
                onChange={e => {
                  const next = [...(block.config?.annotations || [])]
                  next[i] = { ...next[i], x: e.target.value }
                  updConfig('annotations', next)
                }}
                className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <input
                type="text"
                placeholder="Texto"
                value={ann.text || ''}
                onChange={e => {
                  const next = [...(block.config?.annotations || [])]
                  next[i] = { ...next[i], text: e.target.value }
                  updConfig('annotations', next)
                }}
                className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <input
                type="color"
                value={ann.color || '#f59e0b'}
                onChange={e => {
                  const next = [...(block.config?.annotations || [])]
                  next[i] = { ...next[i], color: e.target.value }
                  updConfig('annotations', next)
                }}
                className="w-7 h-7 rounded cursor-pointer border border-gray-200 p-0.5 shrink-0"
              />
              <button
                onClick={() => updConfig('annotations', (block.config?.annotations || []).filter((_, j) => j !== i))}
                className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => updConfig('annotations', [...(block.config?.annotations || []), { x: '', text: '', color: '#f59e0b' }])}
            className="w-full py-1.5 text-xs text-violet-600 hover:text-violet-800 border border-dashed border-violet-200 rounded-lg hover:border-violet-400 transition-colors"
          >
            + Adicionar anotação
          </button>
        </ConfigSection>
      )}

      {/* scatter trendline toggle */}
      {block.type === 'scatter' && (
        <ConfigSection title="Tendência" defaultOpen={false}>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => updConfig('show_trendline', !block.config?.show_trendline)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.show_trendline ? 'bg-violet-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.show_trendline ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">Linha de tendência (regressão linear)</span>
          </label>
        </ConfigSection>
      )}

      {/* LINHA DE REFERÊNCIA */}
      {['bar', 'bar_h', 'line', 'area'].includes(block.type) && (
        <ConfigSection title={t('block.sectionReference')} defaultOpen={false}>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelRefValue')}</label>
            <input
              type="number"
              step="any"
              value={block.config?.reference_value ?? ''}
              onChange={e => onChange({ ...block, config: { ...block.config, reference_value: e.target.value === '' ? null : e.target.value } })}
              placeholder={t('block.placeholderRefValue')}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">{t('block.labelRefLabel')}</label>
            <input
              type="text"
              value={block.config?.reference_label || ''}
              onChange={e => onChange({ ...block, config: { ...block.config, reference_label: e.target.value } })}
              placeholder={t('block.placeholderRefLabel')}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
        </ConfigSection>
      )}

      {/* LAYOUT DO BLOCO */}
      <ConfigSection title={t('block.sectionLayout')} defaultOpen={false}>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => updConfig('locked', !block.config?.locked)} className={`w-8 h-4 rounded-full transition-colors relative ${block.config?.locked ? 'bg-amber-400' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.config?.locked ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs text-gray-600">{t('block.toggleLockPosition')}</span>
        </label>
        <p className="text-[10px] text-gray-400">{t('block.hintLockPosition')}</p>
      </ConfigSection>

      {/* MAPEAMENTO DE VALORES */}
      {hasData && (
        <ConfigSection title="Mapeamento de valores" defaultOpen={false}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-400">Mapear valores brutos para labels com cor</span>
            <button
              onClick={() => {
                const mappings = [...(block.config.value_mappings || []), { from: '', to: '', color: '#7c3aed' }];
                onChange({ ...block, config: { ...block.config, value_mappings: mappings } });
              }}
              className="text-xs text-purple-600 hover:text-purple-800"
            >+ Adicionar</button>
          </div>
          {(block.config.value_mappings || []).map((m, i) => (
            <div key={i} className="flex gap-1 mb-1 items-center">
              <input
                type="text"
                placeholder="De"
                value={m.from}
                onChange={e => {
                  const mappings = [...(block.config.value_mappings || [])];
                  mappings[i] = { ...mappings[i], from: e.target.value };
                  onChange({ ...block, config: { ...block.config, value_mappings: mappings } });
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-xs"
              />
              <span className="text-gray-400 text-xs">→</span>
              <input
                type="text"
                placeholder="Para"
                value={m.to}
                onChange={e => {
                  const mappings = [...(block.config.value_mappings || [])];
                  mappings[i] = { ...mappings[i], to: e.target.value };
                  onChange({ ...block, config: { ...block.config, value_mappings: mappings } });
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-xs"
              />
              <input
                type="color"
                value={m.color || '#7c3aed'}
                onChange={e => {
                  const mappings = [...(block.config.value_mappings || [])];
                  mappings[i] = { ...mappings[i], color: e.target.value };
                  onChange({ ...block, config: { ...block.config, value_mappings: mappings } });
                }}
                className="w-8 h-6 border border-gray-300 rounded cursor-pointer p-0"
              />
              <button
                onClick={() => {
                  const mappings = (block.config.value_mappings || []).filter((_, j) => j !== i);
                  onChange({ ...block, config: { ...block.config, value_mappings: mappings } });
                }}
                className="text-red-400 hover:text-red-600 text-xs"
              >✕</button>
            </div>
          ))}
          {(block.config.value_mappings || []).length === 0 && (
            <p className="text-[10px] text-gray-400">Nenhum mapeamento configurado. Clique em + Adicionar.</p>
          )}
        </ConfigSection>
      )}

      {/* GANTT — configuração */}
      {block.type === 'gantt' && (
        <ConfigSection title="Gantt">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Dataset</label>
            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}), dataset_id: e.target.value } })}>
              <option value="">— selecionar dataset —</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {columns.length > 0 && (
            <>
              {[['task_col','Coluna de tarefa'],['start_col','Data início'],['end_col','Data fim'],['group_col','Grupo (opcional)']].map(([field, label]) => (
                <div key={field} className="mb-2">
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={block.config?.[field] || ''}
                    onChange={e => onChange({ ...block, config: { ...(block.config || {}), [field]: e.target.value } })}>
                    <option value="">— selecionar —</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </>
          )}
        </ConfigSection>
      )}

      {/* SANKEY — configuração */}
      {block.type === 'sankey' && (
        <ConfigSection title="Sankey">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Dataset</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              value={block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}), dataset_id: e.target.value } })}>
              <option value="">Selecione...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {columns.length > 0 && [['source_col','Origem'],['target_col','Destino'],['value_col','Valor']].map(([field, label]) => (
            <div key={field} className="mb-2">
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                value={block.config?.[field] || ''}
                onChange={e => onChange({ ...block, config: { ...(block.config || {}), [field]: e.target.value } })}>
                <option value="">Selecione...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </ConfigSection>
      )}

      {/* CANDLESTICK — configuração */}
      {block.type === 'candlestick' && (
        <ConfigSection title="Candlestick (OHLC)">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Dataset</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              value={block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}), dataset_id: e.target.value } })}>
              <option value="">Selecione...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {columns.length > 0 && [['date_col','Data'],['open_col','Abertura'],['high_col','Máxima'],['low_col','Mínima'],['close_col','Fechamento']].map(([field, label]) => (
            <div key={field} className="mb-2">
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                value={block.config?.[field] || ''}
                onChange={e => onChange({ ...block, config: { ...(block.config || {}), [field]: e.target.value } })}>
                <option value="">Selecione...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </ConfigSection>
      )}

      {/* BOXPLOT — configuração */}
      {block.type === 'boxplot' && (
        <ConfigSection title="Box Plot">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Dataset</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              value={block.dataset_id || ''}
              onChange={e => onChange({ ...block, dataset_id: e.target.value || null, config: { ...(block.config || {}), dataset_id: e.target.value } })}>
              <option value="">Selecione...</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {columns.length > 0 && [['group_col','Agrupamento (opcional)'],['value_col','Coluna de valores']].map(([field, label]) => (
            <div key={field} className="mb-2">
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                value={block.config?.[field] || ''}
                onChange={e => onChange({ ...block, config: { ...(block.config || {}), [field]: e.target.value } })}>
                <option value="">Selecione...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </ConfigSection>
      )}

      {/* ID DO BLOCO */}
      <ConfigSection title={t('block.sectionBlockId')} defaultOpen={false}>
        <div className="flex items-center gap-1">
          <code className="flex-1 text-[10px] text-gray-400 font-mono truncate bg-gray-50 px-2 py-1.5 rounded border border-gray-100">{block.id}</code>
          <button
            onClick={() => navigator.clipboard.writeText(block.id)}
            title={t('block.btnCopyId')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded border border-gray-100 bg-gray-50 shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400">{t('block.hintBlockId')}</p>
      </ConfigSection>

      </div>}{/* fim aba avancado */}
    </div>
  )
}

export function CanvasConfigPanel({ config, onChange }) {
  const t = useTranslations('dashboardEditor')
  const [applyingBrand, setApplyingBrand] = useState(false)
  const [brandApplied, setBrandApplied] = useState(false)

  function upd(field, value) { onChange(prev => ({ ...prev, [field]: value })) }

  async function handleApplyBrand() {
    setApplyingBrand(true)
    try {
      const brand = await api.brand.get()
      if (brand.primary_color) upd('accentColor', brand.primary_color)
      if (brand.brand_colors?.length > 0) upd('chartPalette', brand.brand_colors)
      setBrandApplied(true)
      setTimeout(() => setBrandApplied(false), 2500)
    } catch { /* ignora silenciosamente */ } finally {
      setApplyingBrand(false)
    }
  }

  function SwatchPicker({ field, colors, placeholder }) {
    return (
      <div>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {colors.map(c => (
            <button key={c} onClick={() => upd(field, c)}
              className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${config[field] === c ? 'border-violet-500 scale-110' : 'border-gray-200 dark:border-gray-600'}`}
              style={{ backgroundColor: c }} title={c}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={config[field] || placeholder}
            onChange={e => upd(field, e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600 p-0.5 shrink-0" />
          <input type="text" value={config[field] || ''} onChange={e => upd(field, e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-gray-800 dark:text-gray-200" />
          {config[field] && (
            <button onClick={() => upd(field, '')} className="text-gray-300 hover:text-gray-500 shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  const QUICK_THEMES = [
    { name: t('canvas.themes.default'), sheet: '#ffffff', bg: '#f3f4f6', accent: '#7c3aed' },
    { name: t('canvas.themes.night'),   sheet: '#1e1e2e', bg: '#18181b', accent: '#a78bfa' },
    { name: t('canvas.themes.ocean'),   sheet: '#f0f9ff', bg: '#dbeafe', accent: '#2563eb' },
    { name: t('canvas.themes.forest'),  sheet: '#f0fdf4', bg: '#dcfce7', accent: '#16a34a' },
    { name: t('canvas.themes.sunset'),  sheet: '#fffbeb', bg: '#fef3c7', accent: '#d97706' },
    { name: t('canvas.themes.lavender'),sheet: '#faf5ff', bg: '#ede9fe', accent: '#7c3aed' },
  ]

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('canvas.title')}</p>

      {/* APLICAR MARCA */}
      <button
        onClick={handleApplyBrand}
        disabled={applyingBrand}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
          brandApplied
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-[#6D28D9]/30 bg-[#f5f3ff] text-[#6D28D9] hover:bg-[#ede9fe] hover:border-[#6D28D9]/50'
        } disabled:opacity-50`}
      >
        {brandApplied ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Marca aplicada!
          </>
        ) : applyingBrand ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Aplicando...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            Aplicar minha marca
          </>
        )}
      </button>

      {/* TEMA RÁPIDO */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('canvas.quickTheme')}</label>
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_THEMES.map(t => (
            <button key={t.name}
              onClick={() => { upd('sheetBgColor', t.sheet); upd('bgColor', t.bg); upd('accentColor', t.accent) }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
            >
              <div className="flex gap-0.5">
                <div className="w-4 h-4 rounded-sm border border-gray-200" style={{ backgroundColor: t.sheet }} />
                <div className="w-4 h-4 rounded-sm border border-gray-200" style={{ backgroundColor: t.bg }} />
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: t.accent }} />
              </div>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium leading-none">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sheet */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('canvas.sheetColor')}</label>
        <SwatchPicker
          field="sheetBgColor"
          colors={['#ffffff', '#f8fafc', '#fafafa', '#fffbeb', '#f0fdf4', '#eef2ff', '#1e1e2e']}
          placeholder="#ffffff"
        />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('canvas.bgColor')}</label>
        <SwatchPicker
          field="bgColor"
          colors={['#f3f4f6', '#e5e7eb', '#dbeafe', '#ede9fe', '#dcfce7', '#fef3c7', '#18181b']}
          placeholder="#f3f4f6"
        />
      </div>

      {/* Arredondamento folha */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('canvas.borderRadius')}</label>
        <div className="flex items-center gap-3">
          <input type="range" min="0" max="32" value={config.sheetRadius ?? 0} onChange={e => upd('sheetRadius', +e.target.value)} className="flex-1 accent-violet-600" />
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{config.sheetRadius ?? 0}px</span>
        </div>
      </div>

      {/* Tipografia */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('canvas.typography')}</label>
        <select value={config.fontFamily || 'inter'} onChange={e => upd('fontFamily', e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="inter">{t('canvas.fontDefault')}</option>
          <option value="roboto">Roboto</option>
          <option value="poppins">Poppins</option>
          <option value="dm-sans">DM Sans</option>
          <option value="open-sans">Open Sans</option>
          <option value="mono">Monospace</option>
        </select>
      </div>

      {/* Grade */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => upd('showGrid', !config.showGrid)} className={`w-8 h-4 rounded-full transition-colors relative ${config.showGrid ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${config.showGrid ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('canvas.showGrid')}</span>
        </label>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t('canvas.showGridHint')}</p>
      </div>

      {/* Idioma do link público */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('canvas.publicLang')}</label>
        <select value={config.language || 'pt-BR'} onChange={e => upd('language', e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="pt-BR">🇧🇷 Português</option>
          <option value="es">🇪🇸 Español</option>
          <option value="en">🇺🇸 English</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="de">🇩🇪 Deutsch</option>
          <option value="it">🇮🇹 Italiano</option>
          <option value="zh">🇨🇳 中文</option>
          <option value="ja">🇯🇵 日本語</option>
        </select>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t('canvas.publicLangHint')}</p>
      </div>

      {/* Fuso horário */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Fuso horário</label>
        <select
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
          value={config.timezone || 'America/Sao_Paulo'}
          onChange={e => upd('timezone', e.target.value)}
        >
          <option value="America/Sao_Paulo">América/São Paulo (BRT)</option>
          <option value="America/Manaus">América/Manaus (AMT)</option>
          <option value="America/Belem">América/Belém (BRT)</option>
          <option value="America/Fortaleza">América/Fortaleza (BRT)</option>
          <option value="America/Recife">América/Recife (BRT)</option>
          <option value="America/Bahia">América/Bahia (BRT)</option>
          <option value="America/Cuiaba">América/Cuiabá (AMT)</option>
          <option value="America/Porto_Velho">América/Porto Velho (AMT)</option>
          <option value="America/Boa_Vista">América/Boa Vista (AMT)</option>
          <option value="America/Rio_Branco">América/Rio Branco (ACT)</option>
          <option value="America/Noronha">América/Noronha (FNT)</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">América/Nova York (EST)</option>
          <option value="America/Chicago">América/Chicago (CST)</option>
          <option value="America/Los_Angeles">América/Los Angeles (PST)</option>
          <option value="Europe/London">Europa/Londres (GMT)</option>
          <option value="Europe/Lisbon">Europa/Lisboa (WET)</option>
          <option value="Europe/Madrid">Europa/Madri (CET)</option>
        </select>
      </div>

      {/* CSS Customizado */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CSS Customizado</label>
        <textarea
          className="w-full text-xs font-mono border border-gray-300 dark:border-gray-600 rounded p-2 h-32 resize-none bg-white dark:bg-gray-800 dark:text-gray-200"
          placeholder=".block-container { border-radius: 12px; } .recharts-text { font-family: 'Inter'; }"
          value={config.custom_css || ''}
          onChange={e => upd('custom_css', e.target.value)}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">CSS aplicado globalmente ao canvas deste dashboard.</p>
      </div>
    </div>
  )
}

export function DatasetPanel({ datasets, onDatasetsChange, reportDatasetIds = null, onPinDataset, onUnpinDataset }) {
  const t = useTranslations('dashboardEditor')
  const locale = useLocale()
  const [tab, setTab] = useState('upload')
  const [uploading, setUploading] = useState(false)
  const [apiForm, setApiForm] = useState({ name: '', api_url: '', api_headers: '', api_data_path: '' })
  const [apiSaving, setApiSaving] = useState(false)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [scheduleSaving, setScheduleSaving] = useState(null)
  const [sheets, setSheets] = useState([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [excelSheetPicker, setExcelSheetPicker] = useState(null)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [linksForm, setLinksForm] = useState({ campaignId: '', name: '', days: 90 })
  const [linksSaving, setLinksSaving] = useState(false)
  const [linksCampaigns, setLinksCampaigns] = useState(null)
  const fileRef = useRef()

  // Quando no contexto de um dashboard, mostra só os datasets pinados
  const displayedDatasets = reportDatasetIds !== null
    ? datasets.filter(d => reportDatasetIds.includes(d.id))
    : datasets
  const unpinnedDatasets = reportDatasetIds !== null
    ? datasets.filter(d => !reportDatasetIds.includes(d.id))
    : []

  const isGoogleSheets = apiForm.api_url.includes('docs.google.com/spreadsheets')

  function handleApiUrlChange(url) {
    setApiForm(f => ({ ...f, api_url: url }))
    setSheets([])
    setSelectedSheet('')
  }

  async function fetchSheets() {
    setSheetsLoading(true); setError(null)
    try {
      const result = await api.reports.datasets.fetchGoogleSheets(apiForm.api_url)
      setSheets(result.sheets || [])
      if (result.sheets?.length > 0) setSelectedSheet(result.sheets[0])
    } catch (e) { setError(e.message) }
    finally { setSheetsLoading(false) }
  }

  function normalizeApiUrl(url, sheet) {
    const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    if (!m) return url
    const id = m[1]
    if (sheet) return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&sheet=${encodeURIComponent(sheet)}`
    const gidM = url.match(/[#&?]gid=(\d+)/)
    const gid = gidM ? gidM[1] : '0'
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (['xlsx', 'xls'].includes(ext)) {
      try {
        const fd = new FormData(); fd.append('file', file)
        const result = await api.reports.datasets.getExcelSheets(fd)
        if (result.sheets && result.sheets.length > 1) {
          const meta = result.sheets_meta || result.sheets.map(s => ({ name: s }))
          // Se a aba sugerida é um espelho de fórmula, usa a aba fonte como padrão
          const suggested = meta.find(m => m.suggested) || meta.find(m => m.type === 'data')
          const formulaMirror = !suggested && meta.find(m => m.formula_source)
          const defaultSheet = suggested?.name || formulaMirror?.formula_source || result.sheets[0]
          setExcelSheetPicker({ file, sheets: result.sheets, sheetsMeta: meta, defaultSheet })
          if (fileRef.current) fileRef.current.value = ''
          return
        }
      } catch { /* fallthrough */ }
    }
    await doUpload(file, null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function doUpload(file, sheetName) {
    setUploading(true); setError(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      if (sheetName) fd.append('sheet_name', sheetName)
      const ds = await api.reports.datasets.upload(fd)
      onDatasetsChange([ds, ...datasets])
      if (reportDatasetIds !== null && onPinDataset) onPinDataset(ds.id)
    } catch (err) { setError(err.message) }
    finally { setUploading(false) }
  }

  async function handleExcelSheetConfirm(sheetName) {
    const { file } = excelSheetPicker
    setExcelSheetPicker(null)
    await doUpload(file, sheetName)
  }

  async function handleApiCreate(e) {
    e.preventDefault(); setApiSaving(true); setError(null)
    try {
      let headers = null
      if (apiForm.api_headers.trim()) {
        try { headers = JSON.parse(apiForm.api_headers) } catch { throw new Error('Headers inválidos — use JSON: {"Authorization":"Bearer <token>"}') }
      }
      const resolvedUrl = isGoogleSheets ? normalizeApiUrl(apiForm.api_url, selectedSheet) : apiForm.api_url
      const ds = await api.reports.datasets.createApi({ name: apiForm.name, api_url: resolvedUrl, api_headers: headers, api_data_path: apiForm.api_data_path || null })
      onDatasetsChange([ds, ...datasets])
      if (reportDatasetIds !== null && onPinDataset) onPinDataset(ds.id)
      setApiForm({ name: '', api_url: '', api_headers: '', api_data_path: '' })
      setSheets([]); setSelectedSheet('')
    } catch (err) { setError(err.message) }
    finally { setApiSaving(false) }
  }

  async function handleSync(id, type) {
    setSyncing(id)
    try {
      let updated
      if (type === 'links') {
        updated = await api.reports.datasets.syncLinks(id)
      } else {
        updated = await api.reports.datasets.sync(id)
      }
      onDatasetsChange(datasets.map(d => d.id === id ? updated : d))
    } catch (err) { setError(err.message) }
    finally { setSyncing(null) }
  }

  async function handleLinksTabOpen() {
    if (linksCampaigns === null) {
      try {
        const data = await api.links.listCampaigns()
        setLinksCampaigns(data || [])
        if (data?.length > 0) setLinksForm(f => ({ ...f, campaignId: data[0].id, name: `Links - ${data[0].name}` }))
      } catch { setLinksCampaigns([]) }
    }
  }

  async function handleLinksCreate(e) {
    e.preventDefault(); setLinksSaving(true); setError(null)
    try {
      const ds = await api.reports.datasets.createLinksDataset(linksForm.campaignId, linksForm.name, linksForm.days)
      onDatasetsChange([ds, ...datasets])
      if (reportDatasetIds !== null && onPinDataset) onPinDataset(ds.id)
      setLinksForm(f => ({ ...f, name: '' }))
    } catch (err) { setError(err.message) }
    finally { setLinksSaving(false) }
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
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('dataset.title')}</p>

      {displayedDatasets.length > 0 && (
        <div className="space-y-2">
          {displayedDatasets.map(ds => (
            <div key={ds.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${ds.type === 'api' ? 'bg-blue-100 text-blue-700' : ds.type === 'google-analytics' ? 'bg-orange-100 text-orange-700' : ds.type === 'database' ? 'bg-emerald-100 text-emerald-700' : ds.type === 'links' ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'}`}>{ds.type === 'google-analytics' ? 'GA' : ds.type === 'database' ? 'DB' : ds.type.toUpperCase()}</span>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{ds.name}</p>
                  {ds.is_demo && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">DEMO</span>}
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{(ds.row_count || 0).toLocaleString()} lin.</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(ds.type === 'api' || ds.type === 'google-analytics' || ds.type === 'links') && (
                    <button onClick={() => handleSync(ds.id, ds.type)} disabled={syncing === ds.id} title={t('dataset.syncTitle')} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                      <svg className={`w-3.5 h-3.5 ${syncing === ds.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  )}
                  {reportDatasetIds !== null && onUnpinDataset ? (
                    <button onClick={() => onUnpinDataset(ds.id)} title="Remover deste dashboard" className="p-1 text-gray-400 hover:text-orange-500 rounded">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  ) : (
                    <button onClick={() => handleDelete(ds.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
              {ds.type === 'api' && (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={ds.refresh_interval_minutes ?? ''}
                    disabled={scheduleSaving === ds.id}
                    onChange={e => handleSchedule(ds.id, e.target.value === '' ? null : parseInt(e.target.value))}
                    className="flex-1 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    title={t('dataset.refreshTitle')}
                  >
                    <option value="">{t('dataset.noRefresh')}</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">{t('dataset.refresh1h')}</option>
                    <option value="240">{t('dataset.refresh4h')}</option>
                    <option value="1440">{t('dataset.refresh24h')}</option>
                  </select>
                  {ds.next_refresh_at && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0" title={t('dataset.nextRefresh')}>
                      ↻ {new Date(ds.next_refresh_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Picker de datasets existentes para pinar */}
      {reportDatasetIds !== null && onPinDataset && unpinnedDatasets.length > 0 && (
        <div>
          {showAddPicker ? (
            <div className="border border-violet-200 dark:border-violet-800 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-800">
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">Adicionar fonte existente</span>
                <button onClick={() => setShowAddPicker(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {unpinnedDatasets.map(ds => (
                  <button key={ds.id} onClick={() => { onPinDataset(ds.id); setShowAddPicker(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-left transition-colors bg-white dark:bg-gray-800">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${ds.type === 'api' ? 'bg-blue-100 text-blue-700' : ds.type === 'google-analytics' ? 'bg-orange-100 text-orange-700' : ds.type === 'database' ? 'bg-emerald-100 text-emerald-700' : ds.type === 'links' ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'}`}>{ds.type === 'google-analytics' ? 'GA' : ds.type === 'database' ? 'DB' : ds.type.toUpperCase()}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{ds.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto shrink-0">{(ds.row_count || 0).toLocaleString()} lin.</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddPicker(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-violet-600 font-semibold hover:bg-violet-50 rounded-lg border border-dashed border-violet-200 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Adicionar fonte existente
            </button>
          )}
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {['upload', 'api', 'links'].map(tabKey => (
            <button key={tabKey} onClick={() => { setTab(tabKey); if (tabKey === 'links') handleLinksTabOpen() }}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === tabKey ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {tabKey === 'upload' ? t('dataset.uploadTab') : tabKey === 'api' ? t('dataset.apiTab') : 'Links'}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 border-b border-red-100">{error}</p>}

        {tab === 'upload' && (
          <div className="p-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{t('dataset.uploadHint')}</p>
            <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-xs text-gray-500 dark:text-gray-400">{uploading ? t('dataset.uploading') : t('dataset.clickToSelect')}</span>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}

        {tab === 'links' && (
          <div className="p-3 space-y-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">Importe dados de cliques de uma campanha de links como dataset para usar nos seus dashboards.</p>
            {linksCampaigns === null ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">Carregando campanhas...</p>
            ) : linksCampaigns.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">Nenhuma campanha de links encontrada.</p>
            ) : (
              <form onSubmit={handleLinksCreate} className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Campanha</label>
                  <select
                    className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white dark:bg-gray-800 dark:text-gray-200"
                    value={linksForm.campaignId}
                    onChange={e => {
                      const camp = linksCampaigns.find(c => c.id === e.target.value)
                      setLinksForm(f => ({ ...f, campaignId: e.target.value, name: camp ? `Links - ${camp.name}` : f.name }))
                    }}
                    required
                  >
                    {linksCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nome do dataset</label>
                  <input className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white dark:bg-gray-800 dark:text-gray-200" placeholder="Ex: Links - Campanha Verao" value={linksForm.name} onChange={e => setLinksForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Periodo retroativo</label>
                  <select
                    className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white dark:bg-gray-800 dark:text-gray-200"
                    value={linksForm.days}
                    onChange={e => setLinksForm(f => ({ ...f, days: parseInt(e.target.value) }))}
                  >
                    <option value={7}>Ultimos 7 dias</option>
                    <option value={30}>Ultimos 30 dias</option>
                    <option value={90}>Ultimos 90 dias</option>
                    <option value={180}>Ultimos 180 dias</option>
                    <option value={365}>Ultimo ano</option>
                  </select>
                </div>
                <button type="submit" disabled={linksSaving} className="w-full py-2 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 disabled:opacity-50 mt-1">
                  {linksSaving ? 'Importando...' : 'Importar cliques'}
                </button>
              </form>
            )}
          </div>
        )}

        {tab === 'api' && (
          <form onSubmit={handleApiCreate} className="p-3 space-y-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dataset.apiName')}</label>
              <input className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-gray-800 dark:text-gray-200" placeholder={t('dataset.apiNamePlaceholder')} value={apiForm.name} onChange={e => setApiForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dataset.apiUrl')}</label>
              <input className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-gray-800 dark:text-gray-200" placeholder={t('dataset.apiUrlPlaceholder')} value={apiForm.api_url} onChange={e => handleApiUrlChange(e.target.value)} required />
              {isGoogleSheets && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] text-violet-600">Google Sheets detectado</span>
                  <button type="button" onClick={fetchSheets} disabled={sheetsLoading} className="text-[10px] text-violet-600 underline hover:text-violet-800 disabled:opacity-50">
                    {sheetsLoading ? 'Buscando...' : 'Buscar abas'}
                  </button>
                </div>
              )}
              {sheets.length > 0 && (
                <select value={selectedSheet} onChange={e => setSelectedSheet(e.target.value)} className="mt-1.5 w-full border border-violet-200 dark:border-violet-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-gray-800 dark:text-gray-200">
                  {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dataset.apiHeaders')}</label>
              <input className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono bg-white dark:bg-gray-800 dark:text-gray-200" placeholder='{"Authorization":"Bearer token"}' value={apiForm.api_headers} onChange={e => setApiForm(f => ({ ...f, api_headers: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dataset.apiPath')}</label>
              <input className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono bg-white dark:bg-gray-800 dark:text-gray-200" placeholder={t('dataset.apiPathPlaceholder')} value={apiForm.api_data_path} onChange={e => setApiForm(f => ({ ...f, api_data_path: e.target.value }))} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('dataset.apiPathHint')}</p>
            </div>
            <button type="submit" disabled={apiSaving} className="w-full py-2 bg-violet-600 text-white text-xs font-semibold rounded hover:bg-violet-700 disabled:opacity-50 mt-1">{apiSaving ? t('dataset.apiConnecting') : t('dataset.apiConnect')}</button>
          </form>
        )}
      </div>

      {excelSheetPicker && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setExcelSheetPicker(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Qual aba contém os dados?</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">O arquivo tem {excelSheetPicker.sheets.length} abas. Escolha qual importar como dataset.</p>
            <ExcelSheetPickerInline sheets={excelSheetPicker.sheets} sheetsMeta={excelSheetPicker.sheetsMeta} defaultSheet={excelSheetPicker.defaultSheet} onConfirm={handleExcelSheetConfirm} onClose={() => setExcelSheetPicker(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function ExcelSheetPickerInline({ sheets, sheetsMeta, defaultSheet, onConfirm, onClose }) {
  const [selected, setSelected] = useState(defaultSheet || sheets[0] || '')
  const meta = sheetsMeta || sheets.map(s => ({ name: s }))

  const typeLabel = (type) => {
    if (type === 'data') return { label: 'Dados', cls: 'bg-green-100 text-green-700' }
    if (type === 'summary') return { label: 'Resumo', cls: 'bg-yellow-100 text-yellow-700' }
    if (type === 'formula') return { label: 'Fórmula', cls: 'bg-orange-100 text-orange-700' }
    if (type === 'empty') return { label: 'Vazia', cls: 'bg-gray-100 text-gray-400' }
    return { label: 'Indefinida', cls: 'bg-gray-100 text-gray-500' }
  }

  return (
    <>
      <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto pr-1">
        {meta.map(m => {
          const isSelected = selected === m.name
          const tl = typeLabel(m.type)
          return (
            <button
              key={m.name}
              onClick={() => setSelected(m.name)}
              className={`w-full text-left rounded-xl border-2 px-3 py-2.5 transition-all ${isSelected ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-300'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{m.name}</span>
                {m.suggested && (
                  <span className="text-[10px] font-semibold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">Recomendada</span>
                )}
                {m.type && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tl.cls}`}>{tl.label}</span>
                )}
              </div>
              {m.reason && (
                <p className="text-[11px] text-gray-400 mt-0.5">{m.reason}</p>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onConfirm(selected)} className="flex-1 bg-violet-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-violet-700">Importar aba</button>
      </div>
    </>
  )
}

// ─── Smart preset generation ─────────────────────────────────────────────────
function _detectColsByRole(ds) {
  const cols = ds.columns || []
  const types = ds.column_types || {}
  const isDate = c => types[c] === 'date' || /\b(data|date|periodo|mes|ano|emissao|vencimento|competencia|created|updated)\b/i.test(c)
  const isNum  = c => types[c] === 'number' || /\b(valor|total|faturamento|receita|preco|price|amount|revenue|liquido|bruto|desconto|quantidade|qtd|count|volume)\b/i.test(c)
  const isId   = c => /\b(cnpj|cpf|id|codigo|numero|chave|nfe|nfse|rps|hash|uuid|inscricao|cep|telefone|email|endereco|logradouro|bairro)\b/i.test(c)
  const isClient = c => /\b(cliente|tomador|razao|empresa|prestador|fornecedor|nome)\b/i.test(c) && !isId(c)
  const isCat  = c => !isId(c) && !isNum(c) && !isDate(c) && !isClient(c)
    && /\b(status|situacao|tipo|categoria|grupo|servico|modalidade|natureza|tributacao|regime)\b/i.test(c)

  const dateCol   = cols.find(isDate)
  const valueCols = cols.filter(isNum)
  const clientCol = cols.find(isClient)
  const catCol    = cols.find(isCat)
  return { dateCol, valueCols, mainValue: valueCols[0], clientCol, catCol }
}

function generateSmartPresets(ds) {
  const { dateCol, mainValue, clientCol, catCol } = _detectColsByRole(ds)
  const dsId = ds.id
  const presets = []

  const mkDateFilter = () => dateCol ? {
    id: crypto.randomUUID(), type: 'filter', title: 'Período',
    dataset_id: dsId, filter_col: dateCol, filter_label: 'Período',
    config: { date_mode: true }, layout: { w: 4, h: 2 },
  } : null

  const mkKpi = (title, col, agg, w = 3) => ({
    id: crypto.randomUUID(), type: 'kpi', title, dataset_id: dsId,
    value_col: col, agg, layout: { w, h: 2 },
  })

  const mkLine = (title, labelCol, valCol) => ({
    id: crypto.randomUUID(), type: 'line', title, dataset_id: dsId,
    label_col: labelCol, value_col: valCol, agg: 'sum',
    config: { granularity: 'month', dim_type: 'date' }, layout: { w: 6, h: 4 },
  })

  const mkBubble = (title, labelCol, valCol) => ({
    id: crypto.randomUUID(), type: 'bubble', title, dataset_id: dsId,
    label_col: labelCol, value_col: valCol, agg: 'sum', layout: { w: 6, h: 4 },
  })

  const mkBarH = (title, labelCol, valCol) => ({
    id: crypto.randomUUID(), type: 'bar_h', title, dataset_id: dsId,
    label_col: labelCol, value_col: valCol, agg: 'sum', layout: { w: 6, h: 4 },
  })

  const mkPie = (title, labelCol, valCol) => ({
    id: crypto.randomUUID(), type: 'pie', title, dataset_id: dsId,
    label_col: labelCol, value_col: valCol, agg: 'sum', layout: { w: 4, h: 4 },
  })

  const mkCatFilter = (col) => ({
    id: crypto.randomUUID(), type: 'filter', title: col, dataset_id: dsId,
    filter_col: col, filter_label: col, config: {}, layout: { w: 3, h: 4 },
  })

  // ── Preset 1: Faturamento / Revenue evolution ─────────────────────────────
  if (mainValue) {
    const df = mkDateFilter()
    const blocks = []
    if (df) blocks.push(df)
    blocks.push(mkKpi(`Total ${mainValue}`, mainValue, 'sum'))
    blocks.push(mkKpi('Ticket Médio', mainValue, 'avg'))
    if (dateCol) {
      blocks.push(mkKpi('Contagem', mainValue, 'count'))
      blocks.push(mkLine('Evolução Mensal', dateCol, mainValue))
    }
    presets.push({
      id: 'faturamento',
      title: dateCol ? `Evolução de ${mainValue}` : `Análise de ${mainValue}`,
      desc: dateCol ? 'KPIs + evolução mensal + filtro de período' : 'KPIs principais',
      blocks,
    })
  }

  // ── Preset 2: Por Cliente ─────────────────────────────────────────────────
  if (clientCol && mainValue) {
    const df = mkDateFilter()
    const blocks = []
    if (df) blocks.push({ ...df, id: crypto.randomUUID() })
    blocks.push(mkBubble(`Concentração por ${clientCol}`, clientCol, mainValue))
    blocks.push(mkBarH(`Top ${clientCol}`, clientCol, mainValue))
    presets.push({
      id: 'clientes',
      title: `Por ${clientCol}`,
      desc: 'Concentração + ranking',
      blocks,
    })
  }

  // ── Preset 3: Por Categoria/Status ────────────────────────────────────────
  if (catCol && mainValue) {
    const df = mkDateFilter()
    const blocks = []
    if (df) blocks.push({ ...df, id: crypto.randomUUID() })
    blocks.push(mkCatFilter(catCol))
    blocks.push(mkPie(`Distribuição por ${catCol}`, catCol, mainValue))
    presets.push({
      id: 'categoria',
      title: `Por ${catCol}`,
      desc: 'Filtro + distribuição',
      blocks,
    })
  }

  // ── Preset 4: Filtro de data standalone ───────────────────────────────────
  if (dateCol) {
    presets.push({
      id: 'date_filter',
      title: 'Filtro de Período',
      desc: `Selecionar intervalo de ${dateCol}`,
      blocks: [mkDateFilter()],
    })
  }

  return presets
}

export function ColumnsPanel({ datasets = [], blocks = [], selectedBlockId, onAssignColumn, onDatasetsChange, onColumnDragStart, onColumnDragEnd, onAddPreset, reportDatasetIds = null, onUnpinDataset, onPinDataset }) {
  const [tab, setTab] = useState('colunas')
  const [search, setSearch] = useState('')
  const [expandedDates, setExpandedDates] = useState(new Set())
  const [expandedDatasets, setExpandedDatasets] = useState(() => new Set(datasets.map(d => d.id)))
  const [expandedPresets, setExpandedPresets] = useState(true)
  const [showAddPicker, setShowAddPicker] = useState(false)

  const GRANULARITIES = [
    { value: 'year', label: 'Ano' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'month', label: 'Mês' },
    { value: 'week', label: 'Semana' },
    { value: 'day', label: 'Dia' },
    { value: 'hour', label: 'Hora' },
    { value: 'minute', label: 'Minuto' },
    { value: 'second', label: 'Segundo' },
  ]

  function toggleDataset(id) {
    setExpandedDatasets(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Datasets efetivamente usados por blocos deste dashboard
  const usedDatasetIds = new Set(blocks.map(b => b.dataset_id).filter(Boolean))
  const usedDatasets = datasets.filter(d => usedDatasetIds.has(d.id))

  // reportDatasetIds: null = legado (mostra usados ou todos), [] = nenhum selecionado, [ids] = filtrado
  const displayDatasets = reportDatasetIds !== null
    ? datasets.filter(d => reportDatasetIds.includes(d.id))
    : (usedDatasets.length > 0 ? usedDatasets : datasets)

  // Datasets disponíveis para adicionar (não estão no dashboard ainda)
  const unpinnedDatasets = reportDatasetIds !== null
    ? datasets.filter(d => !reportDatasetIds.includes(d.id))
    : []

  const hiddenCount = reportDatasetIds !== null ? 0 : datasets.length - displayDatasets.length

  // Sugestões inteligentes: date_filter pertence ao painel Filtros — não exibir aqui
  const allPresets = displayDatasets.flatMap(ds => generateSmartPresets(ds).filter(p => p.id !== 'date_filter').map(p => ({ ...p, dsName: ds.name, dsId: ds.id })))

  return (
    <div className="space-y-2">
      {/* Tabs */}
      <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {[{ k: 'colunas', l: 'Dados' }, { k: 'gerenciar', l: 'Gerenciar' }].map(tk => (
          <button key={tk.k} onClick={() => setTab(tk.k)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === tk.k ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
            {tk.l}
          </button>
        ))}
      </div>

      {tab === 'colunas' && (
        <div className="space-y-1.5">

          {/* ── Seção: Sugestões inteligentes ───────────────────────────── */}
          {allPresets.length > 0 && onAddPreset && (
            <div className="border border-violet-100 dark:border-violet-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedPresets(p => !p)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">Sugestões inteligentes</span>
                </div>
                <svg className={`w-3.5 h-3.5 text-violet-400 transition-transform ${expandedPresets ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedPresets && (
                <div className="divide-y divide-violet-50 dark:divide-violet-900/30">
                  {allPresets.map(preset => (
                    <div key={`${preset.dsId}-${preset.id}`} className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-800 hover:bg-violet-50/60 dark:hover:bg-violet-950/40 transition-colors group">
                      <span className="shrink-0 w-6 h-6 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-500">
                        {preset.id === 'faturamento' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" /></svg>}
                        {preset.id === 'clientes' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 3.13a4 4 0 010 7.75" /></svg>}
                        {preset.id === 'categoria' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
                        {preset.id === 'date_filter' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-none truncate">{preset.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-none truncate">{preset.desc}</p>
                      </div>
                      <button
                        onClick={() => onAddPreset(preset.blocks)}
                        title={`Adicionar: ${preset.title}`}
                        className="shrink-0 w-6 h-6 rounded-lg bg-violet-100 text-violet-600 hover:bg-violet-600 hover:text-white transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Busca ──────────────────────────────────────────────────── */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar coluna..." className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-gray-200 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-all" />
          </div>

          {!selectedBlockId && !search && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 rounded-lg px-2.5 py-1.5">
              Selecione um bloco para atribuir colunas manualmente
            </p>
          )}
          {hiddenCount > 0 && !search && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-2.5 py-1.5">
              {hiddenCount} fonte{hiddenCount > 1 ? 's' : ''} não usada{hiddenCount > 1 ? 's' : ''} neste dashboard — disponível em <button onClick={() => setTab('gerenciar')} className="text-violet-600 underline font-medium">Gerenciar</button>
            </p>
          )}

          {/* Estado vazio quando nenhum dataset vinculado */}
          {reportDatasetIds !== null && displayDatasets.length === 0 && !search && (
            <div className="text-center py-6 px-3">
              <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5"/></svg>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Nenhuma fonte vinculada a este dashboard</p>
              {unpinnedDatasets.length > 0 && onPinDataset && (
                <button onClick={() => setShowAddPicker(true)} className="text-xs text-violet-600 font-semibold hover:underline">+ Adicionar fonte de dados</button>
              )}
            </div>
          )}

          {displayDatasets.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">Nenhum dataset — vá em Gerenciar para adicionar</p>
          ) : displayDatasets.map(ds => {
            const cols = ds.columns || []
            const colTypes = ds.column_types || {}
            const filtered = search ? cols.filter(c => String(c).toLowerCase().includes(search.toLowerCase())) : cols
            if (filtered.length === 0) return null
            const isOpen = expandedDatasets.has(ds.id) || !!search

            return (
              <div key={ds.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Dataset header — accordion toggle */}
                <div className="flex items-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <button
                    onClick={() => toggleDataset(ds.id)}
                    className="flex items-center gap-2 px-3 py-2.5 text-left flex-1 min-w-0"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" />
                    </svg>
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 flex-1 truncate">{ds.name}</span>
                    {ds.is_demo && <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-600 shrink-0">DEMO</span>}
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 shrink-0">{cols.length} cols</span>
                    <svg className={`w-3 h-3 text-gray-300 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {reportDatasetIds !== null && onUnpinDataset && (
                    <button
                      onClick={e => { e.stopPropagation(); onUnpinDataset(ds.id) }}
                      title="Remover deste dashboard"
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>

                {/* Columns list */}
                {isOpen && (
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {filtered.map(col => {
                      const type = colTypes[col] || 'text'
                      const semantic = (ds.column_semantics || {})[col] || (type === 'number' ? 'metric' : type === 'date' ? 'date' : type === 'boolean' ? 'boolean' : 'category')
                      const isDateCol = type === 'date'
                      const key = `${ds.id}:${col}`
                      const isExpanded = expandedDates.has(key)

                      const SEMANTIC_STYLE = {
                        metric:     { cls: 'text-violet-700 bg-violet-50', icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, tip: 'Métrica - use Soma ou Média' },
                        identifier: { cls: 'text-teal-700 bg-teal-50',    icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8M12 3v4"/></svg>, tip: 'Identificador - use Contagem distinta' },
                        category:   { cls: 'text-blue-700 bg-blue-50',    icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h6"/></svg>, tip: 'Categoria - use como Dimensão' },
                        date:       { cls: 'text-amber-700 bg-amber-50',  icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, tip: 'Data - use como eixo temporal' },
                        boolean:    { cls: 'text-emerald-700 bg-emerald-50', icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>, tip: 'Booleano - use como Filtro' },
                      }
                      const { cls, icon, tip } = SEMANTIC_STYLE[semantic] || SEMANTIC_STYLE.category

                      return (
                        <div key={col}>
                          <div
                            className={`group flex items-center gap-1 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors ${onColumnDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            draggable={!!onColumnDragStart}
                            onDragStart={onColumnDragStart ? e => {
                              e.dataTransfer.effectAllowed = 'copy'
                              e.dataTransfer.setData('text/plain', JSON.stringify({ col, colType: type, datasetId: ds.id }))
                              onColumnDragStart(col, type, ds.id)
                            } : undefined}
                            onDragEnd={onColumnDragEnd || undefined}
                          >
                            <button
                              onClick={() => {
                                if (isDateCol) {
                                  setExpandedDates(prev => {
                                    const next = new Set(prev)
                                    if (next.has(key)) next.delete(key)
                                    else next.add(key)
                                    return next
                                  })
                                }
                                onAssignColumn?.(col, type, null, ds.id)
                              }}
                              className="flex-1 flex items-center gap-2 px-3 py-1.5 text-left"
                            >
                              <span title={tip} className={`w-5 h-5 flex items-center justify-center shrink-0 rounded ${cls}`}>
                                {icon}
                              </span>
                              <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{col}</span>
                              {isDateCol && (
                                <svg className={`w-3 h-3 text-gray-300 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              )}
                            </button>
                            <div className="flex gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {type !== 'number' && (
                                <button onClick={e => { e.stopPropagation(); onAssignColumn?.(col, type === 'date' ? 'date' : 'text', null, ds.id) }}
                                  title="Atribuir como Dimensão"
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded hover:bg-violet-100 transition-colors">Dim</button>
                              )}
                              <button onClick={e => { e.stopPropagation(); onAssignColumn?.(col, 'number', null, ds.id) }}
                                title="Atribuir como Métrica"
                                className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors">Mét</button>
                            </div>
                          </div>
                          {isDateCol && isExpanded && (
                            <div className="ml-10 pb-1 space-y-0.5">
                              {GRANULARITIES.map(g => (
                                <button key={g.value}
                                  onClick={() => onAssignColumn?.(col, 'date', g.value, ds.id)}
                                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-left transition-colors">
                                  <span className="text-[9px] text-blue-300 w-4">↳</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{g.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Botão Adicionar fonte (apenas quando datasets vinculados estão configurados) */}
      {tab === 'colunas' && reportDatasetIds !== null && unpinnedDatasets.length > 0 && onPinDataset && (
        <div className="pt-1">
          {showAddPicker ? (
            <div className="border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
                <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400">Adicionar fonte</span>
                <button onClick={() => setShowAddPicker(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {unpinnedDatasets.map(ds => (
                  <button key={ds.id} onClick={() => { onPinDataset(ds.id); setShowAddPicker(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors text-left bg-white dark:bg-gray-800">
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5"/></svg>
                    <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{ds.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{(ds.row_count || 0).toLocaleString()} linhas</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddPicker(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-violet-600 font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-xl border border-dashed border-violet-200 dark:border-violet-800 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Adicionar fonte de dados
            </button>
          )}
        </div>
      )}

      {tab === 'gerenciar' && (
        <DatasetPanel datasets={datasets} onDatasetsChange={onDatasetsChange} reportDatasetIds={reportDatasetIds} onPinDataset={onPinDataset} onUnpinDataset={onUnpinDataset} />
      )}
    </div>
  )
}

// ─── BlockDropZones — overlays de drop exibidos durante drag de coluna ───────
function BlockDropZones({ block, draggedColumn, onDrop }) {
  if (!draggedColumn) return null
  const zones = DROP_ZONE_CONFIG[block.type]
  if (!zones) return null
  return (
    <div className="absolute inset-0 z-30 flex gap-1.5 p-2 pointer-events-none rounded-[inherit]">
      {zones.map(zone => {
        const compatible = zone.accepts.some(a => {
          if (a === 'number') return draggedColumn.colType === 'number'
          if (a === 'date')   return draggedColumn.colType === 'date'
          if (a === 'text')   return ['text', 'date'].includes(draggedColumn.colType)
          return false
        })
        const currentVal = block[zone.slot]
        return (
          <div
            key={zone.slot}
            className={`flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed pointer-events-auto transition-all duration-100 select-none
              ${compatible
                ? 'border-violet-400 bg-violet-50/95 dark:bg-violet-900/80 text-violet-700 dark:text-violet-300 cursor-copy hover:bg-violet-100/95 hover:border-violet-500 scale-[0.98]'
                : 'border-gray-200 bg-white/80 dark:bg-gray-800/80 text-gray-300 cursor-not-allowed opacity-50'}`}
            onDragOver={e => { if (compatible) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
            onDrop={e => { e.preventDefault(); if (compatible) onDrop(block.id, zone.slot, draggedColumn) }}
          >
            <span className="text-[10px] font-bold text-center leading-tight px-1">{zone.label}</span>
            {currentVal && (
              <span className="text-[9px] text-violet-400 mt-0.5 truncate max-w-full px-1 font-medium">↳ {currentVal}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── RichTextEditor — contenteditable com suporte a HTML ──────────────────────
function RichTextEditor({ block, onTextChange }) {
  const ref = useRef(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      ref.current.innerHTML = block.config?.text || ''
      initializedRef.current = true
    }
  }, [block.id])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="w-full h-full text-sm outline-none overflow-auto leading-relaxed"
      style={{ color: block.config?.text_color || '#4b5563' }}
      onInput={e => onTextChange(e.currentTarget.innerHTML)}
    />
  )
}

// ─── FloatingTextToolbar — toolbar de formatação para bloco de texto ──────────
function FloatingTextToolbar({ block, blocks, onChange }) {
  const [fontSize, setFontSize] = useState('3')

  function execCmd(cmd, val) {
    document.execCommand(cmd, false, val ?? null)
  }

  function updConfig(patch) {
    onChange(blocks.map(b => b.id === block.id ? { ...b, config: { ...b.config, ...patch } } : b))
  }

  const btnBase = 'flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors text-xs font-semibold'
  const divider = <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />

  return (
    <div
      className="absolute -top-11 left-0 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center px-1.5 py-1 gap-0.5 z-50 flex-wrap"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Negrito */}
      <button className={btnBase} title="Negrito (Ctrl+B)" onClick={() => execCmd('bold')}>
        <span className="font-bold">B</span>
      </button>
      {/* Itálico */}
      <button className={btnBase} title="Itálico (Ctrl+I)" onClick={() => execCmd('italic')}>
        <em>I</em>
      </button>
      {/* Sublinhado */}
      <button className={btnBase} title="Sublinhado (Ctrl+U)" onClick={() => execCmd('underline')}>
        <span className="underline">U</span>
      </button>
      {divider}
      {/* Tamanho */}
      <select
        value={fontSize}
        onChange={e => { setFontSize(e.target.value); execCmd('fontSize', e.target.value) }}
        onMouseDown={e => e.stopPropagation()}
        className="text-[10px] border border-gray-200 rounded-lg px-1 py-1 outline-none focus:border-violet-400 bg-white text-gray-600 cursor-pointer"
        title="Tamanho"
      >
        <option value="1">XS</option>
        <option value="2">P</option>
        <option value="3">M</option>
        <option value="4">G</option>
        <option value="5">GG</option>
        <option value="6">XG</option>
      </select>
      {divider}
      {/* Alinhamentos */}
      <button className={btnBase} title="Alinhar à esquerda" onClick={() => execCmd('justifyLeft')}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 10h10M4 14h16M4 18h10"/>
        </svg>
      </button>
      <button className={btnBase} title="Centralizar" onClick={() => execCmd('justifyCenter')}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M7 10h10M4 14h16M7 18h10"/>
        </svg>
      </button>
      <button className={btnBase} title="Alinhar à direita" onClick={() => execCmd('justifyRight')}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M10 10h10M4 14h16M10 18h10"/>
        </svg>
      </button>
      {divider}
      {/* Lista */}
      <button className={btnBase} title="Lista com marcadores" onClick={() => execCmd('insertUnorderedList')}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
        </svg>
      </button>
      {divider}
      {/* Cor do texto */}
      <label className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer" title="Cor do texto">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3L5 18h3l2-5h4l2 5h3L12 3z"/>
        </svg>
        <input type="color" className="sr-only" defaultValue={block.config?.text_color || '#4b5563'} onChange={e => { updConfig({ text_color: e.target.value }); execCmd('foreColor', e.target.value) }} />
      </label>
      {divider}
      {/* Excluir */}
      <button
        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        title="Excluir bloco"
        onClick={() => onChange(blocks.filter(b => b.id !== block.id))}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  )
}

// ─── FloatingBlockToolbar — toolbar flutuante acima do bloco selecionado ──────
function FloatingBlockToolbar({ block, blocks, onChange, datasets, onBlockAction, onAiImprove, onClone }) {
  const [showTypes, setShowTypes] = useState(false)
  const [showData, setShowData] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [showInspector, setShowInspector] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const CHART_TYPES_QUICK = [
    { type: 'kpi',   label: 'KPI' },
    { type: 'bar',   label: 'Barras' },
    { type: 'bar_h', label: 'Barras H' },
    { type: 'line',  label: 'Linha' },
    { type: 'area',  label: 'Área' },
    { type: 'pie',   label: 'Pizza' },
    { type: 'table', label: 'Tabela' },
    { type: 'scatter', label: 'Scatter' },
  ]

  const CHART_COLORS = ['#6D28D9', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626', '#374151']

  const currentType = BLOCK_TYPES.find(bt => bt.type === block.type)
  const currentColor = block.config?.chartColor || block.config?.color || '#6D28D9'
  const ds = datasets.find(d => d.id === block.dataset_id) || datasets[0]
  const numCols = Object.entries(ds?.column_types || {}).filter(([, t]) => t === 'number').map(([c]) => c)
  const dimCols = Object.entries(ds?.column_types || {}).filter(([, t]) => t !== 'number').map(([c]) => c)

  function upd(patch) {
    onChange(blocks.map(b => b.id === block.id ? { ...b, ...patch } : b))
  }

  function closeAll() { setShowTypes(false); setShowData(false); setShowColors(false); setShowInspector(false) }

  async function handleAiImprove() {
    if (!onAiImprove || aiLoading) return
    setAiLoading(true)
    try { await onAiImprove(block.id) }
    catch (e) { console.error('[FloatingBlockToolbar] IA improve:', e) }
    finally { setAiLoading(false) }
  }

  return (
    <div
      className="absolute -top-10 left-0 bg-white rounded-2xl shadow-[0_8px_32px_rgba(109,40,217,0.18)] border border-[#E2E8F0] flex items-center px-1.5 py-1 gap-0.5 z-50"
      onClick={e => e.stopPropagation()}
    >
      {/* Type picker — oculto para filtros */}
      {block.type !== 'filter' && block.type !== 'slider' && <div className="relative">
        <button
          onClick={() => { setShowTypes(v => !v); setShowData(false); setShowColors(false) }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${showTypes ? 'bg-violet-50 text-violet-700' : 'text-gray-600 hover:bg-gray-100'}`}
          title="Tipo de bloco"
        >
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-500">{TYPE_ICONS[block.type]}</span>
          <span className="hidden sm:inline max-w-[52px] truncate">{currentType?.label || block.type}</span>
          <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        {showTypes && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 grid grid-cols-4 gap-1">
            {CHART_TYPES_QUICK.map(({ type, label }) => (
              <button
                key={type}
                title={label}
                onClick={() => { upd({ type }); setShowTypes(false) }}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-[10px] border transition-all ${block.type === type ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-600'}`}
              >
                <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{TYPE_ICONS[type]}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>}

      {block.type !== 'filter' && block.type !== 'slider' && <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0"/>}

      {/* Dados — oculto para filtros */}
      {block.type !== 'filter' && block.type !== 'slider' && <div className="relative">
        <button
          onClick={() => { setShowData(v => !v); setShowTypes(false); setShowColors(false) }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${showData ? 'bg-violet-50 text-violet-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          title="Configurar dados"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth={2}/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3"/>
          </svg>
          <span className="hidden sm:inline">Dados</span>
        </button>
        {showData && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 space-y-2.5">
            {datasets.length > 1 && (
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Dataset</label>
                <select
                  value={block.dataset_id || ''}
                  onChange={e => upd({ dataset_id: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white outline-none focus:border-violet-400"
                >
                  {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Dimensão</label>
              <select
                value={block.label_col || ''}
                onChange={e => upd({ label_col: e.target.value || null })}
                className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white outline-none focus:border-violet-400"
              >
                <option value="">—</option>
                {dimCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Métrica</label>
              <select
                value={block.value_col || ''}
                onChange={e => upd({ value_col: e.target.value || null })}
                className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white outline-none focus:border-violet-400"
              >
                <option value="">—</option>
                {numCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>}

      {/* IA Improve */}
      {onAiImprove && (
        <button
          onClick={handleAiImprove}
          disabled={aiLoading || !block.dataset_id}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-violet-50 hover:text-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Melhorar com Jarbis IA"
        >
          {aiLoading ? (
            <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          )}
          <span className="hidden sm:inline">IA</span>
        </button>
      )}

      {/* Color */}
      <div className="relative">
        <button
          onClick={() => { setShowColors(v => !v); setShowTypes(false); setShowData(false) }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${showColors ? 'bg-violet-50 text-violet-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          title="Cor do bloco"
        >
          <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: currentColor }} />
        </button>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 flex flex-wrap gap-1.5 w-[116px]">
            {CHART_COLORS.map(color => (
              <button
                key={color}
                onClick={() => { upd({ config: { ...block.config, chartColor: color } }); setShowColors(false) }}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: color, borderColor: currentColor === color ? 'white' : 'transparent', outline: currentColor === color ? `2px solid ${color}` : 'none' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* CSV Export */}
      {block.dataset_id && !['filter', 'slider', 'text', 'image'].includes(block.type) && (
        <button
          title="Exportar CSV"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          onClick={async () => {
            try {
              const result = await api.reports.datasets.queryV2(block.dataset_id, {
                dimensions: [], metrics: [{ column: '__count__', aggregation: 'count' }], limit: 5000
              })
              const raw = result?.data || result || []
              if (!raw.length) return
              const keys = Object.keys(raw[0])
              const csvRows = [keys.join(','), ...raw.map(r => keys.map(k => {
                const v = r[k] == null ? '' : String(r[k])
                return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
              }).join(','))]
              const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `${block.title || 'dados'}.csv`; a.click()
              URL.revokeObjectURL(url)
            } catch (e) { console.error('CSV export:', e) }
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      )}

      {/* Inspector — Ver dados brutos */}
      {block.dataset_id && !['filter', 'slider', 'text', 'image'].includes(block.type) && <div className="relative">
        <button
          onClick={() => { setShowInspector(v => !v); setShowTypes(false); setShowData(false); setShowColors(false) }}
          className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs transition-colors ${showInspector ? 'bg-violet-50 text-violet-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
          title="Inspecionar dados"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 6v12M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z"/>
          </svg>
        </button>
        {showInspector && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-600">Dados do bloco</span>
              <span className="text-[10px] text-gray-400">{block.dataset_id?.slice(0, 8)}…</span>
            </div>
            <div className="max-h-48 overflow-auto">
              <RawTableBlock datasetId={block.dataset_id} columns={[]} readOnly={true} />
            </div>
          </div>
        )}
      </div>}

      <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0"/>

      {/* Advanced */}
      <button
        onClick={() => { closeAll(); onBlockAction?.(block.id, 'config') }}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Configurações avançadas"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      {/* Duplicate */}
      {onClone && (
        <button
          onClick={() => { closeAll(); onClone() }}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Duplicar bloco"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => onChange(blocks.filter(b => b.id !== block.id))}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        title="Excluir bloco"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  )
}

export default function ReportBuilder({ blocks = [], onChange, readOnly = false, selectedBlockId, onSelectBlock, onBlockAction, datasets = [], sheetConfig = {}, globalDateFilter = {}, onGlobalDateFilterChange = null, shareToken = null, locale = 'pt-BR', bindingMode = false, filterTargetMode = false, filterBlockId = null, onToggleFilterTarget = null, draggedColumn = null, onDropColumn = null, onFiltersChange = null, filterResetTrigger = null, onAiImprove = null }) {
  const t = useTranslations('dashboardEditor')
  const [activeFilters, setActiveFilters] = useState({})
  const [crossFilters, setCrossFilters] = useState({})
  const [rangeFilters, setRangeFilters] = useState({})
  // isDragging removed — was set but never consumed
  const [hoveredBlockId, setHoveredBlockId] = useState(null)
  const [gridWidth, setGridWidth] = useState(0)
  // viewportWidth tracks the actual device width — used for isMobile so sidebar animations don't affect layout mode
  const [viewportWidth, setViewportWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 800)
  const sheetRef = useRef(null)

  useEffect(() => {
    if (!sheetRef.current) return
    // Measure synchronously on mount — getBoundingClientRect is accurate after layout
    const w = sheetRef.current.getBoundingClientRect().width
    if (w > 0) setGridWidth(w)
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cw = entry.contentRect.width
        if (cw > 0) setGridWidth(cw)
      }
    })
    observer.observe(sheetRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function onResize() { setViewportWidth(window.innerWidth) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!onFiltersChange) return
    const summary = {}
    const allIds = new Set([...Object.keys(crossFilters), ...Object.keys(activeFilters), ...Object.keys(rangeFilters)])
    allIds.forEach(dsId => {
      let count = 0
      if (crossFilters[dsId]) count += 1
      const af = activeFilters[dsId] || {}
      count += Object.values(af).filter(v => v !== null && v !== undefined && v !== '').length
      if (rangeFilters[dsId]) count += 1
      if (count > 0) summary[dsId] = count
    })
    onFiltersChange(summary)
  }, [crossFilters, activeFilters, rangeFilters])

  useEffect(() => {
    if (!filterResetTrigger?.datasetId) return
    const dsId = filterResetTrigger.datasetId
    setCrossFilters(prev => { const n = { ...prev }; delete n[dsId]; return n })
    setActiveFilters(prev => { const n = { ...prev }; delete n[dsId]; return n })
    setRangeFilters(prev => { const n = { ...prev }; delete n[dsId]; return n })
  }, [filterResetTrigger])

  function handleFilterChange(datasetId, col, val) {
    setActiveFilters(prev => {
      const colVal = val === '' ? undefined : val
      const datasetFilters = { ...(prev[datasetId] || {}), [col]: colVal }
      if (colVal === undefined) delete datasetFilters[col]
      return { ...prev, [datasetId]: datasetFilters }
    })
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

  // isMobile controls single-column vs multi-column layout
  // 768px = portrait phones stack, landscape phones (768-932px) get multi-column
  // AppLayout uses lg(1024px) so sidebar never interferes with this
  const isMobile = viewportWidth < 768
  const layout = isMobile
    ? [...blocks]
        .sort((a, b) => {
          const ay = a.layout?.y ?? 0, by = b.layout?.y ?? 0
          const ax = a.layout?.x ?? 0, bx = b.layout?.x ?? 0
          return ay !== by ? ay - by : ax - bx
        })
        .reduce((acc, b) => {
          const prevY = acc.length > 0 ? acc[acc.length - 1].y + acc[acc.length - 1].h : 0
          acc.push({ i: b.id, x: 0, y: prevY, w: 12, h: b.layout?.h ?? 3, minW: 1, minH: 1 })
          return acc
        }, [])
    : blocks.map(b => ({ i: b.id, x: b.layout?.x ?? 0, y: b.layout?.y ?? 0, w: b.layout?.w ?? 6, h: b.layout?.h ?? 3, minW: 1, minH: 1, static: !!b.config?.locked }))

  function syncLayout(newLayout) {
    if (readOnly || !onChange) return
    onChange(blocks.map(b => { const l = newLayout.find(n => n.i === b.id); return l ? { ...b, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : b }))
  }

  const sheetStyle = {
    backgroundColor: sheetConfig.bgColor || '#f8f7fc',
    borderRadius: isMobile ? '12px' : '16px',
    boxShadow: '0 2px 8px rgba(109,40,217,0.04), 0 12px 40px rgba(0,0,0,0.08)',
    minHeight: isMobile ? 'auto' : '640px',
    padding: isMobile ? '12px 12px 24px' : '28px 28px 40px',
    backgroundImage: `radial-gradient(circle, ${sheetConfig.dotColor || 'rgba(109,40,217,0.08)'} 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
  }

  if (blocks.length === 0) return (
    <div
      style={sheetStyle}
      ref={sheetRef}
      className={`report-canvas flex flex-col items-center justify-center gap-3 py-24 text-center transition-colors duration-150 ${draggedColumn ? 'ring-2 ring-violet-300 ring-inset' : ''}`}
      onDragOver={e => { if (draggedColumn) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
      onDrop={e => {
        e.preventDefault()
        if (!draggedColumn || !onDropColumn) return
        onDropColumn('__create__', 'auto', draggedColumn)
      }}
    >
      {draggedColumn ? (
        <>
          <svg className="w-10 h-10 text-violet-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          <p className="text-sm font-semibold text-violet-600">Solte para criar um bloco com <span className="font-bold">{draggedColumn.col}</span></p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 opacity-40">
            <div className="flex flex-col gap-1">
              <div className="w-16 h-2.5 rounded bg-gray-300" />
              <div className="w-12 h-2.5 rounded bg-gray-300" />
              <div className="w-14 h-2.5 rounded bg-gray-300" />
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            <div className="w-20 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400">Arraste uma coluna para começar</p>
          <p className="text-xs text-gray-300">ou clique no <span className="font-semibold text-gray-400">+</span> ao lado de qualquer coluna</p>
        </div>
      )}
    </div>
  )

  const anyCrossFiltersActive = Object.keys(crossFilters).length > 0

  return (
    <div
      style={{ ...sheetStyle, position: 'relative' }}
      ref={sheetRef}
      className="report-canvas"
      onClick={() => { if (anyCrossFiltersActive) setCrossFilters({}) }}
    >
    {anyCrossFiltersActive && (
      <div
        onClick={e => { e.stopPropagation(); setCrossFilters({}) }}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-50 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-full shadow-lg select-none transition-colors"
        style={{ pointerEvents: 'auto' }}
      >
        <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse shrink-0" />
        {Object.values(crossFilters).map((cf, i) => (
          <span key={i} className="max-w-[140px] truncate">{cf.col}: <strong>{String(cf.val)}</strong></span>
        ))}
        <svg className="w-3 h-3 ml-1 opacity-80 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    )}
    {gridWidth > 0 && <GridLayout key="grid" className="w-full" layout={layout} width={gridWidth} gridConfig={{ cols: 12, rowHeight: isMobile ? 64 : 52, margin: isMobile ? [6, 6] : [8, 8] }} dragConfig={{ enabled: !readOnly && !isMobile, handle: '.drag-handle' }} resizeConfig={{ enabled: !readOnly && !isMobile }} compactor={verticalCompactor} onDragStop={(l) => syncLayout(l)} onResizeStop={(l) => syncLayout(l)}>
      {blocks.map(block => {
        const activeCross = crossFilters[block.dataset_id]
        const isSelected = selectedBlockId === block.id
        const isHovered = hoveredBlockId === block.id

        // Column mismatch detection
        const blockDataset = datasets.find(d => d.id === block.dataset_id)
        const availableCols = blockDataset?.columns || []
        const missingLabel = block.label_col && availableCols.length > 0 && !availableCols.includes(block.label_col)
        const missingValue = block.value_col && availableCols.length > 0 && !availableCols.includes(block.value_col)
        const hasColumnMismatch = !readOnly && (missingLabel || missingValue)

        // Cross-filter highlight logic
        const anyCrossActive = Object.keys(crossFilters).length > 0
        const hasDataset = !!block.dataset_id
        const isCrossFiltered = anyCrossActive && hasDataset && !!crossFilters[block.dataset_id]
        const isUnrelated = anyCrossActive && hasDataset && !crossFilters[block.dataset_id]

        function cloneBlock() {
          const cloned = {
            ...JSON.parse(JSON.stringify(block)),
            id: crypto.randomUUID(),
            title: block.title + ' ' + t('builder.copyLabel'),
            layout: { ...block.layout, y: block.layout.y + block.layout.h },
          }
          onChange([...blocks, cloned])
        }

        const shadowMap = { sm: '0 1px 4px rgba(0,0,0,0.08)', md: '0 4px 16px rgba(0,0,0,0.14)', lg: '0 8px 32px rgba(0,0,0,0.20)', xl: '0 20px 60px rgba(0,0,0,0.25)', none: 'none' }
        const customBorderRadius = block.config?.border_radius != null && block.config?.border_radius !== '' ? `${block.config.border_radius}px` : undefined
        const customShadow = !isSelected && !isCrossFiltered && block.config?.shadow ? shadowMap[block.config.shadow] : undefined

        return (
          <div
            key={block.id}
            className={`group relative rounded-2xl flex flex-col transition-all duration-200 ${
              isSelected
                ? 'ring-2 ring-[#6D28D9] ring-offset-2 shadow-[0_8px_32px_rgba(109,40,217,0.18)] border border-transparent'
                : isCrossFiltered
                ? 'border-2 border-emerald-400 shadow-[0_4px_16px_rgba(52,211,153,0.2)]'
                : isUnrelated
                ? 'border border-[#E2E8F0] opacity-35'
                : 'border border-[#E2E8F0] shadow-[0_2px_8px_rgba(109,40,217,0.06)] hover:shadow-[0_8px_24px_rgba(109,40,217,0.14)] hover:border-violet-200 hover:-translate-y-px'
            }`}
            style={{
              backgroundColor: isCrossFiltered
                ? (block.config?.bg_color ? block.config.bg_color : '#f0fdf4')
                : (block.config?.bg_color || 'white'),
              zIndex: (isSelected || isHovered) ? 100 : undefined,
              ...(customBorderRadius && { borderRadius: customBorderRadius }),
              ...(customShadow && { boxShadow: customShadow }),
              ...(!isSelected && !isCrossFiltered && !isUnrelated && block.config?.border_color && {
                borderColor: block.config.border_color,
                borderWidth: `${block.config.border_width || 1}px`,
              }),
            }}
            data-block-id={block.id}
            onMouseEnter={() => setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
            onClick={e => { e.stopPropagation(); !readOnly && onSelectBlock?.(block.id) }}
          >
            {/* Floating block toolbar — shown above selected non-text blocks */}
            {!readOnly && isSelected && block.type !== 'text' && (
              <FloatingBlockToolbar
                block={block}
                blocks={blocks}
                onChange={onChange}
                datasets={datasets}
                onBlockAction={onBlockAction}
                onAiImprove={onAiImprove}
                onClone={cloneBlock}
              />
            )}
            {/* Floating text toolbar — shown above selected text blocks */}
            {!readOnly && isSelected && block.type === 'text' && (
              <FloatingTextToolbar block={block} blocks={blocks} onChange={onChange} />
            )}

            {/* Header — todos os filtros (data e categorial) têm header mínimo */}
            {block.type === 'filter' ? (
              !readOnly && (
                <div className="drag-handle cursor-grab absolute top-1 left-1/2 -translate-x-1/2 flex items-center justify-center h-3 opacity-0 group-hover:opacity-30 transition-opacity z-10">
                  <svg className="w-3 h-2.5 text-gray-500" viewBox="0 0 10 8" fill="currentColor">
                    <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                    <circle cx="2" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
                  </svg>
                </div>
              )
            ) : (
            <div className={`flex items-center gap-2 shrink-0 ${!readOnly ? 'drag-handle cursor-grab active:cursor-grabbing' : ''} ${block.config?.hide_header ? 'px-1 pt-1 pb-0 h-3 overflow-hidden' : 'px-3 pt-3 pb-1.5'}`}>
              {!readOnly && (
                <svg className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSelected ? 'text-purple-400' : 'text-gray-200 group-hover:text-gray-400'}`} viewBox="0 0 10 16" fill="currentColor">
                  <circle cx="2" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
                  <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                  <circle cx="2" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                </svg>
              )}
              {readOnly ? (
                <span className="text-xs font-semibold text-[#1A1A2E] flex-1 truncate leading-none">{block.title}</span>
              ) : (
                <input
                  className="text-xs font-semibold text-[#1A1A2E] flex-1 bg-transparent outline-none min-w-0 leading-none placeholder:text-gray-300"
                  value={block.title}
                  onChange={e => onChange(blocks.map(b => b.id === block.id ? { ...b, title: e.target.value } : b))}
                  onClick={e => e.stopPropagation()}
                />
              )}
              {isCrossFiltered && (
                <button
                  onClick={e => { e.stopPropagation(); clearCrossFilter(block.dataset_id) }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold shrink-0 hover:bg-emerald-100 transition-colors"
                  title={t('builder.tooltipFiltered')}
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
              {/* Lock indicator */}
              {block.config?.locked && (
                <span title={t('builder.tooltipLocked')} className="shrink-0 text-amber-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
              )}
              {/* Export CSV button — visible on hover for data blocks */}
              {block.dataset_id && block.label_col && block.value_col && !['text','filter','slider','image'].includes(block.type) && (
                <button
                  title={t('builder.tooltipExportCsv')}
                  onClick={async e => {
                    e.stopPropagation()
                    try {
                      const rows = await api.reports.datasets.query(block.dataset_id, block.label_col, block.value_col, block.agg || 'sum')
                      downloadCSV(rows, block.title)
                    } catch {}
                  }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-all shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
              )}
            </div>
            )} {/* fim do else: header normal */}

            {/* Column mismatch warning */}
            {hasColumnMismatch && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center rounded-2xl bg-amber-50/96 border-2 border-amber-200">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Coluna não encontrada</p>
                  {missingLabel && <p className="text-[10px] text-amber-700">Dimensão: <strong>"{block.label_col}"</strong></p>}
                  {missingValue && <p className="text-[10px] text-amber-700">Métrica: <strong>"{block.value_col}"</strong></p>}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onBlockAction?.(block.id, 'config') }}
                  className="text-[10px] px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >Corrigir</button>
              </div>
            )}

            {/* Content */}
            <div className={`flex-1 min-h-0 overflow-hidden ${block.type === 'filter' ? 'px-2 py-1 flex flex-col justify-center' : 'px-3 pb-3 pt-0.5'}`}>
              <BlockPreview
                block={block}
                readOnly={readOnly}
                onTextChange={text => onChange(blocks.map(b => b.id === block.id ? { ...b, config: { ...b.config, text } } : b))}
                activeFilters={activeFilters}
                crossFilters={crossFilters}
                onCrossFilter={handleCrossFilter}
                onFilterChange={handleFilterChange}
                globalDateFilter={globalDateFilter}
                onGlobalDateFilterChange={onGlobalDateFilterChange}
                shareToken={shareToken}
                rangeFilters={rangeFilters}
                onRangeChange={handleRangeChange}
                locale={locale}
                onBlockAction={onBlockAction}
              />
            </div>

            {/* Binding Mode — drop zone borders */}
            {bindingMode && !['filter', 'slider', 'text', 'image'].includes(block.type) && isSelected && (
              <div className="absolute inset-0 rounded-lg border-2 border-dashed border-purple-400 pointer-events-none z-10 animate-pulse" />
            )}
            {bindingMode && !['filter', 'slider', 'text', 'image'].includes(block.type) && !isSelected && (
              <div className="absolute inset-0 rounded-lg border-2 border-dashed border-gray-200 pointer-events-none z-10" />
            )}
            {/* Binding Mode Overlay */}
            {bindingMode && !['filter', 'slider', 'text', 'image'].includes(block.type) && (
              <div className="absolute inset-0 rounded-[inherit] bg-blue-500/15 border-2 border-blue-400 pointer-events-none flex flex-col items-start justify-end p-2 gap-1 z-10">
                {block.label_col ? (
                  <span className="bg-blue-500 text-white text-[9px] rounded px-1.5 py-0.5 font-semibold max-w-full truncate">Dim: {block.label_col}</span>
                ) : (
                  <span className="bg-blue-100 text-blue-600 text-[9px] rounded px-1.5 py-0.5 font-semibold border border-dashed border-blue-300">+ dimensão</span>
                )}
                {block.value_col ? (
                  <span className="bg-emerald-500 text-white text-[9px] rounded px-1.5 py-0.5 font-semibold max-w-full truncate">Métrica: {block.value_col}</span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-600 text-[9px] rounded px-1.5 py-0.5 font-semibold border border-dashed border-emerald-300">+ métrica</span>
                )}
              </div>
            )}
            {/* Drag-and-Drop Column Zones — exibido durante drag de coluna do LeftDataTray */}
            {!readOnly && draggedColumn && (
              <BlockDropZones block={block} draggedColumn={draggedColumn} onDrop={onDropColumn} />
            )}
            {/* Filter Targeting Overlay */}
            {filterTargetMode && !['filter', 'slider', 'text', 'image'].includes(block.type) && (() => {
              const fb = blocks.find(b => b.id === filterBlockId)
              const targets = fb?.config?.target_block_ids
              const isTargeted = !targets || targets.length === 0 || targets.includes(block.id)
              return (
                <div
                  className={`absolute inset-0 rounded-[inherit] pointer-events-auto flex items-center justify-center z-10 cursor-pointer ${
                    isTargeted ? 'bg-green-500/20 border-2 border-green-400' : 'bg-pink-500/20 border-2 border-pink-400'
                  }`}
                  onClick={e => { e.stopPropagation(); onToggleFilterTarget?.(filterBlockId, block.id) }}
                  title={isTargeted ? 'Clique para remover este filtro do bloco' : 'Clique para aplicar este filtro ao bloco'}
                >
                  <span className={`text-3xl font-bold ${isTargeted ? 'text-green-500' : 'text-pink-400'}`}>
                    {isTargeted ? '✓' : '✗'}
                  </span>
                </div>
              )
            })()}
          </div>
        )
      })}
    </GridLayout>}
    </div>
  )
}
