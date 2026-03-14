import './globals.css'

export const metadata = {
  title: 'Jarbis — BI embarcado para empresas brasileiras',
  description: 'Dashboards profissionais, analytics avançado e relatórios interativos. Simples de configurar, poderoso para crescer.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
