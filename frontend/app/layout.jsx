import './globals.css'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/lib/toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Jarbis — BI embarcado para empresas brasileiras',
  description: 'Dashboards profissionais, analytics avançado e relatórios interativos. Simples de configurar, poderoso para crescer.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
