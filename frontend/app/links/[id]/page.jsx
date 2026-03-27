'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://jarbis.cc'
const DEVICE_COLORS = { mobile: '#7c3aed', desktop: '#a78bfa', tablet: '#ddd6fe', Outro: '#e5e7eb' }
const BROWSER_COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']

// ── Ícones ─────────────────────────────────────────────────────────────────
function IconBack() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
}
function IconCopy() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
}
function IconCheck() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function IconPlus() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function IconEdit() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function IconExternalLink() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
}
function IconLock() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
}
function IconX() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
function IconChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
}

// ── Copy Button ─────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 hover:bg-violet-100 hover:text-violet-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-violet-900/20 dark:hover:text-violet-400'}`}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? 'Copiado!' : label}
    </button>
  )
}

// ── Modal: Adicionar link ───────────────────────────────────────────────────
function AddLinkModal({ campaignId, planLimits, currentLinksCount, onClose, onCreated }) {
  const [originalUrl, setOriginalUrl] = useState('')
  const [name, setName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [slugMode, setSlugMode] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [slugError, setSlugError] = useState('')
  const toast = useToast()

  const maxLinks = planLimits?.links_per_campaign ?? 5
  const atLimit = maxLinks !== -1 && currentLinksCount >= maxLinks

  function validateSlug(v) {
    if (!v) { setSlugError(''); return }
    if (!/^[a-z0-9][a-z0-9\-_]{1,30}[a-z0-9]$/.test(v.toLowerCase())) {
      setSlugError('Use letras, números, hífen ou underscore (mín. 3 caracteres)')
    } else {
      setSlugError('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!originalUrl.trim() || !name.trim()) return
    if (slugMode === 'custom' && slugError) return
    setLoading(true)
    try {
      const body = { original_url: originalUrl.trim(), name: name.trim(), custom_slug: slugMode === 'custom' && customSlug.trim() ? customSlug.trim().toLowerCase() : null }
      const data = await api.fetch(`/links/campaigns/${campaignId}/links`, { method: 'POST', body: JSON.stringify(body) })
      onCreated(data)
      onClose()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('já está em uso')) { setSlugError(msg) }
      else { toast(msg || 'Erro ao criar link', 'error') }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Adicionar link</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Links não podem ser removidos após criados - fazem parte do banco de dados da campanha.</p>

        {atLimit && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Limite de {maxLinks} links por campanha atingido no seu plano.</p>
            <Link href="/configuracoes/planos" className="text-xs text-amber-700 dark:text-amber-400 underline">Fazer upgrade</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">URL de destino *</label>
            <input autoFocus type="url" value={originalUrl} onChange={e => setOriginalUrl(e.target.value)} placeholder="https://..." disabled={atLimit} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome identificador *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: claro_26_03_whatsapp_dark_post" disabled={atLimit} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50" />
            <p className="text-xs text-gray-400 mt-1">Use um nome que facilite o De/Para com seus relatórios.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Slug do link</label>
            <div className="flex gap-2 mb-3">
              <button type="button" disabled={atLimit} onClick={() => setSlugMode('auto')} className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${slugMode === 'auto' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>Gerar automaticamente</button>
              <button type="button" disabled={atLimit} onClick={() => setSlugMode('custom')} className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${slugMode === 'custom' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>Personalizar</button>
            </div>
            {slugMode === 'custom' && (
              <div>
                <div className={`flex items-center rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-violet-500 ${slugError ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}>
                  <span className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap shrink-0">{FRONTEND_URL}/l/</span>
                  <input value={customSlug} onChange={e => { setCustomSlug(e.target.value.toLowerCase()); validateSlug(e.target.value) }} placeholder="meu-link" className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none" />
                </div>
                {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || atLimit || !originalUrl.trim() || !name.trim() || (slugMode === 'custom' && !!slugError)} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-sm font-medium text-white transition-colors">{loading ? 'Criando...' : 'Criar link'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Editar link ─────────────────────────────────────────────────────
function EditLinkModal({ link, onClose, onSaved }) {
  const [name, setName] = useState(link.name)
  const [originalUrl, setOriginalUrl] = useState(link.original_url)
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const toast = useToast()

  function validateUrl(v) {
    if (!v.startsWith('http://') && !v.startsWith('https://')) {
      setUrlError('URL deve começar com http:// ou https://')
    } else {
      setUrlError('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !originalUrl.trim() || urlError) return
    const unchanged = name.trim() === link.name && originalUrl.trim() === link.original_url
    if (unchanged) { onClose(); return }
    setLoading(true)
    try {
      const data = await api.fetch(`/links/${link.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), original_url: originalUrl.trim() }),
      })
      onSaved(data)
      onClose()
    } catch (err) {
      toast(err.message || 'Erro ao salvar', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Editar link</h2>
        <p className="text-xs text-gray-400 mb-5">O slug (<span className="font-mono text-violet-500">/l/{link.slug}</span>) é permanente e não pode ser alterado.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">URL de destino</label>
            <input
              type="url"
              value={originalUrl}
              onChange={e => { setOriginalUrl(e.target.value); validateUrl(e.target.value) }}
              className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 ${urlError ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome identificador</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !name.trim() || !originalUrl.trim() || !!urlError} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-sm font-medium text-white transition-colors">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Barra horizontal reutilizável ────────────────────────────────────────────
function HBar({ label, clicks, total, color = '#7c3aed', labelWidth = 'w-24' }) {
  const pct = Math.round((clicks / (total || 1)) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs text-gray-700 dark:text-gray-300 ${labelWidth} truncate shrink-0`}>{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right tabular-nums shrink-0">{clicks}</span>
    </div>
  )
}

// ── Modal: Ver mais analytics ───────────────────────────────────────────────
function MoreAnalyticsModal({ analytics, label, onClose }) {
  if (!analytics) return null

  const totalCliques = analytics.total_clicks || 0
  const uniqueCliques = analytics.unique_clicks || 0
  const totalBrowser = analytics.by_browser?.reduce((s, b) => s + b.clicks, 0) || 0
  const totalOS = analytics.by_os?.reduce((s, b) => s + b.clicks, 0) || 0
  const totalDevice = analytics.by_device?.reduce((s, d) => s + d.clicks, 0) || 0
  const totalReferrer = analytics.by_referrer?.reduce((s, r) => s + r.clicks, 0) || 0
  const totalWeekday = analytics.by_weekday?.reduce((s, w) => s + w.clicks, 0) || 0
  const uniquePct = totalCliques > 0 ? Math.round((uniqueCliques / totalCliques) * 100) : 0

  const REFERRER_ICONS = {
    'Google': '🔍', 'Instagram': '📸', 'Facebook': '👥', 'WhatsApp': '💬',
    'Twitter / X': '𝕏', 'LinkedIn': '💼', 'TikTok': '🎵', 'YouTube': '▶️',
    'Direto': '🔗', 'Outro': '🌐',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Analytics detalhado</h2>
            <p className="text-xs text-gray-400 mt-0.5">{label} - últimos 30 dias</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <IconX />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs: Total vs Únicos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{totalCliques.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-500 mt-1">Total de cliques</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{uniqueCliques.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-500 mt-1">Cliques únicos <span className="text-violet-500 font-semibold">{uniquePct}%</span></p>
            </div>
          </div>

          {/* Evolução diária */}
          {analytics.by_day?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Evolução diária</p>
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={analytics.by_day} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <Tooltip formatter={v => [v.toLocaleString('pt-BR'), 'Cliques']} labelFormatter={d => d} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Line type="monotone" dataKey="clicks" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hora do dia */}
          {analytics.by_hour?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cliques por hora do dia</p>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={analytics.by_hour} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={h => `${h}h`} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <Tooltip formatter={v => [v.toLocaleString('pt-BR'), 'Cliques']} labelFormatter={h => `${h}h`} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="clicks" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dia da semana */}
          {analytics.by_weekday?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Dia da semana</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={analytics.by_weekday} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="weekday" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <Tooltip formatter={v => [v.toLocaleString('pt-BR'), 'Cliques']} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="clicks" fill="#a78bfa" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Fonte de tráfego */}
          {analytics.by_referrer?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Fonte de tráfego</p>
              <div className="flex flex-col gap-2">
                {analytics.by_referrer.map(r => (
                  <div key={r.source} className="flex items-center gap-2">
                    <span className="text-sm shrink-0 w-5 text-center">{REFERRER_ICONS[r.source] || '🌐'}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 w-28 truncate shrink-0">{r.source}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.round((r.clicks / (totalReferrer || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right tabular-nums shrink-0">{r.clicks}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispositivos */}
          {analytics.by_device?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Dispositivos</p>
              <div className="flex flex-col gap-2">
                {analytics.by_device.map(d => (
                  <HBar key={d.device_type} label={d.device_type} clicks={d.clicks} total={totalDevice} color={DEVICE_COLORS[d.device_type] || '#ddd6fe'} />
                ))}
              </div>
            </div>
          )}

          {/* Navegadores */}
          {analytics.by_browser?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Navegadores</p>
              <div className="flex flex-col gap-2">
                {analytics.by_browser.map((b, i) => (
                  <HBar key={b.browser} label={b.browser} clicks={b.clicks} total={totalBrowser} color={BROWSER_COLORS[i % BROWSER_COLORS.length]} />
                ))}
              </div>
            </div>
          )}

          {/* Sistemas operacionais */}
          {analytics.by_os?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sistemas operacionais</p>
              <div className="flex flex-col gap-2">
                {analytics.by_os.map((o, i) => (
                  <HBar key={o.os} label={o.os} clicks={o.clicks} total={totalOS} color={BROWSER_COLORS[i % BROWSER_COLORS.length]} />
                ))}
              </div>
            </div>
          )}

          {/* Países */}
          {analytics.by_country?.filter(c => c.country && c.country !== 'Desconhecido').length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Países</p>
              <div className="flex flex-col gap-2">
                {analytics.by_country.slice(0, 10).map(c => (
                  <HBar key={c.country} label={c.country || 'Desconhecido'} clicks={c.clicks} total={analytics.by_country[0].clicks} color="#7c3aed" />
                ))}
              </div>
            </div>
          )}

          {/* Cidades */}
          {analytics.by_city?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cidades</p>
              <div className="flex flex-col gap-2">
                {analytics.by_city.slice(0, 10).map(c => (
                  <HBar key={`${c.city}-${c.country}`} label={`${c.city}, ${c.country}`} clicks={c.clicks} total={analytics.by_city[0].clicks} color="#7c3aed" labelWidth="w-40" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Link Row ────────────────────────────────────────────────────────────────
function LinkRow({ link, clicksFromCH, isSelected, canSeeAnalytics, onSelect, onEdit }) {
  const shortUrl = `${FRONTEND_URL}/l/${link.slug}`
  const clicks = clicksFromCH ?? link.clicks_cached

  return (
    <div
      className={`py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 rounded-xl transition-colors ${isSelected ? 'bg-violet-50 dark:bg-violet-900/10 -mx-2 px-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => canSeeAnalytics && onSelect(link)}
              className={`text-sm font-semibold truncate text-left transition-colors ${canSeeAnalytics ? 'cursor-pointer hover:text-violet-600 dark:hover:text-violet-400' : 'cursor-default'} ${isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-gray-900 dark:text-gray-100'}`}
            >
              {link.name}
            </button>
            {canSeeAnalytics && (
              <span className={`text-xs shrink-0 transition-colors ${isSelected ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'}`}>
                <IconChevronRight />
              </span>
            )}
            <button onClick={() => onEdit(link)} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors shrink-0">
              <IconEdit />
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-2">{link.original_url}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-violet-700 dark:text-violet-300 font-mono">{shortUrl}</span>
            </div>
            <CopyButton text={shortUrl} />
            <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 bg-gray-100 dark:bg-gray-800 transition-colors">
              <IconExternalLink />
              Testar
            </a>
          </div>
        </div>
        <div className="text-right shrink-0 pt-1">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{clicks.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400">cliques</p>
        </div>
      </div>
    </div>
  )
}

// ── Analytics Panel ─────────────────────────────────────────────────────────
function AnalyticsPanel({ analytics, loading, canSeeAnalytics, onShowMore }) {
  if (loading) return (
    <div className="space-y-3">
      {[80, 120, 100].map((h, i) => <div key={i} style={{ height: h }} className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
    </div>
  )

  if (!canSeeAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4 text-violet-500">
          <IconLock />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Analytics bloqueado</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">Veja de onde vêm os cliques, quais dispositivos e muito mais em qualquer plano pago.</p>
        <Link href="/configuracoes/planos" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors">
          Ver planos
        </Link>
      </div>
    )
  }

  if (!analytics || analytics.total_clicks === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Sem dados ainda</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Compartilhe seus links para ver os dados aqui.</p>
    </div>
  )

  const deviceData = analytics.by_device.map(d => ({ name: d.device_type, value: d.clicks, color: DEVICE_COLORS[d.device_type] || DEVICE_COLORS.Outro }))

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl p-4 text-center">
        <p className="text-3xl font-bold text-white tabular-nums">{analytics.total_clicks.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-violet-200 mt-0.5">cliques totais - últimos 30 dias</p>
      </div>

      {analytics.by_day.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Cliques por dia</p>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={analytics.by_day} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
              <Tooltip formatter={(v) => [v.toLocaleString('pt-BR'), 'Cliques']} labelFormatter={l => l} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="clicks" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {deviceData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Dispositivos</p>
          <div className="flex items-center gap-3">
            <PieChart width={72} height={72}>
              <Pie data={deviceData} cx={32} cy={32} innerRadius={18} outerRadius={32} dataKey="value" strokeWidth={0}>
                {deviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="flex flex-col gap-1.5 flex-1">
              {deviceData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize flex-1">{d.name}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{Math.round((d.value / analytics.total_clicks) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analytics.by_country.filter(c => c.country && c.country !== 'Desconhecido').length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Países</p>
          <div className="flex flex-col gap-2">
            {analytics.by_country.slice(0, 5).map(c => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 dark:text-gray-300 w-20 truncate">{c.country || 'Desconhecido'}</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.round((c.clicks / analytics.by_country[0].clicks) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-right tabular-nums">{c.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onShowMore}
        className="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-700 dark:hover:text-violet-400 transition-colors"
      >
        Ver mais dados
      </button>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function CampaignPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState(null)
  const [links, setLinks] = useState([])
  const [billing, setBilling] = useState(null)
  const [analytics, setAnalytics] = useState(() => {        // campanha — inicia do cache
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem(`jarbis_analytics_${id}`)) } catch { return null }
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    try { return !localStorage.getItem(`jarbis_analytics_${id}`) } catch { return true }
  })
  const [selectedLink, setSelectedLink] = useState(null)
  const [linkAnalytics, setLinkAnalytics] = useState(null)  // link individual
  const [linkAnalyticsLoading, setLinkAnalyticsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [showMoreModal, setShowMoreModal] = useState(false)

  const canSeeAnalytics = billing?.limits?.link_analytics === true

  // Contagem de cliques por link vinda do ClickHouse (fonte de verdade para pagantes)
  function getClickCount(link) {
    if (analytics?.links) {
      const found = analytics.links.find(l => l.link_id === link.id)
      if (found !== undefined) return found.clicks
    }
    return link.clicks_cached
  }

  // Analytics ativo: link selecionado ou campanha
  const activeAnalytics = selectedLink ? linkAnalytics : analytics
  const activeAnalyticsLoading = selectedLink ? linkAnalyticsLoading : analyticsLoading
  const activeLabel = selectedLink ? selectedLink.name : (campaign?.name || 'Campanha')

  useEffect(() => {
    // Analytics dispara imediatamente em paralelo, sem bloquear o render principal
    api.fetch(`/links/campaigns/${id}/analytics?days=30`)
      .then(data => {
        setAnalytics(data)
        setAnalyticsLoading(false)
        try { localStorage.setItem(`jarbis_analytics_${id}`, JSON.stringify(data)) } catch {}
      })
      .catch(() => setAnalyticsLoading(false))

    // Dados principais - exibe a página assim que carregar
    Promise.all([
      api.fetch(`/links/campaigns`),
      api.fetch(`/links/campaigns/${id}/links`),
      api.billing.status(),
    ]).then(([campaigns, linksData, billingData]) => {
      setCampaign(campaigns.find(c => c.id === id) || null)
      setLinks(linksData)
      setBilling(billingData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  function handleSelectLink(link) {
    if (!canSeeAnalytics) return
    if (selectedLink?.id === link.id) {
      // Deseleciona - volta para campanha
      setSelectedLink(null)
      setLinkAnalytics(null)
      return
    }
    setSelectedLink(link)
    setLinkAnalytics(null)
    setLinkAnalyticsLoading(true)
    api.fetch(`/links/${link.id}/analytics?days=30`)
      .then(data => { setLinkAnalytics(data); setLinkAnalyticsLoading(false) })
      .catch(() => setLinkAnalyticsLoading(false))
  }

  function handleLinkCreated(link) {
    setLinks(prev => [link, ...prev])
    if (canSeeAnalytics) {
      setAnalyticsLoading(true)
      api.fetch(`/links/campaigns/${id}/analytics?days=30`)
        .then(data => { setAnalytics(data); setAnalyticsLoading(false) })
        .catch(() => setAnalyticsLoading(false))
    }
  }

  function handleLinkSaved(updated) {
    setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    if (selectedLink?.id === updated.id) {
      setSelectedLink(updated)
    }
  }

  const maxLinks = billing?.limits?.links_per_campaign ?? 5

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            <IconBack />
            Campanhas
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">{loading ? '...' : (campaign?.name || 'Campanha')}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{campaign?.name || ''}</h1>
            {campaign?.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{campaign.description}</p>}
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors shadow-sm shrink-0">
            <IconPlus />
            Adicionar link
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Links - espaço principal */}
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Links da campanha</h2>
              <div className="flex items-center gap-2">
                {maxLinks !== -1 && (
                  <span className="text-xs text-gray-400">{links.length}/{maxLinks}</span>
                )}
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{links.length} {links.length === 1 ? 'link' : 'links'}</span>
              </div>
            </div>
            {canSeeAnalytics && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Clique no nome do link para ver os dados individuais.</p>
            )}

            {loading ? (
              <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nenhum link ainda.</p>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors">
                  <IconPlus /> Adicionar primeiro link
                </button>
              </div>
            ) : (
              links.map(link => (
                <LinkRow
                  key={link.id}
                  link={link}
                  clicksFromCH={canSeeAnalytics ? (analytics?.links?.find(l => l.link_id === link.id)?.clicks ?? null) : null}
                  isSelected={selectedLink?.id === link.id}
                  canSeeAnalytics={canSeeAnalytics}
                  onSelect={handleSelectLink}
                  onEdit={setEditingLink}
                />
              ))
            )}
          </div>

          {/* Analytics - coluna fixa à direita */}
          <div className="w-full xl:w-72 shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {selectedLink ? `Analytics: ${selectedLink.name}` : 'Analytics'}
                </h2>
                {!selectedLink && <span className="text-xs text-gray-400">30 dias</span>}
              </div>
              {selectedLink && (
                <button
                  onClick={() => { setSelectedLink(null); setLinkAnalytics(null) }}
                  className="ml-2 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                  title="Voltar ao total da campanha"
                >
                  <IconX />
                </button>
              )}
            </div>
            <AnalyticsPanel
              analytics={activeAnalytics}
              loading={loading || activeAnalyticsLoading}
              canSeeAnalytics={canSeeAnalytics}
              onShowMore={() => setShowMoreModal(true)}
            />
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddLinkModal
          campaignId={id}
          planLimits={billing?.limits}
          currentLinksCount={links.length}
          onClose={() => setShowAddModal(false)}
          onCreated={handleLinkCreated}
        />
      )}
      {editingLink && <EditLinkModal link={editingLink} onClose={() => setEditingLink(null)} onSaved={handleLinkSaved} />}
      {showMoreModal && (
        <MoreAnalyticsModal
          analytics={activeAnalytics}
          label={activeLabel}
          onClose={() => setShowMoreModal(false)}
        />
      )}
    </AppLayout>
  )
}
