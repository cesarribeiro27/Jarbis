'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogoComet } from '@/components/logos/JarbisLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

export const AdminRoleContext = createContext({ role: null, email: null })
export const useAdminRole = () => useContext(AdminRoleContext)

const NAV = [
  {
    href: '/admin',
    label: 'Métricas',
    roles: ['full', 'vendas', 'financeiro', 'marketing', 'suporte'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    href: '/admin/tenants',
    label: 'Tenants',
    roles: ['full', 'vendas', 'financeiro', 'suporte'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/admin/afiliados',
    label: 'Afiliados',
    roles: ['full', 'vendas', 'marketing'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    href: '/admin/cupons',
    label: 'Cupons',
    roles: ['full', 'vendas', 'marketing'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    href: '/admin/customer-success',
    label: 'CS / Retenção',
    roles: ['full', 'vendas', 'suporte'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: '/admin/crm',
    label: 'CRM',
    roles: ['full', 'vendas'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="8" width="5" height="13" rx="1"/><rect x="17" y="5" width="5" height="16" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/admin/emails',
    label: 'Emails',
    roles: ['full', 'vendas', 'marketing'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
  {
    href: '/admin/alertas',
    label: 'Alertas',
    roles: ['full', 'vendas', 'suporte', 'financeiro'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/admin/suporte',
    label: 'Suporte',
    roles: ['full', 'vendas', 'suporte'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/admin/financeiro',
    label: 'Financeiro',
    roles: ['full', 'financeiro'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    href: '/admin/marketing',
    label: 'Marketing',
    roles: ['full', 'marketing', 'vendas'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/admin/equipe',
    label: 'Equipe',
    roles: ['full'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    href: '/admin/nps',
    label: 'NPS',
    roles: ['full', 'vendas', 'suporte'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    href: '/admin/auditoria',
    label: 'Auditoria',
    roles: ['full'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: '/admin/notificacoes',
    label: 'Notificações',
    roles: ['full'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        <circle cx="18" cy="5" r="3" fill="currentColor" stroke="none" className="text-violet-400"/>
      </svg>
    ),
  },
]

const ROLE_BADGE = {
  full:        { label: 'Full',        cls: 'bg-violet-900/60 text-violet-300' },
  vendas:      { label: 'Vendas',      cls: 'bg-blue-900/60 text-blue-300' },
  financeiro:  { label: 'Financeiro',  cls: 'bg-emerald-900/60 text-emerald-300' },
  marketing:   { label: 'Marketing',   cls: 'bg-amber-900/60 text-amber-300' },
  suporte:     { label: 'Suporte',     cls: 'bg-gray-800 text-gray-400' },
}

function SidebarContent({ collapsed, onToggleCollapse, onClose, adminEmail, adminRole, roleBadge, visibleNav, alertCount, ticketCount, pathname }) {
  return (
    <>
      {/* Header */}
      <div className={`h-[60px] flex items-center border-b border-gray-800 flex-shrink-0 ${collapsed ? 'px-[17px] justify-between' : 'px-4 gap-2'}`}>
        <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
          <LogoComet size={28} light={true} />
          {!collapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-black text-white text-sm tracking-tight">jar<span style={{ color: '#A78BFA' }}>b</span>is</span>
              <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-md flex-shrink-0">ADMIN</span>
            </div>
          )}
        </Link>

        {onClose ? (
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        ) : onToggleCollapse ? (
          <button
            onClick={onToggleCollapse}
            className={`${collapsed ? 'ml-0' : 'ml-auto'} w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0`}
          >
            {collapsed
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            }
          </button>
        ) : null}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-3 overflow-y-auto space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {visibleNav.map(({ href, label, icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          const isAlerts  = href === '/admin/alertas'
          const isSupport = href === '/admin/suporte'
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-colors ${
                collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'
              } ${
                active
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <span className={`flex-shrink-0 ${active ? 'text-violet-400' : ''}`}>{icon}</span>
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {!collapsed && isAlerts && alertCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
              {!collapsed && isSupport && ticketCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {ticketCount > 99 ? '99+' : ticketCount}
                </span>
              )}
              {collapsed && isAlerts && alertCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-800 space-y-0.5 ${collapsed ? 'px-2 py-3' : 'px-3 py-4'}`}>
        <Link
          href="/dashboard"
          onClick={onClose}
          title={collapsed ? 'Voltar ao app' : undefined}
          className={`flex items-center gap-3 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors ${collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2'}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          {!collapsed && <span>Voltar ao app</span>}
        </Link>

        {!collapsed && (
          <div className="px-3 py-2 space-y-1">
            <div className="text-xs text-gray-600 truncate">{adminEmail}</div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleBadge.cls}`}>
              {roleBadge.label}
            </span>
          </div>
        )}

        {collapsed && (
          <div title={adminEmail} className="flex justify-center py-1">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${roleBadge.cls}`}>
              {roleBadge.label[0]}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [adminEmail, setAdminEmail] = useState(null)
  const [adminRole, setAdminRole] = useState(null)
  const [alertCount, setAlertCount] = useState(0)
  const [ticketCount, setTicketCount] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Em tablet (< 1024px) começa colapsada
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setCollapsed(mq.matches)
    const handler = (e) => { if (!mobileOpen) setCollapsed(e.matches) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Fecha drawer mobile ao trocar de página
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_admin_token') : null
    if (!token) { router.replace('/admin/login'); return }

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

    fetch(`${API_URL}/admin/me`, { credentials: 'include', headers })
      .then(r => {
        if (r.status === 401) { router.replace('/admin/login'); return null }
        if (r.status === 403) { router.replace('/dashboard'); return null }
        return r.json()
      })
      .then(data => {
        if (data?.role) {
          setAdminEmail(data.email)
          setAdminRole(data.role)
          setChecking(false)
        } else if (data?.is_superadmin) {
          setAdminEmail(data.email)
          setAdminRole('full')
          setChecking(false)
        } else if (data) {
          router.replace('/dashboard')
        }
      })
      .catch(() => router.replace('/admin/login'))
  }, [])

  useEffect(() => {
    if (!adminRole) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_admin_token') : null
    if (!token) return
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

    fetch(`${API_URL}/admin/alerts`, { credentials: 'include', headers })
      .then(r => r.json()).then(d => setAlertCount(d.total || 0)).catch(() => {})
    fetch(`${API_URL}/admin/support/tickets?status=open&page_size=1`, { credentials: 'include', headers })
      .then(r => r.json()).then(d => setTicketCount(d.total || 0)).catch(() => {})

    const interval = setInterval(() => {
      fetch(`${API_URL}/admin/alerts`, { credentials: 'include', headers })
        .then(r => r.json()).then(d => setAlertCount(d.total || 0)).catch(() => {})
    }, 60000)

    return () => clearInterval(interval)
  }, [adminRole])

  if (pathname === '/admin/login') return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const visibleNav = NAV.filter(item => item.roles.includes(adminRole))
  const roleBadge = ROLE_BADGE[adminRole] || ROLE_BADGE.suporte
  const sidebarProps = { adminEmail, adminRole, roleBadge, visibleNav, alertCount, ticketCount, pathname }

  return (
    <AdminRoleContext.Provider value={{ role: adminRole, email: adminEmail }}>
      <div className="flex h-screen bg-gray-950 overflow-hidden">

        {/* Overlay mobile */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer mobile */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-[220px] bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent
            {...sidebarProps}
            collapsed={false}
            onClose={() => setMobileOpen(false)}
          />
        </aside>

        {/* Sidebar desktop/tablet */}
        <aside className={`hidden md:flex flex-col bg-gray-900 border-r border-gray-800 flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
          <SidebarContent
            {...sidebarProps}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(c => !c)}
          />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar mobile */}
          <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-gray-900 border-b border-gray-800 flex-shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <LogoComet size={24} light={true} />
              <span className="font-black text-white text-sm">jar<span style={{ color: '#A78BFA' }}>b</span>is</span>
              <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-md">ADMIN</span>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto bg-gray-950">
            {children}
          </main>
        </div>

      </div>
    </AdminRoleContext.Provider>
  )
}
