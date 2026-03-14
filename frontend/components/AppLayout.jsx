'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Charts: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
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
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: Icons.Dashboard },
  { href: '/dashboards', label: 'Dashboards', Icon: Icons.Charts },
  { href: '/datasets', label: 'Dados', Icon: Icons.Database },
  { href: '/alertas', label: 'Alertas', Icon: Icons.Bell },
]

const NAV_ADMIN = [
  { href: '/configuracoes/usuarios', label: 'Usuários', Icon: Icons.Users },
  { href: '/configuracoes', label: 'Configurações', Icon: Icons.Settings },
]

export default function AppLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [trialDays, setTrialDays] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('jarbis_token')
    if (!token) { router.push('/login'); return }
    try {
      const u = localStorage.getItem('jarbis_user')
      if (u) setUser(JSON.parse(u))
    } catch {
      localStorage.removeItem('jarbis_user')
      router.push('/login')
      return
    }
    const td = localStorage.getItem('jarbis_trial_days')
    if (td !== null) setTrialDays(parseInt(td, 10))
  }, [])

  function logout() {
    localStorage.removeItem('jarbis_token')
    localStorage.removeItem('jarbis_user')
    router.push('/login')
  }

  const isAdmin = user?.role === 'owner' || user?.role === 'admin'
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex h-screen bg-[#f8f7fc]">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[68px]' : 'w-[220px]'} bg-white border-r border-gray-100/80 flex flex-col transition-all duration-200 flex-shrink-0`}
        style={{ boxShadow: '1px 0 0 0 #f0eef8' }}>

        {/* Logo */}
        <div className={`h-[60px] flex items-center border-b border-gray-100/80 flex-shrink-0 ${collapsed ? 'px-[17px] justify-between' : 'px-4 gap-2'}`}>
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
            </svg>
          </div>
          {!collapsed && <span className="font-black text-gray-900 text-[15px] tracking-tight">Jarbis</span>}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`${collapsed ? 'ml-0' : 'ml-auto'} w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors`}
          >
            {collapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            return (
              <Link
                key={href}
                href={href}
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
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
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

        {/* User footer */}
        <div className="p-2 border-t border-gray-100/80 space-y-0.5">
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-gray-800 truncate">{user.full_name}</div>
                <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
              </div>
            </div>
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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {trialDays !== null && trialDays <= 7 && (
          <div className={`px-6 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${
            trialDays <= 2
              ? 'bg-red-50 text-red-700 border-b border-red-100'
              : 'bg-amber-50 text-amber-700 border-b border-amber-100'
          }`}>
            <Icons.Zap />
            {trialDays === 0
              ? 'Seu período de teste expirou. Escolha um plano para continuar.'
              : `Período de teste gratuito termina em ${trialDays} dia${trialDays !== 1 ? 's' : ''}.`}
            <Link href="/configuracoes/planos" className="underline font-bold ml-1">Ver planos</Link>
          </div>
        )}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
