'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const ACTION_LABELS = {
  plan_change:        'Mudança de plano',
  toggle_active:      'Ativar/desativar conta',
  extend_trial:       'Extensão de trial',
  bulk_extend_trial:  'Trial em massa',
  coupon_create:      'Cupom criado',
  coupon_delete:      'Cupom excluído',
  affiliate_create:   'Afiliado criado',
  affiliate_payment:  'Pagamento de afiliado',
  ticket_create:      'Ticket aberto',
  nfe_issue:          'NF-e emitida',
  impersonate:        'Impersonação',
  api_key_create:     'API key criada',
  api_key_revoke:     'API key revogada',
  admin_invite:       'Admin convidado',
  admin_remove:       'Admin removido',
}

const ACTION_COLOR = {
  impersonate:    'text-red-400',
  toggle_active:  'text-amber-400',
  plan_change:    'text-violet-400',
  nfe_issue:      'text-emerald-400',
  api_key_revoke: 'text-red-400',
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export default function AuditLogPage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filterEmail, setFilterEmail] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')

  async function load(p = page) {
    setLoading(true)
    const params = new URLSearchParams({ page: p, page_size: 50 })
    if (filterEmail) params.set('admin_email', filterEmail)
    if (filterAction) params.set('action', filterAction)
    if (filterEntity) params.set('entity_type', filterEntity)

    const r = await fetch(`${API_URL}/admin/audit-log?${params}`, {
      credentials: 'include', headers: authHeaders(),
    })
    if (r.ok) {
      const d = await r.json()
      setItems(d.items || [])
      setTotal(d.total || 0)
    }
    setLoading(false)
  }

  useEffect(() => { load(1); setPage(1) }, [filterEmail, filterAction, filterEntity])
  useEffect(() => { load(page) }, [page])

  const totalPages = Math.ceil(total / 50)

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Auditoria</h1>
          <p className="text-gray-500 text-sm mt-1">{total} registros</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Filtrar por admin..."
            value={filterEmail}
            onChange={e => setFilterEmail(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600 w-52"
          />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600"
          >
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600"
          >
            <option value="">Todos os tipos</option>
            <option value="tenant">Tenant</option>
            <option value="coupon">Cupom</option>
            <option value="affiliate">Afiliado</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 text-center py-16 text-sm rounded-2xl border border-gray-800">
            Nenhum registro encontrado.
          </div>
        ) : (
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-800" />
            <div className="space-y-3">
              {items.map(item => {
                const actionLabel = ACTION_LABELS[item.action] || item.action
                const colorCls = ACTION_COLOR[item.action] || 'text-gray-300'
                return (
                  <div key={item.id} className="flex gap-4 relative">
                    {/* Dot */}
                    <div className="w-10 flex-shrink-0 flex items-start pt-3 justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-700 border border-gray-600 relative z-10" />
                    </div>
                    {/* Card */}
                    <div className="flex-1 rounded-xl border border-gray-800 bg-gray-900/20 px-4 py-3 mb-1">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <span className={`text-sm font-semibold ${colorCls}`}>{actionLabel}</span>
                          {item.entity_name && (
                            <span className="ml-2 text-xs text-gray-500">→ {item.entity_name}</span>
                          )}
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-violet-400 font-medium">{item.admin_email}</div>
                          <div className="text-[10px] text-gray-600 mt-0.5">{fmtDate(item.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs text-gray-400 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs text-gray-400 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
