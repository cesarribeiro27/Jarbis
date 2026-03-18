'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAdminRole } from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLANS = ['free', 'solo', 'equipe', 'ilimitado', 'enterprise']
const PLAN_LABELS = { free: 'Gratuito', solo: 'Solo', equipe: 'Profissional', ilimitado: 'Equipe', enterprise: 'Enterprise', starter: 'Solo', professional: 'Profissional' }
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
  const { role } = useAdminRole()
  // Backend returns flat object: {id, name, slug, plan, is_active, ..., limits:{}, usage:{}, users:[]}
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const [newPlan, setNewPlan] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [extendDays, setExtendDays] = useState('')

  // Onboarding
  const [onboarding, setOnboarding] = useState(null)

  // NF-e
  const [nfeDocs, setNfeDocs] = useState([])
  const [nfeForm, setNfeForm] = useState({ competencia: '', valor: '', descricao: 'Assinatura Jarbis' })
  const [issuingNfe, setIssuingNfe] = useState(false)
  const [nfeMsg, setNfeMsg] = useState(null)

  // Impersonation
  const [impersonating, setImpersonating] = useState(false)

  // Notas
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Dados fiscais
  const [fiscal, setFiscal] = useState({
    cnpj: '', razao_social: '', inscricao_estadual: '',
    cep: '', logradouro: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '',
  })
  const [savingFiscal, setSavingFiscal] = useState(false)
  const [fiscalMsg, setFiscalMsg] = useState(null)

  function authHeaders() {
    const token = localStorage.getItem('jarbis_token')
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  async function loadNotes() {
    const r = await fetch(`${API_URL}/admin/tenants/${id}/notes`, { headers: authHeaders() })
    if (r.ok) setNotes(await r.json())
  }

  useEffect(() => {
    fetch(`${API_URL}/admin/tenants/${id}`, { credentials: 'include', headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setTenant(d)
        setNewPlan(d.plan)
        setIsActive(d.is_active)
        setFiscal({
          cnpj: d.cnpj || '', razao_social: d.razao_social || '',
          inscricao_estadual: d.inscricao_estadual || '',
          cep: d.cep || '', logradouro: d.logradouro || '',
          numero: d.numero || '', complemento: d.complemento || '',
          bairro: d.bairro || '', cidade: d.cidade || '', estado: d.estado || '',
        })
        setLoading(false)
      })
      .catch(e => {
        if (e === 403 || e === 401) router.replace('/admin')
        setLoading(false)
      })
    loadNotes()
    // Onboarding + NF-e em paralelo
    fetch(`${API_URL}/admin/tenants/${id}/onboarding`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null).then(d => d && setOnboarding(d)).catch(() => {})
    fetch(`${API_URL}/admin/tenants/${id}/nfe`, { credentials: 'include', headers: authHeaders() })
      .then(r => r.ok ? r.json() : []).then(d => setNfeDocs(d)).catch(() => {})
  }, [id])

  async function issueNfe(e) {
    e.preventDefault()
    setIssuingNfe(true)
    setNfeMsg(null)
    const r = await fetch(`${API_URL}/admin/tenants/${id}/nfe`, {
      method: 'POST', credentials: 'include', headers: authHeaders(),
      body: JSON.stringify({ competencia: nfeForm.competencia, valor: parseFloat(nfeForm.valor), descricao: nfeForm.descricao }),
    })
    const d = await r.json()
    setNfeMsg(d.status === 'issued' ? { type: 'ok', text: 'NF-e emitida com sucesso!' } : { type: 'err', text: d.error_message || 'Erro ao emitir NF-e' })
    if (r.ok) {
      const docs = await fetch(`${API_URL}/admin/tenants/${id}/nfe`, { credentials: 'include', headers: authHeaders() }).then(r => r.json())
      setNfeDocs(docs)
    }
    setIssuingNfe(false)
  }

  async function saveNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const r = await fetch(`${API_URL}/admin/tenants/${id}/notes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content: newNote.trim() }),
      })
      if (r.ok) {
        setNewNote('')
        loadNotes()
      }
    } finally {
      setSavingNote(false)
    }
  }

  async function deleteNote(noteId) {
    if (!confirm('Deletar esta nota?')) return
    await fetch(`${API_URL}/admin/tenants/${id}/notes/${noteId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    loadNotes()
  }

  async function saveFiscal(e) {
    e.preventDefault()
    setSavingFiscal(true)
    setFiscalMsg(null)
    const r = await fetch(`${API_URL}/admin/tenants/${id}/fiscal`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(fiscal),
    })
    if (r.ok) {
      setFiscalMsg({ type: 'ok', text: 'Dados fiscais salvos!' })
    } else {
      const d = await r.json().catch(() => ({}))
      setFiscalMsg({ type: 'err', text: d.detail || 'Erro ao salvar dados fiscais.' })
    }
    setSavingFiscal(false)
  }

  async function impersonate() {
    if (!confirm(`Entrar como cliente "${tenant.name}"? O token expira em 15 minutos.`)) return
    setImpersonating(true)
    try {
      const r = await fetch(`${API_URL}/admin/tenants/${id}/impersonate`, {
        method: 'POST', credentials: 'include', headers: authHeaders(),
      })
      if (!r.ok) { alert('Falha ao iniciar impersonação'); return }
      const d = await r.json()
      // Abre o app em nova aba com o token de impersonação
      const url = new URL(window.location.origin + '/dashboard')
      localStorage.setItem('jarbis_token_impersonation_backup', localStorage.getItem('jarbis_token') || '')
      localStorage.setItem('jarbis_token', d.token)
      localStorage.setItem('jarbis_impersonated_by', d.owner_email)
      localStorage.setItem('jarbis_impersonated_tenant', d.tenant_name)
      window.open('/dashboard', '_blank')
    } finally {
      setImpersonating(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setMsg(null)
    const body = { plan: newPlan, is_active: isActive }
    if (extendDays) body.extend_trial_days = parseInt(extendDays)
    const r = await fetch(`${API_URL}/admin/tenants/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: authHeaders(),
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
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
  }

  if (!tenant) {
    return <div className="p-8 text-gray-500">Tenant não encontrado.</div>
  }

  const { users = [], usage = {}, limits = {} } = tenant

  return (
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <Link href="/admin/tenants" className="text-gray-500 hover:text-gray-300 transition-colors pt-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">{tenant.name}</h1>
            <p className="text-gray-500 text-sm font-mono mt-0.5">{tenant.slug}</p>
          </div>
          {role === 'full' && (
            <button
              onClick={impersonate}
              disabled={impersonating}
              title="Entrar como este cliente (impersonação — 15 min)"
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 border border-amber-700/40 hover:bg-amber-600/30 text-amber-400 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {impersonating ? 'Aguarde...' : 'Entrar como cliente'}
            </button>
          )}
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
              <InfoRow label="Stripe ID" value={
                tenant.stripe_customer_id
                  ? <a href={`https://dashboard.stripe.com/customers/${tenant.stripe_customer_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 font-mono text-xs flex items-center gap-1">
                      {tenant.stripe_customer_id}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  : null
              } />
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
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-xs text-gray-600 font-medium px-5 py-2">Usuário</th>
                      <th className="text-left text-xs text-gray-600 font-medium px-5 py-2">Role</th>
                      <th className="text-left text-xs text-gray-600 font-medium px-5 py-2 hidden lg:table-cell">Último acesso</th>
                      <th className="text-right text-xs text-gray-600 font-medium px-5 py-2">Status</th>
                    </tr>
                  </thead>
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
                        <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">
                          {u.last_login_at ? fmtDate(u.last_login_at) : 'Nunca'}
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
            {/* UTM de aquisição */}
            {(tenant.utm_source || tenant.utm_medium || tenant.utm_campaign) && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Origem de Aquisição (UTM)</h2>
                <InfoRow label="utm_source" value={tenant.utm_source} />
                <InfoRow label="utm_medium" value={tenant.utm_medium} />
                <InfoRow label="utm_campaign" value={tenant.utm_campaign} />
                <InfoRow label="utm_term" value={tenant.utm_term} />
                <InfoRow label="utm_content" value={tenant.utm_content} />
              </div>
            )}

            {/* Dados fiscais */}
            {['full', 'financeiro', 'vendas'].includes(role) && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-400">Dados Fiscais (NF-e)</h2>
                </div>
                <form onSubmit={saveFiscal} className="p-5 grid grid-cols-2 gap-3">
                  {[
                    { key: 'cnpj', label: 'CNPJ', placeholder: 'XX.XXX.XXX/XXXX-XX' },
                    { key: 'razao_social', label: 'Razão Social', placeholder: 'Empresa LTDA', span: 2 },
                    { key: 'inscricao_estadual', label: 'Insc. Estadual', placeholder: 'ISENTO ou número' },
                    { key: 'cep', label: 'CEP', placeholder: '00000-000' },
                    { key: 'logradouro', label: 'Logradouro', placeholder: 'Rua / Av.', span: 2 },
                    { key: 'numero', label: 'Número', placeholder: '100' },
                    { key: 'complemento', label: 'Complemento', placeholder: 'Sala 5' },
                    { key: 'bairro', label: 'Bairro', placeholder: 'Centro' },
                    { key: 'cidade', label: 'Cidade', placeholder: 'São Paulo' },
                    { key: 'estado', label: 'UF', placeholder: 'SP' },
                  ].map(f => (
                    <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                      <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                      <input
                        value={fiscal[f.key]}
                        onChange={e => setFiscal(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-gray-600"
                      />
                    </div>
                  ))}
                  {fiscalMsg && (
                    <div className={`col-span-2 text-xs px-3 py-2 rounded-lg ${fiscalMsg.type === 'ok' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                      {fiscalMsg.text}
                    </div>
                  )}
                  <div className="col-span-2">
                    <button type="submit" disabled={savingFiscal}
                      className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition-colors">
                      {savingFiscal ? 'Salvando...' : 'Salvar dados fiscais'}
                    </button>
                  </div>
                </form>
              </div>
            )}

          {/* ── Onboarding ───────────────────────────────────────── */}
          {onboarding && (
            <div className="rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Onboarding</h2>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${onboarding.percent === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                      style={{ width: `${onboarding.percent}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${onboarding.percent === 100 ? 'text-emerald-400' : 'text-violet-400'}`}>
                    {onboarding.percent}%
                  </span>
                </div>
              </div>
              <div className="px-5 py-3 grid grid-cols-2 gap-2">
                {onboarding.steps.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className={s.done ? 'text-emerald-400' : 'text-gray-600'}>{s.done ? '✓' : '○'}</span>
                    <span className={s.done ? 'text-gray-300' : 'text-gray-600'}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── NF-e ─────────────────────────────────────────────── */}
          {(role === 'full' || role === 'financeiro') && (
            <div className="rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-white">NF-e de Serviço</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <form onSubmit={issueNfe} className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Competência</label>
                    <input type="month" required value={nfeForm.competencia}
                      onChange={e => setNfeForm(f => ({ ...f, competencia: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-600" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" min="0" required value={nfeForm.valor}
                      onChange={e => setNfeForm(f => ({ ...f, valor: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-600" />
                  </div>
                  <button type="submit" disabled={issuingNfe}
                    className="py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                    {issuingNfe ? 'Emitindo...' : 'Emitir NF-e'}
                  </button>
                </form>
                {nfeMsg && (
                  <p className={`text-xs px-3 py-2 rounded-lg ${nfeMsg.type === 'ok' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40' : 'bg-red-900/30 text-red-400 border border-red-800/40'}`}>
                    {nfeMsg.text}
                  </p>
                )}
                {nfeDocs.length > 0 && (
                  <div className="space-y-2">
                    {nfeDocs.map(d => (
                      <div key={d.id} className="flex items-center gap-3 text-xs py-2 border-t border-gray-800/50">
                        <span className="text-gray-400 font-mono">{d.competencia}</span>
                        <span className="text-white font-medium">R$ {Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.status === 'issued' ? 'bg-emerald-900/40 text-emerald-300' : d.status === 'error' ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                          {d.status}
                        </span>
                        {d.pdf_url && <a href={d.pdf_url} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 ml-auto">PDF →</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

            {/* Notas internas */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400">Notas internas ({notes.length})</h2>
                <span className="text-xs text-gray-600">Visível apenas para a equipe admin</span>
              </div>

              {/* Formulário de nova nota */}
              <form onSubmit={saveNote} className="px-5 py-4 border-b border-gray-800/50">
                <div className="flex gap-3">
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Adicionar nota... Ex: cliente pediu desconto, negociado upgrade manual, problema técnico relatado..."
                    rows={2}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
                  />
                  <button
                    type="submit"
                    disabled={savingNote || !newNote.trim()}
                    className="self-end bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    {savingNote ? '...' : 'Adicionar'}
                  </button>
                </div>
              </form>

              {/* Lista de notas */}
              {notes.length === 0 ? (
                <div className="text-gray-600 text-xs text-center py-6">Nenhuma nota ainda.</div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {notes.map(note => (
                    <div key={note.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                          <span>{note.admin_email}</span>
                          <span>·</span>
                          <span>{new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-gray-700 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
                        title="Deletar nota"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}
