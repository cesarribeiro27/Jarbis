'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'
const FRONTEND_URL = 'https://jarbis.cc'

const PLAN_LABELS = { free: 'Free', solo: 'Solo', equipe: 'Equipe', ilimitado: 'Ilimitado', enterprise: 'Enterprise' }
const PLAN_COLORS = {
  free: 'bg-gray-700/60 text-gray-300',
  solo: 'bg-blue-900/50 text-blue-300',
  equipe: 'bg-violet-900/50 text-violet-300',
  ilimitado: 'bg-emerald-900/50 text-emerald-300',
  enterprise: 'bg-amber-900/50 text-amber-300',
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminAfiliadoDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [copied, setCopied] = useState(false)

  // Edit state
  const [form, setForm] = useState({})

  useEffect(() => {
    // Backend returns flat object: {id, name, email, code, commission_percent, is_active, notes,
    //   referral_link, referrals: [{tenant_id, name, plan, plan_name, ...}], total_commission_estimated, created_at}
    fetch(`${API_URL}/admin/affiliates/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setData(d)
        setForm({
          name: d.name,
          email: d.email,
          commission_percent: parseFloat(d.commission_percent || 0),
          notes: d.notes || '',
          is_active: d.is_active,
        })
        setLoading(false)
      })
      .catch(e => {
        if (e === 403 || e === 401) router.replace('/admin')
        setLoading(false)
      })
  }, [id])

  const referralLink = data?.referral_link || (data ? `${FRONTEND_URL}/signup?ref=${data.code}` : '')

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const save = async () => {
    setSaving(true)
    setMsg(null)
    const r = await fetch(`${API_URL}/admin/affiliates/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) {
      setData(prev => ({ ...prev, ...form }))
      setMsg({ type: 'ok', text: 'Salvo com sucesso!' })
      setEditing(false)
    } else {
      const d = await r.json().catch(() => ({}))
      setMsg({ type: 'err', text: d.detail || 'Erro ao salvar.' })
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

  if (!data) {
    return (
      <AdminLayout>
        <div className="p-8 text-gray-500">Afiliado não encontrado.</div>
      </AdminLayout>
    )
  }

  // data is the affiliate itself (flat) with referrals array embedded
  const affiliate = data
  const referrals = data.referrals || []
  const total_commission = data.total_commission_estimated

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <Link href="/admin/afiliados" className="text-gray-500 hover:text-gray-300 transition-colors pt-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{data.name}</h1>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${data.is_active ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                {data.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{data.email}</p>
          </div>
          <button
            onClick={() => { setEditing(v => !v); setMsg(null) }}
            className="text-sm text-violet-400 hover:text-violet-300 border border-violet-800/50 px-3 py-1.5 rounded-xl transition-colors"
          >
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info / Edit */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
              <h2 className="text-sm font-semibold text-gray-400 mb-4">Dados do afiliado</h2>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-600" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-600" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Comissão (%)</label>
                    <input type="number" min="0" max="100" step="0.5"
                      value={form.commission_percent}
                      onChange={e => setForm(f => ({ ...f, commission_percent: parseFloat(e.target.value) || 0 }))}
                      className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-600" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                    <textarea value={form.notes} rows={3}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-violet-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Ativo</span>
                    <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {msg && (
                    <p className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                      {msg.text}
                    </p>
                  )}
                  <button onClick={save} disabled={saving}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Código</div>
                    <div className="font-mono font-bold text-violet-400 text-lg">{data.code}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Comissão</div>
                    <div className="text-white font-semibold">{parseFloat(data.commission_percent || 0).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Comissão total estimada</div>
                    <div className="text-emerald-400 font-semibold">
                      {(total_commission ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                  {data.notes && (
                    <div>
                      <div className="text-xs text-gray-600 mb-0.5">Notas</div>
                      <div className="text-gray-400 text-xs">{data.notes}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-600 mb-0.5">Cadastrado em</div>
                    <div className="text-gray-400">{fmtDate(data.created_at)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Referral link */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Link de indicação</h2>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-violet-400 break-all mb-3">
                {referralLink}
              </div>
              <button
                onClick={copyLink}
                className="w-full text-sm border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 py-2 rounded-xl transition-colors"
              >
                {copied ? '✓ Copiado!' : 'Copiar link'}
              </button>
            </div>
          </div>

          {/* Right — referrals */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400">
                  Tenants indicados ({referrals?.length ?? 0})
                </h2>
              </div>

              {!referrals?.length ? (
                <div className="text-gray-500 text-sm text-center py-12">
                  Nenhum tenant indicado ainda.
                  <p className="text-xs mt-1 text-gray-600">Compartilhe o link de indicação para começar.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900/30">
                      <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Tenant</th>
                      <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Plano</th>
                      <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((t, i) => (
                      <tr key={t.tenant_id || i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20">
                        <td className="px-5 py-3">
                          {t.tenant_id ? (
                            <Link href={`/admin/tenants/${t.tenant_id}`} className="text-sm font-medium text-violet-400 hover:text-violet-300">
                              {t.name}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-gray-300">{t.name}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${PLAN_COLORS[t.plan] || 'bg-gray-700 text-gray-300'}`}>
                            {PLAN_LABELS[t.plan] || t.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{fmtDate(t.created_at)}</td>
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
