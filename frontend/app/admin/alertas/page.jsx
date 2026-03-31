'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function AlertCard({ icon, title, color, children, count }) {
  const colors = {
    red:    { border: 'border-red-800/40',    bg: 'bg-red-900/10',    icon: 'text-red-400',    badge: 'bg-red-500' },
    amber:  { border: 'border-amber-800/40',  bg: 'bg-amber-900/10',  icon: 'text-amber-400',  badge: 'bg-amber-500' },
    blue:   { border: 'border-blue-800/40',   bg: 'bg-blue-900/10',   icon: 'text-blue-400',   badge: 'bg-blue-500' },
  }
  const c = colors[color] || colors.amber
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-lg ${c.icon}`}>{icon}</span>
        <h3 className="text-sm font-semibold text-white flex-1">{title}</h3>
        {count > 0 && (
          <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${c.badge}`}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function AdminAlertasPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' }
    return h
  }

  useEffect(() => {
    fetch(`${API_URL}/admin/alerts`, { credentials: 'include', headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const trialExpiring   = data?.trial_expiring || []
  const pastDueCritical = data?.past_due_critical || []
  const inactiveNew     = data?.inactive_new || []
  const total           = data?.total ?? 0

  return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Alertas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total > 0 ? `${total} alerta${total > 1 ? 's' : ''} requer${total === 1 ? ' atenção' : 'em atenção'}` : 'Tudo certo — nenhum alerta ativo'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-emerald-400 font-semibold">Nenhum alerta ativo</p>
            <p className="text-gray-500 text-sm mt-1">Todos os tenants estão em boa situação.</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Trial expirando */}
            {trialExpiring.length > 0 && (
              <AlertCard icon="⏰" title="Trial expirando em ≤ 3 dias" color="amber" count={trialExpiring.length}>
                <div className="space-y-2">
                  {trialExpiring.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-t border-amber-900/30">
                      <div className="flex-1">
                        <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-white hover:text-amber-400 transition-colors">
                          {t.name}
                        </Link>
                        <div className="text-xs text-gray-500">{t.owner_email}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${t.days_remaining === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                          {t.days_remaining === 0 ? 'Hoje!' : `${t.days_remaining}d`}
                        </div>
                        <div className="text-[10px] text-gray-600">{fmtDate(t.trial_ends_at)}</div>
                      </div>
                      <Link href={`/admin/tenants/${t.id}`} className="text-xs text-violet-400 hover:text-violet-300 ml-2">Ver →</Link>
                    </div>
                  ))}
                </div>
              </AlertCard>
            )}

            {/* Past due crítico */}
            {pastDueCritical.length > 0 && (
              <AlertCard icon="💳" title="Pagamento pendente (past_due)" color="red" count={pastDueCritical.length}>
                <div className="space-y-2">
                  {pastDueCritical.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-t border-red-900/30">
                      <div className="flex-1">
                        <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-white hover:text-red-400 transition-colors">
                          {t.name}
                        </Link>
                        <div className="text-xs text-gray-500">{t.owner_email}</div>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{t.plan}</span>
                      <Link href={`/admin/tenants/${t.id}`} className="text-xs text-violet-400 hover:text-violet-300 ml-2">Ver →</Link>
                    </div>
                  ))}
                </div>
              </AlertCard>
            )}

            {/* Novos inativos */}
            {inactiveNew.length > 0 && (
              <AlertCard icon="😴" title="Novos clientes sem login recente" color="blue" count={inactiveNew.length}>
                <p className="text-xs text-gray-500 mb-3">Cadastrados há menos de 30 dias, sem login nos últimos 7 dias.</p>
                <div className="space-y-2">
                  {inactiveNew.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-t border-blue-900/30">
                      <div className="flex-1">
                        <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                          {t.name}
                        </Link>
                        <div className="text-xs text-gray-500">{t.owner_email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">{t.days_since_signup}d</div>
                        <div className="text-[10px] text-gray-600">último: {fmtDate(t.last_login_at)}</div>
                      </div>
                      <Link href={`/admin/tenants/${t.id}`} className="text-xs text-violet-400 hover:text-violet-300 ml-2">Ver →</Link>
                    </div>
                  ))}
                </div>
              </AlertCard>
            )}

          </div>
        )}
      </div>
  )
}
