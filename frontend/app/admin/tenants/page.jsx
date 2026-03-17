'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLAN_LABELS = { free: 'Free', solo: 'Solo', equipe: 'Equipe', ilimitado: 'Ilimitado', enterprise: 'Enterprise' }
const PLAN_COLORS = {
  free: 'bg-gray-700/60 text-gray-300',
  solo: 'bg-blue-900/50 text-blue-300',
  equipe: 'bg-violet-900/50 text-violet-300',
  ilimitado: 'bg-emerald-900/50 text-emerald-300',
  enterprise: 'bg-amber-900/50 text-amber-300',
}
const STATUS_COLORS = {
  active: 'bg-emerald-900/50 text-emerald-300',
  trial: 'bg-amber-900/50 text-amber-300',
  inactive: 'bg-red-900/50 text-red-300',
  past_due: 'bg-red-900/70 text-red-200',
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, page_size: pageSize })
    if (search) params.set('search', search)
    if (planFilter) params.set('plan', planFilter)
    if (statusFilter) params.set('status', statusFilter)

    fetch(`${API_URL}/admin/tenants?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setTenants(d.items || [])
        setTotal(d.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, planFilter, statusFilter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Tenants</h1>
            <p className="text-gray-500 text-sm mt-1">{total.toLocaleString('pt-BR')} tenants no total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar por nome, slug ou email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 min-w-[240px] bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600"
          />
          <select
            value={planFilter}
            onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600"
          >
            <option value="">Todos os planos</option>
            {Object.entries(PLAN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="trial">Trial</option>
            <option value="inactive">Inativo</option>
            <option value="past_due">Pagamento pendente</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-gray-500 text-center py-16 text-sm">Nenhum tenant encontrado.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Nome / Slug</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Plano</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">Usuários</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Criado em</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-white">{t.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{t.slug}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${PLAN_COLORS[t.plan] || 'bg-gray-700 text-gray-300'}`}>
                        {PLAN_LABELS[t.plan] || t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const st = !t.is_active ? 'inactive'
                          : t.subscription_status === 'past_due' ? 'past_due'
                          : (t.trial_days_remaining != null && t.trial_days_remaining > 0) ? 'trial'
                          : 'active'
                        const label = { active: 'Ativo', trial: 'Trial', past_due: 'Pendente', inactive: 'Inativo' }[st]
                        return <span className={`text-xs font-bold px-2 py-1 rounded-md ${STATUS_COLORS[st] || 'bg-gray-700 text-gray-300'}`}>{label}</span>
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-400">{t.user_count ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{fmtDate(t.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/tenants/${t.id}`}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                      >
                        Ver detalhes →
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
            <span className="text-xs text-gray-500">
              Página {page} de {totalPages} — {total} registros
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-xs rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-xs rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
