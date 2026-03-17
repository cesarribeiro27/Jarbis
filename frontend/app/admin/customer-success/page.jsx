'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const HEALTH_CONFIG = {
  saudavel: { label: 'Saudável', emoji: '🟢', cls: 'bg-emerald-900/40 text-emerald-300', bar: 'bg-emerald-500' },
  risco:    { label: 'Em risco', emoji: '🟡', cls: 'bg-amber-900/40 text-amber-300',    bar: 'bg-amber-500' },
  churn:    { label: 'Churn',    emoji: '🔴', cls: 'bg-red-900/40 text-red-300',        bar: 'bg-red-500' },
}

const PLAN_LABELS = {
  free: 'Gratuito', starter: 'Solo', solo: 'Solo',
  professional: 'Profissional', equipe: 'Profissional',
  ilimitado: 'Equipe', enterprise: 'Enterprise',
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CustomerSuccessPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [riskOnly, setRiskOnly] = useState(false)
  const [search, setSearch] = useState('')

  function authHeaders() {
    const token = localStorage.getItem('jarbis_token')
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/admin/customer-success?limit=200${riskOnly ? '&risk_only=true' : ''}`, {
      credentials: 'include',
      headers: authHeaders(),
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [riskOnly])

  const items = (data?.items || []).filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.owner_email?.toLowerCase().includes(q)
  })

  const totalAtRisk = data?.at_risk ?? 0
  const totalChurn  = data?.churn_risk ?? 0
  const total       = data?.total ?? 0

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Customer Success</h1>
          <p className="text-gray-500 text-sm mt-1">Health score de cada tenant — piores primeiro</p>
        </div>

        {/* KPI summary */}
        {!loading && data && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-4 text-center">
              <div className="text-2xl font-black text-white">{total}</div>
              <div className="text-xs text-gray-500 mt-1">Tenants ativos</div>
            </div>
            <div className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-4 text-center">
              <div className="text-2xl font-black text-amber-400">{totalAtRisk}</div>
              <div className="text-xs text-gray-500 mt-1">Em risco ou churn</div>
            </div>
            <div className="rounded-2xl border border-red-800/40 bg-red-900/10 p-4 text-center">
              <div className="text-2xl font-black text-red-400">{totalChurn}</div>
              <div className="text-xs text-gray-500 mt-1">Risco crítico de churn</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 mb-5">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-600"
          />
          <button
            onClick={() => setRiskOnly(v => !v)}
            className={`px-4 py-2 text-sm rounded-xl border font-medium transition-colors ${
              riskOnly
                ? 'border-amber-700 bg-amber-900/30 text-amber-300'
                : 'border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {riskOnly ? '🟡 Só em risco' : 'Todos'}
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 text-center py-16 text-sm">Nenhum tenant encontrado.</div>
        ) : (
          <div className="space-y-3">
            {items.map(t => {
              const hc = HEALTH_CONFIG[t.health_status] || HEALTH_CONFIG.saudavel
              const score = t.health_score ?? 0
              return (
                <div key={t.id} className="rounded-2xl border border-gray-800 bg-gray-900/20 p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-4">

                    {/* Score bar */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className={`text-lg font-black ${hc.cls.split(' ')[1]}`}>{score}</div>
                      <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
                        <div
                          className={`h-1 rounded-full transition-all ${hc.bar}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/tenants/${t.id}`}
                          className="text-sm font-semibold text-white hover:text-violet-400 transition-colors"
                        >
                          {t.name}
                        </Link>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${hc.cls}`}>
                          {hc.emoji} {hc.label}
                        </span>
                        <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-md">
                          {PLAN_LABELS[t.plan] || t.plan}
                        </span>
                      </div>

                      {t.owner_email && (
                        <div className="text-xs text-gray-500 mt-0.5">{t.owner_email}</div>
                      )}

                      {/* Risk reasons */}
                      {t.risk_reasons?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {t.risk_reasons.map((r, i) => (
                            <span key={i} className="text-[10px] bg-gray-800/80 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">
                              ⚠ {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex-shrink-0 hidden md:flex gap-6 text-center">
                      <div>
                        <div className="text-sm font-bold text-white">{t.user_count ?? 0}</div>
                        <div className="text-[10px] text-gray-600">usuários</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{t.dash_count ?? 0}</div>
                        <div className="text-[10px] text-gray-600">dashboards</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{fmtDate(t.created_at)}</div>
                        <div className="text-[10px] text-gray-600">cadastro</div>
                      </div>
                    </div>

                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="flex-shrink-0 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                      Ver →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
