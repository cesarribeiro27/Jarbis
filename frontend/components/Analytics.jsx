'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import ConsentBanner from './ConsentBanner'

const CONSENT_KEY = 'jarbis_consent'

function isEuropeanTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/')
  } catch {
    return false
  }
}

export default function Analytics() {
  const pathname = usePathname()
  const [showBanner, setShowBanner] = useState(false)

  // Determina consentimento na montagem
  useEffect(() => {
    const isEU = isEuropeanTimezone()
    const stored = localStorage.getItem(CONSENT_KEY)

    if (!isEU || stored === 'granted') {
      // Não-europeu ou europeu que já aceitou: libera analytics
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
      })
    } else if (isEU && stored === null) {
      // Europeu sem decisão: exibe banner
      setShowBanner(true)
    }
    // stored === 'denied': mantém defaults negados (já definidos no layout)
  }, [])

  // Pageview em cada navegação SPA
  useEffect(() => {
    window.gtag?.('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
    })
  }, [pathname])

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, 'granted')
    window.gtag?.('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted' })
    setShowBanner(false)
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, 'denied')
    setShowBanner(false)
  }

  if (!showBanner) return null
  return <ConsentBanner onAccept={handleAccept} onDecline={handleDecline} />
}
