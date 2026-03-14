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

function TemplateGallery({ onSelect }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">J</span>
        </div>
        <span className="text-gray-900 font-black text-sm">Jarbis</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500 text-sm">Novo Dashboard</span>
      </div>

      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Escolha um template</h1>
          <p className="text-sm text-gray-500">Comece com um template ou em branco. Os blocos ficam prontos — basta conectar seus dados.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="group text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className={`w-full h-24 rounded-xl ${tpl.color} mb-4 flex items-center justify-center overflow-hidden relative`}>
                {tpl.id === 'blank' ? (
                  <span className="text-3xl opacity-40">＋</span>
                ) : (
                  <div className="w-full h-full p-2 grid grid-cols-6 grid-rows-3 gap-0.5 opacity-60">
                    {tpl.blocks.slice(0, 12).map((b, i) => (
                      <div
                        key={i}
                        className={`rounded ${b.type === 'kpi' ? 'bg-indigo-400' : b.type === 'bar' || b.type === 'bar_h' ? 'bg-green-400' : b.type === 'line' || b.type === 'area' ? 'bg-blue-400' : b.type === 'pie' ? 'bg-purple-400' : b.type === 'table' ? 'bg-gray-400' : b.type === 'filter' ? 'bg-yellow-300' : 'bg-gray-300'}`}
                        style={{ gridColumn: `span ${Math.min(b.layout.w, 3)}`, gridRow: `span ${Math.min(b.layout.h, 2)}` }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">{tpl.icon}</span>
                <div>
                  <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{tpl.title}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.description}</p>
                  {tpl.blocks.length > 0 && <p className="text-xs text-gray-400 mt-2">{tpl.blocks.length} blocos</p>}
                </div>
              </div>
            </button>
          ))}
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push('/dashboards')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Voltar
        </button>
        <button onClick={() => setTemplateSelected(false)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /></svg>
          Templates
        </button>

        <div className="relative" ref={addMenuRef}>
          <button onClick={() => setShowAddMenu(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" /></svg>
            Adicionar item
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" /></svg>
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 grid grid-cols-2 gap-1">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => { addBlock(bt.type); setShowAddMenu(false) }} className="flex flex-col items-start p-2 rounded-lg hover:bg-indigo-50 transition-colors text-left">
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
        <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Salvar dashboard'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6 min-w-0" style={{ backgroundColor: canvasConfig.bgColor || '#f3f4f6' }} onClick={() => setSelectedBlockId(null)}>
          <div className="mb-6" onClick={e => e.stopPropagation()}>
            <input className="text-2xl font-black text-gray-800 bg-transparent outline-none border-b-2 border-transparent focus:border-indigo-300 transition-colors py-1 w-full block" placeholder="Título do dashboard..." value={title} onChange={e => setTitle(e.target.value)} />
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
          <button title="Dados" onClick={() => togglePanel('dados')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'dados' && sidebarOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" /></svg>
          </button>
          <button title="Configurar" onClick={() => togglePanel('config')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'config' && sidebarOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeWidth={1.5} /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
