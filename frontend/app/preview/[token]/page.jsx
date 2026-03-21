'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LogoA } from '@/components/logos/JarbisLogo'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

// Gera blocos fake desfocados baseados nos metadados reais
function generatePreviewBlocks(stats = []) {
  const numericStats = stats.filter(s => s.type === 'numeric')
  const textStats = stats.filter(s => s.type === 'text')

  const blocks = []
  numericStats.slice(0, 4).forEach((s, i) => blocks.push({ type: 'kpi', col: s.col, index: i }))
  if (numericStats.length > 0 && textStats.length > 0) blocks.push({ type: 'bar' })
  if (numericStats.length > 1) blocks.push({ type: 'line' })
  return blocks
}

function MockKpiCard({ index }) {
  const values = ['R$ 248.750', '1.284', '4,7%', 'R$ 87.320']
  const labels = ['Receita Total', 'Registros', 'Taxa Conv.', 'Valor Médio']
  const changes = ['+23%', '+12%', '-0,3%', '+8%']
  const colors = ['text-emerald-400', 'text-emerald-400', 'text-red-400', 'text-emerald-400']
  return (
    <div className="rounded-xl p-4 border border-white/10 select-none" style={{ background: '#1C1929' }}>
      <div className="text-xs text-gray-500 mb-1">{labels[index % 4]}</div>
      <div className="text-xl font-black text-white mb-1 blur-sm select-none">{values[index % 4]}</div>
      <div className={`text-xs font-semibold blur-sm ${colors[index % 4]}`}>{changes[index % 4]}</div>
    </div>
  )
}

function MockBarChart() {
  const heights = [40, 65, 45, 82, 60, 78, 55, 90, 70, 48, 85, 72]
  return (
    <div className="rounded-xl p-4 border border-white/10 col-span-2" style={{ background: '#1C1929' }}>
      <div className="text-xs text-gray-500 mb-4">Análise por período</div>
      <div className="flex items-end gap-1.5 h-28 blur-sm">
        {heights.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{
            height: `${h}%`,
            background: i === heights.length - 1 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : 'rgba(124,58,237,0.3)'
          }} />
        ))}
      </div>
    </div>
  )
}

function MockLineChart() {
  return (
    <div className="rounded-xl p-4 border border-white/10" style={{ background: '#1C1929' }}>
      <div className="text-xs text-gray-500 mb-4">Tendência</div>
      <svg viewBox="0 0 200 80" className="w-full h-20 blur-sm">
        <polyline
          points="0,60 20,50 40,55 60,35 80,40 100,25 120,30 140,20 160,25 180,15 200,10"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <polyline
          points="0,60 20,50 40,55 60,35 80,40 100,25 120,30 140,20 160,25 180,15 200,10"
          fill="url(#grad)"
          stroke="none"
          opacity="0.2"
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export default function PreviewPage() {
  const { token } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/reports/preview/${token}`)
        if (!res.ok) throw new Error('not found')
        const json = await res.json()
        setData(json)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0A1A' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Carregando preview...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0A1A' }}>
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-4">⏱️</div>
        <h2 className="text-white font-bold text-xl mb-2">Preview expirado</h2>
        <p className="text-gray-400 text-sm mb-6">O preview expira após 24 horas. Suba novamente para continuar.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-6 py-3 rounded-full hover:bg-violet-500 transition-colors">
          Voltar ao início
        </Link>
      </div>
    </div>
  )

  const blocks = generatePreviewBlocks(data?.stats || [])
  const fileName = data?.file_name || 'seus-dados'
  const rowCount = data?.row_count || 0
  const colCount = (data?.columns || []).length

  return (
    <div className="min-h-screen" style={{ background: '#0B0A1A' }}>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoA size={28} light />
            <span className="font-black text-[16px] text-white tracking-tight">jarbis</span>
          </div>
          <Link
            href={`/signup?ref=preview&token=${token}`}
            className="bg-violet-600 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-violet-500 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>
      </nav>

      {/* CONTEÚDO DESFOCADO */}
      <div className="pt-14 relative">
        {/* Header do dashboard */}
        <div className="px-6 py-5 border-b border-white/5" style={{ background: '#13111F' }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-base">{fileName}</h1>
                <p className="text-xs text-gray-500">{rowCount.toLocaleString('pt-BR')} linhas · {colCount} colunas</p>
              </div>
              <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                IA analisou {colCount} colunas
              </div>
            </div>
          </div>
        </div>

        {/* Grid de blocos desfocados */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[0, 1, 2, 3].map(i => <MockKpiCard key={i} index={i} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MockBarChart />
            <MockLineChart />
          </div>
        </div>

        {/* OVERLAY DE CADASTRO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="fixed inset-0 top-14 z-40 flex items-center justify-center px-6"
          style={{ background: 'linear-gradient(to bottom, rgba(11,10,26,0) 0%, rgba(11,10,26,0.6) 30%, rgba(11,10,26,0.95) 60%, #0B0A1A 100%)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5, ease: 'easeOut' }}
            className="max-w-md w-full text-center"
            style={{ marginTop: '20vh' }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold px-4 py-2 rounded-full mb-5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Seu dashboard está pronto!
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              Crie sua conta grátis<br />
              <span style={{ background: 'linear-gradient(135deg, #a78bfa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                para acessar tudo
              </span>
            </h2>

            <p className="text-gray-400 text-sm mb-2">
              A IA analisou <strong className="text-white">{rowCount.toLocaleString('pt-BR')} linhas</strong> e {colCount} colunas do seu arquivo.
            </p>
            <p className="text-gray-500 text-sm mb-7">
              Crie sua conta para salvar o dashboard, editar os blocos e compartilhar com seu time.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={`/signup?ref=preview&token=${token}`}
                  className="inline-flex items-center justify-center gap-2 bg-violet-600 text-white font-bold px-8 py-4 rounded-full hover:bg-violet-500 transition-all text-base shadow-lg shadow-violet-900/60 w-full sm:w-auto"
                >
                  Criar conta grátis
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </motion.div>
              <Link href="/login" className="inline-flex items-center justify-center border border-white/10 text-gray-300 font-semibold px-8 py-4 rounded-full hover:bg-white/5 transition-all text-base">
                Já tenho conta
              </Link>
            </div>

            <p className="text-xs text-gray-600 mt-5">
              Grátis para sempre · Sem cartão · Cancele quando quiser
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
