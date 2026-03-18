'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLAN_LABELS = { free: 'Gratuito', solo: 'Solo', equipe: 'Profissional', ilimitado: 'Equipe', enterprise: 'Enterprise', starter: 'Solo', professional: 'Profissional' }
const PLAN_COLORS = {
  free: 'bg-gray-700/60 text-gray-300',
  solo: 'bg-blue-900/50 text-blue-300',
  equipe: 'bg-violet-900/50 text-violet-300',
  ilimitado: 'bg-emerald-900/50 text-emerald-300',
  enterprise: 'bg-amber-900/50 text-amber-300',
}
const STATUS_COLORS = {
  active:   'bg-emerald-900/50 text-emerald-300',
  trial:    'bg-amber-900/50 text-amber-300',
  inactive: 'bg-red-900/50 text-red-300',
  past_due: 'bg-red-900/70 text-red-200',
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getStatus(t) {
  if (!t.is_active) return 'inactive'
  if (t.subscription_status === 'past_due') return 'past_due'
  if (t.trial_days_remaining != null && t.trial_days_remaining > 0) return 'trial'
  return 'active'
}

const HEALTH_BADGE = {
  saudavel: { label: '🟢 Saudável', cls: 'bg-emerald-900/40 text-emerald-300' },
  risco:    { label: '🟡 Em risco', cls: 'bg-amber-900/40 text-amber-300' },
  churn:    { label: '🔴 Churn',    cls: 'bg-red-900/40 text-red-300' },
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [toggling, setToggling] = useState(null)
  const [healthMap, setHealthMap] = useState({})
  const [selected, setSelected] = useState(new Set())
  const [bulkDays, setBulkDays] = useState(7)
  const [bulking, setBulking] = useState(false)
  const pageSize = 20

  function authHeaders() {
    const token = localStorage.getItem('jarbis_token')
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, page_size: pageSize })
    if (search) params.set('search', search)
    if (planFilter) params.set('plan', planFilter)
    if (statusFilter) params.set('status', statusFilter)

    fetch(`${API_URL}/admin/tenants?${params}`, { credentials: 'include', headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setTenants(d.items || [])
        setTotal(d.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, planFilter, statusFilter, page])

  useEffect(() => { load() }, [load])

  // Carrega health scores uma vez (independente do filtro)
  useEffect(() => {
    const token = localStorage.getItem('jarbis_token')
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    fetch(`${API_URL}/admin/customer-success?limit=500`, { credentials: 'include', headers: h })
      .then(r => r.json())
      .then(d => {
        const map = {}
        ;(d.items || []).forEach(item => { map[item.id] = item })
        setHealthMap(map)
      })
      .catch(() => {})
  }, [])

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === tenants.length) setSelected(new Set())
    else setSelected(new Set(tenants.map(t => t.id)))
  }

  async function bulkExtendTrial() {
    if (!selected.size) return
    setBulking(true)
    const r = await fetch(`${API_URL}/admin/tenants/bulk-extend-trial`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ tenant_ids: Array.from(selected), days: bulkDays }),
    })
    if (r.ok) {
      setSelected(new Set())
      load()
    }
    setBulking(false)
  }

  async function toggleActive(t) {
    setToggling(t.id)
    const newActive = !t.is_active
    const r = await fetch(`${API_URL}/admin/tenants/${t.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ is_active: newActive }),
    })
    if (r.ok) {
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, is_active: newActive } : x))
    }
    setToggling(null)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
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

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-violet-700 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4">
            <span className="text-sm text-gray-400 font-medium">{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Estender trial:</span>
              <input
                type="number"
                value={bulkDays}
                onChange={e => setBulkDays(Number(e.target.value))}
                min={1} max={365}
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-violet-600"
              />
              <span className="text-xs text-gray-500">dias</span>
              <button
                onClick={bulkExtendTrial}
                disabled={bulking}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {bulking ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
            <button onClick={() => setSelected(new Set())} className="text-gray-600 hover:text-gray-400 text-xs ml-2">✕</button>
          </div>
        )}

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
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={tenants.length > 0 && selected.size === tenants.length}
                      onChange={selectAll}
                      className="rounded border-gray-600 bg-gray-800 text-violet-600 focus:ring-violet-600 focus:ring-offset-0"
                    />
                  </th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Nome / Slug</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Plano</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">Usuários</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden xl:table-cell">Saúde</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Criado em</th>
                  <th className="text-center text-xs text-gray-500 font-medium px-5 py-3">On/Off</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => {
                  const st = getStatus(t)
                  const stLabel = { active: 'Ativo', trial: 'Trial', past_due: 'Pendente', inactive: 'Inativo' }[st]
                  const health = healthMap[t.id]
                  const hBadge = health ? HEALTH_BADGE[health.health_status] : null
                  return (
                    <tr key={t.id} className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors ${selected.has(t.id) ? 'bg-violet-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="rounded border-gray-600 bg-gray-800 text-violet-600 focus:ring-violet-600 focus:ring-offset-0"
                        />
                      </td>
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
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${STATUS_COLORS[st] || 'bg-gray-700 text-gray-300'}`}>
                          {stLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-400">{t.user_count ?? '—'}</td>
                      <td className="px-5 py-3 hidden xl:table-cell">
                        {hBadge ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${hBadge.cls}`} title={health.risk_reasons?.join(', ')}>
                            {hBadge.label}
                          </span>
                        ) : (
                          <span className="text-gray-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{fmtDate(t.created_at)}</td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleActive(t)}
                          disabled={toggling === t.id}
                          title={t.is_active ? 'Desativar conta' : 'Ativar conta'}
                          className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${t.is_active ? 'bg-emerald-600' : 'bg-gray-700'}`}
                        >
                          {toggling === t.id ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            </span>
                          ) : (
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${t.is_active ? 'left-4' : 'left-0.5'}`} />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/tenants/${t.id}`}
                          className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                        >
                          Detalhes →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
  )
}
