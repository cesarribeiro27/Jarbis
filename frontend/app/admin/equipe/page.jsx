'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const ROLES = [
  { value: 'full',       label: 'Acesso Total',  desc: 'Tudo — apenas para líderes de confiança',  color: 'text-violet-400' },
  { value: 'vendas',     label: 'Vendas',         desc: 'Tenants, planos, cupons, trials, afiliados', color: 'text-blue-400' },
  { value: 'financeiro', label: 'Financeiro',     desc: 'Faturas, receita, export CSV',               color: 'text-emerald-400' },
  { value: 'marketing',  label: 'Marketing',      desc: 'Afiliados, cupons, dashboard de aquisição',  color: 'text-amber-400' },
  { value: 'suporte',    label: 'Suporte',        desc: 'Tenants (leitura), extensão de trial',       color: 'text-gray-400' },
]

const ROLE_BADGE = {
  full:        'bg-violet-900/60 text-violet-300 border border-violet-800/40',
  vendas:      'bg-blue-900/60 text-blue-300 border border-blue-800/40',
  financeiro:  'bg-emerald-900/60 text-emerald-300 border border-emerald-800/40',
  marketing:   'bg-amber-900/60 text-amber-300 border border-amber-800/40',
  suporte:     'bg-gray-800 text-gray-400 border border-gray-700/40',
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export default function AdminEquipePage() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'suporte', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/admin/equipe`, { headers: authHeaders() })
      const data = await r.json()
      setTeam(data.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const r = await fetch(`${API_URL}/admin/equipe`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.detail || 'Erro ao adicionar.'); return }
      setSuccess(`${form.email} adicionado com sucesso.`)
      setShowForm(false)
      setForm({ email: '', role: 'suporte', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(member) {
    if (member.is_env_admin) return
    await fetch(`${API_URL}/admin/equipe/${member.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ is_active: !member.is_active }),
    })
    load()
  }

  async function changeRole(member, newRole) {
    if (member.is_env_admin) return
    await fetch(`${API_URL}/admin/equipe/${member.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ role: newRole }),
    })
    load()
  }

  async function handleRemove(member) {
    if (member.is_env_admin) return
    if (!confirm(`Remover acesso de ${member.email}?`)) return
    await fetch(`${API_URL}/admin/equipe/${member.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    load()
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Equipe</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie quem tem acesso ao painel admin e com qual nível de permissão.
            </p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Adicionar membro
          </button>
        </div>

        {/* Tabela de roles — legenda */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Níveis de acesso</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLES.map(r => (
              <div key={r.value} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50">
                <span className={`text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${ROLE_BADGE[r.value]}`}>{r.label}</span>
                <span className="text-xs text-gray-400">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário de adição */}
        {showForm && (
          <div className="bg-gray-900 border border-violet-800/30 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-4">Novo membro da equipe</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Email corporativo</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="fulano@empresa.com"
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Nível de acesso</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  >
                    {ROLES.filter(r => r.value !== 'full').map(r => (
                      <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                    ))}
                    <option value="full">Acesso Total — apenas para líderes de confiança</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Observações (opcional)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ex: Gerente de vendas — contratado em março 2026"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  {saving ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
            {success}
          </div>
        )}

        {/* Lista da equipe */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white">Membros com acesso ({team.length})</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-16 text-gray-600 text-sm">Nenhum membro cadastrado.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-6 py-3 font-medium">Email</th>
                  <th className="text-left px-6 py-3 font-medium">Role</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Observações</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {team.map((member, i) => (
                  <tr key={member.id || member.email} className={`border-b border-gray-800/50 ${!member.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white font-medium">{member.email}</div>
                      {member.is_env_admin && (
                        <div className="text-xs text-gray-600 mt-0.5">via variável de ambiente</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.is_env_admin ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${ROLE_BADGE[member.role]}`}>{member.role_label}</span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={e => changeRole(member, e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500"
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.is_env_admin ? (
                        <span className="text-xs text-emerald-400">Ativo</span>
                      ) : (
                        <button
                          onClick={() => toggleActive(member)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            member.is_active
                              ? 'bg-emerald-900/40 text-emerald-300 hover:bg-red-900/40 hover:text-red-300'
                              : 'bg-gray-800 text-gray-500 hover:bg-emerald-900/40 hover:text-emerald-300'
                          }`}
                        >
                          {member.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                      {member.notes || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!member.is_env_admin && (
                        <button
                          onClick={() => handleRemove(member)}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                          title="Remover acesso"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
