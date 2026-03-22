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
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Preserva UTMs no sessionStorage para o signup capturar mesmo após navegação interna
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref']
    utmKeys.forEach(key => {
      const val = params.get(key)
      if (val) sessionStorage.setItem(key, val)
    })
  }, [])

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

  async function handleUploadFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setUploadState('error')
      return
    }
    setUploadState('uploading')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/reports/preview-upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('upload failed')
      const data = await res.json()
      router.push(`/preview/${data.temp_token}`)
    } catch {
      setUploadState('error')
    }
  }

  function onFileChange(e) {
    handleUploadFile(e.target.files?.[0])
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleUploadFile(e.dataTransfer.files?.[0])
  }

  return (
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
              <Link href="/signup" className="bg-violet-600 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200 block">
                {t('nav.trialCta')}
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

          {/* Badge */}
          <motion.div
            variants={fadeIn} initial="hidden" animate="visible"
            className="inline-flex items-center gap-2 border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-8"
          >
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            {t('hero.badge')}
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tight leading-[1.0] mb-6"
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
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
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
              onClick={() => uploadState === 'idle' && fileInputRef.current?.click()}
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
                  <p className="text-sm text-red-400">{t('hero.upload.error')}</p>
                  <button onClick={(e) => { e.stopPropagation(); setUploadState('idle') }} className="text-xs text-gray-400 underline">{t('hero.upload.tryAgain')}</button>
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

        {/* Dashboard mockup — desktop com floating */}
        <motion.div
          className="hidden md:block relative max-w-5xl mx-auto mt-16"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.9, ease: 'easeOut' }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1.6 }}
          >
            <div className="absolute -inset-4 rounded-2xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.3) 0%, transparent 60%)' }} />
            <div className="relative rounded-t-2xl overflow-hidden border border-white/10" style={{ background: '#13111F' }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5" style={{ background: '#1C1929' }}>
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <div className="flex-1 mx-4 rounded-md h-6 flex items-center px-3 border border-white/5" style={{ background: '#0B0A1A' }}>
                  <span className="text-xs text-gray-500">{t('hero.mockupUrl')}</span>
                </div>
              </div>
              <div className="p-5 grid grid-cols-12 gap-3">
                {[
                  { labelKey: 'hero.kpi.totalSales', value: pricing.symbol === 'R$' ? 'R$847K' : '$247K', change: '+23%', up: true },
                  { labelKey: 'hero.kpi.newClients',  value: '1.284', change: '+12%', up: true },
                  { labelKey: 'hero.kpi.conversion',  value: '4,7%', change: '-0,3%', up: false },
                  { labelKey: 'hero.kpi.mrr',          value: pricing.symbol === 'R$' ? 'R$124K' : '$36K', change: '+8%', up: true },
                ].map((kpi) => (
                  <div key={kpi.labelKey} className="col-span-3 rounded-xl p-4 border border-white/5" style={{ background: '#1C1929' }}>
                    <div className="text-xs text-gray-500 mb-1.5">{t(kpi.labelKey)}</div>
                    <div className="text-xl font-black text-white mb-1">{kpi.value}</div>
                    <div className={`text-xs font-semibold ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>{kpi.change}</div>
                  </div>
                ))}
                <div className="col-span-8 rounded-xl p-4 border border-white/5" style={{ background: '#1C1929' }}>
                  <div className="text-xs text-gray-500 mb-4">{t('hero.chart.revenue')}</div>
                  <div className="flex items-end gap-1.5 h-28">
                    {[40,55,45,70,60,85,75,92,80,68,88,96].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : 'rgba(124,58,237,0.25)' }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {heroMonths.map(m => (
                      <div key={m} className="text-[9px] text-gray-600">{m}</div>
                    ))}
                  </div>
                </div>
                <div className="col-span-4 rounded-xl p-4 border border-white/5" style={{ background: '#1C1929' }}>
                  <div className="text-xs text-gray-500 mb-4">{t('hero.chart.byChannel')}</div>
                  <div className="space-y-3">
                    {[
                      { labelKey: 'hero.chart.direct',  pct: 45, color: '#7c3aed' },
                      { labelKey: 'hero.chart.organic', pct: 30, color: '#06b6d4' },
                      { labelKey: 'hero.chart.paid',    pct: 25, color: '#10b981' },
                    ].map((item) => (
                      <div key={item.labelKey}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-400">{t(item.labelKey)}</span>
                          <span className="text-white font-semibold">{item.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
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
          <div className="rounded-2xl overflow-hidden border border-white/10 p-4" style={{ background: '#13111F' }}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { labelKey: 'hero.kpi.totalSales', value: pricing.symbol === 'R$' ? 'R$847K' : '$247K' },
                { labelKey: 'hero.kpi.newClients',  value: '1.284' },
              ].map((kpi) => (
                <div key={kpi.labelKey} className="rounded-xl p-3 border border-white/5" style={{ background: '#1C1929' }}>
                  <div className="text-[10px] text-gray-500 mb-1">{t(kpi.labelKey)}</div>
                  <div className="text-base font-black text-white">{kpi.value}</div>
                  <div className="text-[10px] font-semibold text-emerald-400">+23%</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 border border-white/5" style={{ background: '#1C1929' }}>
              <div className="text-[10px] text-gray-500 mb-2">{t('hero.chart.revenue')}</div>
              <div className="flex items-end gap-1 h-16">
                {[40,55,45,70,60,85,75,92,80,68,88,96].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : 'rgba(124,58,237,0.25)' }} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fade para a próxima seção */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #FAFAF8)' }} />
      </section>

      {/* ── ANTES / DEPOIS ── */}
      <section className="py-20 sm:py-28 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">{t('problem.label')}</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              {t('problem.title')}
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid sm:grid-cols-2 gap-6"
          >
            <motion.div
              variants={scaleIn}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm"
            >
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                {t('problem.beforeBadge')}
              </div>
              <motion.ul variants={stagger} className="space-y-4">
                {problemBefore.map(text => (
                  <motion.li key={text} variants={fadeUp} className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    {text}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              variants={scaleIn}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="bg-violet-50 rounded-2xl p-6 sm:p-8 border border-violet-100 shadow-sm"
            >
              <div className="inline-flex items-center gap-2 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {t('problem.afterBadge')}
              </div>
              <motion.ul variants={stagger} className="space-y-4">
                {problemAfter.map(text => (
                  <motion.li key={text} variants={fadeUp} className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {text}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
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
      <section id="funcionalidades" className="py-20 sm:py-28 px-6" style={{ background: '#F5F3FF' }}>
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
                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(109,40,217,0.12)' }}
                transition={{ type: 'spring', stiffness: 280 }}
                className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-violet-200 transition-colors group cursor-default"
              >
                <motion.div
                  whileHover={{ rotate: 8, scale: 1.12 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${FEATURE_COLORS[i]}`}
                >
                  <FeatureIcon index={i} />
                </motion.div>
                <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-violet-700 transition-colors">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section id="compare" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">{t('comparison.label')}</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">{t('comparison.title')}</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-500">{t('comparison.subtitle')}</motion.p>
          </motion.div>
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-[560px] w-full">
                <thead>
                  <tr style={{ background: '#FAFAF8' }} className="border-b border-gray-100">
                    <th className="text-left px-4 sm:px-6 py-4 text-sm font-semibold text-gray-400">{t('comparison.colFeature')}</th>
                    <th className="px-4 sm:px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 font-bold text-sm px-3 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />Jarbis
                      </div>
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-center"><div className="text-sm font-semibold text-gray-400">{t('comparison.colExcel')}</div></th>
                    <th className="px-4 sm:px-6 py-4 text-center"><div className="text-sm font-semibold text-gray-400">{t('comparison.colBiCorp')}</div></th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{row.feature}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center"><ComparisonCell value={row.jarbis} /></td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center"><ComparisonCell value={row.competitor} /></td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center"><ComparisonCell value={row.powerbi} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
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
                    <Link href="/signup" className={`block text-center py-2.5 rounded-full font-bold text-xs transition-colors ${
                      cfg.highlight ? 'bg-white text-violet-700 hover:bg-violet-50' : key === 'free' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}>
                      {plan.cta}
                    </Link>
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

      {/* ── SEGURANÇA & PROPRIEDADE DOS DADOS ── */}
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
              No Jarbis, não somos donos dos seus dados — somos guardiões temporários enquanto você trabalha com eles. Essa é a nossa essência.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid sm:grid-cols-3 gap-6 mb-16"
          >
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ),
                title: 'Isolamento total',
                body: 'Cada empresa opera em um ambiente completamente isolado. Nenhum cliente enxerga os dados de outro — por arquitetura, não por configuração.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'IA sem memória',
                body: 'Nenhum dado seu é usado para treinar modelos de IA. O Jarbis analisa apenas o que você enviou, apenas naquela sessão. A sessão encerra, os dados somem.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                ),
                title: 'Abuso tem consequências',
                body: 'Tentativas de extrair dados do sistema ou manipular a IA são detectadas, registradas e investigadas. Protegemos os dados dos nossos clientes com rigor e responsabilidade legal.',
              },
            ].map(({ icon, title, body }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4">
                  {icon}
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            className="text-center border-t border-white/10 pt-12"
          >
            <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
              "Confiar nos dados dos nossos clientes é a<br className="hidden sm:block" />
              <span className="text-violet-400"> razão de existirmos."</span>
            </p>
            <p className="text-gray-500 text-sm mt-3">— Jarbis, plataforma de BI para PMEs brasileiras</p>
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
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/termos" className="hover:text-gray-700 transition-colors">{t('footer.terms')}</Link>
            <Link href="/privacidade" className="hover:text-gray-700 transition-colors">{t('footer.privacy')}</Link>
            <Link href="/login" className="hover:text-gray-700 transition-colors">{t('footer.login')}</Link>
          </div>
          <p className="text-xs text-gray-300">{t('footer.copyright')}</p>
        </div>
      </footer>

    </div>
  )
}
