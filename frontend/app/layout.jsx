import './globals.css'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/lib/toast'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import ThemeProvider from '@/components/ThemeProvider'
import Script from 'next/script'
import GoogleAdsConfig from '@/components/GoogleAdsConfig'
import Analytics from '@/components/Analytics'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Jarbis',
  description: 'Dashboards profissionais, analytics avançado e relatórios interativos. Simples de configurar, poderoso para crescer.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={inter.variable}>
      <body className="antialiased">
        <Script src="https://www.googletagmanager.com/gtag/js?id=GT-NCNR47TR" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', wait_for_update: 2000 });
          gtag('js', new Date());
          gtag('config', 'GT-NCNR47TR');
        `}</Script>
        <GoogleAdsConfig />
        <Analytics />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
