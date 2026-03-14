'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

const ROLES = [
  { value: 'admin',  label: 'Admin',   desc: 'Acesso total exceto excluir owner' },
  { value: 'member', label: 'Membro',  desc: 'Cria e edita dashboards' },
  { value: 'viewer', label: 'Viewer',  desc: 'Apenas visualiza' },
]

function InviteModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'member' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const user = await api.users.invite(form)
      onCreated(user); onClose()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Convidar usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome</label>
            <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">E-mail</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Senha inicial</label>
            <input required type="password" minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Perfil</label>
            <div className="flex flex-col gap-2">
              {ROLES.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.role === r.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={() => setForm(f => ({ ...f, role: r.value }))} className="accent-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-400">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Criando...' : 'Criar usuário'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('jarbis_user')
    if (u) setCurrentUser(JSON.parse(u))
    api.users.list()
      .then(data => setUsers(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin'

  const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Membro', viewer: 'Viewer' }
  const ROLE_COLORS = { owner: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700', member: 'bg-green-100 text-green-700', viewer: 'bg-gray-100 text-gray-600' }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Usuários</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie os membros da sua equipe</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              + Convidar
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Perfil</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-indigo-600 font-bold text-sm">{u.full_name?.[0] || '?'}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={u => setUsers(prev => [...prev, u])} />}
    </AppLayout>
  )
}
