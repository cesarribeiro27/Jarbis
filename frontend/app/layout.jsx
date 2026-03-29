import './globals.css'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/lib/toast'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import ThemeProvider from '@/components/ThemeProvider'
import Script from 'next/script'
import GoogleAdsConfig from '@/components/GoogleAdsConfig'

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
          gtag('js', new Date());
          gtag('config', 'GT-NCNR47TR');
          gtag('config', 'G-LX3PPJWZH6');
        `}</Script>
        <GoogleAdsConfig />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
