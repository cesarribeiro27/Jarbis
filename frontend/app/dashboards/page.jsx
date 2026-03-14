'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

export default function DashboardsPage() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchReports() }, [])

  function fetchReports() {
    api.reports.list()
      .then(data => setReports(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  async function handleDelete(id) {
    try {
      await api.reports.delete(id)
      setReports(prev => prev.filter(r => r.id !== id))
      setDeleteConfirm(null)
      setMenuOpen(null)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleShare(id) {
    try {
      const res = await api.reports.share(id)
      await navigator.clipboard.writeText(`${window.location.origin}/r/${res.token}`)
      alert('Link copiado!')
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Dashboards</h1>
            <p className="text-sm text-gray-500 mt-1">Relatórios interativos conectados aos seus dados</p>
          </div>
          <button
            onClick={() => router.push('/dashboards/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            + Novo dashboard
          </button>
        </div>

        {loading && <div className="text-center py-20 text-gray-400">Carregando...</div>}

        {!loading && reports.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="font-semibold text-gray-800 mb-2">Nenhum dashboard criado</p>
            <p className="text-sm text-gray-400 mb-6">Crie dashboards com gráficos, KPIs e tabelas conectados aos seus dados</p>
            <button
              onClick={() => router.push('/dashboards/novo')}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Criar primeiro dashboard
            </button>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reports.map(r => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all relative group"
                onClick={() => router.push(`/dashboards/${r.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.is_shared && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Compartilhado</span>
                    )}
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === r.id ? null : r.id); setDeleteConfirm(null) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                      {menuOpen === r.id && (
                        <div className="absolute right-0 top-6 z-10 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => router.push(`/dashboards/${r.id}`)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Editar</button>
                          <button onClick={() => handleShare(r.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Compartilhar</button>
                          {deleteConfirm === r.id ? (
                            <div className="px-3 py-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-2">Confirmar exclusão?</p>
                              <div className="flex gap-2">
                                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 font-semibold hover:underline">Excluir</button>
                                <button onClick={() => { setDeleteConfirm(null); setMenuOpen(null) }} className="text-xs text-gray-400 hover:underline">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(r.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 border-t border-gray-100">Excluir</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{r.title}</h3>
                {r.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{r.description}</p>}
                <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                  <span>{r.block_count ?? 0} {r.block_count === 1 ? 'bloco' : 'blocos'}</span>
                  <span>{new Date(r.updated_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
