'use client'

import { useState, useEffect } from 'react'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_admin_token') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function KPICard({ label, value, sub, color = '#6D28D9' }) {
  return (
    <div className="bg-[#141424] rounded-2xl p-5 border border-white/5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function BarRow({ label, count, max, color = '#7C3AED' }) {
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 2
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-300 w-36 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-gray-400 w-8 text-right shrink-0">{count}</span>
    </div>
  )
}

export default function AdminMarketingPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/admin/marketing`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.detail) throw new Error(d.detail)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const funil = data?.funil || {}
  const aquisicao = data?.aquisicao || {}
  const coupons = data?.cupons || []

  const maxSource = Math.max(...(aquisicao.by_source || []).map(s => s.count), 1)
  const maxAffiliate = Math.max(...(aquisicao.by_affiliate || []).map(a => a.count), 1)

  return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Marketing</h1>
          <p className="text-gray-500 text-sm mt-1">Aquisição de clientes, canais e conversão</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm">Carregando...</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard
                label="Total de contas"
                value={funil.total_tenants ?? '—'}
                color="#a78bfa"
              />
              <KPICard
                label="Em trial (histórico)"
                value={funil.total_trial ?? '—'}
                color="#60a5fa"
              />
              <KPICard
                label="Contas pagas"
                value={funil.total_paid ?? '—'}
                color="#34d399"
              />
              <KPICard
                label="Conversão trial → pago"
                value={`${funil.conversion_trial_to_paid ?? 0}%`}
                sub="percentual das contas em trial que pagaram"
                color="#f59e0b"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Canais de aquisição */}
              <div className="bg-[#141424] rounded-2xl p-6 border border-white/5">
                <h2 className="text-sm font-semibold text-white mb-1">Canais de Aquisição</h2>
                <p className="text-xs text-gray-500 mb-4">Origem do cadastro (utm_source)</p>
                {(aquisicao.by_source || []).length === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhum UTM capturado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {(aquisicao.by_source || []).map(s => (
                      <BarRow key={s.source} label={s.source} count={s.count} max={maxSource} color="#7C3AED" />
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-white/5 flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Orgânico/direto</span>
                    <span className="text-white font-bold ml-2">{aquisicao.organic ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Via afiliado</span>
                    <span className="text-white font-bold ml-2">{aquisicao.via_affiliate ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Afiliados com mais indicações */}
              <div className="bg-[#141424] rounded-2xl p-6 border border-white/5">
                <h2 className="text-sm font-semibold text-white mb-1">Top Afiliados</h2>
                <p className="text-xs text-gray-500 mb-4">Códigos com mais indicações</p>
                {(aquisicao.by_affiliate || []).length === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhuma indicação registrada ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {(aquisicao.by_affiliate || []).map(a => (
                      <BarRow key={a.code} label={a.code} count={a.count} max={maxAffiliate} color="#10b981" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Funil visual */}
            <div className="bg-[#141424] rounded-2xl p-6 border border-white/5 mb-6">
              <h2 className="text-sm font-semibold text-white mb-4">Funil de Conversão</h2>
              <div className="flex items-end gap-4 h-32">
                {[
                  { label: 'Cadastros', value: funil.total_tenants, color: '#7C3AED' },
                  { label: 'Em trial', value: funil.total_trial, color: '#3B82F6' },
                  { label: 'Pagantes', value: funil.total_paid, color: '#10b981' },
                ].map(step => {
                  const max = funil.total_tenants || 1
                  const pct = Math.max(8, Math.round(((step.value || 0) / max) * 100))
                  return (
                    <div key={step.label} className="flex flex-col items-center gap-2 flex-1">
                      <span className="text-xs text-gray-400">{step.value ?? '—'}</span>
                      <div className="w-full rounded-t-lg transition-all" style={{ height: `${pct}%`, background: step.color, opacity: 0.8 }} />
                      <span className="text-xs text-gray-500">{step.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cupons mais usados */}
            <div className="bg-[#141424] rounded-2xl p-6 border border-white/5">
              <h2 className="text-sm font-semibold text-white mb-1">Cupons Mais Usados</h2>
              <p className="text-xs text-gray-500 mb-4">Top cupons por número de utilizações</p>
              {coupons.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum cupom utilizado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-white/5">
                        <th className="pb-2 font-medium">Código</th>
                        <th className="pb-2 font-medium">Desconto</th>
                        <th className="pb-2 font-medium text-right">Usos</th>
                        <th className="pb-2 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(c => (
                        <tr key={c.code} className="border-b border-white/5 last:border-0">
                          <td className="py-3 font-mono font-bold text-violet-300">{c.code}</td>
                          <td className="py-3 text-gray-300">{c.discount_label}</td>
                          <td className="py-3 text-right text-white font-bold">{c.used_count}</td>
                          <td className="py-3 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-900/40 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>
                              {c.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
  )
}
