'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const ReportBuilder = dynamic(() => import('@/components/ReportBuilder'), { ssr: false })

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function EmbedPage() {
  const { token } = useParams()
  const searchParams = useSearchParams()
  const [report, setReport] = useState(null)
  const [activePageId, setActivePageId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const containerRef = useRef(null)

  // Optional query params for customization
  const bg = searchParams.get('bg') || 'transparent'
  const hideTabs = searchParams.get('hide_tabs') === '1'
  const printMode = searchParams.get('print') === '1'

  // Auto-print when ?print=1 is set
  useEffect(() => {
    if (!printMode || loading || error || !report) return
    const timer = setTimeout(() => { window.print() }, 500)
    return () => clearTimeout(timer)
  }, [printMode, loading, error, report])

  useEffect(() => {
    fetch(`${API_URL}/reports/public/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('Link inválido ou expirado')
        return r.json()
      })
      .then(r => {
        setReport(r)
        const pages = r.pages && r.pages.length > 0 ? r.pages : [{ id: 'page_1', blocks: r.blocks || [] }]
        setActivePageId(pages[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  // Auto-resize: post height to parent window
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => {
      const height = containerRef.current?.scrollHeight || 0
      window.parent.postMessage({ type: 'lumetra:resize', height, token }, '*')
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [report])

  if (loading) return (
    <div className="flex items-center justify-center p-8 text-gray-400 text-sm">
      Carregando...
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center p-8 text-red-400 text-sm text-center">
      {error}
    </div>
  )

  const pages = report.pages && report.pages.length > 0 ? report.pages : [{ id: 'page_1', blocks: report.blocks || [] }]
  const activeBlocks = pages.find(p => p.id === activePageId)?.blocks || report.blocks || []

  return (
    <div ref={containerRef} style={{ background: bg }} className="p-4">
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4 landscape; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          button { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      {/* Tabs */}
      {!hideTabs && pages.length > 1 && (
        <div className="flex items-center gap-1 mb-4 flex-wrap">
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
    </div>
  )
}
