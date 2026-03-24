'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'

const PALETTE_PRESETS = [
  { name: 'Jarbis', colors: ['#6D28D9', '#7C3AED', '#10b981', '#f59e0b', '#3b82f6'] },
  { name: 'Oceano', colors: ['#0ea5e9', '#0284c7', '#06b6d4', '#6366f1', '#8b5cf6'] },
  { name: 'Terra', colors: ['#d97706', '#b45309', '#78350f', '#16a34a', '#15803d'] },
  { name: 'Noite', colors: ['#1e1b4b', '#3730a3', '#4338ca', '#6366f1', '#818cf8'] },
  { name: 'Coral', colors: ['#dc2626', '#e11d48', '#f97316', '#f59e0b', '#eab308'] },
]

const DEFAULT_COLORS = ['#6D28D9', '#10b981', '#3b82f6', '#f59e0b', '#ef4444']

function ColorSwatch({ color, onChange, index }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        <div
          className="w-12 h-12 rounded-2xl border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          value={color}
          onChange={e => onChange(index, e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title="Clique para alterar a cor"
        />
      </div>
      <span className="text-[10px] font-mono text-gray-500">{color.toUpperCase()}</span>
    </div>
  )
}

function ChartPreview({ colors }) {
  const bars = [65, 90, 45, 78, 55, 82, 38]
  return (
    <div className="flex items-end gap-1.5 h-20 px-2">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md transition-all duration-300"
          style={{ height: `${h}%`, backgroundColor: colors[i % colors.length] }}
        />
      ))}
    </div>
  )
}

export default function MarcaPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState(null)
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false)

  const [colors, setColors] = useState(DEFAULT_COLORS)
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')

  useEffect(() => {
    api.brand.get()
      .then(data => {
        if (data.brand_colors?.length > 0) setColors([...data.brand_colors, ...DEFAULT_COLORS].slice(0, 5))
        if (data.custom_logo_url) setLogoUrl(data.custom_logo_url)
        if (data.primary_color) setPrimaryColor(data.primary_color)
        setPlan(data.plan)
        setWhiteLabelEnabled(data.white_label_enabled)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function updateColor(index, value) {
    setColors(prev => prev.map((c, i) => i === index ? value : c))
  }

  function applyPreset(preset) {
    setColors([...preset.colors])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { brand_colors: colors }
      if (whiteLabelEnabled) {
        payload.custom_logo_url = logoUrl || null
        payload.primary_color = primaryColor || null
      }
      await api.brand.save(payload)
      toast('Identidade visual salva com sucesso.', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-gray-100'

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Identidade Visual</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Defina a paleta de cores e o logo da sua marca. Aplicados automaticamente aos dashboards.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">

          {/* Paleta de cores */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Paleta da marca</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Até 5 cores — usadas nos gráficos dos seus dashboards.
            </p>

            {/* Swatches */}
            <div className="flex gap-5 mb-6">
              {colors.map((color, i) => (
                <ColorSwatch key={i} color={color} onChange={updateColor} index={i} />
              ))}
            </div>

            {/* Preview live */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Preview nos gráficos</p>
              <ChartPreview colors={colors} />
              <div className="flex gap-2 mt-3 flex-wrap">
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                    <span className="text-[10px] text-gray-500 font-mono">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Paletas prontas</p>
              <div className="flex gap-2 flex-wrap">
                {PALETTE_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                  >
                    <div className="flex gap-0.5">
                      {preset.colors.slice(0, 3).map((c, i) => (
                        <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* White-label (logo + cor primária) — planos avançados */}
          <div className={`bg-white dark:bg-gray-800 rounded-2xl border p-6 ${whiteLabelEnabled ? 'border-gray-100 dark:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-600 opacity-60'}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">White-label</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Logo e cor primária exibidos nos dashboards compartilhados e embeds.
                </p>
              </div>
              {!whiteLabelEnabled && (
                <span className="text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-2.5 py-1 rounded-full shrink-0">
                  Profissional+
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">URL do logo</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  disabled={!whiteLabelEnabled}
                  placeholder="https://suaempresa.com/logo.png"
                  className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                />
                {logoUrl && whiteLabelEnabled && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={logoUrl} alt="Preview logo" className="h-8 object-contain" onError={e => e.target.style.display = 'none'} />
                    <span className="text-xs text-gray-400">Preview do logo</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Cor primária</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={primaryColor || '#6D28D9'}
                    onChange={e => setPrimaryColor(e.target.value)}
                    disabled={!whiteLabelEnabled}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    disabled={!whiteLabelEnabled}
                    placeholder="#6D28D9"
                    className={`${inputClass} font-mono flex-1 disabled:opacity-40 disabled:cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>

            {!whiteLabelEnabled && (
              <div className="mt-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  White-label disponível nos planos <strong>Profissional</strong> e <strong>Business</strong>.{' '}
                  <a href="/configuracoes/planos" className="underline">Fazer upgrade</a>
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">As cores são aplicadas imediatamente ao criar ou editar dashboards.</p>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-violet-600 text-white font-bold text-sm rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar identidade visual'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
