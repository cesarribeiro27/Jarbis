import './globals.css'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/lib/toast'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import ThemeProvider from '@/components/ThemeProvider'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Jarbis',
  description: 'Dashboards profissionais, analytics avançado e relatórios interativos. Simples de configurar, poderoso para crescer.',
}

export default async function RootLayout({ children }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={inter.variable}>
      <body className="antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17421636806"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-17421636806');
        `}</Script>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
