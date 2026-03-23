'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const STAGES = [
  { id: 'novo',          label: 'Novos',           color: 'border-gray-700 bg-gray-900/40',         badge: 'bg-gray-700 text-gray-300' },
  { id: 'contato',       label: 'Em Contato',       color: 'border-blue-800/50 bg-blue-900/10',      badge: 'bg-blue-900/60 text-blue-300' },
  { id: 'demo_agendada', label: 'Demo Agendada',    color: 'border-violet-800/50 bg-violet-900/10',  badge: 'bg-violet-900/60 text-violet-300' },
  { id: 'proposta',      label: 'Proposta',         color: 'border-amber-800/50 bg-amber-900/10',    badge: 'bg-amber-900/60 text-amber-300' },
  { id: 'cliente',       label: 'Cliente',          color: 'border-emerald-800/50 bg-emerald-900/10', badge: 'bg-emerald-900/60 text-emerald-300' },
  { id: 'perdido',       label: 'Perdido',          color: 'border-red-800/50 bg-red-900/10',        badge: 'bg-red-900/60 text-red-400' },
]

const PLAN_LABELS = {
  free: 'Free', starter: 'Solo', solo: 'Solo',
  professional: 'Pro', equipe: 'Pro', ilimitado: 'Equipe', enterprise: 'Enterprise',
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_admin_token') : null
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export default function AdminCrmPage() {
  const [board, setBoard] = useState({})
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(null) // tenant id being moved
  const [total, setTotal] = useState(0)

  async function load() {
    setLoading(true)
    const r = await fetch(`${API_URL}/admin/crm`, { credentials: 'include', headers: authHeaders() })
    const d = await r.json()
    setBoard(d.board || {})
    setTotal(d.total || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function moveStage(tenantId, newStage) {
    setMoving(tenantId)
    await fetch(`${API_URL}/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ crm_stage: newStage }),
    })
    await load()
    setMoving(null)
  }

  return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">CRM</h1>
            <p className="text-gray-500 text-sm mt-1">{total} tenants no pipeline</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(stage => {
              const cards = board[stage.id] || []
              return (
                <div key={stage.id} className="flex-shrink-0 w-64">
                  {/* Column header */}
                  <div className={`rounded-xl border px-3 py-2.5 mb-3 flex items-center justify-between ${stage.color}`}>
                    <span className="text-sm font-semibold text-white">{stage.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
                      {cards.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {cards.map(t => (
                      <div
                        key={t.id}
                        className={`rounded-xl border border-gray-800 bg-gray-900/50 p-3 hover:bg-gray-800/60 transition-colors ${moving === t.id ? 'opacity-50' : ''}`}
                      >
                        <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-white hover:text-violet-400 transition-colors block mb-1">
                          {t.name}
                        </Link>
                        <div className="text-xs text-gray-500 truncate mb-2">{t.owner_email}</div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                            {PLAN_LABELS[t.plan] || t.plan}
                          </span>
                          {t.subscription_status === 'trial' && t.trial_days_remaining != null && (
                            <span className="text-[10px] text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded">
                              {t.trial_days_remaining}d trial
                            </span>
                          )}
                        </div>

                        {/* Mover estágio */}
                        <select
                          value={stage.id}
                          disabled={moving === t.id}
                          onChange={e => moveStage(t.id, e.target.value)}
                          className="w-full text-[10px] bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-400 focus:outline-none focus:border-violet-600 disabled:opacity-50"
                        >
                          {STAGES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}

                    {cards.length === 0 && (
                      <div className="rounded-xl border border-dashed border-gray-800 p-4 text-center text-xs text-gray-700">
                        Nenhum
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
  )
}
