'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { BlockConfigPanel, DatasetPanel, CanvasConfigPanel } from '@/components/ReportBuilder'
import { TEMPLATES } from '@/lib/templates'

const ReportBuilder = dynamic(() => import('@/components/ReportBuilder'), { ssr: false })

const BLOCK_TYPES = [
  { type: 'kpi',     label: 'KPI',       desc: 'Número em destaque' },
  { type: 'bar',     label: 'Barras',    desc: 'Comparar categorias' },
  { type: 'bar_h',   label: 'Barras H',  desc: 'Barras horizontais' },
  { type: 'area',    label: 'Área',      desc: 'Evolução acumulada' },
  { type: 'line',    label: 'Linhas',    desc: 'Evolução no tempo' },
  { type: 'pie',     label: 'Pizza',     desc: 'Distribuição %' },
  { type: 'scatter', label: 'Dispersão', desc: 'Correlação XY' },
  { type: 'table',   label: 'Tabela',    desc: 'Dados em linhas' },
  { type: 'text',    label: 'Texto',     desc: 'Comentários' },
  { type: 'filter',  label: 'Filtro',    desc: 'Filtrar dados' },
  { type: 'image',   label: 'Imagem',    desc: 'Foto ou logo' },
]

let counter = 0
function newBlock(type) {
  const isFilter = type === 'filter'
  const isNoData = isFilter || type === 'text' || type === 'image'
  const col = isFilter ? (counter % 6) * 2 : (counter % 4) * 3
  return {
    id: `block_${++counter}_${Date.now()}`,
    type,
    title: BLOCK_TYPES.find(b => b.type === type)?.label || type,
    dataset_id: null,
    ...(isFilter ? { filter_col: null, filter_label: '' } : isNoData ? {} : { label_col: null, value_col: null, agg: 'sum' }),
    config: {},
    layout: { x: col, y: Infinity, w: isFilter ? 2 : 3, h: isFilter ? 2 : 2 },
  }
}

const TPL_ICONS = {
  blank: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  vendas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  midia: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  executivo: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  campanha: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
    </svg>
  ),
}

const TPL_ICON_COLORS = {
  blank:     { bg: 'bg-gray-100',    text: 'text-gray-500'   },
  vendas:    { bg: 'bg-violet-100',  text: 'text-violet-600' },
  midia:     { bg: 'bg-blue-100',    text: 'text-blue-600'   },
  executivo: { bg: 'bg-emerald-100', text: 'text-emerald-600'},
  campanha:  { bg: 'bg-amber-100',   text: 'text-amber-600'  },
}

function getTplIcon(tpl) {
  const key = tpl.id in TPL_ICONS ? tpl.id : 'vendas'
  const colors = TPL_ICON_COLORS[key] || TPL_ICON_COLORS.vendas
  return { icon: TPL_ICONS[key], ...colors }
}

function TemplateGallery({ onSelect }) {
  return (
    <div className="min-h-screen bg-[#f8f7fc] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 h-[60px] flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm shadow-violet-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>
          </svg>
        </div>
        <span className="text-gray-900 font-black text-[15px] tracking-tight">Jarbis</span>
        <span className="text-gray-300 text-sm">·</span>
        <span className="text-gray-500 text-sm">Novo Dashboard</span>
      </div>

      <div className="flex-1 p-10 max-w-4xl mx-auto w-full">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Escolha um template</h1>
          <p className="text-sm text-gray-500">Comece do zero ou use um template pronto — basta conectar seus dados.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map(tpl => {
            const { icon, bg, text } = getTplIcon(tpl)
            return (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className="group text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-violet-300 hover:shadow-md transition-all"
              >
                {/* Preview */}
                <div className="w-full h-24 rounded-xl bg-gray-50 border border-gray-100 mb-4 overflow-hidden">
                  {tpl.id === 'blank' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-full p-2 grid grid-cols-6 grid-rows-3 gap-0.5 opacity-70">
                      {tpl.blocks.slice(0, 12).map((b, i) => (
                        <div
                          key={i}
                          className={`rounded-sm ${b.type === 'kpi' ? 'bg-violet-300' : b.type === 'bar' || b.type === 'bar_h' ? 'bg-violet-400' : b.type === 'line' || b.type === 'area' ? 'bg-blue-300' : b.type === 'pie' ? 'bg-violet-200' : b.type === 'table' ? 'bg-gray-200' : b.type === 'filter' ? 'bg-amber-200' : 'bg-gray-200'}`}
                          style={{ gridColumn: `span ${Math.min(b.layout.w, 3)}`, gridRow: `span ${Math.min(b.layout.h, 2)}` }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${bg} ${text} flex items-center justify-center flex-shrink-0`}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors text-sm">{tpl.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tpl.description}</p>
                    {tpl.blocks.length > 0 && <p className="text-xs text-gray-300 mt-1.5">{tpl.blocks.length} blocos</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function NovoDashboardPage() {
  const router = useRouter()
  const [templateSelected, setTemplateSelected] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [blocks, setBlocks] = useState([])
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidePanel, setSidePanel] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [canvasConfig, setCanvasConfig] = useState({ bgColor: '', sheetBgColor: '' })
  const addMenuRef = useRef()

  useEffect(() => {
    api.reports.datasets.list().then(setDatasets).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function applyTemplate(tpl) {
    setTitle(tpl.id === 'blank' ? '' : tpl.title)
    setBlocks(tpl.blocks.map((b, i) => ({ ...b, id: `tpl_${tpl.id}_${i}_${Date.now()}` })))
    setTemplateSelected(true)
  }

  if (!templateSelected) return <TemplateGallery onSelect={applyTemplate} />

  function addBlock(type) {
    const block = newBlock(type)
    setBlocks(prev => [...prev, block])
    setSelectedBlockId(block.id)
  }

  function updateActiveBlock(updated) {
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  function togglePanel(panel) {
    if (sidePanel === panel && sidebarOpen) { setSidebarOpen(false); setSidePanel(null) }
    else { setSidePanel(panel); setSidebarOpen(true) }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Informe o título'); return }
    setSaving(true); setError('')
    try {
      const report = await api.reports.create({ title, description: description || null, blocks })
      router.push(`/dashboards/${report.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const activeBlock = blocks.find(b => b.id === selectedBlockId)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f7fc]">
      <div className="bg-white border-b border-gray-100 px-4 h-[52px] flex items-center gap-2 shrink-0">
        <button onClick={() => router.push('/dashboards')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Voltar
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <button onClick={() => setTemplateSelected(false)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /></svg>
          Templates
        </button>

        <div className="relative" ref={addMenuRef}>
          <button onClick={() => setShowAddMenu(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" /></svg>
            Adicionar item
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" /></svg>
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 grid grid-cols-2 gap-1">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => { addBlock(bt.type); setShowAddMenu(false) }} className="flex flex-col items-start p-2 rounded-lg hover:bg-violet-50 transition-colors text-left">
                  <p className="text-xs font-semibold text-gray-800">{bt.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{bt.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button onClick={() => router.push('/dashboards')} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Salvar dashboard'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6 min-w-0" style={{ backgroundColor: canvasConfig.bgColor || '#f3f4f6' }} onClick={() => setSelectedBlockId(null)}>
          <div className="mb-6" onClick={e => e.stopPropagation()}>
            <input className="text-2xl font-black text-gray-800 bg-transparent outline-none border-b-2 border-transparent focus:border-violet-300 transition-colors py-1 w-full block" placeholder="Título do dashboard..." value={title} onChange={e => setTitle(e.target.value)} />
            <input className="text-sm text-gray-500 bg-transparent outline-none mt-1 w-full block" placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <ReportBuilder blocks={blocks} onChange={setBlocks} readOnly={false} selectedBlockId={selectedBlockId} onSelectBlock={id => setSelectedBlockId(id)} onBlockAction={(id, action) => { setSelectedBlockId(id); setSidePanel(action); setSidebarOpen(true) }} datasets={datasets} sheetConfig={{ bgColor: canvasConfig.sheetBgColor }} />
        </div>

        <aside className={`${sidebarOpen && sidePanel ? 'w-72' : 'w-0'} bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden transition-[width] duration-200`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">{sidePanel === 'dados' ? 'Dados' : activeBlock ? 'Configurar bloco' : 'Dashboard'}</span>
            <button onClick={() => { setSidebarOpen(false); setSidePanel(null) }} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {sidePanel === 'dados' && <DatasetPanel datasets={datasets} onDatasetsChange={setDatasets} />}
            {sidePanel === 'config' && (activeBlock ? <BlockConfigPanel block={activeBlock} onChange={updateActiveBlock} datasets={datasets} /> : <CanvasConfigPanel config={canvasConfig} onChange={setCanvasConfig} />)}
          </div>
        </aside>

        <div className="w-12 bg-white border-l border-gray-100 flex flex-col items-center py-3 gap-1 shrink-0">
          <button title="Dados" onClick={() => togglePanel('dados')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'dados' && sidebarOpen ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" /></svg>
          </button>
          <button title="Configurar" onClick={() => togglePanel('config')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'config' && sidebarOpen ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeWidth={1.5} /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
