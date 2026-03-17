'use client'

import { useState, useEffect } from 'react'
import AffiliateLayout from '@/components/AffiliateLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLAN_LABELS = {
  free: 'Gratuito', starter: 'Solo', solo: 'Solo',
  professional: 'Profissional', equipe: 'Profissional',
  ilimitado: 'Equipe', enterprise: 'Enterprise',
}

const STATUS_CONFIG = {
  pagante:   { label: 'Pagante',   cls: 'bg-emerald-900/40 text-emerald-300' },
  trial:     { label: 'Trial',     cls: 'bg-amber-900/40 text-amber-300' },
  free:      { label: 'Free',      cls: 'bg-gray-800 text-gray-400' },
  cancelado: { label: 'Cancelado', cls: 'bg-red-900/40 text-red-400' },
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AffiliateReferralsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('jarbis_affiliate_token')
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    fetch(`${API_URL}/affiliate/referrals`, { credentials: 'include', headers })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const referrals = data?.referrals || []
  const total = data?.total ?? 0
  const paying = referrals.filter(r => r.status === 'pagante').length
  const totalCommission = referrals.reduce((acc, r) => acc + (r.commission_monthly || 0), 0)
  const money = n => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <AffiliateLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Indicações</h1>
          <p className="text-gray-500 text-sm mt-1">Todos os clientes que você indicou</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-2xl border border-gray-800 p-4 text-center">
                <div className="text-2xl font-black text-white">{total}</div>
                <div className="text-xs text-gray-500 mt-1">Total indicados</div>
              </div>
              <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-4 text-center">
                <div className="text-2xl font-black text-emerald-400">{paying}</div>
                <div className="text-xs text-gray-500 mt-1">Pagantes</div>
              </div>
              <div className="rounded-2xl border border-violet-800/40 bg-violet-900/10 p-4 text-center">
                <div className="text-2xl font-black text-violet-400">{money(totalCommission)}</div>
                <div className="text-xs text-gray-500 mt-1">Comissão/mês</div>
              </div>
            </div>

            {referrals.length === 0 ? (
              <div className="text-gray-500 text-center py-16 text-sm">
                Nenhuma indicação ainda. Compartilhe seu link!
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900/50">
                      <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Empresa</th>
                      <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Plano</th>
                      <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">Comissão/mês</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Entrou em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map(r => {
                      const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.free
                      return (
                        <tr key={r.tenant_id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="text-sm font-medium text-white">{r.name}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs text-gray-400">{PLAN_LABELS[r.plan] || r.plan}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-medium text-emerald-400">
                            {r.commission_monthly > 0 ? money(r.commission_monthly) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-gray-500 hidden md:table-cell">
                            {fmtDate(r.joined_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AffiliateLayout>
  )
}
