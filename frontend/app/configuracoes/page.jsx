'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'

export default function ConfiguracoesPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('jarbis_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Configurações</h1>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-4">Minha conta</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-black text-lg">{user?.full_name?.[0] || '?'}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.full_name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-2">Plano</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Gratuito</p>
              <p className="text-sm text-gray-500 mt-0.5">5 dashboards · 3 datasets · 2 alertas</p>
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              Fazer upgrade
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
