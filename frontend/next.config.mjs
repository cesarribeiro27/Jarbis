import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // BACKEND_URL aponta sempre para o Railway (server-side, nunca exposta ao browser).
    // Em produção, NEXT_PUBLIC_API_URL = '/api-proxy' e BACKEND_URL = URL do Railway.
    // Em desenvolvimento, NEXT_PUBLIC_API_URL = 'http://localhost:8000' e BACKEND_URL não é necessária.
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/l/:slug',
        destination: `${backendUrl}/l/:slug`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
