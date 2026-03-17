'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

function ScoreBar({ score, count, total }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0
  const color = score >= 9 ? 'bg-emerald-500' : score >= 7 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 text-xs text-gray-500 text-right">{score}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-xs text-gray-500 text-right">{count}</span>
    </div>
  )
}

function NpsGauge({ nps }) {
  if (nps === null) return <div className="text-gray-500 text-sm">Sem dados</div>
  const color = nps >= 50 ? 'text-emerald-400' : nps >= 0 ? 'text-amber-400' : 'text-red-400'
  const label = nps >= 50 ? 'Excelente' : nps >= 20 ? 'Bom' : nps >= 0 ? 'Precisa melhorar' : 'Crítico'
  return (
    <div className="text-center">
      <div className={`text-5xl font-black ${color}`}>{nps > 0 ? '+' : ''}{nps}</div>
      <div className={`text-xs font-bold mt-1 ${color}`}>{label}</div>
    </div>
  )
}

export default function NpsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/admin/nps?months=12`, { credentials: 'include', headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">NPS</h1>
          <p className="text-gray-500 text-sm mt-1">Net Promoter Score — últimos 12 meses</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.total === 0 ? (
          <div className="text-gray-500 text-center py-16 text-sm rounded-2xl border border-gray-800">
            Nenhuma resposta de NPS ainda.<br />
            <span className="text-xs text-gray-600 mt-1 block">O modal será exibido automaticamente para clientes com mais de 30 dias de conta.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Score principal */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-6 flex flex-col items-center justify-center gap-4">
              <NpsGauge nps={data.nps} />
              <div className="text-center space-y-1">
                <div className="text-xs text-gray-500">{data.total} respostas</div>
                <div className="text-xs text-gray-500">Nota média: <span className="text-gray-300 font-bold">{data.avg_score}</span></div>
              </div>
            </div>

            {/* Breakdown promotores/detratores */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Breakdown</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-emerald-400">Promotores</div>
                    <div className="text-[10px] text-gray-600">Score 9-10</div>
                  </div>
                  <div className="text-xl font-black text-emerald-400">{data.promoters_pct}%</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-amber-400">Neutros</div>
                    <div className="text-[10px] text-gray-600">Score 7-8</div>
                  </div>
                  <div className="text-xl font-black text-amber-400">
                    {Math.round(100 - data.promoters_pct - data.detractors_pct)}%
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-red-400">Detratores</div>
                    <div className="text-[10px] text-gray-600">Score 0-6</div>
                  </div>
                  <div className="text-xl font-black text-red-400">{data.detractors_pct}%</div>
                </div>
              </div>
            </div>

            {/* Distribuição por nota */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Distribuição</h3>
              <div className="space-y-1.5">
                {[10,9,8,7,6,5,4,3,2,1,0].map(s => (
                  <ScoreBar key={s} score={s} count={data.distribution?.[s] || 0} total={data.total} />
                ))}
              </div>
            </div>

            {/* Comentários recentes */}
            {data.recent_comments?.length > 0 && (
              <div className="lg:col-span-3 rounded-2xl border border-gray-800 bg-gray-900/20 p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Comentários recentes ({data.recent_comments.length})
                </h3>
                <div className="space-y-3">
                  {data.recent_comments.map((c, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-800/30 border border-gray-800/50">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                        c.score >= 9 ? 'bg-emerald-900/50 text-emerald-400'
                        : c.score >= 7 ? 'bg-amber-900/50 text-amber-400'
                        : 'bg-red-900/50 text-red-400'
                      }`}>
                        {c.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-violet-400 font-medium mb-1">{c.tenant_name}</div>
                        <p className="text-sm text-gray-300">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
