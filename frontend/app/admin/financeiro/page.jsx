'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const STATUS_LABELS = {
  paid:            { label: 'Pago',           cls: 'bg-emerald-900/40 text-emerald-300' },
  open:            { label: 'Em aberto',       cls: 'bg-amber-900/40 text-amber-300' },
  void:            { label: 'Cancelado',       cls: 'bg-gray-800 text-gray-500' },
  uncollectible:   { label: 'Incobrável',      cls: 'bg-red-900/40 text-red-400' },
}

const PLAN_LABELS = {
  free: 'Gratuito', solo: 'Solo', equipe: 'Profissional',
  ilimitado: 'Equipe', enterprise: 'Enterprise',
  starter: 'Solo', professional: 'Profissional',
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function fmtBRL(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// Gera lista de meses retroativos (últimos 12 + vazio = todos)
function monthOptions() {
  const opts = [{ value: '', label: 'Todos os períodos' }]
  const now = new Date()
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}

export default function AdminFinanceiroPage() {
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPaidAllTime, setTotalPaidAllTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStatus, setFilterStatus] = useState('paid')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  async function load(pg = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pg,
        page_size: PAGE_SIZE,
        status: filterStatus,
        ...(filterMonth && { month: filterMonth }),
      })
      const r = await fetch(`${API_URL}/admin/invoices?${params}`, { headers: authHeaders() })
      const data = await r.json()
      setInvoices(data.items || [])
      setTotal(data.total || 0)
      setTotalPaidAllTime(data.total_paid_all_time || 0)
      setPage(pg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [filterMonth, filterStatus])

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        status: filterStatus || 'paid',
        ...(filterMonth && { month: filterMonth }),
      })
      const r = await fetch(`${API_URL}/admin/invoices/export?${params}`, { headers: authHeaders() })
      if (!r.ok) return
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `faturas_${filterMonth || 'todas'}_${filterStatus || 'paid'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  // Receita do período filtrado (somente pagas)
  const periodRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0)

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Financeiro</h1>
            <p className="text-sm text-gray-500 mt-1">
              Histórico de faturas e receita. Exporte para seu contador.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-emerald-800/30 bg-emerald-900/10 rounded-2xl p-5">
            <div className="text-xs text-gray-500 mb-1">Receita total (histórico)</div>
            <div className="text-2xl font-black text-emerald-400">{fmtBRL(totalPaidAllTime)}</div>
            <div className="text-xs text-gray-600 mt-1">todas as faturas pagas</div>
          </div>
          <div className="bg-gray-900 border border-violet-800/30 bg-violet-900/10 rounded-2xl p-5">
            <div className="text-xs text-gray-500 mb-1">Receita no período</div>
            <div className="text-2xl font-black text-violet-400">{fmtBRL(periodRevenue)}</div>
            <div className="text-xs text-gray-600 mt-1">{filterMonth ? `referente a ${filterMonth}` : 'todos os períodos'}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs text-gray-500 mb-1">Faturas no período</div>
            <div className="text-2xl font-black text-white">{total}</div>
            <div className="text-xs text-gray-600 mt-1">com filtro atual</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Período</label>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
            >
              {monthOptions().map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
            >
              <option value="">Todos</option>
              <option value="paid">Pago</option>
              <option value="open">Em aberto</option>
              <option value="void">Cancelado</option>
              <option value="uncollectible">Incobrável</option>
            </select>
          </div>
          <div className="ml-auto text-xs text-gray-600">
            {total} fatura{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="text-gray-600 text-sm">Nenhuma fatura encontrada.</div>
              <div className="text-gray-700 text-xs">
                As faturas são registradas automaticamente quando um pagamento é processado pelo Stripe.
              </div>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="text-left px-6 py-3 font-medium">Empresa</th>
                    <th className="text-left px-6 py-3 font-medium">Plano</th>
                    <th className="text-left px-6 py-3 font-medium">Período</th>
                    <th className="text-left px-6 py-3 font-medium">Pago em</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                    <th className="text-right px-6 py-3 font-medium">Valor</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const st = STATUS_LABELS[inv.status] || { label: inv.status, cls: 'bg-gray-800 text-gray-400' }
                    return (
                      <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm text-white font-medium">{inv.tenant_name}</div>
                          <div className="text-xs text-gray-600 font-mono">{inv.stripe_invoice_id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {PLAN_LABELS[inv.plan] || inv.plan || '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {inv.period_start ? (
                            <>{fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}</>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {fmtDate(inv.paid_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-bold ${inv.status === 'paid' ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {fmtBRL(inv.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {inv.invoice_pdf && (
                            <a
                              href={inv.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-violet-400 transition-colors"
                              title="Ver PDF"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700">
                    <td colSpan="5" className="px-6 py-3 text-xs text-gray-500 font-medium">
                      Total desta página
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-emerald-400">
                      {fmtBRL(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              {/* Paginação */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-800">
                  <button
                    disabled={page === 1}
                    onClick={() => load(page - 1)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs text-gray-600">Página {page} de {pages}</span>
                  <button
                    disabled={page === pages}
                    onClick={() => load(page + 1)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info sobre preenchimento */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-4 text-xs text-gray-600">
          <strong className="text-gray-500">Como funciona:</strong> As faturas são registradas automaticamente
          quando o Stripe processa um pagamento (evento <code className="text-gray-400">invoice.paid</code>).
          Se a tabela estiver vazia, é porque ainda não houve pagamentos processados após a ativação desta funcionalidade.
          Pagamentos anteriores não são retroativos.
        </div>
      </div>
    </AdminLayout>
  )
}
