'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'

const PAGE_SIZE = 50

// Ícone de tipo de coluna (estilo Jarbis: violet/cinza)
function ColTypeIcon({ type }) {
  if (type === 'date') {
    return (
      <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  }
  if (type === 'number') {
    return (
      <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth="2"/>
        <path d="M12 8v8M8 12h8" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  }
  // text / default
  return (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h7"/>
    </svg>
  )
}

// Mini histograma de barras
function MiniHistogram({ data }) {
  if (!data || data.length === 0) {
    return <div className="h-8 flex items-end gap-0.5 px-1">{[...Array(6)].map((_, i) => <div key={i} className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-sm h-2" />)}</div>
  }
  const max = Math.max(...data.map(d => d.value || 0), 1)
  return (
    <div className="h-8 flex items-end gap-0.5 px-1">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-violet-500 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
          style={{ height: `${Math.max(4, Math.round((d.value / max) * 28))}px` }}
          title={`${d.label}: ${d.value}`}
        />
      ))}
    </div>
  )
}

// Modal de renomear coluna
function RenameColumnModal({ colName, onClose, onRename }) {
  const [value, setValue] = useState(colName)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!value.trim() || value === colName) { onClose(); return }
    setLoading(true)
    await onRename(colName, value.trim())
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-80 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Renomear coluna</h3>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Menu ⋮ por coluna
function ColMenu({ colName, onRename, onDelete, onCopy }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg w-44 py-1 text-sm">
          <button onClick={() => { setOpen(false); onRename() }} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Renomear coluna
          </button>
          <button onClick={() => { setOpen(false); onCopy() }} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Copiar nome
          </button>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-500">
            Remover coluna
          </button>
        </div>
      )}
    </div>
  )
}

export default function DatasetDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const toast = useToast()

  const [dataset, setDataset] = useState(null)      // { name, row_count, columns: [{name, type}] }
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [histograms, setHistograms] = useState({})  // colName → [{label, value}]
  const [colSearch, setColSearch] = useState({})    // colName → string
  const [globalSearch, setGlobalSearch] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [renamingCol, setRenamingCol] = useState(null)  // colName sendo renomeada
  const [deletingCol, setDeletingCol] = useState(null)  // colName aguardando confirm
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [warpStatus, setWarpStatus] = useState(null)

  // Carrega metadados + histogramas
  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.reports.datasets.columns(id)
      .then(data => {
        setDataset(data)
        setNameValue(data.name)
        // Carrega histogramas em paralelo
        if (data.columns?.length) {
          data.columns.forEach(col => {
            const req = col.type === 'number'
              ? { metrics: [{ column: col.name, aggregation: 'sum' }], dimensions: [{ column: col.name, type: 'number' }], limit: 8 }
              : { dimensions: [{ column: col.name, type: col.type === 'date' ? 'date' : 'text' }], metrics: [{ column: '__count__', aggregation: 'count' }], limit: 8 }
            api.reports.datasets.queryV2(id, req)
              .then(res => {
                const bars = (res.rows || []).map(r => ({
                  label: String(r[col.name] ?? r[Object.keys(r)[0]] ?? ''),
                  value: Number(r.__count__ ?? r[col.name] ?? r[Object.keys(r)[Object.keys(r).length - 1]] ?? 0),
                }))
                setHistograms(prev => ({ ...prev, [col.name]: bars }))
              })
              .catch(() => {})
          })
        }
      })
      .catch(() => toast('Erro ao carregar dataset', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  // Verifica status do Warp cache ao montar
  useEffect(() => {
    if (!id) return
    api.reports.datasets.warpStatus(id)
      .then(data => setWarpStatus(data))
      .catch(() => {})
  }, [id])

  // Carrega linhas ao mudar de página
  useEffect(() => {
    if (!id) return
    setLoadingRows(true)
    api.reports.datasets.rows(id, PAGE_SIZE, page * PAGE_SIZE)
      .then(data => {
        setRows(data.rows || [])
        setTotal(data.total || 0)
      })
      .catch(() => toast('Erro ao carregar linhas', 'error'))
      .finally(() => setLoadingRows(false))
  }, [id, page])

  // Filtro de linhas client-side (por coluna)
  const filteredRows = rows.filter(row => {
    return Object.entries(colSearch).every(([col, search]) => {
      if (!search) return true
      const val = String(row[col] ?? '').toLowerCase()
      return val.includes(search.toLowerCase())
    })
  })

  // Colunas visíveis filtradas pela busca global
  const visibleCols = (dataset?.columns || []).filter(col =>
    !globalSearch || col.name.toLowerCase().includes(globalSearch.toLowerCase())
  )

  async function handleRenameDataset() {
    if (!nameValue.trim() || nameValue === dataset?.name) { setEditingName(false); return }
    try {
      await api.reports.datasets.update(id, { name: nameValue.trim() })
      setDataset(prev => ({ ...prev, name: nameValue.trim() }))
      toast('Dataset renomeado', 'success')
    } catch (e) {
      toast(e.message || 'Erro ao renomear', 'error')
    }
    setEditingName(false)
  }

  async function handleRenameColumn(oldName, newName) {
    // Renomear coluna = remover coluna antiga e criar nova (sem suporte nativo no backend)
    // Por enquanto apenas atualiza o label localmente (UI) — backend não tem endpoint de rename
    // Quando backend tiver, chamar aqui
    setDataset(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.name === oldName ? { ...c, label: newName } : c),
    }))
    toast('Coluna renomeada (apenas na visualização)', 'success')
  }

  async function handleDeleteColumn(colName) {
    try {
      await api.reports.datasets.deleteColumn(id, colName)
      setDataset(prev => ({
        ...prev,
        columns: prev.columns.filter(c => c.name !== colName),
      }))
      setRows(prev => prev.map(row => {
        const r = { ...row }
        delete r[colName]
        return r
      }))
      setHistograms(prev => { const h = { ...prev }; delete h[colName]; return h })
      setDeletingCol(null)
      toast('Coluna removida', 'success')
    } catch (e) {
      toast(e.message || 'Erro ao remover coluna', 'error')
    }
  }

  function handleCopyCol(colName) {
    navigator.clipboard.writeText(colName).then(() => toast('Nome copiado', 'success'))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const showing = Math.min((page + 1) * PAGE_SIZE, total)
  const from = page * PAGE_SIZE + 1

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!dataset) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-gray-400">Dataset não encontrado</div>
      </AppLayout>
    )
  }

  const typeLabel = dataset.type === 'api' ? 'API' : dataset.type === 'google-analytics' ? 'Google Analytics' : dataset.type === 'database' ? 'Banco de dados' : 'CSV/Excel'

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-screen bg-[#FAFAF8] dark:bg-gray-900">

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push('/datasets')}
              className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              Voltar
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Ícone dataset */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dataset.type === 'api' ? 'bg-blue-50' : 'bg-violet-50'}`}>
                {dataset.type === 'api' ? (
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                )}
              </div>

              {/* Nome editável */}
              {editingName ? (
                <form onSubmit={e => { e.preventDefault(); handleRenameDataset() }} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onBlur={handleRenameDataset}
                    className="text-xl font-bold border-b-2 border-violet-400 bg-transparent outline-none text-gray-900 dark:text-gray-100 min-w-0"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400 transition-colors text-left truncate"
                  title="Clique para renomear"
                >
                  {dataset.name}
                </button>
              )}
            </div>

            {/* Ações do header */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowDetails(v => !v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors ${showDetails ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                Detalhes
              </button>
            </div>
          </div>

          {/* Metadados */}
          <div className="flex items-center gap-3 mt-2 ml-[52px]">
            <span className="text-xs text-gray-400">{total.toLocaleString('pt-BR')} registros</span>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="text-xs text-gray-400">{dataset.columns?.length || 0} colunas</span>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="text-xs text-gray-400">{typeLabel}</span>
            {warpStatus?.cached && (
              <>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3"/>
                  </svg>
                  Warp ativo
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Tabela principal */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Barra de busca de colunas */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3">
              <div className="relative max-w-sm">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
                </svg>
                <input
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  placeholder="Buscar colunas..."
                  className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-violet-300 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
                  {/* Row 1: headers */}
                  <tr>
                    {visibleCols.map(col => (
                      <th key={col.name} className="border-b border-r border-gray-100 dark:border-gray-700 text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[140px] max-w-[240px] bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ColTypeIcon type={col.type} />
                            <span className="truncate text-xs font-semibold text-gray-700 dark:text-gray-300">{col.label || col.name}</span>
                          </div>
                          <ColMenu
                            colName={col.name}
                            onRename={() => setRenamingCol(col.name)}
                            onDelete={() => setDeletingCol(col.name)}
                            onCopy={() => handleCopyCol(col.name)}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                  {/* Row 2: histogramas */}
                  <tr className="bg-gray-50/70 dark:bg-gray-800/50">
                    {visibleCols.map(col => (
                      <td key={col.name} className="border-b border-r border-gray-100 dark:border-gray-700 px-0 py-0">
                        <MiniHistogram data={histograms[col.name]} />
                      </td>
                    ))}
                  </tr>
                  {/* Row 3: busca por coluna */}
                  <tr className="bg-white dark:bg-gray-900">
                    {visibleCols.map(col => (
                      <td key={col.name} className="border-b border-r border-gray-100 dark:border-gray-700 px-2 py-1">
                        <input
                          value={colSearch[col.name] || ''}
                          onChange={e => setColSearch(prev => ({ ...prev, [col.name]: e.target.value }))}
                          placeholder="Buscar..."
                          className="w-full text-xs border border-gray-150 dark:border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-300 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600"
                        />
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingRows ? (
                    <tr>
                      <td colSpan={visibleCols.length} className="py-12 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleCols.length} className="py-12 text-center text-gray-400 text-sm">
                        Nenhuma linha encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, i) => (
                      <tr key={i} className="hover:bg-violet-50/30 dark:hover:bg-violet-900/20 transition-colors">
                        {visibleCols.map(col => (
                          <td key={col.name} className="border-b border-r border-gray-50 dark:border-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[240px]">
                            <span className="block truncate" title={String(row[col.name] ?? '')}>
                              {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 shrink-0">
              <span>
                {total === 0 ? 'Nenhuma linha' : `Mostrando ${from.toLocaleString('pt-BR')}–${showing.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} linhas`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Anterior
                  </button>
                  <span className="text-gray-400">{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Painel de Detalhes (lateral) */}
          {showDetails && (
            <div className="w-72 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 flex flex-col overflow-y-auto shrink-0">
              <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">Detalhes do Dataset</h3>
              </div>
              <div className="px-4 py-4 flex flex-col gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Informações</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Registros</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{total.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Colunas</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{dataset.columns?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Tipo</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{typeLabel}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Colunas ({dataset.columns?.length || 0})</p>
                  <div className="flex flex-col gap-1">
                    {(dataset.columns || []).map(col => (
                      <div key={col.name} className="flex items-center gap-2 py-1">
                        <ColTypeIcon type={col.type} />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{col.label || col.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal renomear coluna */}
      {renamingCol && (
        <RenameColumnModal
          colName={renamingCol}
          onClose={() => setRenamingCol(null)}
          onRename={handleRenameColumn}
        />
      )}

      {/* Confirmação de exclusão de coluna */}
      {deletingCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-80 p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Remover coluna?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              A coluna <strong>{deletingCol}</strong> será removida permanentemente de todos os registros do dataset.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingCol(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button
                onClick={() => handleDeleteColumn(deletingCol)}
                className="px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
