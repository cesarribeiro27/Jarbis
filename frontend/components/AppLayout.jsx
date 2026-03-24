'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { LogoA, LogoWithText } from '@/components/logos/JarbisLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import SupportChat from '@/components/SupportChat'
import UpgradeModal from '@/components/UpgradeModal'
import ThemeToggle from '@/components/ThemeToggle'

const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Charts: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  Database: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      <path d="M12 2v2m0 18v-2M2 12h2m18 0h-2m-2.93-7.07-1.41 1.41M6.34 17.66l-1.41 1.41m12.73 0-1.41-1.41M6.34 6.34 4.93 4.93" />
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Zap: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Crown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M2 20h20v2H2zM2 17l5-9 5 5 5-8 5 9H2z"/>
    </svg>
  ),
  Hamburger: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
}

const NAV_KEYS = [
  { href: '/dashboard',  key: 'home',       Icon: Icons.Dashboard },
  { href: '/dashboards', key: 'dashboards', Icon: Icons.Charts },
  { href: '/datasets',   key: 'sources',    Icon: Icons.Database },
  { href: '/alertas',    key: 'alerts',     Icon: Icons.Bell },
]

const NAV_ADMIN_KEYS = [
  { href: '/configuracoes/usuarios',  key: 'users',     Icon: Icons.Users },
  { href: '/configuracoes/relatorios', key: 'scheduled', Icon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )},
  { href: '/configuracoes/query-logs', label: 'Query Logs', Icon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )},
  { href: '/configuracoes/sub-orgs', label: 'Sub-orgs', Icon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    </svg>
  )},
  { href: '/configuracoes',           key: 'settings', Icon: Icons.Settings },
]

const PLAN_BADGES = {
  free:         { label: 'Trial',      bg: 'bg-gray-100',   text: 'text-gray-500'   },
  solo:         { label: 'Solo',       bg: 'bg-blue-100',   text: 'text-blue-700'   },
  equipe:       { label: 'Equipe',     bg: 'bg-violet-100', text: 'text-violet-700' },
  starter:      { label: 'Starter',    bg: 'bg-blue-100',   text: 'text-blue-700'   },
  professional: { label: 'Pro',        bg: 'bg-violet-100', text: 'text-violet-700' },
  ilimitado:    { label: 'Grupo',      bg: 'bg-indigo-100', text: 'text-indigo-700' },
  enterprise:   { label: 'Enterprise', bg: 'bg-amber-100',  text: 'text-amber-700'  },
}

function SidebarContent({ collapsed, onToggleCollapse, user, plan, badge, initials, isAdmin, pathname, logout, onClose, unreadCount, onBellClick }) {
  const t = useTranslations('app')
  const NAV = NAV_KEYS.map(n => ({ ...n, label: t(`nav.${n.key}`) }))
  const NAV_ADMIN = NAV_ADMIN_KEYS.map(n => ({ ...n, label: n.label || t(`nav.${n.key}`) }))
  return (
    <>
      {/* Logo */}
      <div className={`h-[60px] flex items-center border-b border-gray-100/80 dark:border-gray-800 flex-shrink-0 ${collapsed ? 'px-[17px] justify-between' : 'px-4 gap-2'}`}>
        {collapsed
          ? <LogoA size={32} className="flex-shrink-0" />
          : <LogoWithText size={28} />
        }
        {onClose ? (
          <button onClick={onClose} className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Icons.X />
          </button>
        ) : onToggleCollapse ? (
          <button
            onClick={onToggleCollapse}
            className={`${collapsed ? 'ml-0' : 'ml-auto'} w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
          >
            {collapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
          </button>
        ) : null}
      </div>

      {/* Nav principal */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-[#6D28D9] text-white shadow-sm shadow-violet-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-[#1A1A2E] dark:hover:text-gray-100 hover:bg-[#f5f3ff] dark:hover:bg-gray-800'
              }`}
            >
              <span className="flex-shrink-0"><Icon /></span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {isAdmin && (
          <div className="pt-3">
            {!collapsed && (
              <div className="text-[10px] text-gray-400 font-semibold px-2.5 pb-1.5 uppercase tracking-widest">
                {t('admin')}
              </div>
            )}
            {NAV_ADMIN.map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== '/configuracoes' && pathname.startsWith(href + '/'))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="flex-shrink-0"><Icon /></span>
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-100/80 dark:border-gray-800 space-y-0.5">
        {!collapsed && user && (
          <Link href="/configuracoes" onClick={onClose} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-0.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black flex-shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{user.full_name}</div>
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
            {badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
          </Link>
        )}
        {collapsed && user && (
          <Link href="/configuracoes" title="Configurações" className="flex items-center justify-center w-full py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black">
              {initials}
            </div>
          </Link>
        )}
        {!collapsed && (
          <div className="px-2.5 py-1 flex items-center gap-2">
            <LanguageSwitcher dropUp />
            <ThemeToggle />
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-1">
            <ThemeToggle />
          </div>
        )}
        <button
          onClick={onBellClick}
          title={collapsed ? 'Notificações' : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 w-full transition-all duration-150 relative"
        >
          <span className="flex-shrink-0 relative">
            <Icons.Bell />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          {!collapsed && <span>Notificações{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>}
        </button>
        <button
          onClick={logout}
          title={collapsed ? t('nav.logout') : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-all duration-150"
        >
          <span className="flex-shrink-0"><Icons.Logout /></span>
          {!collapsed && t('nav.logout')}
        </button>
      </div>
    </>
  )
}

export default function AppLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('app')
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('jarbis_user') || 'null') } catch { return null }
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [trialDays, setTrialDays] = useState(() => {
    if (typeof window === 'undefined') return null
    const td = localStorage.getItem('jarbis_trial_days')
    return td !== null ? parseInt(td, 10) : null
  })
  const [plan, setPlan] = useState(null)
  const [pastDue, setPastDue] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(null)
  const [impersonation, setImpersonation] = useState(null)
  const [npsModal, setNpsModal] = useState(false)
  const [npsScore, setNpsScore] = useState(null)
  const [npsComment, setNpsComment] = useState('')
  const [npsSending, setNpsSending] = useState(false)
  const [npsDone, setNpsDone] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [suborgContext, setSuborgContext] = useState(null)

  useEffect(() => {
    const impBy = typeof window !== 'undefined' ? localStorage.getItem('jarbis_impersonated_by') : null
    const impTenant = typeof window !== 'undefined' ? localStorage.getItem('jarbis_impersonated_tenant') : null
    if (impBy) setImpersonation({ email: impBy, tenant: impTenant })

    const suborgId = typeof window !== 'undefined' ? localStorage.getItem('jarbis_suborg_id') : null
    const suborgName = typeof window !== 'undefined' ? localStorage.getItem('jarbis_suborg_name') : null
    if (suborgId) setSuborgContext({ id: suborgId, name: suborgName })

    // NPS: mostrar após 30 dias se não respondeu
    try {
      const u = localStorage.getItem('jarbis_user')
      if (!u) return
      const parsed = JSON.parse(u)
      const createdAt = parsed.created_at || parsed.tenant_created_at
      if (!createdAt) return
      const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (ageDays < 30) return
      const dismissed = localStorage.getItem('jarbis_nps_dismissed')
      if (dismissed) return
      const token = localStorage.getItem('jarbis_token')
      if (!token) return
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'}/admin/nps/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.ok ? r.json() : null).then(d => {
        if (d && !d.submitted) setTimeout(() => setNpsModal(true), 3000)
      }).catch(() => {})
    } catch {}
  }, [])

  async function submitNps() {
    if (npsScore === null) return
    setNpsSending(true)
    try {
      const token = localStorage.getItem('jarbis_token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'}/admin/nps/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: npsScore, comment: npsComment }),
      })
      setNpsDone(true)
      setTimeout(() => setNpsModal(false), 2000)
    } finally {
      setNpsSending(false)
    }
  }

  function dismissNps() {
    localStorage.setItem('jarbis_nps_dismissed', '1')
    setNpsModal(false)
  }

  function exitImpersonation() {
    const backup = localStorage.getItem('jarbis_token_impersonation_backup')
    if (backup) localStorage.setItem('jarbis_token', backup)
    localStorage.removeItem('jarbis_token_impersonation_backup')
    localStorage.removeItem('jarbis_impersonated_by')
    localStorage.removeItem('jarbis_impersonated_tenant')
    window.close()
    router.push('/admin/tenants')
  }

  function exitSuborgContext() {
    localStorage.removeItem('jarbis_suborg_id')
    localStorage.removeItem('jarbis_suborg_name')
    setSuborgContext(null)
    router.push('/dashboard')
  }

  useEffect(() => {
    // user and trialDays already initialized from localStorage via useState lazy initializer
    if (!user) { router.push('/login'); return }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/billing/status`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPlan(data.plan)
          if (data.trial_days_remaining !== null) setTrialDays(data.trial_days_remaining)
          if (data.subscription_status === 'past_due') setPastDue(true)
        }
      })
      .catch(() => {})
  }, [])

  // Listener global para erros 402/403 disparados por api.js
  useEffect(() => {
    const handler = (e) => setUpgradeModal(e.detail)
    window.addEventListener('upgrade-required', handler)
    return () => window.removeEventListener('upgrade-required', handler)
  }, [])

  // Notificações in-app
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'
    async function fetchNotifs() {
      try {
        const token = localStorage.getItem('jarbis_token')
        if (!token) return
        const r = await fetch(`${API}/reports/notifications?limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (r.ok) {
          const d = await r.json()
          setNotifications(d.items || [])
          setUnreadCount(d.unread_count || 0)
        }
      } catch {}
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  async function markAllRead() {
    try {
      const token = localStorage.getItem('jarbis_token')
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'
      await fetch(`${API}/reports/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }

  // Fecha drawer ao navegar
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function logout() {
    try { await api.logout() } catch {}
    localStorage.removeItem('jarbis_user')
    localStorage.removeItem('jarbis_trial_days')
    localStorage.removeItem('jarbis_token')
    router.push('/login')
  }

  const isAdmin = user?.role === 'owner' || user?.role === 'admin'
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  const badge = PLAN_BADGES[plan] || null
  const showTrial = trialDays !== null && trialDays <= 7

  const sidebarProps = { user, plan, badge, initials, isAdmin, pathname, logout, unreadCount, onBellClick: () => setNotifOpen(o => !o) }

  return (
    <div className="flex min-h-screen lg:h-screen bg-[#f8f7fc] dark:bg-gray-950">

      {/* ── Sidebar desktop (md+) ── */}
      <aside
        className={`hidden lg:flex ${collapsed ? 'w-[68px]' : 'w-[220px]'} bg-white dark:bg-gray-900 border-r border-gray-100/80 dark:border-gray-800 flex-col transition-all duration-200 flex-shrink-0`}
        style={{ boxShadow: '1px 0 0 0 #f0eef8' }}
      >
        <SidebarContent
          {...sidebarProps}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(c => !c)}
          onClose={null}
        />
      </aside>

      {/* ── Drawer mobile (< md) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Painel */}
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <SidebarContent
              {...sidebarProps}
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 lg:overflow-y-auto flex flex-col min-w-0 pb-16 lg:pb-0">

        {/* Header mobile */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <LogoWithText size={24} />
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Icons.Bell />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('openMenu')}
            >
              <Icons.Hamburger />
            </button>
          </div>
        </div>

        {/* Banner de impersonação */}
        {impersonation && (
          <div className="px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-3 flex-shrink-0 bg-amber-900/80 text-amber-200 border-b border-amber-700">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>Você está navegando como <strong>{impersonation.tenant}</strong> (sessão de diagnóstico por {impersonation.email})</span>
            <button
              onClick={exitImpersonation}
              className="ml-2 px-3 py-1 bg-amber-700/60 hover:bg-amber-700 rounded-lg text-xs font-bold transition-colors"
            >
              Encerrar sessão
            </button>
          </div>
        )}

        {/* Banner de sub-org ativa */}
        {suborgContext && (
          <div className="px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-3 flex-shrink-0 bg-violet-600/90 text-violet-50 border-b border-violet-500">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
            <span>Gerenciando: <strong>{suborgContext.name}</strong></span>
            <button
              onClick={exitSuborgContext}
              className="ml-2 px-3 py-1 bg-violet-500/60 hover:bg-violet-500 rounded-lg text-xs font-bold transition-colors"
            >
              Voltar ao contexto principal
            </button>
          </div>
        )}

        {/* Banner de pagamento pendente */}
        {pastDue && (
          <div className="px-4 py-2 text-sm font-medium flex flex-wrap items-center justify-center gap-x-2 gap-y-1 flex-shrink-0 bg-red-50 text-red-700 border-b border-red-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-center">Pagamento pendente. Atualize seu método de pagamento para não perder o acesso.</span>
            <button
              onClick={async () => { try { const r = await api.billing.portal(); if (r?.url) window.open(r.url, '_blank') } catch {} }}
              className="underline font-bold"
            >
              Gerenciar pagamento
            </button>
          </div>
        )}

        {/* Banner de trial */}
        {showTrial && (
          <div className={`px-4 py-2 text-sm font-medium flex flex-wrap items-center justify-center gap-x-2 gap-y-1 flex-shrink-0 ${
            trialDays <= 2
              ? 'bg-red-50 text-red-700 border-b border-red-100'
              : 'bg-amber-50 text-amber-700 border-b border-amber-100'
          }`}>
            <Icons.Zap />
            <span className="text-center">
              {trialDays === 0
                ? t('trialExpired')
                : t('trialDays', { days: trialDays })}
            </span>
            <Link href="/configuracoes/planos" className="underline font-bold">{t('trialCta')}</Link>
          </div>
        )}

        <div className="flex-1">
          {children}
        </div>
      </main>

      <SupportChat />

      {/* Painel de notificações */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}>
          <div
            className="absolute top-14 md:top-auto md:bottom-16 right-4 md:left-[228px] w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Notificações</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma notificação</div>
              ) : notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.read ? 'bg-violet-50/50 dark:bg-violet-900/20' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-1.5 flex-shrink-0" />}
                    <div className={!n.read ? '' : 'pl-3.5'}>
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{n.title}</div>
                      {n.body && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.body}</div>}
                      {n.link && (
                        <a href={n.link} className="text-xs text-violet-600 hover:underline mt-1 inline-block" onClick={() => setNotifOpen(false)}>
                          Ver mais →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal NPS */}
      {npsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            {npsDone ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🙏</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Obrigado pelo feedback!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sua resposta nos ajuda a melhorar o Jarbis.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Uma pergunta rápida</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">De 0 a 10, o quanto você indicaria o Jarbis a um colega?</p>
                  </div>
                  <button onClick={dismissNps} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
                </div>
                <div className="flex gap-1 mb-4 flex-wrap justify-center">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      onClick={() => setNpsScore(n)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                        npsScore === n
                          ? n >= 9 ? 'bg-emerald-600 text-white'
                            : n >= 7 ? 'bg-amber-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-4 px-1">
                  <span>Jamais indicaria</span>
                  <span>Com certeza indicaria</span>
                </div>
                {npsScore !== null && (
                  <textarea
                    value={npsComment}
                    onChange={e => setNpsComment(e.target.value)}
                    placeholder="Comentário opcional — o que podemos melhorar?"
                    rows={2}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-violet-400 resize-none mb-3"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={submitNps}
                    disabled={npsScore === null || npsSending}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {npsSending ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button onClick={dismissNps} className="px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    Depois
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de upgrade universal */}
      {upgradeModal && (
        <UpgradeModal errorData={upgradeModal} onClose={() => setUpgradeModal(null)} />
      )}

      {/* ── Bottom navigation mobile (< md) ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          {NAV_KEYS.map(({ href, key, Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            const label = t(`nav.${key}`)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? 'text-violet-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <span className={active ? 'text-violet-600' : ''}><Icon /></span>
                <span className={`text-[10px] font-semibold ${active ? 'text-violet-600' : 'text-gray-400'}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}
