'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

const StatIcons = {
  dashboards: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  datasets: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  shared: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  views: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
}

const statColors = [
  { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'hover:border-violet-200' },
  { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'hover:border-blue-200' },
  { bg: 'bg-emerald-50',icon: 'text-emerald-600', border: 'hover:border-emerald-200' },
  { bg: 'bg-amber-50',  icon: 'text-amber-600',   border: 'hover:border-amber-200' },
]

export default function DashboardHome() {
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

  const stats = [
    { label: 'Dashboards', value: dashboards.length, iconKey: 'dashboards', href: '/dashboards' },
    { label: 'Datasets', value: datasets.length, iconKey: 'datasets', href: '/datasets' },
    { label: 'Compartilhados', value: dashboards.filter(d => d.share_token).length, iconKey: 'shared', href: '/dashboards' },
    { label: 'Visualizações', value: dashboards.reduce((s, d) => s + (d.view_count || 0), 0), iconKey: 'views', href: '/dashboards' },
  ]

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">
            Olá{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Aqui está um resumo da sua conta</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={`bg-white rounded-2xl border border-gray-100 p-5 transition-all ${statColors[i].border} hover:shadow-sm group`}
            >
              <div className={`w-10 h-10 ${statColors[i].bg} ${statColors[i].icon} rounded-xl flex items-center justify-center mb-3`}>
                {StatIcons[stat.iconKey]}
              </div>
              <div className="text-2xl font-black text-gray-900">{loading ? '—' : stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">{stat.label}</div>
            </Link>
          ))}
        </div>

        {/* Recent dashboards */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Dashboards recentes</h2>
            <Link
              href="/dashboards/novo"
              className="bg-violet-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl hover:bg-violet-700 transition-colors"
            >
              + Novo
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-gray-400 py-4">Carregando...</div>
          ) : dashboards.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm mb-4">Nenhum dashboard ainda</p>
              <Link
                href="/dashboards/novo"
                className="bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors inline-block"
              >
                Criar primeiro dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {dashboards.slice(0, 5).map(d => (
                <Link
                  key={d.id}
                  href={`/dashboards/${d.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{d.title}</div>
                    <div className="text-xs text-gray-400">{d.view_count || 0} visualizações</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
              {dashboards.length > 5 && (
                <Link href="/dashboards" className="block text-center text-xs text-violet-600 font-semibold pt-2 hover:underline">
                  Ver todos ({dashboards.length})
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
