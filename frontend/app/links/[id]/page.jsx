'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://jarbis.cc'
const DEVICE_COLORS = { mobile: '#7c3aed', desktop: '#a78bfa', tablet: '#ddd6fe', Outro: '#e5e7eb' }

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        copied
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
          : 'bg-gray-50 text-gray-500 hover:bg-violet-50 hover:text-violet-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-violet-900/20 dark:hover:text-violet-400'
      }`}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function AddLinkModal({ campaignId, onClose, onCreated }) {
  const [originalUrl, setOriginalUrl] = useState('')
  const [name, setName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [slugMode, setSlugMode] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [slugError, setSlugError] = useState('')
  const { showToast } = useToast()

  function validateSlug(v) {
    if (!v) { setSlugError(''); return }
    if (!/^[a-z0-9][a-z0-9\-_]{1,30}[a-z0-9]$/.test(v.toLowerCase())) {
      setSlugError('Use apenas letras, números, hífen ou underscore (mín. 3 caracteres)')
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
      const body = {
        original_url: originalUrl.trim(),
        name: name.trim(),
        custom_slug: slugMode === 'custom' && customSlug.trim() ? customSlug.trim().toLowerCase() : null,
      }
      const data = await api(`/links/campaigns/${campaignId}/links`, { method: 'POST', body: JSON.stringify(body) })
      onCreated(data)
      onClose()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('já está em uso')) {
        setSlugError(msg)
      } else {
        showToast(msg || 'Erro ao criar link', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Adicionar link</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">O link criado não pode ser removido - faz parte do banco de dados da campanha.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">URL de destino *</label>
            <input
              autoFocus
              type="url"
              value={originalUrl}
              onChange={e => setOriginalUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome identificador *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: claro_26_03_whatsapp_dark_post"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-gray-400 mt-1">Use um nome que facilite o De/Para com seus relatórios de campanha.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Link encurtado</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSlugMode('auto')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  slugMode === 'auto'
                    ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                }`}
              >
                Gerar automaticamente
              </button>
              <button
                type="button"
                onClick={() => setSlugMode('custom')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  slugMode === 'custom'
                    ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                }`}
              >
                Personalizar
              </button>
            </div>

            {slugMode === 'custom' && (
              <div>
                <div className="flex items-center gap-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                  <span className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap shrink-0">
                    {FRONTEND_URL}/l/
                  </span>
                  <input
                    value={customSlug}
                    onChange={e => { setCustomSlug(e.target.value.toLowerCase()); validateSlug(e.target.value) }}
                    placeholder="meu-link"
                    className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                </div>
                {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !originalUrl.trim() || !name.trim() || (slugMode === 'custom' && !!slugError)} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-sm font-medium text-white transition-colors">
              {loading ? 'Criando...' : 'Criar link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LinkRow({ link }) {
  const shortUrl = `${FRONTEND_URL}/l/${link.slug}`
  return (
    <div className="flex items-start gap-3 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-500 shrink-0 mt-0.5">
        <IconLink />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-0.5">{link.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-1">{link.original_url}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-violet-600 dark:text-violet-400 font-mono">{shortUrl}</span>
          <CopyButton text={shortUrl} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{link.clicks_cached.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-gray-400">cliques</p>
      </div>
    </div>
  )
}

function AnalyticsPanel({ analytics, loading }) {
  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
    </div>
  )

  if (!analytics || analytics.total_clicks === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum clique registrado ainda</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Compartilhe seus links para ver os dados aqui.</p>
    </div>
  )

  const deviceData = analytics.by_device.map(d => ({
    name: d.device_type,
    value: d.clicks,
    color: DEVICE_COLORS[d.device_type] || DEVICE_COLORS.Outro,
  }))

  return (
    <div className="space-y-6">
      {/* Total */}
      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 text-center">
        <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{analytics.total_clicks.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">cliques totais</p>
      </div>

      {/* Cliques por dia */}
      {analytics.by_day.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cliques por dia</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={analytics.by_day} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip
                formatter={(v) => [v.toLocaleString('pt-BR'), 'Cliques']}
                labelFormatter={l => l}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Bar dataKey="clicks" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Dispositivos */}
      {deviceData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Dispositivos</p>
          <div className="flex items-center gap-4">
            <PieChart width={80} height={80}>
              <Pie data={deviceData} cx={35} cy={35} innerRadius={20} outerRadius={35} dataKey="value" strokeWidth={0}>
                {deviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="flex flex-col gap-1.5">
              {deviceData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{d.name}</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 ml-auto">
                    {Math.round((d.value / analytics.total_clicks) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Países */}
      {analytics.by_country.filter(c => c.country && c.country !== 'Desconhecido').length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Países</p>
          <div className="flex flex-col gap-2">
            {analytics.by_country.slice(0, 5).map(c => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{c.country || 'Desconhecido'}</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-400 dark:bg-violet-600 rounded-full"
                    style={{ width: `${Math.round((c.clicks / analytics.by_country[0].clicks) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{c.clicks.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CampaignPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState(null)
  const [links, setLinks] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    Promise.all([
      api(`/links/campaigns`),
      api(`/links/campaigns/${id}/links`),
    ]).then(([campaigns, linksData]) => {
      const found = campaigns.find(c => c.id === id)
      setCampaign(found || null)
      setLinks(linksData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading) {
      api(`/links/campaigns/${id}/analytics?days=30`)
        .then(data => { setAnalytics(data); setAnalyticsLoading(false) })
        .catch(() => setAnalyticsLoading(false))
    }
  }, [id, loading])

  function handleLinkCreated(link) {
    setLinks(prev => [link, ...prev])
    // Recarrega analytics
    setAnalyticsLoading(true)
    api(`/links/campaigns/${id}/analytics?days=30`)
      .then(data => { setAnalytics(data); setAnalyticsLoading(false) })
      .catch(() => setAnalyticsLoading(false))
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/links')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <IconBack />
            Campanhas
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {loading ? '...' : (campaign?.name || 'Campanha')}
          </span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{campaign?.name || ''}</h1>
            {campaign?.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{campaign.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors shadow-sm"
          >
            <IconPlus />
            Adicionar link
          </button>
        </div>

        {/* Layout 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Links */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Links</h2>
              <span className="text-xs text-gray-400">{links.length} {links.length === 1 ? 'link' : 'links'}</span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
              </div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nenhum link nesta campanha ainda.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors"
                >
                  <IconPlus />
                  Adicionar primeiro link
                </button>
              </div>
            ) : (
              <div>
                {links.map(link => <LinkRow key={link.id} link={link} />)}
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Analytics</h2>
              <span className="text-xs text-gray-400">últimos 30 dias</span>
            </div>
            <AnalyticsPanel analytics={analytics} loading={analyticsLoading} />
          </div>
        </div>
      </div>

      {showModal && (
        <AddLinkModal campaignId={id} onClose={() => setShowModal(false)} onCreated={handleLinkCreated} />
      )}
    </AppLayout>
  )
}
