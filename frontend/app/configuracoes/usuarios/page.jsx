'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations } from 'next-intl'

const ROLE_COLORS = {
  owner:  'bg-violet-100 text-violet-700',
  admin:  'bg-blue-100 text-blue-700',
  member: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-gray-100 text-gray-600',
}

function InviteModal({ onClose, onCreated }) {
  const t = useTranslations('usuarios')
  const toast = useToast()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'member' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const ROLES = [
    { value: 'admin',  label: t('roles.admin'),  desc: t('roleDescs.admin') },
    { value: 'member', label: t('roles.member'), desc: t('roleDescs.member') },
    { value: 'viewer', label: t('roles.viewer'), desc: t('roleDescs.viewer') },
  ]

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const user = await api.users.invite(form)
      onCreated(user)
      onClose()
      toast(t('modal.successToast', { name: user.full_name }), 'success')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-200">{t('modal.title')}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('modal.subtitle')}</p>
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('modal.passwordLabel')}</label>
            <input required type="password" minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder={t('modal.passwordPlaceholder')} />
          </div>
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
            {loading ? t('modal.creating') : t('modal.createBtn')}
          </button>
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

  useEffect(() => {
    const u = localStorage.getItem('jarbis_user')
    if (u) setCurrentUser(JSON.parse(u))
    api.users.list()
      .then(data => setUsers(data || []))
      .catch(() => toast(t('toast.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin'
  const currentRank = { owner: 3, admin: 2, member: 1, viewer: 0 }[currentUser?.role] ?? 0

  async function handleToggleActive(u) {
    setUpdatingId(u.id)
    try {
      const updated = await api.users.update(u.id, { is_active: !u.is_active })
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x))
      toast(t(updated.is_active ? 'toast.activated' : 'toast.deactivated', { name: updated.full_name }), 'success')
    } catch (err) {
      toast(err.message || t('toast.toggleError'), 'error')
    } finally { setUpdatingId(null) }
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
    } finally { setUpdatingId(null) }
  }

  const canManage = (target) => {
    if (currentUser?.id === target.id) return false
    const targetRank = { owner: 3, admin: 2, member: 1, viewer: 0 }[target.role] ?? 0
    return currentRank >= 2 && currentRank > targetRank
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

              return (
                <div key={u.id} className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-700/50 ${!u.is_active ? 'opacity-50' : ''}`}>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-violet-700 font-bold text-sm">
                      {u.full_name ? u.full_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{u.full_name}</p>
                      {isSelf && <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">{t('you')}</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
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
                            {ROLES.filter(r => ({ owner: 3, admin: 2, member: 1, viewer: 0 }[r.value] < currentRank).map(() => true) ? true : false).map(r => (
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

                  {/* Status */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-400">{u.is_active ? t('statusActive') : t('statusInactive')}</span>
                  </div>

                  {/* Ações */}
                  {manageable && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={isUpdating}
                      title={u.is_active ? t('statusInactive') : t('statusActive')}
                      className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                        u.is_active
                          ? 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                          : 'text-gray-300 hover:text-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      {isUpdating ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      ) : u.is_active ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </button>
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
