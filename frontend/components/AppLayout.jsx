'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/dashboards', label: 'Meus Dashboards', icon: '📊' },
  { href: '/datasets', label: 'Dados', icon: '🗄️' },
  { href: '/alertas', label: 'Alertas', icon: '🔔' },
]

const NAV_ADMIN = [
  { href: '/configuracoes/usuarios', label: 'Usuários', icon: '👥' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]

export default function AppLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('jarbis_token')
    if (!token) { router.push('/login'); return }
    const u = localStorage.getItem('jarbis_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  function logout() {
    localStorage.removeItem('jarbis_token')
    localStorage.removeItem('jarbis_user')
    router.push('/login')
  }

  const isAdmin = user?.role === 'owner' || user?.role === 'admin'

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-100 flex flex-col transition-all duration-200`}>
        <div className="h-14 flex items-center px-4 border-b border-gray-100 gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">J</span>
          </div>
          {!collapsed && <span className="font-black text-gray-900">Jarbis</span>}
          <button onClick={() => setCollapsed(c => !c)} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              {!collapsed && <div className="text-xs text-gray-400 font-semibold px-3 pt-4 pb-1 uppercase tracking-wider">Admin</div>}
              {NAV_ADMIN.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === item.href ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  {!collapsed && item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          {!collapsed && user && (
            <div className="px-3 py-2 mb-1">
              <div className="text-xs font-semibold text-gray-700 truncate">{user.name}</div>
              <div className="text-xs text-gray-400 truncate">{user.email}</div>
            </div>
          )}
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 w-full transition-colors">
            <span className="flex-shrink-0">↩</span>
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
