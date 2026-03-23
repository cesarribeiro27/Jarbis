'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const STATUS_CFG = {
  open:        { label: 'Aberto',      cls: 'bg-blue-900/40 text-blue-300' },
  in_progress: { label: 'Em andamento', cls: 'bg-amber-900/40 text-amber-300' },
  resolved:    { label: 'Resolvido',   cls: 'bg-emerald-900/40 text-emerald-300' },
  closed:      { label: 'Fechado',     cls: 'bg-gray-800 text-gray-500' },
}
const PRIORITY_CFG = {
  low:      { label: 'Baixa',    cls: 'text-gray-500' },
  medium:   { label: 'Média',    cls: 'text-blue-400' },
  high:     { label: 'Alta',     cls: 'text-amber-400' },
  critical: { label: 'Crítica',  cls: 'text-red-400 font-bold' },
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_admin_token') : null
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [tenantSearch, setTenantSearch] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [creating, setCreating] = useState(false)
  const [tenantSuggestions, setTenantSuggestions] = useState([])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (priorityFilter) params.set('priority', priorityFilter)
    const r = await fetch(`${API_URL}/admin/support/tickets?${params}`, {
      credentials: 'include', headers: authHeaders()
    })
    const d = await r.json()
    setTickets(d.items || [])
    setTotal(d.total || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter, priorityFilter])

  async function searchTenants(q) {
    if (!q || q.length < 2) { setTenantSuggestions([]); return }
    const r = await fetch(`${API_URL}/admin/tenants?search=${encodeURIComponent(q)}&page_size=5`, {
      credentials: 'include', headers: authHeaders()
    })
    const d = await r.json()
    setTenantSuggestions(d.items || [])
  }

  async function createTicket(e) {
    e.preventDefault()
    if (!tenantId) return
    setCreating(true)
    await fetch(`${API_URL}/admin/support/tickets`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ tenant_id: tenantId, title, description, priority }),
    })
    setCreating(false)
    setShowCreate(false)
    setTitle(''); setDescription(''); setTenantId(''); setTenantSearch(''); setPriority('medium')
    load()
  }

  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length

  return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Suporte</h1>
            <p className="text-gray-500 text-sm mt-1">
              {openCount} aberto{openCount !== 1 ? 's' : ''} · {inProgressCount} em andamento
            </p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors"
          >
            + Novo ticket
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={createTicket} className="rounded-2xl border border-violet-800/40 bg-violet-900/10 p-5 mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Abrir novo ticket</h3>

            {/* Tenant search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar tenant..."
                value={tenantSearch}
                onChange={e => { setTenantSearch(e.target.value); searchTenants(e.target.value) }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600"
              />
              {tenantSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-xl mt-1 z-10 overflow-hidden">
                  {tenantSuggestions.map(t => (
                    <button
                      key={t.id} type="button"
                      onClick={() => { setTenantId(t.id); setTenantSearch(t.name); setTenantSuggestions([]) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 transition-colors"
                    >
                      {t.name} <span className="text-gray-500 text-xs">{t.slug}</span>
                    </button>
                  ))}
                </div>
              )}
              {tenantId && <div className="text-[10px] text-emerald-400 mt-0.5">✓ Tenant selecionado</div>}
            </div>

            <input
              type="text" required
              placeholder="Título do ticket"
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600"
            />
            <textarea
              placeholder="Descrição (opcional)"
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600 resize-none"
            />
            <div className="flex gap-3">
              <select
                value={priority} onChange={e => setPriority(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
              <button type="submit" disabled={creating || !tenantId || !title}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                {creating ? 'Criando...' : 'Criar ticket'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600">
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em andamento</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600">
            <option value="">Todas as prioridades</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-gray-500 text-center py-16 text-sm rounded-2xl border border-gray-800">
            Nenhum ticket encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => {
              const sc = STATUS_CFG[t.status] || STATUS_CFG.open
              const pc = PRIORITY_CFG[t.priority] || PRIORITY_CFG.medium
              return (
                <Link key={t.id} href={`/admin/suporte/${t.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900/20 px-5 py-4 hover:bg-gray-800/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{t.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sc.cls}`}>{sc.label}</span>
                      <span className={`text-[10px] ${pc.cls}`}>{pc.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                      <span>{t.tenant_name}</span>
                      {t.assigned_to && <span>→ {t.assigned_to}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 flex-shrink-0">{fmtDate(t.created_at)}</div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
  )
}
