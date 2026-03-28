'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useTranslations, useLocale } from 'next-intl'

const PALETTE = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2', '#7c3aed', '#16a34a']

function PreviewThumb({ report, color }) {
  const seed = report.id?.charCodeAt?.(0) ?? 0
  const bars = [45, 72, 55, 88, 63, 79, 50, 94, 68, 82].map((v, i) => v + ((seed + i * 7) % 20) - 10)
  const max = Math.max(...bars)
  return (
    <div className="w-full h-full flex items-end gap-0.5 px-2 pb-1.5 pt-3">
      {bars.slice(0, 8).map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ height: `${(v / max) * 68}%`, backgroundColor: color, opacity: 0.15 + (i % 3) * 0.2 }}
        />
      ))}
    </div>
  )
}

// ─── Cropper estilo Instagram ────────────────────────────────────────────────
function ImageCropperModal({ onSave, onClose }) {
  const t = useTranslations('dashboards')
  const [imgSrc, setImgSrc] = useState(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const containerRef = useRef()
  const fileRef = useRef()

  // Área de corte proporcional à capa real do card:
  // card ~395px × h-36 (144px) → ratio 2.74:1 → a 480px de largura = 175px de altura
  const CROP_W = 480
  const CROP_H = 175

  function loadFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        // Escala a imagem para caber minimamente na área de corte
        const scale = Math.max(CROP_W / img.width, CROP_H / img.height)
        const w = img.width * scale
        const h = img.height * scale
        setImgSize({ w, h })
        setOffset({ x: -(w - CROP_W) / 2, y: -(h - CROP_H) / 2 })
        setImgSrc(ev.target.result)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  function onMouseDown(e) {
    e.preventDefault()
    setDragging(true)
    setDragStart({ mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y })
  }

  const onMouseMove = useCallback((e) => {
    if (!dragging || !dragStart) return
    const dx = e.clientX - dragStart.mx
    const dy = e.clientY - dragStart.my
    const newX = Math.min(0, Math.max(CROP_W - imgSize.w, dragStart.ox + dx))
    const newY = Math.min(0, Math.max(CROP_H - imgSize.h, dragStart.oy + dy))
    setOffset({ x: newX, y: newY })
  }, [dragging, dragStart, imgSize])

  const onMouseUp = useCallback(() => setDragging(false), [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  function handleSave() {
    if (!imgSrc) return
    const canvas = document.createElement('canvas')
    canvas.width = CROP_W
    canvas.height = CROP_H
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, offset.x, offset.y, imgSize.w, imgSize.h)
      onSave(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = imgSrc
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[540px] mx-4 sm:mx-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{t('cropper.title')}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {!imgSrc ? (
            /* Upload zone */
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-10 cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('cropper.clickToChoose')}</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP · Logo da empresa, foto, ilustração</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={loadFile} />
            </label>
          ) : (
            <>
              <p className="text-xs text-gray-400 text-center">{t('cropper.dragToAdjust')}</p>
              {/* Crop area */}
              <div
                ref={containerRef}
                className="relative mx-auto rounded-xl overflow-hidden select-none"
                style={{ width: CROP_W, height: CROP_H, cursor: dragging ? 'grabbing' : 'grab', background: '#e5e7eb' }}
                onMouseDown={onMouseDown}
              >
                {/* Imagem arrastável */}
                <img
                  src={imgSrc}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: offset.x,
                    top: offset.y,
                    width: imgSize.w,
                    height: imgSize.h,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
                {/* Grid de guia (estilo Instagram) */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                  backgroundSize: `${CROP_W/3}px ${CROP_H/3}px`,
                }} />
                {/* Borda de corte */}
                <div className="absolute inset-0 border-2 border-white/60 rounded-xl pointer-events-none" />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setImgSrc(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('cropper.swap')}
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
                >
                  {t('cropper.save')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Criar dashboard com IA ────────────────────────────────────────────
function AiCreateModal({ onClose }) {
  const router = useRouter()
  const [datasets, setDatasets] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [objetivo, setObjetivo] = useState('')
  const [step, setStep] = useState(0)  // 0=idle, 1-3=loading, 4=success, -1=error
  const [error, setError] = useState(null)

  const GEN_STEPS = [
    'Analisando colunas e métricas...',
    'Identificando padrões relevantes...',
    'Montando estrutura do dashboard...',
  ]
  const isLoading = step >= 1 && step <= 3

  useEffect(() => {
    api.reports.datasets.list()
      .then(d => { setDatasets(d || []) })
      .catch(() => {})
  }, [])

  function toggleId(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleGenerate() {
    if (!selectedIds.length || step > 0) return
    setError(null)
    setStep(1)
    const t1 = setTimeout(() => setStep(2), 2500)
    const t2 = setTimeout(() => setStep(3), 5000)
    try {
      const result = await api.reports.generateDashboard(selectedIds, objetivo.trim() || null)
      clearTimeout(t1); clearTimeout(t2)

      if (!result.blocks?.length) {
        setError('A IA não gerou blocos. Tente descrever o objetivo do dashboard.')
        setStep(-1)
        return
      }

      // Ordem: filtros (data + categoria) → KPIs → gráficos
      const filterBlocks = result.blocks.filter(b => b.type === 'filter')
      const kpis         = result.blocks.filter(b => b.type === 'kpi')
      const charts       = result.blocks.filter(b => b.type !== 'filter' && b.type !== 'kpi')
      let curX = 0, curY = 0, rowH = 0
      const blocksWithLayout = [...filterBlocks, ...kpis, ...charts].map(b => {
        const isKpi = b.type === 'kpi'
        const w = b.layout?.w || (isKpi ? 3 : 6)
        const h = b.layout?.h || (isKpi ? 2 : 4)
        if (curX + w > 12) { curY += rowH; curX = 0; rowH = 0 }
        const layout = { x: curX, y: curY, w, h }
        curX += w
        rowH = Math.max(rowH, h)
        return { ...b, id: b.id || crypto.randomUUID(), layout }
      })

      const primaryDs = datasets.find(d => d.id === selectedIds[0])
      const dsNames = selectedIds.map(id => datasets.find(d => d.id === id)?.name).filter(Boolean)
      const title = objetivo.trim() || (dsNames.length > 1 ? `Dashboard — ${dsNames[0]} +${dsNames.length - 1}` : `Dashboard — ${dsNames[0] || 'Dataset'}`)
      const report = await api.reports.create({
        title,
        pages: [{ id: crypto.randomUUID(), title: 'Página 1', blocks: blocksWithLayout }],
        dataset_ids: selectedIds,
      })

      setStep(4)
      setTimeout(() => {
        onClose()
        router.push(`/dashboards/${report.id}`)
      }, 1500)
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2)
      setError(e.message || 'Erro ao gerar dashboard.')
      setStep(-1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-800 text-sm">Criar dashboard com IA</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {(step === 0 || step === -1) && (
            <>
              {datasets.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Nenhum dataset importado</p>
                  <p className="text-xs text-gray-400 mb-4">Importe seus dados primeiro para a IA analisar</p>
                  <button
                    onClick={() => { onClose(); router.push('/datasets') }}
                    className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
                  >
                    Importar dados agora
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Fontes de dados
                      {selectedIds.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">{selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}</span>
                      )}
                    </label>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                      {datasets.map(ds => {
                        const checked = selectedIds.includes(ds.id)
                        const typeColor = ds.type === 'api' ? 'bg-blue-50 text-blue-600' : ds.type === 'database' ? 'bg-emerald-50 text-emerald-700' : ds.type === 'google-analytics' ? 'bg-orange-50 text-orange-600' : 'bg-violet-50 text-violet-600'
                        const typeLabel = ds.type === 'api' ? 'API' : ds.type === 'database' ? 'DB' : ds.type === 'google-analytics' ? 'GA' : 'CSV'
                        return (
                          <button
                            key={ds.id}
                            onClick={() => toggleId(ds.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors ${checked ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-200 hover:bg-violet-50/40'}`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>
                              {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${typeColor}`}>{typeLabel}</span>
                            <span className="text-sm font-medium text-gray-800 truncate flex-1">{ds.name}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{(ds.row_count || 0).toLocaleString()} lin.</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      O que você quer analisar? <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={objetivo}
                      onChange={e => setObjetivo(e.target.value)}
                      placeholder="Ex: faturamento mensal por cliente, análise de vendas por produto, tendência de crescimento..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                    />
                  </div>

                  {step === -1 && error && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <div>
                        <p className="text-xs text-red-600">{error}</p>
                        <button onClick={() => setStep(0)} className="text-xs text-violet-600 hover:underline mt-1">Tentar novamente</button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={!selectedIds.length}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    {selectedIds.length > 1 ? `Gerar com ${selectedIds.length} fontes` : 'Gerar dashboard agora'}
                  </button>

                  <p className="text-[11px] text-gray-400 text-center">
                    O Jarbis analisa todas as colunas e cria KPIs e gráficos posicionados de forma inteligente.
                  </p>
                </>
              )}
            </>
          )}

          {isLoading && (
            <div className="py-8 flex flex-col items-center gap-5">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 text-violet-100" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <svg className="w-16 h-16 text-violet-500 animate-spin absolute inset-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-violet-700">{GEN_STEPS[step - 1]}</p>
                <p className="text-xs text-gray-400 mt-1">Usando IA para criar um dashboard relevante</p>
              </div>
              <div className="flex gap-2">
                {GEN_STEPS.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all duration-500 ${i < step ? 'w-6 h-1.5 bg-violet-500' : 'w-2 h-2 bg-gray-200'}`} />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-800">Dashboard criado com sucesso!</p>
              <p className="text-xs text-gray-400">Abrindo em instantes...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const COLLECTION_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2']

function CollectionModal({ onClose, onSave, initial }) {
  const editing = !!initial
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || '#7c3aed')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), color)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{editing ? 'Editar pasta' : 'Nova pasta'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Nome</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Marketing, Financeiro..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-gray-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Cor</label>
            <div className="flex gap-2">
              {COLLECTION_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {saving ? (editing ? 'Salvando...' : 'Criando...') : (editing ? 'Salvar' : 'Criar pasta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddToCollectionPicker({ collections, reportId, onAdd, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-40 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1" onClick={e => e.stopPropagation()}>
      {collections.length === 0 ? (
        <p className="px-4 py-3 text-xs text-gray-400">Nenhuma pasta criada ainda.</p>
      ) : (
        collections.map(col => (
          <button
            key={col.id}
            onClick={() => { onAdd(reportId, col.id); onClose() }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.color || '#7c3aed' }} />
            <span className="truncate">{col.name}</span>
          </button>
        ))
      )}
    </div>
  )
}

export default function DashboardsPage() {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations('dashboards')
  const locale = useLocale()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [cropTargetId, setCropTargetId] = useState(null)

  // Collections state
  const [collections, setCollections] = useState([])
  const [activeCollection, setActiveCollection] = useState(null)
  const [collectionReportIds, setCollectionReportIds] = useState(null)
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null) // { id, name, color }
  const [collectionMenu, setCollectionMenu] = useState(null) // collection id with menu open
  const [addToCollPicker, setAddToCollPicker] = useState(null) // reportId with picker open
  const [showAiCreate, setShowAiCreate] = useState(false)

  useEffect(() => {
    fetchReports()
    fetchCollections()
  }, [])

  useEffect(() => {
    if (activeCollection) {
      api.reports.collections.listReports(activeCollection)
        .then(data => setCollectionReportIds((data || []).map(r => r.id)))
        .catch(() => setCollectionReportIds([]))
    } else {
      setCollectionReportIds(null)
    }
  }, [activeCollection])

  function fetchReports() {
    api.reports.list()
      .then(data => setReports(data || []))
      .catch(() => toast(t('toast.loadError'), 'error'))
      .finally(() => setLoading(false))
  }

  function fetchCollections() {
    api.reports.collections.list()
      .then(data => setCollections(data || []))
      .catch(() => {})
  }

  async function handleCreateCollection(name, color) {
    try {
      await api.reports.collections.create({ name, color })
      await fetchCollections()
    } catch (err) {
      toast(err.message || 'Erro ao criar pasta', 'error')
      throw err
    }
  }

  async function handleUpdateCollection(name, color) {
    if (!editingCollection) return
    try {
      await api.reports.collections.update(editingCollection.id, { name, color })
      await fetchCollections()
      toast('Pasta atualizada', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao atualizar pasta', 'error')
      throw err
    }
  }

  async function handleDeleteCollection(id) {
    try {
      await api.reports.collections.delete(id)
      setCollections(prev => prev.filter(c => c.id !== id))
      if (activeCollection === id) setActiveCollection(null)
      setCollectionMenu(null)
      toast('Pasta excluída', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao excluir pasta', 'error')
    }
  }

  async function handleRemoveFromCollection(reportId, collectionId) {
    try {
      await api.reports.collections.removeReport(collectionId, reportId)
      await fetchCollections()
      if (activeCollection === collectionId) {
        const data = await api.reports.collections.listReports(collectionId)
        setCollectionReportIds((data || []).map(r => r.id))
      }
      toast('Dashboard removido da pasta', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao remover da pasta', 'error')
    }
  }

  async function handleAddToCollection(reportId, collectionId) {
    try {
      await api.reports.collections.addReport(collectionId, reportId)
      await fetchCollections()
      if (activeCollection === collectionId) {
        const data = await api.reports.collections.listReports(collectionId)
        setCollectionReportIds((data || []).map(r => r.id))
      }
      toast('Dashboard adicionado à pasta', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao adicionar à pasta', 'error')
    }
  }

  async function handleDelete(id) {
    try {
      await api.reports.delete(id)
      setReports(prev => prev.filter(r => r.id !== id))
      setDeleteConfirm(null)
      setMenuOpen(null)
      toast(t('toast.deleted'), 'success')
    } catch (err) {
      toast(err.message || t('toast.deleteError'), 'error')
    }
  }

  async function handleShare(id) {
    try {
      const res = await api.reports.share(id)
      const report = reports.find(r => r.id === id)
      const lang = report?.language || 'pt-BR'
      const shareUrl = `${window.location.origin}/r/${res.token}?lang=${lang}`
      await navigator.clipboard.writeText(shareUrl)
      toast(t('toast.copied'), 'success')
      setMenuOpen(null)
      setReports(prev => prev.map(r => r.id === id ? { ...r, is_shared: true, share_token: res.token } : r))
    } catch (err) {
      toast(err.message || t('toast.shareError'), 'error')
    }
  }

  async function handleClone(id) {
    try {
      const cloned = await api.reports.clone(id)
      setMenuOpen(null)
      toast(t('toast.cloned'), 'success')
      router.push(`/dashboards/${cloned.id}`)
    } catch (err) {
      toast(err.message || t('toast.cloneError'), 'error')
    }
  }

  async function handleSaveCover(reportId, coverDataUrl) {
    try {
      await api.reports.update(reportId, { cover_image: coverDataUrl })
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, cover_image: coverDataUrl } : r))
      setCropTargetId(null)
      setMenuOpen(null)
      toast(t('toast.coverSaved'), 'success')
    } catch (err) {
      toast(t('toast.coverError'), 'error')
    }
  }

  async function handleRemoveCover(reportId) {
    try {
      await api.reports.update(reportId, { cover_image: '' })
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, cover_image: null } : r))
      setMenuOpen(null)
      toast(t('toast.coverRemoved'), 'success')
    } catch (err) {
      toast(t('toast.coverRemoveError'), 'error')
    }
  }

  const filtered = reports.filter(r => {
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase())) return false
    if (collectionReportIds !== null && !collectionReportIds.includes(r.id)) return false
    return true
  })

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {reports.length > 0 ? (reports.length === 1 ? t('subtitleOne') : t('subtitleMany', { count: reports.length })) : t('subtitleEmpty')}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboards/novo')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200 sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            {t('newBtn')}
          </button>
        </div>

        {/* Search */}
        {reports.length > 4 && (
          <div className="relative mb-6">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-sm pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Collections sidebar — oculta no mobile */}
          <div className="hidden md:block w-48 flex-shrink-0" onClick={() => setCollectionMenu(null)}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Pastas</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveCollection(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${!activeCollection ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                <span>Todos</span>
                <span className="ml-auto text-xs text-gray-400">{reports.length}</span>
              </button>
              {collections.map(col => (
                <div key={col.id} className="relative group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setActiveCollection(activeCollection === col.id ? null : col.id); setCollectionMenu(null) }}
                    onKeyDown={e => e.key === 'Enter' && setActiveCollection(activeCollection === col.id ? null : col.id)}
                    className={`w-full cursor-pointer px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeCollection === col.id ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color || '#7c3aed' }} />
                    <span className="truncate flex-1">{col.name}</span>
                    <span className="text-xs text-gray-400 group-hover:hidden">{col.report_count}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setCollectionMenu(collectionMenu === col.id ? null : col.id) }}
                      className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 shrink-0"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>
                  </div>
                  {collectionMenu === col.id && (
                    <div className="absolute left-0 top-full mt-0.5 z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingCollection(col); setCollectionMenu(null) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Renomear
                      </button>
                      <button
                        onClick={() => { if (confirm(`Excluir pasta "${col.name}"? Os dashboards não serão excluídos.`)) handleDeleteCollection(col.id) }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Excluir pasta
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowNewCollection(true)}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nova pasta
              </button>
            </div>
          </div>

          {/* Dashboard grid */}
          <div className="flex-1 min-w-0">

            {/* Collections chips — mobile only */}
            {collections.length > 0 && (
              <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4 scrollbar-none">
                <button
                  onClick={() => setActiveCollection(null)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!activeCollection ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                  Todos
                </button>
                {collections.map(col => (
                  <button
                    key={col.id}
                    onClick={() => setActiveCollection(activeCollection === col.id ? null : col.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeCollection === col.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color || '#7c3aed' }} />
                    {col.name}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-52 animate-pulse" />)}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-14 text-center shadow-sm">
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
                  </svg>
                </div>
                {search ? (
                  <>
                    <p className="font-semibold text-gray-700 mb-1">{t('noResults', { query: search })}</p>
                    <button onClick={() => setSearch('')} className="text-sm text-violet-600 hover:underline mt-2">{t('clearSearch')}</button>
                  </>
                ) : activeCollection ? (
                  <>
                    <p className="font-semibold text-gray-800 mb-2">Nenhum dashboard nesta pasta</p>
                    <p className="text-sm text-gray-400">Adicione dashboards a esta pasta usando o menu de contexto dos cards.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-800 mb-1">{t('empty.title')}</p>
                    <p className="text-sm text-gray-400 mb-6">{t('empty.desc')}</p>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        onClick={() => setShowAiCreate(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Criar com IA
                      </button>
                      <button
                        onClick={() => router.push('/dashboards/novo')}
                        className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                      >
                        Ou criar em branco
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* ✨ Card hero — Criar com IA */}
                <div
                  onClick={() => setShowAiCreate(true)}
                  className="relative rounded-2xl border border-dashed border-violet-300 bg-gradient-to-br from-violet-50 to-violet-100/40 shadow-sm cursor-pointer hover:shadow-md hover:border-violet-500 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <div className="h-36 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      </div>
                      <span className="text-xs text-violet-500 font-medium">Clique para gerar</span>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-violet-400" />
                  <div className="px-4 py-3 border-t border-violet-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-violet-700">Criar com IA</span>
                      <span className="text-[10px] bg-violet-600 text-white font-semibold px-2 py-0.5 rounded-full">Novo</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">IA analisa seus dados e gera automaticamente</p>
                  </div>
                </div>

                {filtered.map((r, i) => {
                  const color = PALETTE[i % PALETTE.length]
                  return (
                    <div
                      key={r.id}
                      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-200 relative group ${menuOpen === r.id ? 'z-20' : ''}`}
                      onClick={() => router.push(`/dashboards/${r.id}`)}
                    >
                      {/* Preview / Capa */}
                      <div
                        className="h-36 relative overflow-hidden rounded-t-2xl"
                        style={r.cover_image ? {} : { background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)` }}
                      >
                        {r.cover_image ? (
                          <img
                            src={r.cover_image}
                            alt="Capa"
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <PreviewThumb report={r} color={color} />
                        )}
                        {/* Barra de cor no topo */}
                        {!r.cover_image && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: color }} />
                        )}
                        {/* Overlay escuro ao hover na capa */}
                        {r.cover_image && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                        )}

                        {/* Botão de 3 pontos */}
                        <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === r.id ? null : r.id); setDeleteConfirm(null); setAddToCollPicker(null) }}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white transition-all shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>
                        </div>

                        {/* Botão "Adicionar capa" inline quando sem capa */}
                        {!r.cover_image && (
                          <button
                            onClick={e => { e.stopPropagation(); setCropTargetId(r.id) }}
                            className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-[11px] font-semibold text-gray-600 hover:bg-white transition-all shadow-sm"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            {t('addCoverBtn')}
                          </button>
                        )}
                      </div>

                      {/* Dropdown fora do overflow-hidden para não ser cortado */}
                      {menuOpen === r.id && (
                        <div className="absolute right-2 top-10 z-30 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { router.push(`/dashboards/${r.id}`); setMenuOpen(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            {t('menu.edit')}
                          </button>
                          <button onClick={() => { setCropTargetId(r.id); setMenuOpen(null) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {r.cover_image ? t('menu.changeCover') : t('menu.addCover')}
                          </button>
                          {r.cover_image && (
                            <button onClick={() => handleRemoveCover(r.id)} className="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              {t('menu.removeCover')}
                            </button>
                          )}
                          {/* Pasta: adicionar ou remover */}
                          {activeCollection && collectionReportIds?.includes(r.id) ? (
                            <button
                              onClick={() => { handleRemoveFromCollection(r.id, activeCollection); setMenuOpen(null) }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" /></svg>
                              Remover da pasta
                            </button>
                          ) : (
                            <div className="relative">
                              <button
                                onClick={e => { e.stopPropagation(); setAddToCollPicker(addToCollPicker === r.id ? null : r.id) }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                                Adicionar à pasta
                              </button>
                              {addToCollPicker === r.id && (
                                <AddToCollectionPicker
                                  collections={collections}
                                  reportId={r.id}
                                  onAdd={handleAddToCollection}
                                  onClose={() => setAddToCollPicker(null)}
                                />
                              )}
                            </div>
                          )}
                          <button onClick={() => handleShare(r.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            {t('menu.copyLink')}
                          </button>
                          <button onClick={() => handleClone(r.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            {t('menu.clone')}
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                          {deleteConfirm === r.id ? (
                            <div className="px-4 py-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">{t('menu.confirmDelete')}</p>
                              <div className="flex gap-3">
                                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 font-bold hover:underline">{t('menu.delete')}</button>
                                <button onClick={() => { setDeleteConfirm(null); setMenuOpen(null) }} className="text-xs text-gray-400 hover:underline">{t('menu.cancel')}</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(r.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              {t('menu.delete')}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Card body */}
                      <div className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug truncate">{r.title}</h3>
                          {r.is_shared && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">{t('public')}</span>
                          )}
                        </div>
                        {r.description && (
                          <p className="text-xs text-gray-400 line-clamp-1 mb-2">{r.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs text-gray-400">{r.block_count ?? 0} {r.block_count === 1 ? t('block') : t('blocks')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5 text-xs text-gray-400" title="Visualizações do link público">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                              {r.view_count ?? 0}
                            </span>
                            <span className="text-xs text-gray-300">{new Date(r.updated_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cropper modal */}
      {cropTargetId && (
        <ImageCropperModal
          onSave={dataUrl => handleSaveCover(cropTargetId, dataUrl)}
          onClose={() => setCropTargetId(null)}
        />
      )}

      {showAiCreate && <AiCreateModal onClose={() => setShowAiCreate(false)} />}

      {/* Collection modals */}
      {showNewCollection && (
        <CollectionModal
          onClose={() => setShowNewCollection(false)}
          onSave={handleCreateCollection}
        />
      )}
      {editingCollection && (
        <CollectionModal
          initial={editingCollection}
          onClose={() => setEditingCollection(null)}
          onSave={handleUpdateCollection}
        />
      )}
    </AppLayout>
  )
}
