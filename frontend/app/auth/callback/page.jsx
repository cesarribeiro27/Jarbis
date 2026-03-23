'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function OAuthCallback() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const userRaw = params.get('user')
    const error = params.get('error')

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`)
      return
    }

    if (!token) {
      router.replace('/login')
      return
    }

    async function finishAuth() {
      localStorage.setItem('jarbis_token', token)
      if (userRaw) {
        try {
          const user = JSON.parse(decodeURIComponent(userRaw))
          localStorage.setItem('jarbis_user', JSON.stringify(user))
        } catch {}
      }

      // Claim preview se o usuário veio da home com arquivo/sheets
      const previewToken = sessionStorage.getItem('preview_token')
      if (previewToken) {
        try {
          const res = await fetch(`${API_BASE}/reports/preview/${previewToken}/claim`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const claimed = await res.json()
            sessionStorage.removeItem('preview_token')
            if (claimed?.dataset_id) {
              router.replace(
                `/dashboards/novo?from=preview&dataset_id=${claimed.dataset_id}&ds_name=${encodeURIComponent(claimed.name || 'Meu Dashboard')}`
              )
              return
            }
          }
        } catch (e) {
          console.warn('[oauth] claimPreview falhou:', e?.message)
        }
        sessionStorage.removeItem('preview_token')
      }

      // Verificar se há dashboard pendente (usuário que precisou verificar email)
      const pendingDatasetId = sessionStorage.getItem('pending_dashboard_dataset_id')
      const pendingDsName = sessionStorage.getItem('pending_dashboard_ds_name')
      if (pendingDatasetId) {
        sessionStorage.removeItem('pending_dashboard_dataset_id')
        sessionStorage.removeItem('pending_dashboard_ds_name')
        router.replace(
          `/dashboards/novo?from=preview&dataset_id=${pendingDatasetId}&ds_name=${encodeURIComponent(pendingDsName || 'Meu Dashboard')}`
        )
        return
      }

      router.replace('/dashboard')
    }

    finishAuth()
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10 flex-shrink-0">
          <div className="absolute inset-0 bg-violet-600 rounded-xl rotate-[8deg]" />
          <div className="absolute inset-0 bg-violet-500 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <rect x="3" y="10" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="8" y="6" width="4" height="11" rx="1" fill="white" />
              <rect x="13" y="3" width="4" height="14" rx="1" fill="white" fillOpacity="0.7" />
            </svg>
          </div>
        </div>
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OAuthCallback />
    </Suspense>
  )
}
