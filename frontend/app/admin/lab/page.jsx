'use client'

/**
 * UI Lab — Jarbis
 * Ambiente centralizado para calibrar a barra lateral, cards e layout do dashboard.
 * Acesse em: /admin/lab
 *
 * Arquivos reais:
 *   - Rail + FiltersPanel + CommentsPanel → app/dashboards/[id]/page.jsx (linhas 548-656 / 103-271)
 *   - BlockConfigPanel, DatasetPanel, CanvasConfigPanel → components/ReportBuilder.jsx (linhas 901+)
 *   - Cards/blocos → components/ReportBuilder.jsx (linhas 435-856)
 */

import { useState } from 'react'
import { BlockConfigPanel, DatasetPanel, CanvasConfigPanel } from '@/components/ReportBuilder'
import { LogoA, LogoB, LogoC, LogoD, LogoE, LogoWithText } from '@/components/logos/JarbisLogo'
import ReportBuilder from '@/components/ReportBuilder'

// ---------------------------------------------------------------------------
// Dados mock para o lab
// ---------------------------------------------------------------------------
const MOCK_BLOCKS = [
  { id: 'b1', type: 'kpi', title: 'Receita Total', dataset_id: 'ds1', label_col: 'mes', value_col: 'receita', agg: 'sum', config: { format: 'currency', color: '#22c55e', showDelta: true } },
  { id: 'b2', type: 'bar', title: 'Vendas por Mês', dataset_id: 'ds1', label_col: 'mes', value_col: 'receita', agg: 'sum', config: {} },
  { id: 'b3', type: 'line', title: 'Tendência', dataset_id: 'ds1', label_col: 'mes', value_col: 'pedidos', agg: 'sum', config: {} },
  { id: 'b4', type: 'filter', title: 'Filtro Categoria', dataset_id: 'ds1', filter_col: 'categoria', filter_label: 'Categoria', config: {} },
]
const MOCK_DATASETS = [
  { id: 'ds1', name: 'Vendas 2024', column_types: { mes: 'date', receita: 'number', pedidos: 'number', categoria: 'text' } },
  { id: 'ds2', name: 'Clientes', column_types: { nome: 'text', total: 'number', data_cadastro: 'date' } },
]
const MOCK_CANVAS = { bgColor: '#f3f4f6', sheetBgColor: '#ffffff' }

// ---------------------------------------------------------------------------
// Ícones do rail (mesmos do page.jsx)
// ---------------------------------------------------------------------------
const RAIL_ICONS = {
  edit: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  dados: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" /></svg>,
  filtros: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>,
  config: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeWidth={1.5} /></svg>,
  notas: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>,
  ia: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
}

// ---------------------------------------------------------------------------
// Componentes de painel (replicados do page.jsx para funcionar standalone)
// ---------------------------------------------------------------------------
function FiltersPanel({ globalDateFilter, onGlobalDateFilterChange }) {
  const hasDateFilter = !!(globalDateFilter.dateFrom || globalDateFilter.dateTo)
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtros do dashboard</p>
      <div className={`rounded-xl border p-3 space-y-2.5 ${hasDateFilter ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            {RAIL_ICONS.filtros}
            Filtro de data
          </span>
          {hasDateFilter && (
            <button onClick={() => onGlobalDateFilterChange({ dateCol: '', dateFrom: '', dateTo: '' })} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Limpar</button>
          )}
        </div>
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
      </div>
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
        <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
        <p className="text-xs text-gray-400">Adicione blocos do tipo Filtro ou Slider ao dashboard para aparecerem aqui.</p>
      </div>
    </div>
  )
}

function CommentsPanel() {
  const [text, setText] = useState('')
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comentários e notas</p>
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
        <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
          <option>Receita Total</option>
          <option>Vendas por Mês</option>
          <option>Tendência</option>
        </select>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white resize-none"
        />
        <button disabled={!text.trim()} className="w-full py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors">
          Adicionar nota
        </button>
      </div>
      <div className="text-center py-6">
        <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>
        <p className="text-xs text-gray-400">Nenhuma nota ainda.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-aba: Barra Lateral
// ---------------------------------------------------------------------------
function TabSidebar() {
  const [activePanel, setActivePanel] = useState('config')
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(0)
  const [blocks, setBlocks] = useState(MOCK_BLOCKS)
  const [datasets, setDatasets] = useState(MOCK_DATASETS)
  const [canvas, setCanvas] = useState(MOCK_CANVAS)
  const [globalDateFilter, setGlobalDateFilter] = useState({ dateCol: '', dateFrom: '', dateTo: '' })

  const selectedBlock = blocks[selectedBlockIdx]

  const railBtns = [
    { id: 'edit',       label: 'Editar',   icon: RAIL_ICONS.edit,    active: activePanel === 'edit',    badge: null,  disabled: false },
    { id: 'dados',      label: 'Dados',    icon: RAIL_ICONS.dados,   active: activePanel === 'dados',   badge: null,  disabled: false },
    { id: 'filtros',    label: 'Filtros',  icon: RAIL_ICONS.filtros, active: activePanel === 'filtros', badge: 2,     disabled: false },
    { id: 'config',     label: 'Config',   icon: RAIL_ICONS.config,  active: activePanel === 'config',  badge: null,  disabled: false },
    { id: 'comentarios',label: 'Notas',    icon: RAIL_ICONS.notas,   active: activePanel === 'comentarios', badge: 1, disabled: false },
    { id: 'ia',         label: 'IA',       icon: RAIL_ICONS.ia,      active: activePanel === 'ia',      badge: null,  disabled: false },
  ]

  const panelTitle = {
    edit: 'Configurar bloco', dados: 'Dados', filtros: 'Filtros',
    config: 'Dashboard', comentarios: 'Comentários', ia: 'IA',
  }

  return (
    <div className="space-y-8">

      {/* Descrição */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1">Onde está o código</p>
        <ul className="text-xs text-blue-600 space-y-0.5 font-mono">
          <li>Rail de ícones (6 btns): <span className="bg-blue-100 px-1 rounded">app/dashboards/[id]/page.jsx:548–656</span></li>
          <li>FiltersPanel: <span className="bg-blue-100 px-1 rounded">page.jsx:103–179</span></li>
          <li>CommentsPanel: <span className="bg-blue-100 px-1 rounded">page.jsx:181–271</span></li>
          <li>BlockConfigPanel: <span className="bg-blue-100 px-1 rounded">components/ReportBuilder.jsx:901</span></li>
          <li>DatasetPanel: <span className="bg-blue-100 px-1 rounded">components/ReportBuilder.jsx:1607</span></li>
          <li>CanvasConfigPanel: <span className="bg-blue-100 px-1 rounded">components/ReportBuilder.jsx:1549</span></li>
        </ul>
      </div>

      {/* Preview live da barra */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-4">Preview da barra lateral (tamanho real)</h3>
        <div className="flex border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-[#f5f5f7]" style={{ height: 520 }}>

          {/* Canvas fake */}
          <div className="flex-1 p-6 overflow-auto">
            <p className="text-sm font-bold text-gray-500 mb-4">Canvas do dashboard</p>
            <div className="grid grid-cols-2 gap-3">
              {blocks.map((b, i) => (
                <div
                  key={b.id}
                  onClick={() => { setSelectedBlockIdx(i); setActivePanel('edit') }}
                  className={`bg-white rounded-xl border p-3 cursor-pointer transition-all ${selectedBlockIdx === i ? 'border-violet-400 shadow-md ring-2 ring-violet-200' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className="text-xs font-semibold text-gray-700">{b.title}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{b.type}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="w-72 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">{panelTitle[activePanel]}</span>
              <button className="text-gray-400 hover:text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activePanel === 'edit' && (
                <BlockConfigPanel block={selectedBlock} onChange={updated => setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b))} datasets={datasets} />
              )}
              {activePanel === 'dados' && (
                <DatasetPanel datasets={datasets} onDatasetsChange={setDatasets} />
              )}
              {activePanel === 'filtros' && (
                <FiltersPanel globalDateFilter={globalDateFilter} onGlobalDateFilterChange={setGlobalDateFilter} />
              )}
              {activePanel === 'config' && (
                <CanvasConfigPanel config={canvas} onChange={setCanvas} />
              )}
              {activePanel === 'comentarios' && <CommentsPanel />}
              {activePanel === 'ia' && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3">{RAIL_ICONS.ia}</div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">IA do Jarbis</p>
                  <p className="text-xs text-gray-400">Faça perguntas sobre os dados em linguagem natural.</p>
                </div>
              )}
            </div>
          </div>

          {/* Rail de ícones */}
          <div className="w-[72px] bg-white border-l border-gray-200/80 flex flex-col items-center py-2 gap-[3px] shrink-0">
            <div className="flex flex-col items-center gap-[3px] w-full mb-auto">
              {railBtns.map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setActivePanel(btn.id)}
                  title={btn.label}
                  className={`relative flex flex-col items-center justify-center gap-[3px] w-[50px] py-[14px] rounded-[11px] transition-all duration-150 ${
                    btn.active ? 'bg-[#ede9fe] text-[#7c3aed]' : 'text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6]'
                  }`}
                >
                  {btn.badge != null && (
                    <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-violet-600 text-white rounded-full text-[8px] font-bold flex items-center justify-center px-0.5 leading-none">
                      {btn.badge > 9 ? '9+' : btn.badge}
                    </span>
                  )}
                  {btn.icon}
                  <span className="text-[9px] font-semibold leading-none">{btn.label}</span>
                </button>
              ))}
            </div>
            <div className="w-8 h-px bg-gray-100 my-1" />
            <div className="flex flex-col items-center gap-[3px] w-full">
              <button title="Ajuda" className="flex flex-col items-center justify-center gap-[3px] w-[50px] py-[14px] rounded-[11px] text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
                <span className="text-[9px] font-semibold leading-none">Ajuda</span>
              </button>
              <button title="Fechar painel" className="flex flex-col items-center justify-center gap-[3px] w-[50px] py-[14px] rounded-[11px] text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                <span className="text-[9px] font-semibold leading-none">Fechar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspetor de props do rail */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Ícones do rail — dimensões atuais</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Largura do rail', value: '72px', file: 'page.jsx:609' },
            { label: 'Largura do botão', value: '50px', file: 'page.jsx:617' },
            { label: 'Padding vertical btn', value: '14px × 2', file: 'page.jsx:617' },
            { label: 'Gap entre botões', value: '3px', file: 'page.jsx:609' },
            { label: 'Tamanho do ícone', value: '20×20px (w-5 h-5)', file: 'page.jsx:556+' },
            { label: 'Fonte do label', value: '9px bold', file: 'page.jsx:631' },
            { label: 'Border radius btn', value: '11px', file: 'page.jsx:617' },
            { label: 'Cor ativo', value: '#ede9fe / #7c3aed', file: 'page.jsx:619' },
            { label: 'Cor inativo', value: '#9ca3af', file: 'page.jsx:622' },
          ].map(item => (
            <div key={item.label} className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-1">{item.label}</p>
              <p className="text-xs font-bold text-gray-800 font-mono">{item.value}</p>
              <p className="text-[9px] text-violet-500 mt-1 font-mono">{item.file}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-aba: Cards
// ---------------------------------------------------------------------------
function TabCards() {
  const cardTypes = [
    { type: 'kpi', label: 'KPI', desc: 'Número em destaque', color: '#22c55e' },
    { type: 'bar', label: 'Barras', desc: 'Barras verticais', color: '#6366f1' },
    { type: 'bar_h', label: 'Barras H', desc: 'Barras horizontais', color: '#8b5cf6' },
    { type: 'area', label: 'Área', desc: 'Área preenchida', color: '#3b82f6' },
    { type: 'line', label: 'Linhas', desc: 'Evolução no tempo', color: '#10b981' },
    { type: 'pie', label: 'Pizza', desc: 'Distribuição %', color: '#f59e0b' },
    { type: 'combo', label: 'Combo', desc: 'Barra + linha', color: '#ef4444' },
    { type: 'gauge', label: 'Gauge', desc: 'Indicador circular', color: '#06b6d4' },
    { type: 'speedometer', label: 'Velocímetro', desc: 'Semicircular', color: '#84cc16' },
    { type: 'treemap', label: 'Treemap', desc: 'Hierarquia por área', color: '#f97316' },
    { type: 'bubble', label: 'Bolhas', desc: 'Dispersão por volume', color: '#a855f7' },
    { type: 'scatter', label: 'Dispersão', desc: 'Correlação XY', color: '#ec4899' },
    { type: 'table', label: 'Tabela', desc: 'Dados em linhas', color: '#64748b' },
    { type: 'text', label: 'Texto', desc: 'Comentários livres', color: '#78716c' },
    { type: 'filter', label: 'Filtro', desc: 'Filtrar por categoria', color: '#0ea5e9' },
    { type: 'slider', label: 'Slider', desc: 'Filtro por faixa', color: '#14b8a6' },
    { type: 'image', label: 'Imagem', desc: 'Foto ou logo', color: '#f43f5e' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1">Onde está o código dos cards</p>
        <p className="text-xs text-blue-600 font-mono">components/ReportBuilder.jsx:435 — função BlockPreview</p>
        <p className="text-xs text-blue-600 font-mono">Cada tipo de card está em um if/else dentro do BlockPreview.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cardTypes.map(ct => (
          <div key={ct.type} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
            {/* Preview area */}
            <div className="h-28 flex items-center justify-center relative" style={{ backgroundColor: ct.color + '15' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: ct.color + '25' }}>
                <div className="w-5 h-5 rounded-lg" style={{ backgroundColor: ct.color }} />
              </div>
              <span className="absolute top-2 right-2 text-[9px] font-mono text-gray-400 bg-white/80 px-1.5 py-0.5 rounded-full">
                type: &quot;{ct.type}&quot;
              </span>
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-gray-800">{ct.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{ct.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-700 mb-2">Para calibrar um card específico</p>
        <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
          <li>Abra <span className="font-mono bg-amber-100 px-1 rounded">components/ReportBuilder.jsx</span></li>
          <li>Busque por <span className="font-mono bg-amber-100 px-1 rounded">type === &apos;kpi&apos;</span> (ou o tipo desejado)</li>
          <li>A função <span className="font-mono bg-amber-100 px-1 rounded">BlockPreview</span> começa na linha 435</li>
          <li>Modifique e veja o resultado no dashboard real ou voltando a esta aba Cards</li>
        </ol>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-aba: Canvas
// ---------------------------------------------------------------------------
function TabCanvas() {
  const [config, setConfig] = useState(MOCK_CANVAS)
  return (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-4">CanvasConfigPanel (live)</h3>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <CanvasConfigPanel config={config} onChange={setConfig} />
        </div>
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-mono">components/ReportBuilder.jsx:1549</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-4">Preview do resultado</h3>
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ backgroundColor: config.bgColor || '#f3f4f6', height: 300 }}>
          <div className="p-4 h-full">
            <div className="h-full rounded-xl flex items-center justify-center" style={{ backgroundColor: config.sheetBgColor || '#ffffff' }}>
              <p className="text-xs text-gray-400 font-medium">Folha do dashboard</p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-1">bgColor (canvas)</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md border border-gray-200 shrink-0" style={{ backgroundColor: config.bgColor || '#f3f4f6' }} />
              <span className="text-xs font-mono text-gray-700">{config.bgColor || '#f3f4f6'}</span>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-1">sheetBgColor (folha)</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md border border-gray-200 shrink-0" style={{ backgroundColor: config.sheetBgColor || '#ffffff' }} />
              <span className="text-xs font-mono text-gray-700">{config.sheetBgColor || '#ffffff'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Logo Gallery
// ---------------------------------------------------------------------------
const LOGO_OPTIONS = [
  { id: 'A', label: 'A — Órbita',     desc: '"J" central com arco orbital e satélite. Transmite dado em movimento.',          Component: LogoA },
  { id: 'B', label: 'B — Farol',      desc: 'Barras crescentes com raio de luz. Ilumina o que estava no escuro.',              Component: LogoB },
  { id: 'C', label: 'C — Nexo',       desc: '3 hexágonos conectados com "J" em negativo. Conexão entre dados e decisão.',     Component: LogoC },
  { id: 'D', label: 'D — Ascensão',   desc: 'Barras + seta upward com barra da direita formando "J". Crescimento visual.',    Component: LogoD },
  { id: 'E', label: 'E — Identidade', desc: '"J" tipográfico moderno com sparkline integrada. Sofisticado e minimalista.',    Component: LogoE },
]

function TabLogos() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-black text-gray-900 mb-1">Logo Gallery</h2>
        <p className="text-sm text-gray-500">5 conceitos de identidade visual para o Jarbis. Compare em fundo claro e escuro.</p>
      </div>

      {/* Grid de opções */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {LOGO_OPTIONS.map(({ id, label, desc, Component }) => (
          <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Preview fundo claro */}
            <div className="flex items-center justify-center gap-6 p-8 bg-white border-b border-gray-100">
              <Component size={48} />
              <Component size={64} />
              <Component size={80} />
            </div>
            {/* Preview fundo escuro */}
            <div className="flex items-center justify-center gap-6 p-8 bg-[#0F0F1A] border-b border-gray-800">
              <Component size={48} light />
              <Component size={64} light />
              <Component size={80} light />
            </div>
            {/* Com texto */}
            <div className="flex flex-col gap-3 p-5 bg-gray-50 border-b border-gray-100">
              <LogoWithText size={28} variant={id} className="text-sm" />
              <div className="flex items-center justify-center p-3 bg-[#0F0F1A] rounded-xl">
                <LogoWithText size={28} variant={id} light className="text-sm" />
              </div>
            </div>
            {/* Info */}
            <div className="p-5">
              <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Uso em sidebar */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Uso na sidebar (tamanho real)</h3>
        <div className="flex flex-wrap gap-6">
          {LOGO_OPTIONS.map(({ id, Component }) => (
            <div key={id} className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
                <Component size={28} />
                <span className="font-black text-gray-900 text-sm tracking-tight">jarbis</span>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold text-center w-full">Opção {id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-aba: Templates de Dashboard
// ---------------------------------------------------------------------------

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const TEMPLATES = {
  financeiro: {
    label: 'Financeiro',
    desc: 'Receita, margem, MRR e distribuição de despesas',
    sheetConfig: { bgColor: '#f5f5f7', sheetBgColor: '#ffffff' },
    blocks: [
      {
        id: 'f-kpi1', type: 'kpi', title: 'Receita Total',
        static_data: [{ value: 285400 }],
        config: { format: 'currency', accent_color: '#10b981', delta: '12.4', delta_label: 'vs mês anterior' },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: 'f-kpi2', type: 'kpi', title: 'MRR',
        static_data: [{ value: 23783 }],
        config: { format: 'currency', accent_color: '#6366f1', delta: '5.2', delta_label: 'vs mês anterior' },
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: 'f-kpi3', type: 'kpi', title: 'Margem Bruta',
        static_data: [{ value: 68.2 }],
        config: { format: 'percent', accent_color: '#f59e0b', delta: '-1.8', delta_label: 'vs mês anterior' },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        id: 'f-bar1', type: 'bar', title: 'Receita por Mês',
        label_col: 'label', value_col: 'value',
        static_data: MES_LABELS.map((m, i) => ({ label: m, value: [180000, 195000, 210000, 198000, 225000, 248000, 235000, 262000, 271000, 258000, 279000, 285400][i] })),
        config: { format: 'currency', color: '#6366f1' },
        layout: { x: 0, y: 2, w: 8, h: 5 },
      },
      {
        id: 'f-pie1', type: 'pie', title: 'Distribuição de Despesas',
        label_col: 'label', value_col: 'value',
        static_data: [
          { label: 'Pessoal', value: 42 },
          { label: 'Infra', value: 18 },
          { label: 'Marketing', value: 15 },
          { label: 'G&A', value: 14 },
          { label: 'Outros', value: 11 },
        ],
        config: { format: 'percent', show_legend: true },
        layout: { x: 8, y: 2, w: 4, h: 5 },
      },
      {
        id: 'f-area1', type: 'area', title: 'Evolução do MRR',
        label_col: 'label', value_col: 'value',
        static_data: MES_LABELS.map((m, i) => ({ label: m, value: [14200, 15800, 17100, 17900, 18700, 19800, 20400, 21200, 21900, 22500, 23100, 23783][i] })),
        config: { format: 'currency', color: '#10b981' },
        layout: { x: 0, y: 7, w: 12, h: 4 },
      },
    ],
  },

  vendas: {
    label: 'Vendas',
    desc: 'Pipeline, ticket médio, top produtos e funil de conversão',
    sheetConfig: { bgColor: '#f5f5f7', sheetBgColor: '#ffffff' },
    blocks: [
      {
        id: 'v-kpi1', type: 'kpi', title: 'Total de Vendas',
        static_data: [{ value: 1842 }],
        config: { format: 'number', accent_color: '#6366f1', delta: '8.7', delta_label: 'vs mês anterior' },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: 'v-kpi2', type: 'kpi', title: 'Ticket Médio',
        static_data: [{ value: 1547 }],
        config: { format: 'currency', accent_color: '#10b981', delta: '3.1', delta_label: 'vs mês anterior' },
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: 'v-kpi3', type: 'kpi', title: 'Taxa de Conversão',
        static_data: [{ value: 18.4 }],
        config: { format: 'percent', accent_color: '#f59e0b', delta: '-0.6', delta_label: 'vs mês anterior' },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        id: 'v-barh1', type: 'bar_h', title: 'Top 8 Produtos',
        label_col: 'label', value_col: 'value',
        static_data: [
          { label: 'Plano Profissional', value: 482 },
          { label: 'Plano Starter', value: 318 },
          { label: 'Add-on IA', value: 241 },
          { label: 'Plano Enterprise', value: 189 },
          { label: 'Add-on Datasets', value: 167 },
          { label: 'Add-on Dashboards', value: 143 },
          { label: 'Plano Free', value: 98 },
          { label: 'Consultoria', value: 54 },
        ],
        config: { format: 'number', sort_by: 'desc' },
        layout: { x: 0, y: 2, w: 7, h: 6 },
      },
      {
        id: 'v-funnel1', type: 'funnel', title: 'Funil de Vendas',
        label_col: 'label', value_col: 'value',
        static_data: [
          { label: 'Visitantes', value: 12800 },
          { label: 'Leads', value: 3840 },
          { label: 'Qualificados', value: 1152 },
          { label: 'Propostas', value: 460 },
          { label: 'Fechados', value: 207 },
        ],
        config: {},
        layout: { x: 7, y: 2, w: 5, h: 6 },
      },
      {
        id: 'v-line1', type: 'line', title: 'Vendas por Semana (últimas 12)',
        label_col: 'label', value_col: 'value',
        static_data: Array.from({ length: 12 }, (_, i) => ({ label: `S${i + 1}`, value: Math.round(320 + Math.sin(i * 0.8) * 80 + i * 15) })),
        config: { format: 'number', color: '#6366f1' },
        layout: { x: 0, y: 8, w: 12, h: 4 },
      },
    ],
  },

  ecommerce: {
    label: 'E-commerce',
    desc: 'GMV, pedidos, canais de aquisição e status',
    sheetConfig: { bgColor: '#f5f5f7', sheetBgColor: '#ffffff' },
    blocks: [
      {
        id: 'e-kpi1', type: 'kpi', title: 'GMV',
        static_data: [{ value: 1284000 }],
        config: { format: 'currency', accent_color: '#6366f1', delta: '22.1', delta_label: 'vs mês anterior' },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: 'e-kpi2', type: 'kpi', title: 'Pedidos',
        static_data: [{ value: 4217 }],
        config: { format: 'number', accent_color: '#10b981', delta: '14.5', delta_label: 'vs mês anterior' },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: 'e-kpi3', type: 'kpi', title: 'CAC',
        static_data: [{ value: 87 }],
        config: { format: 'currency', accent_color: '#ef4444', delta: '-8.2', delta_label: 'vs mês anterior' },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: 'e-kpi4', type: 'kpi', title: 'LTV Médio',
        static_data: [{ value: 1840 }],
        config: { format: 'currency', accent_color: '#f59e0b', delta: '6.8', delta_label: 'vs mês anterior' },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: 'e-area1', type: 'area', title: 'Receita por Canal',
        label_col: 'label', value_col: 'value',
        static_data: MES_LABELS.map((m, i) => ({ label: m, value: [48000, 52000, 61000, 58000, 67000, 74000, 71000, 82000, 88000, 85000, 96000, 104000][i] })),
        config: { format: 'currency', color: '#6366f1' },
        layout: { x: 0, y: 2, w: 8, h: 5 },
      },
      {
        id: 'e-pie1', type: 'pie', title: 'Status dos Pedidos',
        label_col: 'label', value_col: 'value',
        static_data: [
          { label: 'Entregues', value: 3481 },
          { label: 'Em trânsito', value: 518 },
          { label: 'Devolvidos', value: 147 },
          { label: 'Cancelados', value: 71 },
        ],
        config: { show_legend: true },
        layout: { x: 8, y: 2, w: 4, h: 5 },
      },
      {
        id: 'e-bar1', type: 'bar', title: 'Conversão por Campanha',
        label_col: 'label', value_col: 'value',
        static_data: [
          { label: 'Google Ads', value: 8.4 },
          { label: 'Instagram', value: 6.1 },
          { label: 'Email MKT', value: 12.7 },
          { label: 'Afiliados', value: 9.8 },
          { label: 'Orgânico', value: 4.2 },
          { label: 'YouTube', value: 5.5 },
        ],
        config: { format: 'percent' },
        layout: { x: 0, y: 7, w: 12, h: 4 },
      },
    ],
  },

  rh: {
    label: 'RH & Ops',
    desc: 'Headcount, turnover, NPS e distribuição por área',
    sheetConfig: { bgColor: '#f5f5f7', sheetBgColor: '#ffffff' },
    blocks: [
      {
        id: 'r-kpi1', type: 'kpi', title: 'Headcount',
        static_data: [{ value: 247 }],
        config: { format: 'number', accent_color: '#6366f1', delta: '3.8', delta_label: 'vs trimestre anterior' },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: 'r-kpi2', type: 'kpi', title: 'Turnover (%)',
        static_data: [{ value: 8.4 }],
        config: { format: 'percent', accent_color: '#ef4444', delta: '-1.2', delta_label: 'vs trimestre anterior' },
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: 'r-kpi3', type: 'kpi', title: 'eNPS',
        static_data: [{ value: 42 }],
        config: { format: 'number', accent_color: '#10b981', delta: '7', delta_label: 'vs trimestre anterior' },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        id: 'r-bar1', type: 'bar', title: 'Headcount por Departamento',
        label_col: 'label', value_col: 'value',
        static_data: [
          { label: 'Engenharia', value: 68 },
          { label: 'Comercial', value: 52 },
          { label: 'Customer Success', value: 41 },
          { label: 'Marketing', value: 28 },
          { label: 'Produto', value: 24 },
          { label: 'G&A', value: 19 },
          { label: 'Dados', value: 15 },
        ],
        config: { format: 'number' },
        layout: { x: 0, y: 2, w: 7, h: 5 },
      },
      {
        id: 'r-gauge1', type: 'gauge', title: 'Meta de Contratações (Trim)',
        value_col: 'value',
        static_data: [{ value: 73 }],
        config: { format: 'percent', color: '#6366f1', min: 0, max: 100 },
        layout: { x: 7, y: 2, w: 5, h: 5 },
      },
      {
        id: 'r-line1', type: 'line', title: 'Turnover Mensal (%)',
        label_col: 'label', value_col: 'value',
        static_data: MES_LABELS.map((m, i) => ({ label: m, value: [11.2, 10.8, 10.1, 9.7, 9.4, 9.1, 9.6, 8.8, 8.4, 8.1, 8.6, 8.4][i] })),
        config: { format: 'percent', color: '#ef4444' },
        layout: { x: 0, y: 7, w: 12, h: 4 },
      },
    ],
  },
}

function TabTemplates() {
  const [activeTemplate, setActiveTemplate] = useState('financeiro')
  const tpl = TEMPLATES[activeTemplate]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => setActiveTemplate(key)}
            className={`flex flex-col px-4 py-2.5 rounded-xl border text-left transition-all ${
              activeTemplate === key
                ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <span className="text-sm font-bold">{t.label}</span>
            <span className="text-[10px] text-gray-400 mt-0.5 max-w-[180px]">{t.desc}</span>
          </button>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        <strong>Lab de calibração:</strong> todos os blocos abaixo usam dados simulados via <code>static_data</code>. Ajuste o ReportBuilder e veja o resultado aqui em tempo real.
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ minHeight: 620, backgroundColor: tpl.sheetConfig.bgColor }}>
        <ReportBuilder
          key={activeTemplate}
          blocks={tpl.blocks}
          readOnly
          datasets={[]}
          sheetConfig={tpl.sheetConfig}
          globalDateFilter={{}}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal do Lab
// ---------------------------------------------------------------------------
export default function UILabPage() {
  const [tab, setTab] = useState('sidebar')

  const tabs = [
    { id: 'sidebar', label: 'Barra Lateral', icon: '⬤' },
    { id: 'cards', label: 'Cards & Blocos', icon: '▦' },
    { id: 'canvas', label: 'Canvas', icon: '◻' },
    { id: 'logos', label: 'Logo Gallery', icon: '✦' },
    { id: 'templates', label: 'Templates', icon: '◈' },
  ]

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <h1 className="text-base font-black text-gray-900">UI Lab</h1>
            <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">Jarbis</span>
          </div>
          <p className="text-xs text-gray-400">Ambiente de calibração da interface — nenhuma alteração aqui afeta dados reais</p>
        </div>
        <div className="ml-auto">
          <a href="/dashboards" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">← Voltar aos dashboards</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-violet-500 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {tab === 'sidebar' && <TabSidebar />}
        {tab === 'cards' && <TabCards />}
        {tab === 'canvas' && <TabCanvas />}
        {tab === 'logos' && <TabLogos />}
        {tab === 'templates' && <TabTemplates />}
      </div>
    </div>
  )
}
