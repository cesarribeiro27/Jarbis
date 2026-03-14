'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { BlockConfigPanel, DatasetPanel, CanvasConfigPanel } from '@/components/ReportBuilder'

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

function AiPanel({ datasets, onClose }) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id || '')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function ask() {
    if (!datasetId || !question.trim()) return
    setLoading(true); setError(null); setResult(null)
    try { setResult(await api.reports.aiQuery(datasetId, question)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-sm">✨ Perguntar sobre os dados</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {datasets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum dataset disponível.</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Dataset</label>
                <select value={datasetId} onChange={e => setDatasetId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Pergunta</label>
                <div className="flex gap-2">
                  <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Ex: qual produto vendeu mais?" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" autoFocus />
                  <button onClick={ask} disabled={loading || !datasetId || !question.trim()} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors">
                    {loading ? '...' : 'Enviar'}
                  </button>
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
              {result?.answer && <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3"><p className="text-sm text-violet-900">{result.answer}</p></div>}
            </>
          )}
        </div>
      </div>
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

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.reports.update(id, { title: editTitle, description: editDescription || null, blocks: pages[0]?.blocks || [], pages })
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

  const activeBlock = blocks.find(b => b.id === selectedBlockId)

  if (loading) return <AppLayout><div className="p-8 text-center text-gray-400">Carregando...</div></AppLayout>
  if (!report) return <AppLayout><div className="p-8 text-center text-red-500">Dashboard não encontrado</div></AppLayout>

  // EDIT MODE
  if (mode === 'edit') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <button onClick={cancelEdit} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Voltar
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

          <button onClick={() => setShowDateFilter(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${showDateFilter || globalDateFilter.dateFrom || globalDateFilter.dateTo ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" /></svg>
            Data
          </button>

          <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {showDateFilter && (
          <div className="bg-violet-50 border-b border-violet-100 px-4 py-2 flex items-center gap-3 shrink-0 flex-wrap">
            <span className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Filtro de Data</span>
            <select value={globalDateFilter.dateCol} onChange={e => setGlobalDateFilter(f => ({ ...f, dateCol: e.target.value }))} className="border border-violet-200 rounded-lg px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none">
              <option value="">Coluna de data...</option>
              {[...new Set(datasets.flatMap(ds => ds.columns || []))].sort().map(col => <option key={col} value={col}>{col}</option>)}
            </select>
            <input type="date" value={globalDateFilter.dateFrom} onChange={e => setGlobalDateFilter(f => ({ ...f, dateFrom: e.target.value }))} className="border border-violet-200 rounded-lg px-2 py-1 text-xs bg-white" />
            <span className="text-xs text-violet-400">até</span>
            <input type="date" value={globalDateFilter.dateTo} onChange={e => setGlobalDateFilter(f => ({ ...f, dateTo: e.target.value }))} className="border border-violet-200 rounded-lg px-2 py-1 text-xs bg-white" />
            <button onClick={() => setGlobalDateFilter({ dateCol: '', dateFrom: '', dateTo: '' })} className="text-xs text-violet-500 hover:text-violet-700">Limpar</button>
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

            <div className="mb-6" onClick={e => e.stopPropagation()}>
              <input className="text-2xl font-black text-gray-800 bg-transparent outline-none border-b-2 border-transparent focus:border-violet-300 transition-colors py-1 w-full block" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              <input className="text-sm text-gray-500 bg-transparent outline-none mt-1 w-full block" placeholder="Descrição (opcional)" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>

            <ReportBuilder blocks={blocks} onChange={setBlocks} readOnly={false} selectedBlockId={selectedBlockId} onSelectBlock={id => setSelectedBlockId(id)} onBlockAction={(id, action) => { setSelectedBlockId(id); setSidePanel(action); setSidebarOpen(true) }} datasets={datasets} sheetConfig={{ bgColor: canvasConfig.sheetBgColor }} globalDateFilter={globalDateFilter} />
          </div>

          <aside className={`${sidebarOpen && sidePanel ? 'w-72' : 'w-0'} bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden transition-[width] duration-200`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">{sidePanel === 'dados' ? 'Dados' : activeBlock ? 'Configurar bloco' : 'Dashboard'}</span>
              <button onClick={() => { setSidebarOpen(false); setSidePanel(null) }} className="text-gray-400 hover:text-gray-700">
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
            <button title="Perguntar com IA" onClick={() => setShowAiPanel(true)} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-gray-400 hover:text-violet-600 hover:bg-violet-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </button>
          </div>
        </div>
        {showAiPanel && <AiPanel datasets={datasets} onClose={() => setShowAiPanel(false)} />}
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
      {showAiPanel && <AiPanel datasets={datasets} onClose={() => setShowAiPanel(false)} />}
    </AppLayout>
  )
}
