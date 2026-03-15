'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'

const PALETTE = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2', '#7c3aed', '#16a34a']

function PreviewThumb({ report, color }) {
  const seed = report.id?.charCodeAt?.(0) ?? 0
  const bars = [45, 72, 55, 88, 63, 79, 50, 94, 68, 82].map((v, i) => v + ((seed + i * 7) % 20) - 10)
  const max = Math.max(...bars)
  return (
    <div className="w-full h-full flex items-end gap-0.5 px-2 pb-1.5 pt-3">
      {bars.slice(0, 8).map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ height: `${(v / max) * 68}%`, backgroundColor: color, opacity: 0.15 + (i % 3) * 0.2 }}
        />
      ))}
    </div>
  )
}

export default function DashboardsPage() {
  const router = useRouter()
  const toast = useToast()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchReports() }, [])

  function fetchReports() {
    api.reports.list()
      .then(data => setReports(data || []))
      .catch(() => toast('Erro ao carregar dashboards.', 'error'))
      .finally(() => setLoading(false))
  }

  async function handleDelete(id) {
    try {
      await api.reports.delete(id)
      setReports(prev => prev.filter(r => r.id !== id))
      setDeleteConfirm(null)
      setMenuOpen(null)
      toast('Dashboard excluído.', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao excluir.', 'error')
    }
  }

  async function handleShare(id) {
    try {
      const res = await api.reports.share(id)
      await navigator.clipboard.writeText(`${window.location.origin}/r/${res.token}`)
      toast('Link copiado para a área de transferência!', 'success')
      setMenuOpen(null)
      setReports(prev => prev.map(r => r.id === id ? { ...r, is_shared: true, share_token: res.token } : r))
    } catch (err) {
      toast(err.message || 'Erro ao compartilhar.', 'error')
    }
  }

  const filtered = reports.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="p-8 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Dashboards</h1>
            <p className="text-sm text-gray-400 mt-1">
              {reports.length > 0 ? `${reports.length} dashboard${reports.length !== 1 ? 's' : ''}` : 'Relatórios interativos conectados aos seus dados'}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboards/novo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Novo dashboard
          </button>
        </div>

        {/* Search */}
        {reports.length > 4 && (
          <div className="relative mb-6">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Buscar dashboards..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-sm pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-52 animate-pulse" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center shadow-sm">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </div>
            {search ? (
              <>
                <p className="font-semibold text-gray-700 mb-1">Nenhum resultado para "{search}"</p>
                <button onClick={() => setSearch('')} className="text-sm text-violet-600 hover:underline mt-2">Limpar busca</button>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-800 mb-2">Nenhum dashboard criado</p>
                <p className="text-sm text-gray-400 mb-6">Crie dashboards com gráficos, KPIs e tabelas conectados aos seus dados</p>
                <button
                  onClick={() => router.push('/dashboards/novo')}
                  className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
                >
                  Criar primeiro dashboard
                </button>
              </>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((r, i) => {
              const color = PALETTE[i % PALETTE.length]
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 relative group overflow-hidden"
                  onClick={() => router.push(`/dashboards/${r.id}`)}
                >
                  {/* Preview */}
                  <div
                    className="h-28 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)` }}
                  >
                    <PreviewThumb report={r} color={color} />
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: color }} />
                    <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === r.id ? null : r.id); setDeleteConfirm(null) }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white transition-all shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                      {menuOpen === r.id && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1">
                          <button onClick={() => { router.push(`/dashboards/${r.id}`); setMenuOpen(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                          </button>
                          <button onClick={() => handleShare(r.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            Copiar link público
                          </button>
                          <div className="h-px bg-gray-100 my-1" />
                          {deleteConfirm === r.id ? (
                            <div className="px-4 py-2">
                              <p className="text-xs text-gray-500 mb-2 font-medium">Confirmar exclusão?</p>
                              <div className="flex gap-3">
                                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 font-bold hover:underline">Excluir</button>
                                <button onClick={() => { setDeleteConfirm(null); setMenuOpen(null) }} className="text-xs text-gray-400 hover:underline">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(r.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Excluir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{r.title}</h3>
                      {r.is_shared && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">Público</span>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-gray-400 line-clamp-1 mb-2">{r.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-gray-400">{r.block_count ?? 0} {r.block_count === 1 ? 'bloco' : 'blocos'}</span>
                      </div>
                      <span className="text-xs text-gray-300">{new Date(r.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
