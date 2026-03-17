'use client'

import { useState, useEffect } from 'react'
import AffiliateLayout from '@/components/AffiliateLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AffiliatePaymentsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('jarbis_affiliate_token')
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    fetch(`${API_URL}/affiliate/payments`, { credentials: 'include', headers })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const payments = data?.payments || []
  const money = n => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <AffiliateLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Pagamentos</h1>
          <p className="text-gray-500 text-sm mt-1">Histórico de comissões recebidas</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Total */}
            {data && (
              <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-5 mb-6">
                <div className="text-xs text-gray-500 mb-1">Total recebido</div>
                <div className="text-4xl font-black text-emerald-400">{money(data.total_received)}</div>
                <div className="text-xs text-gray-600 mt-1">{payments.length} pagamentos registrados</div>
              </div>
            )}

            {payments.length === 0 ? (
              <div className="text-gray-500 text-center py-16 text-sm rounded-2xl border border-gray-800">
                Nenhum pagamento registrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="rounded-2xl border border-gray-800 bg-gray-900/20 px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-white">{p.period_description || 'Pagamento'}</div>
                      {p.note && <div className="text-xs text-gray-500 mt-0.5">{p.note}</div>}
                      <div className="text-xs text-gray-600 mt-0.5">{fmtDate(p.created_at)}</div>
                    </div>
                    <div className="text-lg font-black text-emerald-400">{money(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AffiliateLayout>
  )
}
