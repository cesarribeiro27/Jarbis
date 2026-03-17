'use client'

import { useState, useEffect } from 'react'
import AffiliateLayout from '@/components/AffiliateLayout'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function KpiCard({ label, value, sub, color = 'default' }) {
  const styles = {
    default: { border: 'border-gray-800', bg: '',                    val: 'text-white' },
    green:   { border: 'border-emerald-800/40', bg: 'bg-emerald-900/10', val: 'text-emerald-400' },
    blue:    { border: 'border-blue-800/40',    bg: 'bg-blue-900/10',    val: 'text-blue-400' },
    violet:  { border: 'border-violet-800/40',  bg: 'bg-violet-900/10',  val: 'text-violet-400' },
    amber:   { border: 'border-amber-800/40',   bg: 'bg-amber-900/10',   val: 'text-amber-400' },
  }
  const s = styles[color] || styles.default
  return (
    <div className={`rounded-2xl border p-5 ${s.border} ${s.bg}`}>
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className={`text-3xl font-black ${s.val}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

export default function AffiliateDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('jarbis_affiliate_token')
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    fetch(`${API_URL}/affiliate/dashboard`, { credentials: 'include', headers })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const money = n => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmt = n => (n ?? 0).toLocaleString('pt-BR')

  function copyLink() {
    if (!data?.referral_link) return
    navigator.clipboard.writeText(data.referral_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AffiliateLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Meu Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhe suas indicações e comissões</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-gray-500 text-center py-20">Erro ao carregar dados.</div>
        ) : (
          <div className="space-y-8">

            {/* Link de referência */}
            <div className="rounded-2xl border border-violet-800/40 bg-violet-900/10 p-5">
              <div className="text-xs text-gray-500 mb-2">Seu link de indicação</div>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-sm text-violet-300 font-mono bg-gray-900/50 px-3 py-2 rounded-xl truncate border border-gray-800">
                  {data.referral_link}
                </code>
                <button
                  onClick={copyLink}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex-shrink-0 ${
                    copied
                      ? 'bg-emerald-700 text-white'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Comissão: <span className="text-violet-400 font-bold">{data.commission_percent}%</span> por cliente ativo indicado
              </div>
            </div>

            {/* KPIs indicações */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Indicações</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard label="Total indicados"   value={fmt(data.total_referrals)}   color="default" />
                <KpiCard label="Clientes pagantes" value={fmt(data.paying_referrals)}  color="green" />
                <KpiCard label="Cancelados"        value={fmt(data.churned_referrals)} color="default" />
              </div>
            </div>

            {/* KPIs comissões */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Comissões</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard
                  label="Comissão estimada/mês"
                  value={money(data.commission_estimated_monthly)}
                  sub={`Sobre ${money(data.mrr_referrals)} MRR`}
                  color="green"
                />
                <KpiCard
                  label="Total recebido"
                  value={money(data.total_paid)}
                  sub="Histórico de pagamentos"
                  color="blue"
                />
                <KpiCard
                  label="Saldo pendente"
                  value={money(data.balance_pending)}
                  sub="Estimativa não confirmada"
                  color="amber"
                />
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="flex gap-3">
              <Link
                href="/affiliate/referrals"
                className="flex-1 rounded-xl border border-gray-800 bg-gray-900/30 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors text-center"
              >
                Ver indicações →
              </Link>
              <Link
                href="/affiliate/payments"
                className="flex-1 rounded-xl border border-gray-800 bg-gray-900/30 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors text-center"
              >
                Histórico de pagamentos →
              </Link>
            </div>

          </div>
        )}
      </div>
    </AffiliateLayout>
  )
}
