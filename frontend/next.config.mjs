import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${apiUrl}/:path*`,
      },
      {
        source: '/l/:slug/wa-open',
        destination: `${apiUrl}/l/:slug/wa-open`,
      },
      {
        source: '/l/:slug',
        destination: `${apiUrl}/l/:slug`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
