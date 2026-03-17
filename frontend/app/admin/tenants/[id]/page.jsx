'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLANS = ['free', 'solo', 'equipe', 'ilimitado', 'enterprise']
const PLAN_LABELS = { free: 'Free', solo: 'Solo', equipe: 'Equipe', ilimitado: 'Ilimitado', enterprise: 'Enterprise' }
const ROLE_COLORS = {
  owner: 'bg-violet-900/50 text-violet-300',
  admin: 'bg-blue-900/50 text-blue-300',
  member: 'bg-gray-700/50 text-gray-300',
  viewer: 'bg-gray-800 text-gray-500',
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-gray-800/50 last:border-0">
      <span className="text-xs text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-200 break-all">{value ?? '—'}</span>
    </div>
  )
}

function UsageBar({ label, used, limit }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-violet-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{used} / {limit ?? '∞'}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AdminTenantDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  // Backend returns flat object: {id, name, slug, plan, is_active, ..., limits:{}, usage:{}, users:[]}
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const [newPlan, setNewPlan] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [extendDays, setExtendDays] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/admin/tenants/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setTenant(d)
        setNewPlan(d.plan)
        setIsActive(d.is_active)
        setLoading(false)
      })
      .catch(e => {
        if (e === 403 || e === 401) router.replace('/admin')
        setLoading(false)
      })
  }, [id])

  const save = async () => {
    setSaving(true)
    setMsg(null)
    const body = { plan: newPlan, is_active: isActive }
    if (extendDays) body.extend_trial_days = parseInt(extendDays)
    const r = await fetch(`${API_URL}/admin/tenants/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      setTenant(prev => ({ ...prev, plan: newPlan, is_active: isActive }))
      setMsg({ type: 'ok', text: 'Salvo com sucesso!' })
      setExtendDays('')
    } else {
      setMsg({ type: 'err', text: 'Erro ao salvar.' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (!tenant) {
    return <AdminLayout><div className="p-8 text-gray-500">Tenant não encontrado.</div></AdminLayout>
  }

  const { users = [], usage = {}, limits = {} } = tenant

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <Link href="/admin/tenants" className="text-gray-500 hover:text-gray-300 transition-colors pt-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">{tenant.name}</h1>
            <p className="text-gray-500 text-sm font-mono mt-0.5">{tenant.slug}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Informações</h2>
              <InfoRow label="ID" value={<span className="font-mono text-xs">{tenant.id}</span>} />
              <InfoRow label="Plano atual" value={PLAN_LABELS[tenant.plan] || tenant.plan} />
              <InfoRow label="Status" value={tenant.is_active ? 'Ativo' : 'Inativo'} />
              <InfoRow label="Trial até" value={fmtDate(tenant.trial_ends_at)} />
              <InfoRow label="Trial restante" value={tenant.trial_days_remaining != null ? `${tenant.trial_days_remaining} dias` : null} />
              <InfoRow label="Stripe ID" value={tenant.stripe_customer_id} />
              <InfoRow label="Afiliado" value={tenant.affiliate_code} />
              <InfoRow label="Addon packs" value={tenant.addon_packs != null ? String(tenant.addon_packs) : null} />
              <InfoRow label="Criado em" value={fmtDate(tenant.created_at)} />
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
              <h2 className="text-sm font-semibold text-gray-400 mb-4">Ações</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Plano</label>
                  <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-600">
                    {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Estender trial (dias)</label>
                  <input type="number" min="1" max="365" placeholder="Ex: 14"
                    value={extendDays} onChange={e => setExtendDays(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Conta ativa</span>
                  <button onClick={() => setIsActive(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                {msg && (
                  <p className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                    {msg.text}
                  </p>
                )}
                <button onClick={save} disabled={saving}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage */}
            {Object.keys(usage).length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
                <h2 className="text-sm font-semibold text-gray-400 mb-4">Uso atual</h2>
                <div className="space-y-4">
                  <UsageBar label="Dashboards" used={usage.dashboards ?? 0} limit={limits.max_reports} />
                  <UsageBar label="Datasets" used={usage.datasets ?? 0} limit={limits.max_datasets} />
                  <UsageBar label="Usuários" used={users.length} limit={limits.max_users} />
                  <UsageBar label="Alertas" used={usage.alerts ?? 0} limit={limits.max_alerts} />
                </div>
              </div>
            )}

            {/* Users */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-400">Usuários do tenant ({users.length})</h2>
              </div>
              {!users.length ? (
                <div className="text-gray-500 text-sm text-center py-8">Nenhum usuário.</div>
              ) : (
                <table className="w-full">
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20">
                        <td className="px-5 py-3">
                          <div className="text-sm text-gray-200">{u.full_name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${ROLE_COLORS[u.role] || 'bg-gray-700 text-gray-300'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs ${u.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                            {u.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
