'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const ReportBuilder = dynamic(() => import('@/components/ReportBuilder'), { ssr: false })

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function PublicReportPage() {
  const { token } = useParams()
  const searchParams = useSearchParams()
  const logoUrl = searchParams.get('logo')
  const accentColor = searchParams.get('accent') || '#111827'
  const [report, setReport] = useState(null)
  const [activePageId, setActivePageId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/reports/public/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Relatório não encontrado ou link expirado')
        return r.json()
      })
      .then(r => {
        setReport(r)
        const pages = r.pages && r.pages.length > 0 ? r.pages : [{ id: 'page_1', blocks: r.blocks || [] }]
        setActivePageId(pages[0].id)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-400 text-sm">Carregando relatório...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-center">
      <div>
        <p className="text-gray-900 font-bold text-lg mb-2">Link inválido</p>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    </div>
  )

  const pages = report.pages && report.pages.length > 0 ? report.pages : [{ id: 'page_1', blocks: report.blocks || [] }]
  const activeBlocks = pages.find(p => p.id === activePageId)?.blocks || report.blocks || []

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-3.5">
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} className="h-6 object-contain" alt="Logo" />
          ) : (
            <>
              <div className="w-6 h-6 rounded-sm bg-gray-950 flex items-center justify-center">
                <span className="text-white font-black text-xs">L</span>
              </div>
              <span className="text-gray-950 font-bold text-sm">Jarbis</span>
            </>
          )}
          <span className="text-gray-300 text-sm">·</span>
          <span className="text-gray-500 text-sm">Relatório Compartilhado</span>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-950 tracking-tight">{report.title}</h1>
          {report.description && <p className="text-gray-500 mt-2">{report.description}</p>}
        </div>

        {/* Tabs — múltiplas páginas */}
        {pages.length > 1 && (
          <div className="flex items-center gap-1 mb-6 border-b border-gray-100 pb-3">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => setActivePageId(page.id)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${activePageId === page.id ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {page.title || page.id}
              </button>
            ))}
          </div>
        )}

        <ReportBuilder blocks={activeBlocks} readOnly shareToken={token} />
      </main>

      <footer className="border-t border-gray-100 mt-12 py-6 text-center text-xs text-gray-400">
        Relatório gerado por <span className="font-bold text-gray-700">Jarbis</span>
      </footer>
    </div>
  )
}
