'use client'
import Script from 'next/script'

export default function GoogleAdsConfig() {
  return (
    <Script id="google-ads-config" strategy="afterInteractive">{`
      gtag('config', 'AW-17421636806');
    `}</Script>
  )
}
