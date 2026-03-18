'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations } from 'next-intl'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function authHeaders() {
  const t = localStorage.getItem('jarbis_token')
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

const ROLES = [
  { value: 'admin',  label: 'Admin',        desc: 'Gerencia usuários e configurações' },
  { value: 'member', label: 'Membro',       desc: 'Cria e edita dashboards' },
  { value: 'viewer', label: 'Visualizador', desc: 'Somente visualização' },
]

const ROLE_RANK = { owner: 3, admin: 2, member: 1, viewer: 0 }

const ROLE_COLORS = {
  owner:  'bg-violet-100 text-violet-700',
  admin:  'bg-blue-100 text-blue-700',
  member: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-gray-100 text-gray-600',
}

function InviteModal({ onClose, onCreated }) {
  const t = useTranslations('usuarios')
  const toast = useToast()
  const [mode, setMode] = useState('email') // 'email' | 'manual'
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'member' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'email') {
        const res = await fetch(`${API_URL}/auth/users/invite-email`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ full_name: form.full_name, email: form.email, role: form.role }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail || 'Erro ao enviar convite')
        }
        const user = await res.json()
        onCreated(user)
        onClose()
        toast(`Convite enviado para ${form.email}!`, 'success')
      } else {
        const user = await api.users.invite(form)
        onCreated(user)
        onClose()
        toast(t('modal.successToast', { name: user.full_name }), 'success')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-200">{t('modal.title')}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {mode === 'email' ? 'O usuário receberá um link para definir a própria senha' : t('modal.subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.nameLabel')}</label>
              <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.emailLabel')}</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>

          {mode === 'manual' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.passwordLabel')}</label>
              <input required type="password" minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder={t('modal.passwordPlaceholder')} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.roleLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <label key={r.value} className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-colors ${form.role === r.value ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={() => setForm(f => ({ ...f, role: r.value }))} className="hidden" />
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{r.label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{r.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">{error}</div>}

          <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading
              ? (mode === 'email' ? 'Enviando convite...' : t('modal.creating'))
              : (mode === 'email' ? 'Enviar convite por email' : t('modal.createBtn'))
            }
          </button>

          <p className="text-center text-xs text-gray-400">
            {mode === 'email' ? (
              <>
                Prefere definir a senha agora?{' '}
                <button type="button" onClick={() => { setMode('manual'); setError(null) }} className="text-violet-600 hover:underline font-medium">
                  Definir senha manualmente
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setMode('email'); setError(null) }} className="text-violet-600 hover:underline font-medium">
                  Enviar convite por email
                </button>
                {' '}(recomendado)
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const t = useTranslations('usuarios')
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [editRoleId, setEditRoleId] = useState(null)
  const [resendingId, setResendingId] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('jarbis_user')
    if (u) setCurrentUser(JSON.parse(u))
    api.users.list()
      .then(data => setUsers(data || []))
      .catch(() => toast(t('toast.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin'
  const currentRank = ROLE_RANK[currentUser?.role] ?? 0

  async function handleToggleActive(u) {
    setUpdatingId(u.id)
    try {
      const updated = await api.users.update(u.id, { is_active: !u.is_active })
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x))
      toast(t(updated.is_active ? 'toast.activated' : 'toast.deactivated', { name: updated.full_name }), 'success')
    } catch (err) {
      toast(err.message || t('toast.toggleError'), 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleChangeRole(u, role) {
    setUpdatingId(u.id)
    setEditRoleId(null)
    try {
      const updated = await api.users.update(u.id, { role })
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x))
      toast(t('toast.roleChanged', { name: updated.full_name, role: t(`roles.${role}`) }), 'success')
    } catch (err) {
      toast(err.message || t('toast.roleError'), 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleResendInvite(u) {
    setResendingId(u.id)
    try {
      const res = await fetch(`${API_URL}/auth/users/${u.id}/resend-invite`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Erro ao reenviar convite')
      }
      toast(`Convite reenviado para ${u.email}!`, 'success')
    } catch (err) {
      toast(err.message || 'Erro ao reenviar convite', 'error')
    } finally {
      setResendingId(null)
    }
  }

  const canManage = (target) => {
    if (currentUser?.id === target.id) return false
    const targetRank = ROLE_RANK[target.role] ?? 0
    return currentRank >= 2 && currentRank > targetRank
  }

  function formatLastLogin(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return null
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {users.length > 0
                ? t('activeCount', { active: users.filter(u => u.is_active).length, total: users.length })
                : t('manageTeam')}
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              {t('inviteBtn')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {[1,2,3].map(i => <div key={i} className="h-16 border-b border-gray-50 dark:border-gray-700 animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('noUsers')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
            {users.map(u => {
              const isSelf = u.id === currentUser?.id
              const manageable = canManage(u)
              const isUpdating = updatingId === u.id
              const isResending = resendingId === u.id
              const isPending = u.is_active === false
              const wasActive = isPending && u.last_login_at != null

              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-700/50">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPending ? 'bg-amber-100' : 'bg-violet-100'}`}>
                    <span className={`font-bold text-sm ${isPending ? 'text-amber-600' : 'text-violet-700'}`}>
                      {u.full_name ? u.full_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{u.full_name}</p>
                      {isSelf && <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">{t('you')}</span>}
                      {isPending && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          Convite pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    {u.last_login_at && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Último acesso: {formatLastLogin(u.last_login_at)}
                      </p>
                    )}
                  </div>

                  {/* Role — clicável se pode gerenciar */}
                  <div className="relative shrink-0">
                    {manageable ? (
                      <>
                        <button
                          onClick={() => setEditRoleId(editRoleId === u.id ? null : u.id)}
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all hover:ring-2 hover:ring-violet-300 hover:ring-offset-1 ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}
                          title="Clique para alterar perfil"
                        >
                          {t(`roles.${u.role}`, { defaultValue: u.role })} ▾
                        </button>
                        {editRoleId === u.id && (
                          <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 w-40">
                            {ROLES.filter(r => ROLE_RANK[r.value] < currentRank).map(r => (
                              <button
                                key={r.value}
                                onClick={() => handleChangeRole(u, r.value)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${u.role === r.value ? 'font-bold text-violet-700 dark:text-violet-400' : 'text-gray-700 dark:text-gray-200'}`}
                              >
                                {u.role === r.value && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                                {r.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {t(`roles.${u.role}`, { defaultValue: u.role })}
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    ) : wasActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Inativo
                      </span>
                    ) : null}
                  </div>

                  {/* Ações */}
                  {manageable && (
                    <div className="shrink-0 flex items-center gap-1">
                      {isPending ? (
                        /* Botão Reenviar convite */
                        <button
                          onClick={() => handleResendInvite(u)}
                          disabled={isResending}
                          title="Reenviar convite por email"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isResending ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          )}
                          Reenviar convite
                        </button>
                      ) : (
                        /* Botão Desativar/Reativar para usuários ativos */
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isUpdating}
                          title={u.is_active ? 'Desativar acesso' : 'Reativar acesso'}
                          className={`group shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                            u.is_active
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {isUpdating ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          ) : u.is_active ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              <span className="text-xs font-semibold hidden group-hover:inline">Desativar</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <span className="text-xs font-semibold hidden group-hover:inline">Reativar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          {t('footerHint')}
        </p>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={u => setUsers(prev => [...prev, u])} />}
    </AppLayout>
  )
}
