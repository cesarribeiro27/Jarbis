'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed']
const STATUS_CFG = {
  open:        { label: 'Aberto',       cls: 'bg-blue-900/40 text-blue-300' },
  in_progress: { label: 'Em andamento', cls: 'bg-amber-900/40 text-amber-300' },
  resolved:    { label: 'Resolvido',    cls: 'bg-emerald-900/40 text-emerald-300' },
  closed:      { label: 'Fechado',      cls: 'bg-gray-800 text-gray-500' },
}
const PRIORITY_CFG = {
  low:      { label: 'Baixa',    cls: 'text-gray-400' },
  medium:   { label: 'Média',    cls: 'text-blue-400' },
  high:     { label: 'Alta',     cls: 'text-amber-400' },
  critical: { label: 'Crítica',  cls: 'text-red-400 font-bold' },
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    const r = await fetch(`${API_URL}/admin/support/tickets/${id}`, {
      credentials: 'include', headers: authHeaders()
    })
    if (r.ok) setTicket(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function updateTicket(patch) {
    setSaving(true)
    await fetch(`${API_URL}/admin/support/tickets/${id}`, {
      method: 'PATCH', credentials: 'include', headers: authHeaders(),
      body: JSON.stringify(patch),
    })
    setSaving(false)
    load()
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setAddingComment(true)
    await fetch(`${API_URL}/admin/support/tickets/${id}/comments`, {
      method: 'POST', credentials: 'include', headers: authHeaders(),
      body: JSON.stringify({ content: comment }),
    })
    setComment('')
    setAddingComment(false)
    load()
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminLayout>
  )

  if (!ticket) return (
    <AdminLayout>
      <div className="p-8 text-gray-500">Ticket não encontrado.</div>
    </AdminLayout>
  )

  const sc = STATUS_CFG[ticket.status] || STATUS_CFG.open
  const pc = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.medium

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/admin/suporte" className="hover:text-gray-300 transition-colors">Suporte</Link>
          <span>→</span>
          <span className="text-gray-400">{ticket.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-5">
              <h1 className="text-xl font-black text-white mb-2">{ticket.title}</h1>
              {ticket.description && (
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{ticket.description}</p>
              )}
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Comentários ({ticket.comments?.length || 0})
              </h3>
              <div className="space-y-3">
                {ticket.comments?.map(c => (
                  <div key={c.id} className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-violet-400">{c.author_email}</span>
                      <span className="text-xs text-gray-600">{fmtDate(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={submitComment} className="mt-4 space-y-2">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600 resize-none"
                />
                <button type="submit" disabled={addingComment || !comment.trim()}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                  {addingComment ? 'Enviando...' : 'Comentar'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-4 space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1.5">Status</label>
                <select
                  value={ticket.status}
                  onChange={e => updateTicket({ status: e.target.value })}
                  disabled={saving}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1.5">Prioridade</label>
                <select
                  value={ticket.priority}
                  onChange={e => updateTicket({ priority: e.target.value })}
                  disabled={saving}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-600"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1.5">Responsável</label>
                <input
                  type="email"
                  defaultValue={ticket.assigned_to || ''}
                  onBlur={e => e.target.value !== (ticket.assigned_to || '') && updateTicket({ assigned_to: e.target.value })}
                  placeholder="email@equipe.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-600"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Tenant</span>
                <Link href={`/admin/tenants/${ticket.tenant_id}`} className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
                  {ticket.tenant_name}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Criado por</span>
                <span className="text-gray-400">{ticket.created_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Criado em</span>
                <span className="text-gray-400">{fmtDate(ticket.created_at)}</span>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolvido em</span>
                  <span className="text-emerald-400">{fmtDate(ticket.resolved_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
