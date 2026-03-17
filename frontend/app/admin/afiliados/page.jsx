'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminAfiliadosPage() {
  const [afiliados, setAfiliados] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, page_size: pageSize })
    if (search) params.set('search', search)

    fetch(`${API_URL}/admin/affiliates?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setAfiliados(d.items || [])
        setTotal(d.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Afiliados</h1>
            <p className="text-gray-500 text-sm mt-1">{total.toLocaleString('pt-BR')} afiliados cadastrados</p>
          </div>
          <Link
            href="/admin/afiliados/novo"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo afiliado
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nome, email ou código..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : afiliados.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm">Nenhum afiliado encontrado.</p>
              <Link href="/admin/afiliados/novo" className="mt-3 inline-block text-violet-400 text-sm hover:text-violet-300">
                Cadastrar primeiro afiliado →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Nome / Email</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Código</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">Comissão</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">Referrals</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Criado em</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {afiliados.map(a => (
                  <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-white">{a.name}</div>
                      <div className="text-xs text-gray-500">{a.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm font-bold text-violet-400">{a.code}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-300">
                      {parseFloat(a.commission_percent || 0).toFixed(0)}%
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-300">
                      {(a.referral_count ?? 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${a.is_active ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                        {a.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{fmtDate(a.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/afiliados/${a.id}`}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-xs rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-xs rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
