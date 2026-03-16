/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Em dev, faz proxy das chamadas /api/* para o backend de produção
    // Isso evita erros de CORS ao rodar localmente
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
