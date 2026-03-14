'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

export default function ConfiguracoesPage() {
  const [user, setUser] = useState(null)
  const [billing, setBilling] = useState(null)

  useEffect(() => {
    try {
      const u = localStorage.getItem('jarbis_user')
      if (u) setUser(JSON.parse(u))
    } catch {}
    api.fetch('/billing/status').then(setBilling).catch(() => {})
  }, [])

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Configurações</h1>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-4">Minha conta</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <span className="text-violet-600 font-black text-lg">{user?.full_name?.[0] || '?'}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.full_name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Plano</h2>
            <Link
              href="/configuracoes/planos"
              className="text-xs text-violet-600 font-semibold hover:underline"
            >
              Ver todos os planos →
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{billing?.plan_name || 'Gratuito'}</p>
              {billing ? (
                <p className="text-sm text-gray-500 mt-0.5">
                  {billing.usage.dashboards}/{billing.limits.dashboards === -1 ? '∞' : billing.limits.dashboards} dashboards
                  · {billing.usage.datasets}/{billing.limits.datasets === -1 ? '∞' : billing.limits.datasets} datasets
                  · {billing.usage.users}/{billing.limits.users === -1 ? '∞' : billing.limits.users} usuários
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-0.5">Carregando...</p>
              )}
              {billing?.trial_days_remaining > 0 && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  {billing.trial_days_remaining} dias de trial restantes
                </p>
              )}
            </div>
            {billing?.plan === 'free' || !billing ? (
              <Link
                href="/configuracoes/planos"
                className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
              >
                Fazer upgrade
              </Link>
            ) : (
              <Link
                href="/configuracoes/planos"
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Gerenciar plano
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
