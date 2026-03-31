'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://jarbis.cc'
const DEVICE_COLORS = { mobile: '#6D28D9', desktop: '#8B5CF6', tablet: '#C4B5FD', Outro: '#E2E8F0' }
const BROWSER_COLORS = ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD']
const REFERRER_ICONS = {
  Google: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  Instagram: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="url(#ig)"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  Facebook: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  WhatsApp: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  'Twitter / X': <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  LinkedIn: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  TikTok: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
  YouTube: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  Direto: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#6D28D9]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  Outro: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#94A3B8]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
}

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
function IconClone() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
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
    <button onClick={handleCopy} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-[#F1F5F9] text-[#6B7280] hover:bg-violet-50 hover:text-[#6D28D9] dark:bg-[#2D2D3D] dark:text-[#94A3B8] dark:hover:bg-violet-900/20 dark:hover:text-[#A78BFA]'}`}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? 'Copiado!' : label}
    </button>
  )
}

// ── Modal: Adicionar link ───────────────────────────────────────────────────
function AddLinkModal({ campaignId, planLimits, currentLinksCount, onClose, onCreated, prefill }) {
  const [originalUrl, setOriginalUrl] = useState(prefill?.original_url || '')
  const [name, setName] = useState(prefill?.name || '')
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90dvh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{prefill ? 'Clonar link' : 'Adicionar link'}</h2>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90dvh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
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
function HBar({ label, clicks, total, color = '#6D28D9', labelWidth = 'w-24' }) {
  const pct = Math.round((clicks / (total || 1)) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs text-[#1A1A2E] dark:text-[#F1F5F9] ${labelWidth} truncate shrink-0`}>{label}</span>
      <div className="flex-1 h-1.5 bg-[#F1F5F9] dark:bg-[#2D2D3D] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] w-8 text-right tabular-nums shrink-0">{clicks}</span>
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

  const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-[#1E1E2E] border border-[#E2E8F0] dark:border-[#2D2D3D] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl sm:mx-4 max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1E1E2E] border-b border-[#E2E8F0] dark:border-[#2D2D3D] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A2E] dark:text-[#F1F5F9]">Analytics detalhado</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{label} - últimos 30 dias</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#f5f3ff] dark:hover:bg-[#2D2D3D] transition-colors">
            <IconX />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className={`grid gap-3 ${analytics.whatsapp_button_clicks > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="bg-gradient-to-br from-[#6D28D9] to-[#7C3AED] rounded-2xl p-4 text-center shadow-[0_2px_8px_rgba(109,40,217,0.25)]">
              <p className="text-2xl font-bold text-white tabular-nums">{totalCliques.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-violet-200 mt-0.5">cliques totais</p>
            </div>
            <div className="bg-[#f5f3ff] dark:bg-[#6D28D9]/10 border border-[#ede9fe] dark:border-[#6D28D9]/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[#6D28D9] dark:text-[#A78BFA] tabular-nums">{uniqueCliques.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                únicos {totalCliques > 0 && <span className="text-[#6D28D9] font-semibold">{uniquePct}%</span>}
              </p>
            </div>
            {analytics.whatsapp_button_clicks > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{analytics.whatsapp_button_clicks.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                  abriram WA {totalCliques > 0 && <span className="text-emerald-600 font-semibold">{Math.round((analytics.whatsapp_button_clicks / totalCliques) * 100)}%</span>}
                </p>
              </div>
            )}
          </div>

          {/* Evolução diária */}
          {analytics.by_day?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Evolução diária</p>
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={analytics.by_day} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip formatter={v => [v.toLocaleString('pt-BR'), 'Cliques']} labelFormatter={d => d} contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="clicks" stroke="#6D28D9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hora do dia */}
          {analytics.by_hour?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Cliques por hora do dia</p>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={analytics.by_hour} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={h => `${h}h`} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip formatter={v => [v.toLocaleString('pt-BR'), 'Cliques']} labelFormatter={h => `${h}h`} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="clicks" fill="#6D28D9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dia da semana */}
          {analytics.by_weekday?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Dia da semana</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={analytics.by_weekday} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="weekday" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <Tooltip formatter={v => [v.toLocaleString('pt-BR'), 'Cliques']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="clicks" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Fonte de tráfego */}
          {analytics.by_referrer?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Fonte de tráfego</p>
              <div className="flex flex-col gap-2">
                {analytics.by_referrer.map(r => (
                  <div key={r.source} className="flex items-center gap-2">
                    <span className="shrink-0 w-5 flex items-center justify-center text-[#6B7280]">{REFERRER_ICONS[r.source] || REFERRER_ICONS.Outro}</span>
                    <span className="text-xs text-[#1A1A2E] dark:text-[#F1F5F9] w-28 truncate shrink-0">{r.source}</span>
                    <div className="flex-1 h-1.5 bg-[#F1F5F9] dark:bg-[#2D2D3D] rounded-full overflow-hidden">
                      <div className="h-full bg-[#6D28D9] rounded-full" style={{ width: `${Math.round((r.clicks / (totalReferrer || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] w-8 text-right tabular-nums shrink-0">{r.clicks}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispositivos */}
          {analytics.by_device?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Dispositivos</p>
              <div className="flex flex-col gap-2">
                {analytics.by_device.map(d => (
                  <HBar key={d.device_type} label={d.device_type} clicks={d.clicks} total={totalDevice} color={DEVICE_COLORS[d.device_type] || '#C4B5FD'} />
                ))}
              </div>
            </div>
          )}

          {/* Navegadores */}
          {analytics.by_browser?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Navegadores</p>
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
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Sistemas operacionais</p>
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
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Países</p>
              <div className="flex flex-col gap-2">
                {analytics.by_country.slice(0, 10).map(c => (
                  <HBar key={c.country} label={c.country || 'Desconhecido'} clicks={c.clicks} total={analytics.by_country[0].clicks} />
                ))}
              </div>
            </div>
          )}

          {/* Cidades */}
          {analytics.by_city?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-3">Cidades</p>
              <div className="flex flex-col gap-2">
                {analytics.by_city.slice(0, 10).map(c => (
                  <HBar key={`${c.city}-${c.country}`} label={`${c.city}, ${c.country}`} clicks={c.clicks} total={analytics.by_city[0].clicks} labelWidth="w-40" />
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
function LinkRow({ link, clicksFromCH, isSelected, canSeeAnalytics, onSelect, onEdit, onClone }) {
  const shortUrl = `${FRONTEND_URL}/l/${link.slug}`
  const clicks = clicksFromCH ?? link.clicks_cached

  return (
    <div
      className={`py-4 border-b border-[#F1F5F9] dark:border-[#2D2D3D] last:border-0 rounded-xl transition-colors ${isSelected ? 'bg-violet-50 dark:bg-violet-900/10 -mx-2 px-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => canSeeAnalytics && onSelect(link)}
              className={`text-sm font-semibold truncate text-left transition-colors ${canSeeAnalytics ? 'cursor-pointer hover:text-[#6D28D9] dark:hover:text-[#A78BFA]' : 'cursor-default'} ${isSelected ? 'text-[#6D28D9] dark:text-[#A78BFA]' : 'text-[#1A1A2E] dark:text-[#F1F5F9]'}`}
            >
              {link.name}
            </button>
            {canSeeAnalytics && (
              <span className={`text-xs shrink-0 transition-colors ${isSelected ? 'text-[#7C3AED]' : 'text-[#CBD5E1] dark:text-[#475569]'}`}>
                <IconChevronRight />
              </span>
            )}
            <button onClick={() => onEdit(link)} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[#CBD5E1] dark:text-[#475569] hover:text-[#6D28D9] hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors shrink-0" title="Editar">
              <IconEdit />
            </button>
            <button onClick={() => onClone(link)} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[#CBD5E1] dark:text-[#475569] hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors shrink-0" title="Clonar link">
              <IconClone />
            </button>
          </div>
          <p className="text-xs text-[#94A3B8] dark:text-[#475569] truncate mb-2">{link.original_url}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-violet-700 dark:text-violet-300 font-mono">{shortUrl}</span>
            </div>
            <CopyButton text={shortUrl} />
            <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[#6B7280] hover:text-[#6D28D9] hover:bg-violet-50 dark:hover:bg-violet-900/20 bg-[#F1F5F9] dark:bg-[#2D2D3D] transition-colors">
              <IconExternalLink />
              Testar
            </a>
          </div>
        </div>
        <div className="text-right shrink-0 pt-1">
          <p className="text-lg font-bold text-[#1A1A2E] dark:text-[#F1F5F9] tabular-nums">{clicks.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">cliques</p>
        </div>
      </div>
    </div>
  )
}

// ── Analytics Panel ─────────────────────────────────────────────────────────
function AnalyticsPanel({ analytics, loading, canSeeAnalytics, onShowMore }) {
  if (loading) return (
    <div className="space-y-3">
      {[80, 120, 100].map((h, i) => <div key={i} style={{ height: h }} className="rounded-xl bg-[#F1F5F9] dark:bg-[#2D2D3D] animate-pulse" />)}
    </div>
  )

  if (!canSeeAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4 text-violet-500">
          <IconLock />
        </div>
        <p className="text-sm font-semibold text-[#1A1A2E] dark:text-[#F1F5F9] mb-1">Analytics bloqueado</p>
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-4 leading-relaxed">Veja de onde vêm os cliques, quais dispositivos e muito mais em qualquer plano pago.</p>
        <Link href="/configuracoes/planos" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors">
          Ver planos
        </Link>
      </div>
    )
  }

  if (!analytics || analytics.total_clicks === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] dark:bg-[#2D2D3D] flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7C3AED]"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
      </div>
      <p className="text-sm text-[#1A1A2E] dark:text-[#F1F5F9] font-medium">Sem dados ainda</p>
      <p className="text-xs text-[#94A3B8] dark:text-[#475569] mt-1">Compartilhe seus links para ver os dados aqui.</p>
    </div>
  )

  const deviceData = analytics.by_device.map(d => ({ name: d.device_type, value: d.clicks, color: DEVICE_COLORS[d.device_type] || DEVICE_COLORS.Outro }))

  return (
    <div className="space-y-5">
      <div className={`grid gap-2 ${analytics.whatsapp_button_clicks > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white tabular-nums">{analytics.total_clicks.toLocaleString('pt-BR')}</p>
          <p className="text-[11px] text-violet-200 mt-0.5">cliques totais</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">{(analytics.unique_clicks ?? 0).toLocaleString('pt-BR')}</p>
          <p className="text-[11px] text-violet-400 mt-0.5">
            únicos
            {analytics.total_clicks > 0 && <span className="ml-1 font-semibold">{Math.round(((analytics.unique_clicks ?? 0) / analytics.total_clicks) * 100)}%</span>}
          </p>
        </div>
        {analytics.whatsapp_button_clicks > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{analytics.whatsapp_button_clicks.toLocaleString('pt-BR')}</p>
            <p className="text-[11px] text-emerald-500 mt-0.5">
              abriram WA
              {analytics.total_clicks > 0 && <span className="ml-1 font-semibold">{Math.round((analytics.whatsapp_button_clicks / analytics.total_clicks) * 100)}%</span>}
            </p>
          </div>
        )}
      </div>

      {analytics.by_day.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#6D28D9] dark:text-[#A78BFA] uppercase tracking-wider mb-2">Cliques por dia</p>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={analytics.by_day} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
              <Tooltip formatter={(v) => [v.toLocaleString('pt-BR'), 'Cliques']} labelFormatter={l => l} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff' }} />
              <Bar dataKey="clicks" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {deviceData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#6D28D9] dark:text-[#A78BFA] uppercase tracking-wider mb-3">Dispositivos</p>
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
                  <span className="text-xs text-[#1A1A2E] dark:text-[#CBD5E1] capitalize flex-1">{d.name}</span>
                  <span className="text-xs font-semibold text-[#1A1A2E] dark:text-[#F1F5F9]">{Math.round((d.value / analytics.total_clicks) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analytics.by_country.filter(c => c.country && c.country !== 'Desconhecido').length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#6D28D9] dark:text-[#A78BFA] uppercase tracking-wider mb-3">Países</p>
          <div className="flex flex-col gap-2">
            {analytics.by_country.slice(0, 5).map(c => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="text-xs text-[#1A1A2E] dark:text-[#F1F5F9] w-20 truncate">{c.country || 'Desconhecido'}</span>
                <div className="flex-1 h-1.5 bg-[#F1F5F9] dark:bg-[#2D2D3D] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${Math.round((c.clicks / analytics.by_country[0].clicks) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-[#1A1A2E] dark:text-[#CBD5E1] w-8 text-right tabular-nums">{c.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onShowMore}
        className="w-full py-2 rounded-xl border border-[#E2E8F0] dark:border-[#2D2D3D] text-xs font-medium text-[#6D28D9] dark:text-[#A78BFA] hover:border-[#7C3AED] hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
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
  const [cloningLink, setCloningLink] = useState(null)
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
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#6B7280] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#F1F5F9] transition-colors">
            <IconBack />
            Campanhas
          </button>
          <span className="text-[#CBD5E1] dark:text-[#475569]">/</span>
          <span className="text-sm font-medium text-[#1A1A2E] dark:text-[#F1F5F9] truncate max-w-xs">{loading ? '...' : (campaign?.name || 'Campanha')}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E] dark:text-[#F1F5F9]">{campaign?.name || ''}</h1>
            {campaign?.description && <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{campaign.description}</p>}
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors shadow-sm shrink-0">
            <IconPlus />
            Adicionar link
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Links - espaço principal */}
          <div className="flex-1 min-w-0 bg-white dark:bg-[#1E1E2E] border border-[#E2E8F0] dark:border-[#2D2D3D] rounded-2xl p-5 shadow-[0_2px_8px_rgba(109,40,217,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1A1A2E] dark:text-[#F1F5F9]">Links da campanha</h2>
              <div className="flex items-center gap-2">
                {maxLinks !== -1 && (
                  <span className="text-xs text-[#94A3B8]">{links.length}/{maxLinks}</span>
                )}
                <span className="text-xs text-[#6D28D9] dark:text-[#A78BFA] bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">{links.length} {links.length === 1 ? 'link' : 'links'}</span>
              </div>
            </div>
            {canSeeAnalytics && (
              <p className="text-xs text-[#94A3B8] dark:text-[#475569] mb-3">Clique no nome do link para ver os dados individuais.</p>
            )}

            {loading ? (
              <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-[#F1F5F9] dark:bg-[#2D2D3D] animate-pulse" />)}</div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] mb-4">Nenhum link ainda.</p>
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
                  onClone={link => setCloningLink({ original_url: link.original_url, name: `${link.name} (cópia)` })}
                />
              ))
            )}
          </div>

          {/* Analytics - coluna fixa à direita */}
          <div className="w-full xl:w-72 shrink-0 bg-white dark:bg-[#1E1E2E] border border-[#E2E8F0] dark:border-[#2D2D3D] rounded-2xl p-5 shadow-[0_2px_8px_rgba(109,40,217,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-[#1A1A2E] dark:text-[#F1F5F9] truncate">
                  {selectedLink ? `Analytics: ${selectedLink.name}` : 'Analytics'}
                </h2>
                {!selectedLink && <span className="text-xs text-[#6D28D9] dark:text-[#A78BFA]">30 dias</span>}
              </div>
              {selectedLink && (
                <button
                  onClick={() => { setSelectedLink(null); setLinkAnalytics(null) }}
                  className="ml-2 p-1 rounded-lg text-[#CBD5E1] hover:text-[#1A1A2E] hover:bg-[#F1F5F9] dark:hover:bg-[#2D2D3D] dark:hover:text-[#F1F5F9] transition-colors shrink-0"
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
      {cloningLink && (
        <AddLinkModal
          campaignId={id}
          planLimits={billing?.limits}
          currentLinksCount={links.length}
          prefill={cloningLink}
          onClose={() => setCloningLink(null)}
          onCreated={link => { handleLinkCreated(link); setCloningLink(null) }}
        />
      )}
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
