'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { LogoA, LogoWithText } from '@/components/logos/JarbisLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getPricing } from '@/i18n/config'

// ─── Variantes de animação ────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}
const scaleIn = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }
const staggerFast = { visible: { transition: { staggerChildren: 0.07 } } }

// ─── Ícones das features ──────────────────────────────────────────────────────
const FEATURE_COLORS = [
  'bg-violet-100 text-violet-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-blue-100 text-blue-600',
  'bg-red-100 text-red-500',
  'bg-purple-100 text-purple-600',
]
function FeatureIcon({ index }) {
  const cls = 'w-6 h-6'
  const paths = [
    'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
    'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
    'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
    'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
    'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
  ]
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[index]} />
    </svg>
  )
}

// ─── Ícone do "Como Funciona" ─────────────────────────────────────────────────
function HowItWorksIcon({ index }) {
  const cls = 'w-7 h-7'
  if (index === 0) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
  if (index === 1) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  )
}

const PLAN_KEYS = ['free', 'essential', 'pro', 'business', 'enterprise']

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function NavLogo({ light = false }) {
  return <LogoWithText size={28} light={light} />
}

function ComparisonCell({ value }) {
  if (value === true) return (
    <div className="flex justify-center">
      <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
  if (value === false) return (
    <div className="flex justify-center">
      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
  return <span className="text-sm text-gray-500">{value}</span>
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-gray-900 text-sm sm:text-base">{q}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="w-5 h-5 text-gray-400 flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <p className="text-sm text-gray-500 leading-relaxed pb-5 -mt-1">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [uploadState, setUploadState] = useState('idle') // idle | uploading | done | error
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [sheetsState, setSheetsState] = useState('idle') // idle | loading | error
  const [sheetsError, setSheetsError] = useState('')
  const [sheetPicker, setSheetPicker] = useState(null) // { type:'excel'|'sheets', file?, url?, sheets, sheetsMeta } | null
  const [sheetsTabState, setSheetsTabState] = useState('idle') // idle | detecting | ready
  const fileInputRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handlePlanCta(key) {
    const token = localStorage.getItem('jarbis_token')
    if (token) {
      router.push(`/checkout?plan=${key}`)
    } else {
      router.push(`/signup?plan=${key}`)
    }
  }

  // Preserva UTMs no sessionStorage para o signup capturar mesmo após navegação interna
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref']
    utmKeys.forEach(key => {
      const val = params.get(key)
      if (val) sessionStorage.setItem(key, val)
    })
  }, [])

  // Auto-detecta abas quando o usuário cola uma URL do Google Sheets
  useEffect(() => {
    const isSheets = sheetsUrl.includes('docs.google.com/spreadsheets')
    if (!isSheets || !sheetsUrl.trim()) {
      setSheetsTabState('idle')
      setSheetPicker(null)
      return
    }
    setSheetsTabState('detecting')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/reports/preview-google-sheets-tabs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sheetsUrl.trim() }),
        })
        if (!res.ok) { setSheetsTabState('idle'); return }
        const data = await res.json()
        const sheets = data.sheets || []
        const sheetsMeta = data.sheets_meta || sheets.map(s => ({ name: s, type: 'unknown', suggested: false }))
        setSheetsTabState('ready')
        if (sheets.length > 1) {
          setSheetPicker({ type: 'sheets', url: sheetsUrl.trim(), sheets, sheetsMeta })
        }
        // 1 aba: já pronto, não precisa modal
      } catch {
        setSheetsTabState('idle')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [sheetsUrl])

  const pricing = getPricing(locale)

  const basePrices = {
    free: 0,
    essential: pricing.essential,
    pro: pricing.pro,
    business: pricing.business,
    enterprise: null,
  }

  function calcPrice(monthly) {
    if (monthly === null || monthly === 0) return monthly
    return annual ? +(monthly * 0.8).toFixed(2) : monthly
  }

  function fmtPrice(p) {
    if (p === null) return t('pricing.onRequest')
    if (p === 0) return t('pricing.free')
    return `${pricing.symbol}${p.toFixed(2).replace('.', ',')}`
  }

  const faqItems = t.raw('faq.items')
  const comparisonRows = t.raw('comparison.rows')
  const featureItems = t.raw('features.items')
  const howItWorksSteps = t.raw('howItWorks.steps')
  const problemBefore = t.raw('problem.beforeItems')
  const problemAfter = t.raw('problem.afterItems')
  const heroMonths = t.raw('hero.months')

  const PLAN_CONFIG = {
    free:       { highlight: false, enterprise: false },
    essential:  { highlight: false, enterprise: false },
    pro:        { highlight: true,  enterprise: false, tag: t('pricing.mostPopular') },
    business:   { highlight: false, enterprise: false },
    enterprise: { highlight: false, enterprise: true  },
  }

  async function doUpload(file, sheetName = null) {
    setUploadState('uploading')
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (sheetName) formData.append('sheet_name', sheetName)
      const res = await fetch(`${API_BASE}/reports/preview-upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'upload failed')
      }
      const data = await res.json()
      router.push(`/preview/${data.temp_token}`)
    } catch (e) {
      setUploadState('error')
      setUploadError(e.message && e.message !== 'upload failed' ? e.message : t('hero.upload.error'))
    }
  }

  async function handleUploadFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setUploadState('error')
      setUploadError(t('hero.upload.error'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadState('error')
      setUploadError(t('hero.upload.errorSize'))
      return
    }

    // Excel com múltiplas abas: mostrar picker primeiro
    if (['xlsx', 'xls'].includes(ext)) {
      setUploadState('uploading')
      setUploadError('')
      try {
        const fd = new FormData(); fd.append('file', file)
        const res = await fetch(`${API_BASE}/reports/preview-excel-sheets`, { method: 'POST', body: fd })
        if (res.ok) {
          const { sheets, sheets_meta } = await res.json()
          if (sheets && sheets.length > 1) {
            setUploadState('idle')
            setSheetPicker({ type: 'excel', file, sheets, sheetsMeta: sheets_meta || sheets.map(s => ({ name: s, type: 'unknown', row_count: null, col_count: null, suggested: false, reason: '' })) })
            return
          }
          // Só 1 aba: prossegue direto
        } else {
          // Endpoint falhou: prossegue normalmente sem picker
          console.warn('preview-excel-sheets status:', res.status)
        }
      } catch (err) {
        console.warn('preview-excel-sheets error:', err)
      }
      // Falhou ao ler abas ou tem só 1 aba: prossegue normalmente
    }

    await doUpload(file)
  }

  function onFileChange(e) {
    handleUploadFile(e.target.files?.[0])
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleUploadFile(e.dataTransfer.files?.[0])
  }

  async function handleSheetsConnect(e, overrideUrl, sheetName) {
    if (e) e.preventDefault()
    const url = overrideUrl || sheetsUrl.trim()
    if (!url) return
    setSheetsState('loading')
    setSheetsError('')
    setUploadState('idle')
    setUploadError('')
    try {
      const body = { url }
      if (sheetName) body.sheet_name = sheetName
      const res = await fetch(`${API_BASE}/reports/preview-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Erro ao conectar ao Google Sheets.')
      }
      const data = await res.json()
      setSheetsState('idle')
      router.push(`/preview/${data.temp_token}`)
    } catch (e) {
      setSheetsState('error')
      setSheetsError(e.message || 'Verifique se a planilha está compartilhada como pública.')
    }
  }

  return (
    <>
    <div className="bg-white text-gray-900 antialiased">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
        scrolled ? 'bg-white/95 border-gray-200 shadow-sm' : 'bg-white/80 border-gray-100'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <NavLogo />
          <div className="hidden md:flex items-center gap-6">
            <a href="#como-funciona" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">{t('nav.howItWorks')}</a>
            <a href="#funcionalidades" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">{t('nav.features')}</a>
            <a href="#precos" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">{t('nav.pricing')}</a>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">{t('nav.login')}</Link>
            <LanguageSwitcher />
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href="/signup" className="inline-flex items-center gap-1.5 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-lg shadow-violet-600/40 hover:shadow-violet-600/60 hover:scale-[1.03]" style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)' }}>
                {t('nav.trialCta')}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </motion.div>
          </div>
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen
              ? <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              : <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            }
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
              className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-6 py-5 flex flex-col gap-4"
            >
              <a href="#como-funciona" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>{t('nav.howItWorks')}</a>
              <a href="#funcionalidades" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>{t('nav.features')}</a>
              <a href="#precos" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>{t('nav.pricing')}</a>
              <Link href="/login" className="text-sm text-gray-600 font-medium">{t('nav.login')}</Link>
              <div className="flex items-center justify-between">
                <LanguageSwitcher />
              </div>
              <Link href="/signup" className="bg-violet-600 text-white text-sm font-bold px-5 py-3 rounded-full text-center">{t('nav.trialCta')}</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-0 px-6 overflow-hidden" style={{ background: '#0B0A1A' }}>
        {/* Glows animados */}
        <div className="hero-glow absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />
        <div className="hero-glow absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', animationDelay: '2s' }} />

        <div className="relative max-w-4xl mx-auto text-center">

          {/* Wordmark */}
          <motion.div
            variants={fadeIn} initial="hidden" animate="visible"
            className="flex justify-center mb-8"
          >
            <LogoWithText size={44} light={true} />
          </motion.div>

          {/* Badge */}
          <motion.div
            variants={fadeIn} initial="hidden" animate="visible"
            className="inline-flex flex-wrap items-center justify-center gap-2 border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-10 max-w-xs sm:max-w-none"
          >
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            {t('hero.badge')}
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-[100px] lg:text-[120px] font-black text-white leading-[0.9] tracking-[-0.04em] mb-8"
          >
            {t('hero.title1')}<br />
            <motion.span
              variants={fadeUp} initial="hidden" animate="visible"
              transition={{ delay: 0.2 }}
              style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'inline-block' }}
            >
              {t('hero.title2')}
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-xl mx-auto mb-10 leading-relaxed font-light"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* Upload widget */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.4 }}
            className="max-w-xl mx-auto mb-6"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={onFileChange}
            />
            <motion.div
              onClick={() => uploadState !== 'uploading' && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              animate={dragOver ? { scale: 1.02 } : { scale: 1 }}
              className={`relative border-2 border-dashed rounded-2xl px-6 py-7 cursor-pointer transition-all ${
                dragOver
                  ? 'border-violet-400 bg-violet-500/15'
                  : uploadState === 'error'
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-white/20 bg-white/5 hover:border-violet-400/60 hover:bg-white/10'
              }`}
            >
              {uploadState === 'uploading' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-300">{t('hero.upload.analyzing')}</p>
                </div>
              ) : uploadState === 'error' ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-red-400">{uploadError || t('hero.upload.error')}</p>
                  <button onClick={(e) => { e.stopPropagation(); setUploadState('idle'); setUploadError('') }} className="text-xs text-gray-400 underline">{t('hero.upload.tryAgain')}</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t('hero.upload.title')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('hero.upload.subtitle')}</p>
                  </div>
                </div>
              )}
            </motion.div>
            {/* Separador */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-600 font-medium">ou cole o link do Google Sheets</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sheets link */}
            <form onSubmit={handleSheetsConnect} className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                {/* Tooltip de instruções */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 group z-10">
                  <div className="w-4 h-4 rounded-full bg-gray-700 text-gray-400 hover:bg-violet-800 hover:text-violet-300 text-[9px] font-bold flex items-center justify-center cursor-default transition-colors">?</div>
                  <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-white rounded-xl p-3 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity text-left">
                    <p className="text-[11px] font-semibold mb-2 text-violet-300">Como obter o link:</p>
                    <ol className="text-[11px] text-gray-300 space-y-1.5">
                      <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">1.</span>Abra a planilha no Google Sheets</li>
                      <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">2.</span>Clique em <span className="text-white font-medium">Compartilhar</span></li>
                      <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">3.</span>Selecione <span className="text-white font-medium">"Qualquer pessoa com o link"</span></li>
                      <li className="flex gap-1.5"><span className="text-violet-400 font-bold shrink-0">4.</span>Copie o link e cole aqui</li>
                    </ol>
                    <div className="absolute right-3 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                </div>
                <input
                  type="url"
                  value={sheetsUrl}
                  onChange={e => { setSheetsUrl(e.target.value); setSheetsState('idle'); setUploadState('idle'); setSheetsTabState('idle') }}
                  placeholder="Cole o link do Google Sheets..."
                  className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${sheetsState === 'error' ? 'border-red-500/50 bg-red-500/10' : 'border-white/20 bg-white/5 focus:border-violet-500/50'}`}
                />
              </div>
              <button type="submit" disabled={sheetsState === 'loading' || !sheetsUrl.trim()}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors sm:shrink-0 w-full sm:w-auto">
                {sheetsState === 'loading' ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                ) : 'Conectar'}
              </button>
            </form>
            {sheetsTabState === 'detecting' && (
              <p className="text-[11px] text-gray-400 mt-1.5 flex items-center justify-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Buscando abas...
              </p>
            )}
            {sheetsTabState === 'ready' && sheetPicker === null && (
              <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Planilha encontrada
              </p>
            )}
            {sheetsState === 'error' && (
              <p className="text-[11px] text-red-400 mt-1.5 text-center">{sheetsError || 'Verifique se a planilha está compartilhada como pública.'}</p>
            )}
            <p className="text-center text-xs text-gray-600 mt-3">{t('hero.upload.orCta')} <Link href="/signup" className="text-violet-400 hover:text-violet-300 underline">{t('hero.upload.signupLink')}</Link></p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-4"
          >
            <a href="#como-funciona"
              className="inline-flex items-center justify-center border border-white/10 text-gray-300 font-semibold px-8 py-4 rounded-full hover:bg-white/5 transition-all text-base">
              {t('hero.ctaSecondary')}
            </a>
          </motion.div>

          {/* Free badge + social proof */}
          <motion.div
            variants={fadeIn} initial="hidden" animate="visible"
            transition={{ delay: 0.6 }}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-gray-600">
              <span>✦ {t('hero.proof1')}</span>
              <span>✦ {t('hero.proof2')}</span>
              <span>✦ {t('hero.proof3')}</span>
            </div>
          </motion.div>
        </div>

        {/* Dashboard mockup — desktop */}
        <motion.div
          className="hidden md:block relative max-w-5xl mx-auto mt-16 px-4"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.9, ease: 'easeOut' }}
        >
          {/* Glow atrás do mockup */}
          <div className="absolute -inset-8 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(124,58,237,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)' }} />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1.6 }}
            className="relative"
          >
            {/* Chrome do browser */}
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/60"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0F0D1D' }}>

              {/* Barra do browser */}
              <div className="flex items-center gap-2 px-4 py-3 border-b"
                style={{ background: '#17152A', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
                </div>
                <div className="flex-1 mx-4 rounded-lg h-6 flex items-center px-3 gap-2"
                  style={{ background: '#0B0A1A', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <svg className="w-3 h-3 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span className="text-[11px] text-gray-500">{t('hero.mockupUrl')}</span>
                </div>
              </div>

              {/* Sidebar + conteúdo */}
              <div className="flex" style={{ background: '#0B0A1A' }}>
                {/* Mini sidebar */}
                <div className="w-12 flex-shrink-0 border-r flex flex-col items-center py-4 gap-4"
                  style={{ background: '#0F0D1D', borderColor: 'rgba(255,255,255,0.05)' }}>
                  {[
                    <path key="g" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
                    <path key="c" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                    <path key="d" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />,
                  ].map((d, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 1 ? 'bg-violet-600/20' : ''}`}>
                      <svg className={`w-4 h-4 ${i === 1 ? 'text-violet-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{d}</svg>
                    </div>
                  ))}
                </div>

                {/* Área principal */}
                <div className="flex-1 p-5">
                  {/* KPIs */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { labelKey: 'hero.kpi.totalSales', value: pricing.symbol === 'R$' ? 'R$847K' : '$247K', change: '+23%', up: true },
                      { labelKey: 'hero.kpi.newClients',  value: '1.284', change: '+12%', up: true },
                      { labelKey: 'hero.kpi.conversion',  value: '4,7%', change: '-0,3%', up: false },
                      { labelKey: 'hero.kpi.mrr',          value: pricing.symbol === 'R$' ? 'R$124K' : '$36K', change: '+8%', up: true },
                    ].map((kpi) => (
                      <div key={kpi.labelKey} className="rounded-xl p-4 border"
                        style={{ background: '#17152A', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[11px] text-gray-500 mb-2">{t(kpi.labelKey)}</div>
                        <div className="text-lg font-black text-white mb-1">{kpi.value}</div>
                        <div className={`text-[11px] font-semibold flex items-center gap-1 ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>
                          <span>{kpi.up ? '▲' : '▼'}</span>{kpi.change}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-12 gap-3">
                    {/* Bar chart */}
                    <div className="col-span-8 rounded-xl p-4 border"
                      style={{ background: '#17152A', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-semibold text-gray-300">{t('hero.chart.revenue')}</span>
                        <span className="text-[10px] text-violet-400 font-semibold bg-violet-500/10 px-2 py-0.5 rounded-full">+18% vs anterior</span>
                      </div>
                      {/* Linhas de grade */}
                      <div className="relative">
                        <div className="absolute inset-x-0 flex flex-col justify-between h-28 pointer-events-none">
                          {[0,1,2,3].map(i => (
                            <div key={i} className="border-t w-full" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
                          ))}
                        </div>
                        <div className="flex items-end gap-1.5 h-28 relative">
                          {[40,55,45,70,60,85,75,92,80,68,88,96].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t-sm relative overflow-hidden" style={{
                              height: `${h}%`,
                              background: i === 11
                                ? 'linear-gradient(to top, #6D28D9, #A78BFA)'
                                : `linear-gradient(to top, rgba(109,40,217,0.12), rgba(167,139,250,0.35))`,
                              boxShadow: i === 11 ? '0 0 12px rgba(167,139,250,0.4)' : 'none',
                            }}>
                              {i === 11 && (
                                <div className="absolute top-0 inset-x-0 h-0.5 rounded-full" style={{ background: '#A78BFA', boxShadow: '0 0 6px #A78BFA' }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        {heroMonths.map(m => (
                          <div key={m} className="text-[9px] text-gray-600">{m}</div>
                        ))}
                      </div>
                    </div>

                    {/* Por canal */}
                    <div className="col-span-4 rounded-xl p-4 border"
                      style={{ background: '#17152A', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="text-[11px] font-semibold text-gray-300 mb-4">{t('hero.chart.byChannel')}</div>
                      <div className="space-y-4">
                        {[
                          { labelKey: 'hero.chart.direct',  pct: 45, color: '#7c3aed', glow: 'rgba(124,58,237,0.5)' },
                          { labelKey: 'hero.chart.organic', pct: 30, color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },
                          { labelKey: 'hero.chart.paid',    pct: 25, color: '#10b981', glow: 'rgba(16,185,129,0.5)' },
                        ].map((item) => (
                          <div key={item.labelKey}>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-gray-400 text-[11px]">{t(item.labelKey)}</span>
                              <span className="text-white font-bold text-[12px]">{item.pct}%</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-2 rounded-full transition-all" style={{
                                width: `${item.pct}%`,
                                background: `linear-gradient(to right, ${item.color}aa, ${item.color})`,
                                boxShadow: `0 0 8px ${item.glow}`,
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Mini total */}
                      <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[10px] text-gray-600 mb-1">Total de visitas</div>
                        <div className="text-base font-black text-white">24.812</div>
                        <div className="text-[10px] text-emerald-400 font-semibold">▲ +34% este mês</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Dashboard mockup — mobile */}
        <motion.div
          className="md:hidden relative max-w-sm mx-auto mt-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7, ease: 'easeOut' }}
        >
          <div className="rounded-2xl overflow-hidden border p-4" style={{ background: '#0F0D1D', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { labelKey: 'hero.kpi.totalSales', value: pricing.symbol === 'R$' ? 'R$847K' : '$247K' },
                { labelKey: 'hero.kpi.newClients',  value: '1.284' },
              ].map((kpi) => (
                <div key={kpi.labelKey} className="rounded-xl p-3 border" style={{ background: '#17152A', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-gray-500 mb-1">{t(kpi.labelKey)}</div>
                  <div className="text-base font-black text-white">{kpi.value}</div>
                  <div className="text-[10px] font-semibold text-emerald-400">▲ +23%</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 border" style={{ background: '#17152A', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] text-gray-500 mb-2">{t('hero.chart.revenue')}</div>
              <div className="flex items-end gap-1 h-16">
                {[40,55,45,70,60,85,75,92,80,68,88,96].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm" style={{
                    height: `${h}%`,
                    background: i === 11
                      ? 'linear-gradient(to top, #6D28D9, #A78BFA)'
                      : 'linear-gradient(to top, rgba(109,40,217,0.12), rgba(167,139,250,0.3))',
                    boxShadow: i === 11 ? '0 0 10px rgba(167,139,250,0.4)' : 'none',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

      </section>

      {/* ── DOR / TRANSFORMAÇÃO ── */}
      <section className="py-20 sm:py-28 px-6" style={{ background: '#0B0A1A' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-violet-400 font-semibold text-sm mb-4 tracking-wide uppercase">O problema real</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-6 leading-tight">
              Quanto tempo você perdeu<br className="hidden sm:block" /> esta semana com planilhas?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-400 max-w-2xl mx-auto">
              A maioria dos donos de negócio sabe que precisa de dados. O problema é que ninguém tem tempo para montar relatório.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid md:grid-cols-3 gap-4"
          >
            {[
              { pain: 'Planilha que só você consegue abrir', fix: 'Dashboard que qualquer um lê no celular' },
              { pain: 'Dados espalhados em vários arquivos', fix: 'Tudo em um lugar, sempre atualizado' },
              { pain: 'Relatório que leva horas para ficar pronto', fix: 'Pronto em 30 segundos, sem fórmulas' },
            ].map(({ pain, fix }) => (
              <motion.div key={pain} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-sm text-gray-600 line-through mb-3 leading-relaxed">{pain}</p>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm text-white font-medium leading-relaxed">{fix}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── OS DADOS SÃO SEUS — logo após hero, mensagem central ── */}
      <section className="py-20 sm:py-28 px-6 bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-6">
              <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-5">
              Os dados são seus.<br className="hidden sm:block" />
              <span className="text-violet-400">Sempre.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              No Jarbis, não somos donos dos seus dados. Somos guardiões temporários enquanto você trabalha com eles. Essa é a nossa essência.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>),
                title: 'Isolamento total',
                body: 'Cada empresa opera em um ambiente completamente isolado. Nenhum cliente enxerga os dados de outro. Por arquitetura, não por configuração.',
              },
              {
                icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>),
                title: 'Análise sem rastro',
                body: 'Nenhum dado seu é usado para treinar sistemas. O Jarbis analisa apenas o que você enviou, naquela sessão. A sessão encerra, os dados somem.',
              },
              {
                icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>),
                title: 'Segurança com responsabilidade',
                body: 'Tentativas de acessar dados indevidamente são detectadas e investigadas. Protegemos os dados dos nossos clientes com rigor e responsabilidade legal.',
              },
            ].map(({ icon, title, body }) => (
              <motion.div key={title} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4">{icon}</div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center border-t border-white/10 pt-12 mt-12">
            <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
              "Confiar nos dados dos nossos clientes é a<br className="hidden sm:block" />
              <span className="text-violet-400"> razão de existirmos."</span>
            </p>
            <p className="text-gray-500 text-sm mt-3">Jarbis, plataforma de BI para PMEs brasileiras</p>
          </motion.div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">{t('howItWorks.label')}</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">{t('howItWorks.title')}</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-500">{t('howItWorks.subtitle')}</motion.p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid md:grid-cols-3 gap-8 relative"
          >
            {/* Linha conectora animada */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              style={{ originX: 0 }}
              className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200"
            />
            {howItWorksSteps.map((item, i) => (
              <motion.div key={item.step} variants={scaleIn} className="text-center relative">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-20 h-20 mx-auto mb-5 rounded-2xl flex flex-col items-center justify-center"
                  style={{ background: i === 1 ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#F5F3FF' }}
                >
                  <span className={`text-xs font-bold mb-1 ${i === 1 ? 'text-violet-200' : 'text-violet-400'}`}>{item.step}</span>
                  <span className={i === 1 ? 'text-white' : 'text-violet-600'}><HowItWorksIcon index={i} /></span>
                </motion.div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">{t('features.label')}</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5 whitespace-pre-line">
              {t('features.title')}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-5"
          >
            {featureItems.map((f, i) => (
              <motion.div
                key={f.title}
                variants={scaleIn}
                whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(109,40,217,0.08)' }}
                transition={{ type: 'spring', stiffness: 280 }}
                className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-violet-200 transition-all group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-5 text-gray-500 group-hover:bg-violet-50 group-hover:border-violet-100 group-hover:text-violet-600 transition-all">
                  <FeatureIcon index={i} />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2 group-hover:text-violet-700 transition-colors">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── EDITOR VISUAL ── */}
      <section className="py-20 sm:py-28 px-6" style={{ background: '#0B0A1A' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <motion.div
              variants={stagger} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.p variants={fadeUp} className="text-violet-400 font-semibold text-sm mb-4 tracking-wide uppercase">Editor visual</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
                Arrasta, solta,<br/>pronto.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 text-lg leading-relaxed mb-8">
                O editor do Jarbis foi feito para quem nunca usou uma ferramenta de BI na vida. Sem código, sem fórmulas, sem curva de aprendizado.
              </motion.p>
              <motion.div variants={stagger} className="space-y-3">
                {[
                  'Arraste gráficos e KPIs direto para o canvas',
                  'Configure tudo com cliques, sem digitar código',
                  'O Jarbis sugere as melhores visualizações para seus dados',
                  'Compartilhe o link e seu cliente vê ao vivo, no celular',
                ].map(item => (
                  <motion.div key={item} variants={fadeUp} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-300 text-sm leading-relaxed">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Mini mockup do editor */}
            <motion.div
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                <span className="text-gray-600 text-xs ml-2">Dashboard — Editor Jarbis</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-violet-400 font-medium">Receita total</span>
                    <span className="text-[10px] text-emerald-400">+23% este mês</span>
                  </div>
                  <div className="text-xl font-bold text-white">R$ 48.920</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 bg-violet-500/40 rounded-sm" style={{ height: `${h * 0.5}px` }} />
                  ))}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                  {[['Produto A', 72], ['Produto B', 48], ['Produto C', 31]].map(([name, pct]) => (
                    <div key={name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] text-gray-500">{name}</span>
                        <span className="text-[9px] text-gray-500">{pct}%</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-8 bg-white/5 border border-dashed border-white/20 rounded-lg flex items-center px-3">
                  <span className="text-[10px] text-gray-600">+ Arraste um bloco para cá...</span>
                </div>
                <div className="h-8 w-8 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" /></svg>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ── PRICING ── */}
      <section id="precos" className="py-20 sm:py-28 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">{t('pricing.label')}</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">{t('pricing.title')}</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-500 mb-8">{t('pricing.subtitle')}</motion.p>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {t('pricing.monthly')}
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {t('pricing.annual')}
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            variants={staggerFast} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {PLAN_KEYS.map((key) => {
              const cfg = PLAN_CONFIG[key]
              const price = calcPrice(basePrices[key])
              const plan = t.raw(`pricing.plans.${key}`)
              const planFeatures = plan.features

              return (
                <motion.div
                  key={key}
                  variants={scaleIn}
                  whileHover={cfg.highlight ? { scale: 1.03 } : { y: -6 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className={`relative rounded-2xl p-5 flex flex-col ${
                    cfg.highlight
                      ? 'text-white shadow-xl shadow-violet-200 ring-2 ring-violet-600'
                      : cfg.enterprise
                      ? 'bg-gray-900 text-white border border-gray-800'
                      : 'bg-white border border-gray-100 shadow-sm'
                  }`}
                  style={cfg.highlight ? { background: 'linear-gradient(145deg, #6d28d9, #7c3aed)' } : {}}
                >
                  {cfg.tag && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                      {cfg.tag}
                    </div>
                  )}

                  <div className={`text-xs font-bold mb-2 ${cfg.highlight ? 'text-violet-200' : 'text-gray-400'}`}>
                    {plan.name}
                  </div>

                  <div className="mb-1 min-h-[2.5rem] flex items-baseline">
                    {price === null ? (
                      <span className={`font-black text-lg ${cfg.enterprise ? 'text-white' : 'text-gray-900'}`}>{t('pricing.onRequest')}</span>
                    ) : price === 0 ? (
                      <span className={`font-black text-3xl ${cfg.highlight ? 'text-white' : 'text-gray-900'}`}>{t('pricing.free')}</span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={annual ? `${key}-annual` : `${key}-monthly`}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.2 }}
                            className={`font-black text-2xl ${cfg.highlight ? 'text-white' : 'text-gray-900'}`}
                          >
                            {pricing.symbol}{price.toFixed(2).replace('.', ',')}
                          </motion.span>
                        </AnimatePresence>
                        <span className={`text-xs ${cfg.highlight ? 'text-violet-300' : cfg.enterprise ? 'text-gray-500' : 'text-gray-400'}`}>{t('pricing.perMonth')}</span>
                      </div>
                    )}
                  </div>

                  <div className="h-5 mb-2" />

                  <p className={`text-xs mb-4 ${cfg.highlight ? 'text-violet-200' : 'text-gray-400'}`}>
                    {plan.desc}
                  </p>

                  <ul className="space-y-2 mb-5 flex-1">
                    {planFeatures.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.highlight ? 'bg-white/20' : cfg.enterprise ? 'bg-gray-700' : 'bg-violet-100'}`}>
                          <svg className={`w-2 h-2 ${cfg.highlight || cfg.enterprise ? 'text-white' : 'text-violet-600'}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className={cfg.highlight ? 'text-violet-100' : cfg.enterprise ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {cfg.enterprise ? (
                    <a href="mailto:comercial@jarbis.cc?subject=Enterprise" className="block text-center py-2.5 rounded-full font-bold text-xs bg-amber-500 text-white hover:bg-amber-400 transition-colors">
                      {plan.cta}
                    </a>
                  ) : (
                    <button
                      onClick={() => key === 'free' ? router.push('/signup') : handlePlanCta(key)}
                      className={`w-full text-center py-2.5 rounded-full font-bold text-xs transition-colors ${
                        cfg.highlight ? 'bg-white text-violet-700 hover:bg-violet-50' : key === 'free' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </motion.div>

          <motion.p
            variants={fadeIn} initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            className="text-center text-xs text-gray-400 mt-4"
          >
            {annual ? t('pricing.footerAnnual') : t('pricing.footerMonthly')}
          </motion.p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">{t('faq.label')}</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{t('faq.title')}</motion.h2>
          </motion.div>
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 sm:px-8"
          >
            {faqItems.map((item) => (
              <motion.div key={item.q} variants={fadeUp}>
                <FaqItem q={item.q} a={item.a} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* ── CTA FINAL ── */}
      <motion.section
        variants={stagger} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="py-20 sm:py-28 px-6 relative overflow-hidden"
        style={{ background: '#0B0A1A' }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.2) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-5 leading-tight">
            {t('finalCta.title1')}<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {t('finalCta.title2')}
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-gray-400 mb-4">{t('finalCta.subtitle')}</motion.p>
          <motion.p variants={fadeUp} className="text-sm text-gray-600 mb-8">{t('finalCta.badge')}</motion.p>
          <motion.div variants={fadeUp}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link href="/signup"
                className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-10 py-5 rounded-full hover:bg-violet-500 transition-all text-lg shadow-xl shadow-violet-900/50">
                {t('finalCta.cta')}
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-10 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <NavLogo />
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">
              {t('footer.madeBy')} <strong className="text-gray-600">{t('footer.company')}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-sm text-gray-400 justify-center md:justify-start">
            <Link href="/termos" className="hover:text-gray-700 transition-colors">{t('footer.terms')}</Link>
            <Link href="/privacidade" className="hover:text-gray-700 transition-colors">{t('footer.privacy')}</Link>
            <Link href="/login" className="hover:text-gray-700 transition-colors">{t('footer.login')}</Link>
          </div>
          <p className="text-xs text-gray-300">{t('footer.copyright')}</p>
        </div>
      </footer>

    </div>

    {/* Modal de seleção de aba do Excel */}
    {sheetPicker && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Qual aba contém seus dados?</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sheetPicker.type === 'excel' ? sheetPicker.file.name : 'Google Sheets'} · {sheetPicker.sheets.length} abas encontradas
                </p>
              </div>
            </div>
          </div>

          {/* Lista de abas */}
          <div className="px-4 py-4 space-y-2 max-h-72 overflow-y-auto">
            {sheetPicker.sheetsMeta.map((s, i) => {
              const isEmpty = s.type === 'empty'
              const isSuggested = s.suggested === true
              const subtitle = s.reason || (s.row_count > 0
                ? [s.row_count && `${s.row_count.toLocaleString('pt-BR')} linhas`, s.col_count && `${s.col_count} colunas`].filter(Boolean).join(' · ')
                : 'Aba vazia')
              return (
                <button
                  key={s.name}
                  onClick={() => {
                    if (isEmpty) return
                    if (sheetPicker.type === 'excel') {
                      const f = sheetPicker.file
                      setSheetPicker(null)
                      doUpload(f, s.name)
                    } else {
                      const url = sheetPicker.url
                      setSheetPicker(null)
                      setSheetsTabState('idle')
                      handleSheetsConnect(null, url, s.name)
                    }
                  }}
                  disabled={isEmpty}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all flex items-center gap-4 ${
                    isEmpty
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : isSuggested
                      ? 'border-violet-400 bg-violet-50 hover:border-violet-500 cursor-pointer active:scale-[0.99]'
                      : 'border-gray-200 hover:border-violet-400 hover:bg-violet-50 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${isEmpty ? 'bg-gray-100 text-gray-400' : isSuggested ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-700'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                      {isSuggested && <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Recomendada</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
                  </div>
                  {!isEmpty && (
                    <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Clique na aba que contém sua tabela principal</p>
            <button
              onClick={() => { setSheetPicker(null); setUploadState('idle'); setSheetsTabState('idle') }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
