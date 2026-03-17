'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLAN_LABELS = {
  free: 'Free', solo: 'Solo', equipe: 'Equipe', ilimitado: 'Ilimitado', enterprise: 'Enterprise',
}
const PLAN_COLORS = {
  free: 'bg-gray-700 text-gray-300',
  solo: 'bg-blue-900/50 text-blue-300',
  equipe: 'bg-violet-900/50 text-violet-300',
  ilimitado: 'bg-emerald-900/50 text-emerald-300',
  enterprise: 'bg-amber-900/50 text-amber-300',
}

function StatCard({ label, value, sub, color = 'violet' }) {
  const borders = {
    violet: 'border-violet-800/40 bg-violet-900/10',
    emerald: 'border-emerald-800/40 bg-emerald-900/10',
    amber: 'border-amber-800/40 bg-amber-900/10',
    red: 'border-red-800/40 bg-red-900/10',
    blue: 'border-blue-800/40 bg-blue-900/10',
  }
  const texts = {
    violet: 'text-violet-400', emerald: 'text-emerald-400',
    amber: 'text-amber-400', red: 'text-red-400', blue: 'text-blue-400',
  }
  return (
    <div className={`rounded-2xl border p-5 ${borders[color]}`}>
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className={`text-3xl font-black ${texts[color]}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{children}</h2>
}

export default function AdminMetricsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/admin/metrics`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmt = n => (n ?? 0).toLocaleString('pt-BR')
  const money = n => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Backend response shape:
  // { totals: {tenants, users, dashboards, datasets},
  //   tenants_by_status: {active, trial, past_due, inactive},
  //   signups: {today, last_7d, last_30d},
  //   by_plan: {plan: count},
  //   mrr_estimated: number }

  const totals = data?.totals || {}
  const byStatus = data?.tenants_by_status || {}
  const signups = data?.signups || {}
  const byPlan = data?.by_plan || {}
  const mrr = data?.mrr_estimated ?? 0

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
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
          <div className="space-y-10">
            {/* Tenants */}
            <section>
              <SectionTitle>Tenants</SectionTitle>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total de tenants" value={fmt(totals.tenants)} color="violet" />
                <StatCard label="Ativos" value={fmt(byStatus.active)} color="emerald" />
                <StatCard label="Em trial" value={fmt(byStatus.trial)} color="amber" />
                <StatCard label="Inativos" value={fmt(byStatus.inactive)} color="red" />
              </div>
            </section>

            {/* Negócio */}
            <section>
              <SectionTitle>Negócio</SectionTitle>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total de usuários" value={fmt(totals.users)} color="blue" />
                <StatCard label="MRR estimado" value={money(mrr)} sub="Planos pagos ativos" color="emerald" />
                <StatCard label="ARR estimado" value={money(mrr * 12)} sub="MRR × 12" color="violet" />
                <StatCard label="Pagamento pendente" value={fmt(byStatus.past_due)} sub="past_due" color="red" />
              </div>
            </section>

            {/* Signups */}
            <section>
              <SectionTitle>Novos Signups</SectionTitle>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Hoje" value={fmt(signups.today)} color="violet" />
                <StatCard label="Últimos 7 dias" value={fmt(signups.last_7d)} color="violet" />
                <StatCard label="Últimos 30 dias" value={fmt(signups.last_30d)} color="violet" />
              </div>
            </section>

            {/* Por plano */}
            {Object.keys(byPlan).length > 0 && (
              <section>
                <SectionTitle>Distribuição por Plano</SectionTitle>
                <div className="rounded-2xl border border-gray-800 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Plano</th>
                        <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">Tenants</th>
                        <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">% do total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byPlan).map(([plan, count]) => (
                        <tr key={plan} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${PLAN_COLORS[plan] || 'bg-gray-700 text-gray-300'}`}>
                              {PLAN_LABELS[plan] || plan}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-gray-300">{fmt(count)}</td>
                          <td className="px-5 py-3 text-right text-sm text-gray-500">
                            {totals.tenants ? ((count / totals.tenants) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-800/30">
                        <td className="px-5 py-3 text-xs font-semibold text-gray-400">Total</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-white">{fmt(totals.tenants)}</td>
                        <td className="px-5 py-3 text-right text-sm text-gray-500">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* Totais adicionais */}
            <section>
              <SectionTitle>Conteúdo</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Dashboards criados" value={fmt(totals.dashboards)} color="blue" />
                <StatCard label="Datasets criados" value={fmt(totals.datasets)} color="blue" />
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
