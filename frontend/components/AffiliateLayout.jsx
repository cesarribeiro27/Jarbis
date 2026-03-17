'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogoA } from '@/components/logos/JarbisLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

export const AffiliateContext = createContext({ id: null, name: null, email: null, code: null })
export const useAffiliate = () => useContext(AffiliateContext)

const NAV = [
  {
    href: '/affiliate/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    href: '/affiliate/referrals',
    label: 'Indicações',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/affiliate/payments',
    label: 'Pagamentos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
]

export default function AffiliateLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [affiliateData, setAffiliateData] = useState(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_affiliate_token') : null
    if (!token) { router.replace('/affiliate/login'); return }

    fetch(`${API_URL}/affiliate/me`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { router.replace('/affiliate/login'); return null }
        return r.json()
      })
      .then(data => {
        if (data?.id) {
          setAffiliateData(data)
          setChecking(false)
        } else if (data) {
          router.replace('/affiliate/login')
        }
      })
      .catch(() => router.replace('/affiliate/login'))
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function logout() {
    localStorage.removeItem('jarbis_affiliate_token')
    router.replace('/affiliate/login')
  }

  return (
    <AffiliateContext.Provider value={affiliateData}>
      <div className="flex h-screen bg-gray-950">
        {/* Sidebar */}
        <aside className="w-[220px] bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
          <div className="px-4 py-5 border-b border-gray-800">
            <Link href="/affiliate/dashboard" className="flex items-center gap-2.5">
              <LogoA size={28} color="#fff" light={true} />
              <div>
                <span className="font-black text-white text-sm tracking-tight">jarbis</span>
                <span className="ml-1.5 text-[10px] font-bold bg-emerald-700 text-white px-1.5 py-0.5 rounded-md">AFILIADO</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-violet-600/20 text-violet-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <span className={active ? 'text-violet-400' : ''}>{icon}</span>
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-800 space-y-1">
            <div className="px-3 py-2 space-y-1 mb-1">
              <div className="text-xs text-gray-400 font-medium truncate">{affiliateData?.name}</div>
              <div className="text-xs text-gray-600 truncate">{affiliateData?.email}</div>
              {affiliateData?.code && (
                <div className="text-[10px] text-emerald-400 font-mono bg-emerald-900/20 px-2 py-0.5 rounded">
                  ref: {affiliateData.code}
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors text-left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-950">
          {children}
        </main>
      </div>
    </AffiliateContext.Provider>
  )
}
