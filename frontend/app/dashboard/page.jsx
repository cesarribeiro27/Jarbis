'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

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

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">
            Olá{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Aqui está um resumo da sua conta</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Dashboards', value: dashboards.length, icon: '📊', href: '/dashboards' },
            { label: 'Datasets', value: datasets.length, icon: '🗄️', href: '/datasets' },
            { label: 'Compartilhados', value: dashboards.filter(d => d.share_token).length, icon: '🔗', href: '/dashboards' },
            { label: 'Visualizações', value: dashboards.reduce((s, d) => s + (d.view_count || 0), 0), icon: '👁️', href: '/dashboards' },
          ].map(stat => (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-indigo-200 transition-colors">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-black text-gray-900">{loading ? '—' : stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </Link>
          ))}
        </div>

        {/* Recent dashboards */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Dashboards recentes</h2>
            <Link href="/dashboards/novo" className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
              + Novo
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-gray-400 py-4">Carregando...</div>
          ) : dashboards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-500 text-sm mb-4">Nenhum dashboard ainda</p>
              <Link href="/dashboards/novo" className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
                Criar primeiro dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {dashboards.slice(0, 5).map(d => (
                <Link key={d.id} href={`/dashboards/${d.id}`} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{d.title}</div>
                    <div className="text-xs text-gray-400">{d.view_count || 0} visualizações</div>
                  </div>
                  <span className="text-gray-300 group-hover:text-indigo-400 transition-colors">→</span>
                </Link>
              ))}
              {dashboards.length > 5 && (
                <Link href="/dashboards" className="block text-center text-xs text-indigo-600 font-semibold pt-2 hover:underline">
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
