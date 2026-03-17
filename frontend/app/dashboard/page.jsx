'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useTranslations, useLocale } from 'next-intl'

const PALETTE = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2']

function MiniChart({ color, seed = 0 }) {
  const h = [30, 55, 42, 70, 48, 80, 60].map((v, i) => v + ((seed * 7 + i * 13) % 20) - 10)
  const max = Math.max(...h)
  return (
    <svg viewBox="0 0 60 32" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <polyline
        points={h.map((v, i) => `${i * 10},${32 - (v / max) * 28}`).join(' ')}
        fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <polygon
        points={`0,32 ${h.map((v, i) => `${i * 10},${32 - (v / max) * 28}`).join(' ')} 60,32`}
        fill={`url(#g${seed})`}
      />
    </svg>
  )
}

const StatIcons = {
  dashboards: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  datasets: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  shared: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  views: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
}

const statConfig = [
  { iconKey: 'dashboards', href: '/dashboards',  color: '#7c3aed', bg: 'from-violet-50 to-violet-100/60',   iconBg: 'bg-violet-600' },
  { iconKey: 'datasets',   href: '/datasets',    color: '#2563eb', bg: 'from-blue-50 to-blue-100/60',       iconBg: 'bg-blue-600' },
  { iconKey: 'shared',     href: '/dashboards',  color: '#059669', bg: 'from-emerald-50 to-emerald-100/60', iconBg: 'bg-emerald-600' },
  { iconKey: 'views',      href: '/dashboards',  color: '#d97706', bg: 'from-amber-50 to-amber-100/60',     iconBg: 'bg-amber-500' },
]

export default function DashboardHome() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [dashboards, setDashboards] = useState([])
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('jarbis_user')
    if (u) setUser(JSON.parse(u))
    Promise.all([api.reports.list(), api.reports.datasets.list()])
      .then(([r, d]) => { setDashboards(r || []); setDatasets(d || []) })
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.full_name?.split(' ')[0] || null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting.morning') : hour < 18 ? t('greeting.afternoon') : t('greeting.evening')

  const stats = [
    { ...statConfig[0], label: 'Dashboards', value: dashboards.length },
    { ...statConfig[1], label: 'Datasets',   value: datasets.length },
    { ...statConfig[2], label: t('stats.shared'), value: dashboards.filter(d => d.share_token).length },
    { ...statConfig[3], label: t('stats.views'),  value: dashboards.reduce((s, d) => s + (d.view_count || 0), 0) },
  ]

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-screen-lg mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-violet-200">
              {firstName ? firstName[0].toUpperCase() : '?'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-none">
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{t('subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={`relative bg-gradient-to-br ${stat.bg} rounded-2xl p-5 border border-white/80 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden group`}
            >
              <div className="relative z-10">
                <div className={`w-10 h-10 ${stat.iconBg} text-white rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
                  {StatIcons[stat.iconKey]}
                </div>
                <div className="text-3xl font-black text-gray-900 tabular-nums leading-none mb-1">
                  {loading ? <span className="text-gray-300">—</span> : stat.value.toLocaleString(locale)}
                </div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</div>
              </div>
              {/* bg sparkline */}
              <div className="absolute bottom-0 right-0 w-24 h-12 opacity-20 group-hover:opacity-30 transition-opacity">
                <MiniChart color={stat.color} seed={stats.indexOf(stat)} />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent dashboards */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h2 className="font-bold text-gray-900 text-sm">{t('recent')}</h2>
            </div>
            <Link
              href="/dashboards/novo"
              className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              {t('newBtn')}
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-300">{t('loading')}</div>
          ) : dashboards.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">{t('empty.title')}</p>
              <p className="text-sm text-gray-400 mb-5">{t('empty.desc')}</p>
              <Link href="/dashboards/novo" className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                {t('empty.cta')}
              </Link>
            </div>
          ) : (
            <div>
              {dashboards.slice(0, 6).map((d, i) => {
                const color = PALETTE[i % PALETTE.length]
                return (
                  <Link
                    key={d.id}
                    href={`/dashboards/${d.id}`}
                    className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 hover:bg-gray-50/80 transition-colors border-b border-gray-50 last:border-b-0 group"
                  >
                    {/* mini chart — oculto em telas muito pequenas */}
                    <div className="hidden xs:block w-12 sm:w-14 h-7 sm:h-8 shrink-0 rounded-lg overflow-hidden bg-gray-50/80">
                      <MiniChart color={color} seed={i + 1} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 transition-colors truncate">{d.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{d.block_count ?? 0} {t('blocks')}</span>
                        {d.share_token && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{t('public')}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-300 shrink-0 group-hover:text-gray-400 transition-colors hidden sm:block">
                      {new Date(d.updated_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                    </div>
                    <svg className="w-4 h-4 text-gray-200 group-hover:text-violet-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                )
              })}
              {dashboards.length > 6 && (
                <Link href="/dashboards" className="flex items-center justify-center gap-1.5 text-xs text-violet-600 font-semibold py-3.5 hover:bg-violet-50 transition-colors">
                  {t('seeAll', { count: dashboards.length })}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} points="9 18 15 12 9 6" /></svg>
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
