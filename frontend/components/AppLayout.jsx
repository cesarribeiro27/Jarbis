'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

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

const NAV = [
  { href: '/dashboard',  label: 'Painel',     Icon: Icons.Dashboard },
  { href: '/dashboards', label: 'Dashboards', Icon: Icons.Charts },
  { href: '/datasets',   label: 'Dados',      Icon: Icons.Database },
  { href: '/alertas',    label: 'Alertas',    Icon: Icons.Bell },
]

const NAV_ADMIN = [
  { href: '/configuracoes/usuarios', label: 'Usuários',      Icon: Icons.Users },
  { href: '/configuracoes',          label: 'Configurações', Icon: Icons.Settings },
]

const PLAN_BADGES = {
  free:         { label: 'Trial',      bg: 'bg-gray-100',   text: 'text-gray-500'   },
  solo:         { label: 'Solo',       bg: 'bg-blue-100',   text: 'text-blue-700'   },
  equipe:       { label: 'Equipe',     bg: 'bg-violet-100', text: 'text-violet-700' },
  starter:      { label: 'Starter',    bg: 'bg-blue-100',   text: 'text-blue-700'   },
  professional: { label: 'Pro',        bg: 'bg-violet-100', text: 'text-violet-700' },
  ilimitado:    { label: 'Ilimitado',  bg: 'bg-indigo-100', text: 'text-indigo-700' },
  enterprise:   { label: 'Enterprise', bg: 'bg-amber-100',  text: 'text-amber-700'  },
}

function SidebarContent({ collapsed, onToggleCollapse, user, plan, badge, initials, isAdmin, pathname, logout, onClose }) {
  return (
    <>
      {/* Logo */}
      <div className={`h-[60px] flex items-center border-b border-gray-100/80 flex-shrink-0 ${collapsed ? 'px-[17px] justify-between' : 'px-4 gap-2'}`}>
        <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
          </svg>
        </div>
        {!collapsed && <span className="font-black text-gray-900 text-[15px] tracking-tight">Jarbis</span>}
        {onClose ? (
          <button onClick={onClose} className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <Icons.X />
          </button>
        ) : onToggleCollapse ? (
          <button
            onClick={onToggleCollapse}
            className={`${collapsed ? 'ml-0' : 'ml-auto'} w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors`}
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
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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
                Admin
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
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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
      <div className="p-2 border-t border-gray-100/80 space-y-0.5">
        {!collapsed && user && (
          <Link href="/configuracoes" onClick={onClose} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-0.5 hover:bg-gray-50 transition-colors group">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black flex-shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800 truncate group-hover:text-violet-700 transition-colors">{user.full_name}</div>
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
          <Link href="/configuracoes" title="Configurações" className="flex items-center justify-center w-full py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black">
              {initials}
            </div>
          </Link>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Sair' : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 w-full transition-all duration-150"
        >
          <span className="flex-shrink-0"><Icons.Logout /></span>
          {!collapsed && 'Sair'}
        </button>
      </div>
    </>
  )
}

export default function AppLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [trialDays, setTrialDays] = useState(null)
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    try {
      const u = localStorage.getItem('jarbis_user')
      if (!u) { router.push('/login'); return }
      setUser(JSON.parse(u))
    } catch {
      localStorage.removeItem('jarbis_user')
      router.push('/login')
      return
    }
    const td = localStorage.getItem('jarbis_trial_days')
    if (td !== null) setTrialDays(parseInt(td, 10))

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/billing/status`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPlan(data.plan)
          if (data.trial_days_remaining !== null) setTrialDays(data.trial_days_remaining)
        }
      })
      .catch(() => {})
  }, [])

  // Fecha drawer ao navegar
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function logout() {
    try { await api.logout() } catch {}
    localStorage.removeItem('jarbis_user')
    localStorage.removeItem('jarbis_trial_days')
    router.push('/login')
  }

  const isAdmin = user?.role === 'owner' || user?.role === 'admin'
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  const badge = PLAN_BADGES[plan] || null
  const showTrial = trialDays !== null && trialDays <= 7

  const sidebarProps = { user, plan, badge, initials, isAdmin, pathname, logout }

  return (
    <div className="flex h-screen bg-[#f8f7fc]">

      {/* ── Sidebar desktop (md+) ── */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-[68px]' : 'w-[220px]'} bg-white border-r border-gray-100/80 flex-col transition-all duration-200 flex-shrink-0`}
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
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Painel */}
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-2xl flex flex-col">
            <SidebarContent
              {...sidebarProps}
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 pb-16 md:pb-0">

        {/* Header mobile */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center shadow-sm shadow-violet-200">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
              </svg>
            </div>
            <span className="font-black text-gray-900 text-sm tracking-tight">Jarbis</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Icons.Hamburger />
          </button>
        </div>

        {/* Banner de trial */}
        {showTrial && (
          <div className={`px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 flex-shrink-0 ${
            trialDays <= 2
              ? 'bg-red-50 text-red-700 border-b border-red-100'
              : 'bg-amber-50 text-amber-700 border-b border-amber-100'
          }`}>
            <Icons.Zap />
            <span className="text-center">
              {trialDays === 0
                ? 'Seu período de teste expirou. Escolha um plano para continuar.'
                : `Teste gratuito termina em ${trialDays} dia${trialDays !== 1 ? 's' : ''}.`}
            </span>
            <Link href="/configuracoes/planos" className="underline font-bold ml-1 whitespace-nowrap">Ver planos</Link>
          </div>
        )}

        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* ── Bottom navigation mobile (< md) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? 'text-violet-600' : 'text-gray-400 hover:text-gray-600'
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
