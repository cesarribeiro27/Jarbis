'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLAN_LABELS = {
  free: 'Gratuito', solo: 'Solo', equipe: 'Profissional', ilimitado: 'Equipe',
  enterprise: 'Enterprise', starter: 'Solo', professional: 'Profissional',
}
const PLAN_COLORS = {
  free: 'bg-gray-700 text-gray-300',
  solo: 'bg-blue-900/50 text-blue-300',
  equipe: 'bg-violet-900/50 text-violet-300',
  ilimitado: 'bg-emerald-900/50 text-emerald-300',
  enterprise: 'bg-amber-900/50 text-amber-300',
  starter: 'bg-blue-900/50 text-blue-300',
  professional: 'bg-violet-900/50 text-violet-300',
}
const STATUS_BADGES = {
  active:   'bg-emerald-900/40 text-emerald-300',
  trial:    'bg-amber-900/40 text-amber-300',
  past_due: 'bg-red-900/40 text-red-300',
  inactive: 'bg-gray-800 text-gray-400',
}
const STATUS_LABELS = {
  active: 'Ativo', trial: 'Trial', past_due: 'Inadimplente', inactive: 'Inativo',
}

function KpiCard({ label, value, sub, color = 'default', href }) {
  const styles = {
    default: { border: 'border-gray-800', bg: '', val: 'text-white' },
    green:   { border: 'border-emerald-800/40', bg: 'bg-emerald-900/10', val: 'text-emerald-400' },
    blue:    { border: 'border-blue-800/40',    bg: 'bg-blue-900/10',    val: 'text-blue-400' },
    violet:  { border: 'border-violet-800/40',  bg: 'bg-violet-900/10',  val: 'text-violet-400' },
    red:     { border: 'border-red-800/40',     bg: 'bg-red-900/10',     val: 'text-red-400' },
    amber:   { border: 'border-amber-800/40',   bg: 'bg-amber-900/10',   val: 'text-amber-400' },
    teal:    { border: 'border-teal-800/40',    bg: 'bg-teal-900/10',    val: 'text-teal-400' },
  }
  const s = styles[color] || styles.default
  const content = (
    <div className={`rounded-2xl border p-5 h-full ${s.border} ${s.bg} ${href ? 'hover:bg-opacity-20 transition-colors' : ''}`}>
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className={`text-3xl font-black ${s.val}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function MrrTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const money = n => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs space-y-1">
      <p className="text-gray-400">{label}</p>
      <p className="text-emerald-300 font-bold">MRR {money(payload[0]?.value)}</p>
      {payload[1] && <p className="text-blue-300">{payload[1]?.payload?.paying_tenants} pagantes</p>}
    </div>
  )
}

function SignupsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      <p className="text-violet-300 font-bold">{payload[0].value} sign-ups</p>
    </div>
  )
}

export default function AdminMetricsPage() {
  const [data, setData] = useState(null)
  const [mrrHistory, setMrrHistory] = useState(null)
  const [retention, setRetention] = useState(null)
  const [threats, setThreats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers = { 'Content-Type': 'application/json' }

    Promise.all([
      fetch(`${API_URL}/admin/metrics`, { credentials: 'include', headers }).then(r => r.json()),
      fetch(`${API_URL}/admin/metrics/mrr-history?months=12`, { credentials: 'include', headers })
        .then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/admin/metrics/retention`, { credentials: 'include', headers })
        .then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/admin/security/threats`, { credentials: 'include', headers })
        .then(r => r.json()).catch(() => null),
    ]).then(([metrics, mrr, ret, sec]) => {
      setData(metrics)
      setMrrHistory(mrr)
      setRetention(ret)
      setThreats(sec)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const fmt = n => (n ?? 0).toLocaleString('pt-BR')
  const money = n => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const moneyK = n => {
    if (!n) return 'R$0'
    if (n >= 1000) return `R$${(n / 1000).toFixed(1)}k`
    return money(n)
  }

  const totals        = data?.totals || {}
  const byStatus      = data?.tenants_by_status || {}
  const signups       = data?.signups || {}
  const byPlan        = data?.by_plan || {}
  const mrr           = data?.mrr_estimated ?? 0
  const signupsByDay  = data?.signups_by_day || []
  const recentTenants = data?.recent_tenants || []
  const trialExpiring = data?.trial_expiring_soon ?? 0
  const conversionRate = data?.conversion_rate ?? 0
  const pastDue       = byStatus.past_due ?? 0

  const mrrSeries = (mrrHistory?.series || []).map(d => ({
    ...d,
    label: d.date ? d.date.slice(0, 7).replace('-', '/') : '',
    mrr_num: parseFloat(d.mrr) || 0,
  }))
  const momChange = mrrHistory?.mom_change ?? null
  const hasHistory = mrrHistory?.has_history ?? false

  const churnRate = retention?.churn_rate_30d ?? null
  const ltv       = retention?.ltv_estimated ?? null
  const nrr       = retention?.nrr_estimated ?? null
  const arpa      = retention?.arpa ?? null

  const chartData = signupsByDay.map(d => ({
    ...d,
    label: d.date ? d.date.slice(5).replace('-', '/') : '',
  }))

  return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Métricas Globais</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do produto em tempo real</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-gray-500 text-center py-20">Erro ao carregar métricas.</div>
        ) : (
          <div className="space-y-8">

            {/* ── Alertas ──────────────────────────────── */}
            {(pastDue > 0 || trialExpiring > 0) && (
              <div className="space-y-2">
                {pastDue > 0 && (
                  <Link href="/admin/tenants?status=past_due"
                    className="flex items-center gap-3 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 hover:bg-red-900/30 transition-colors">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-red-300 text-sm font-medium">
                      <strong>{pastDue} {pastDue === 1 ? 'tenant' : 'tenants'}</strong> com pagamento pendente (past_due) — clique para ver
                    </span>
                  </Link>
                )}
                {trialExpiring > 0 && (
                  <Link href="/admin/tenants?status=trial"
                    className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3 hover:bg-amber-900/30 transition-colors">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-amber-300 text-sm font-medium">
                      <strong>{trialExpiring} {trialExpiring === 1 ? 'trial expira' : 'trials expiram'}</strong> nos próximos 7 dias
                    </span>
                  </Link>
                )}
              </div>
            )}

            {/* ── KPIs financeiros ─────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Receita</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="MRR"
                  value={money(mrr)}
                  sub={momChange !== null ? `${momChange > 0 ? '+' : ''}${momChange}% vs mês anterior` : 'Planos pagos ativos'}
                  color="green"
                />
                <KpiCard label="ARR" value={money(mrr * 12)} sub="MRR × 12" color="blue" />
                <KpiCard label="ARPA" value={arpa ? money(arpa) : '—'} sub="Receita média por tenant" color="teal" />
                <KpiCard label="Conversão trial→pago" value={`${conversionRate}%`} sub="Pagantes / (Pagantes + Trial)" color="violet" />
              </div>
            </div>

            {/* ── KPIs retenção ─────────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Retenção</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Churn Rate (30d)"
                  value={churnRate !== null ? `${churnRate}%` : '—'}
                  sub="Cancelamentos / ativos início do mês"
                  color={churnRate !== null && churnRate > 5 ? 'red' : churnRate !== null && churnRate > 2 ? 'amber' : 'green'}
                />
                <KpiCard
                  label="LTV estimado"
                  value={ltv ? money(ltv) : '—'}
                  sub="ARPA / (Churn Rate / 100)"
                  color="blue"
                />
                <KpiCard
                  label="NRR estimado"
                  value={nrr ? `${nrr}%` : '—'}
                  sub="Retenção líquida de receita"
                  color={nrr !== null && nrr >= 100 ? 'green' : 'amber'}
                />
                <KpiCard
                  label="Inadimplentes"
                  value={fmt(pastDue)}
                  sub="past_due"
                  color={pastDue > 0 ? 'red' : 'default'}
                  href={pastDue > 0 ? '/admin/tenants?status=past_due' : undefined}
                />
              </div>
            </div>

            {/* ── KPIs produto ──────────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Produto</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total de tenants"  value={fmt(totals.tenants)}   color="default" />
                <KpiCard label="Tenants ativos"    value={fmt(byStatus.active)}  color="green" />
                <KpiCard label="Em trial"          value={fmt(byStatus.trial)}   color="amber" />
                <KpiCard label="Sign-ups (7 dias)" value={fmt(signups.last_7d)}  sub={`Hoje: ${fmt(signups.today)}`} color="violet" />
              </div>
            </div>

            {/* ── MRR Histórico ─────────────────────────── */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-300">MRR Histórico</h3>
                {!hasHistory && (
                  <span className="text-[10px] text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded">
                    Snapshots diários serão coletados a partir de hoje
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-4">Últimos 12 meses</p>
              {mrrSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mrrSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={v => moneyK(v)}
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false} tickLine={false} width={48}
                    />
                    <Tooltip content={<MrrTooltip />} cursor={{ stroke: 'rgba(124,58,237,0.2)', strokeWidth: 1 }} />
                    <Line
                      type="monotone"
                      dataKey="mrr_num"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-700 text-sm">Sem dados</div>
              )}
            </div>

            {/* ── Charts sign-ups e por plano ───────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Bar chart — sign-ups por dia */}
              <div className="lg:col-span-3 rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-1">Sign-ups por dia</h3>
                <p className="text-xs text-gray-600 mb-4">Últimos 14 dias</p>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip content={<SignupsTooltip />} cursor={{ fill: 'rgba(124,58,237,0.08)' }} />
                      <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-gray-700 text-sm">Sem dados</div>
                )}
              </div>

              {/* Distribuição por plano */}
              <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-1">Distribuição por plano</h3>
                <p className="text-xs text-gray-600 mb-4">Tenants ativos</p>
                <div className="space-y-2">
                  {Object.entries(byPlan).length === 0 ? (
                    <p className="text-gray-700 text-sm text-center py-8">Sem dados</p>
                  ) : (
                    Object.entries(byPlan)
                      .sort((a, b) => b[1] - a[1])
                      .map(([plan, count]) => {
                        const pct = totals.tenants ? Math.round(count / totals.tenants * 100) : 0
                        return (
                          <div key={plan} className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-20 text-center flex-shrink-0 ${PLAN_COLORS[plan] || 'bg-gray-700 text-gray-300'}`}>
                              {PLAN_LABELS[plan] || plan}
                            </span>
                            <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                              <div className="bg-violet-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{count}</span>
                          </div>
                        )
                      })
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xl font-black text-white">{fmt(totals.users)}</div>
                    <div className="text-[10px] text-gray-600">Usuários</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">{fmt(totals.dashboards)}</div>
                    <div className="text-[10px] text-gray-600">Dashboards</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Últimos cadastros ─────────────────────── */}
            {recentTenants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Últimas empresas cadastradas</h2>
                  <Link href="/admin/tenants" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    Ver todos →
                  </Link>
                </div>
                <div className="rounded-2xl border border-gray-800 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Empresa</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Plano</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Owner</th>
                        <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTenants.map(t => (
                        <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-5 py-3">
                            <Link href={`/admin/tenants/${t.id}`} className="text-sm text-white font-medium hover:text-violet-400 transition-colors">
                              {t.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${PLAN_COLORS[t.plan] || 'bg-gray-700 text-gray-300'}`}>
                              {PLAN_LABELS[t.plan] || t.plan}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_BADGES[t.subscription_status] || 'bg-gray-800 text-gray-400'}`}>
                              {STATUS_LABELS[t.subscription_status] || t.subscription_status || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">{t.owner_email}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 text-right">{formatDate(t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* ── Ameaças de Segurança ─────────────────── */}
          {threats && threats.total > 0 && (
            <div className="mt-8 rounded-2xl border border-red-900/40 bg-red-950/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-red-400 text-lg">&#9888;</span>
                <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
                  Ameaças detectadas (últimas 2h)
                </h2>
                <span className="ml-auto text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">
                  {threats.total} IP{threats.total !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-2 pr-4">IP</th>
                      <th className="text-left pb-2 pr-4">Reqs bloqueadas</th>
                      <th className="text-left pb-2 pr-4">Alerta enviado</th>
                      <th className="text-left pb-2">Últimos endpoints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threats.threats.map(t => (
                      <tr key={t.ip} className="border-b border-gray-800/50">
                        <td className="py-2 pr-4 font-mono text-white">{t.ip}</td>
                        <td className="py-2 pr-4">
                          <span className={`font-bold ${t.hits >= 50 ? 'text-red-400' : t.hits >= 20 ? 'text-amber-400' : 'text-gray-300'}`}>
                            {t.hits}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {t.alerted
                            ? <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">Sim</span>
                            : <span className="text-xs text-gray-600">Não</span>
                          }
                        </td>
                        <td className="py-2 text-gray-400 text-xs font-mono">
                          {(t.recent_events || []).slice(0, 3).join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          </div>
        )}
      </div>
  )
}
