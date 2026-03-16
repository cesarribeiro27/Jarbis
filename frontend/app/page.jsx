'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoA } from '@/components/logos/JarbisLogo'

// ─── Dados ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    title: 'Monte sem saber programar',
    desc: 'Arraste gráficos, tabelas e KPIs para o canvas. Configure tudo com cliques, sem precisar de tecnologia.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
    title: 'Conecte suas planilhas',
    desc: 'Importe Excel, CSV ou conecte o Google Sheets. Seus dados ficam prontos em segundos, sem mexer em código.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    title: 'IA que fala português',
    desc: 'Pergunte "qual meu produto mais vendido?" e receba a resposta na hora, em português, sem fórmulas.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>,
    title: 'Compartilhe com um link',
    desc: 'Gere um link público e envie pelo WhatsApp. Seu cliente vê o dashboard sem precisar criar conta.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
    title: 'Alertas automáticos',
    desc: 'Configure alertas e receba notificação quando as vendas caírem ou o estoque estiver baixo.',
    color: 'bg-red-100 text-red-500',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
    title: 'Incorpore no seu sistema',
    desc: 'Cole o código em qualquer site ou app e o dashboard aparece com a sua cara, sem o nome do Jarbis.',
    color: 'bg-purple-100 text-purple-600',
  },
]

const PLANS_DATA = [
  {
    key: 'free',
    name: 'Gratuito',
    price: 0,
    desc: 'Para experimentar sem compromisso',
    features: ['2 dashboards', '1 fonte de dados', '1 usuário', 'Link público'],
    cta: 'Criar conta grátis',
    href: '/signup',
    highlight: false,
    enterprise: false,
    trialBadge: false,
  },
  {
    key: 'solo',
    name: 'Solo',
    price: 79.90,
    desc: 'Para autônomos e MEIs',
    features: ['8 dashboards', '5 fontes de dados', '1 usuário', '5 alertas', 'Incorporar no site'],
    cta: 'Começar 7 dias grátis',
    href: '/signup',
    highlight: false,
    enterprise: false,
    trialBadge: true,
  },
  {
    key: 'equipe',
    name: 'Equipe',
    price: 189.90,
    desc: 'Para pequenas empresas',
    features: ['30 dashboards', '15 fontes de dados', '5 usuários', 'IA em português', 'Incorporar no site'],
    cta: 'Começar 7 dias grátis',
    href: '/signup',
    highlight: true,
    tag: 'Mais popular',
    enterprise: false,
    trialBadge: true,
  },
  {
    key: 'ilimitado',
    name: 'Ilimitado',
    price: 599.90,
    desc: 'Para empresas em crescimento',
    features: ['Tudo ilimitado', '20 usuários', 'IA em português', 'Marca própria no dashboard'],
    cta: 'Começar 7 dias grátis',
    href: '/signup',
    highlight: false,
    enterprise: false,
    trialBadge: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: null,
    desc: 'Para grandes operações',
    features: ['Tudo ilimitado', 'Usuários ilimitados', 'SLA garantido em contrato', 'Gerente de conta dedicado', 'Onboarding personalizado'],
    cta: 'Falar com comercial',
    href: 'mailto:comercial@jarbis.cc?subject=Interesse no plano Enterprise',
    highlight: false,
    enterprise: true,
    trialBadge: false,
  },
]

const COMPARISON = [
  { feature: 'Preço inicial', jarbis: 'Grátis por 7 dias', luzmo: '$1.000+/mês', powerbi: 'R$60/usuário' },
  { feature: 'Interface em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Suporte em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Incorporar via iframe', jarbis: true, luzmo: true, powerbi: 'Complexo' },
  { feature: 'IA em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Setup em minutos', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Sem cartão no teste', jarbis: true, luzmo: false, powerbi: false },
]

const FAQ = [
  {
    q: 'Preciso saber programar ou mexer em tecnologia?',
    a: 'Não. O Jarbis foi feito para donos de negócio, não para programadores. Se você sabe usar Excel, consegue usar o Jarbis.',
  },
  {
    q: 'Funciona com Google Sheets ou Excel?',
    a: 'Sim! Você pode importar arquivos Excel e CSV diretamente, ou conectar uma planilha do Google Sheets via link. Os dados atualizam sozinhos.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Sim. Todos os dados são armazenados com criptografia e em servidores no Brasil. Nenhum dado é compartilhado com terceiros.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem burocracia e sem multa. Cancele diretamente pelo painel, a qualquer momento.',
  },
  {
    q: 'O que é o plano gratuito?',
    a: 'O plano gratuito permite criar até 2 dashboards com 1 fonte de dados, sem prazo para expirar. Os planos pagos têm 7 dias de teste sem precisar de cartão.',
  },
  {
    q: 'Posso mostrar os gráficos para meus clientes?',
    a: 'Sim. Você gera um link público e envia pelo WhatsApp ou e-mail. Seu cliente vê os dados em tempo real, sem precisar criar conta. No plano Ilimitado, os dashboards aparecem com a sua marca.',
  },
]

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function NavLogo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoA size={32} light={light} />
      <span className={`font-black text-[17px] tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}>
        jarbis
      </span>
    </div>
  )
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
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="text-sm text-gray-500 leading-relaxed pb-5 -mt-1">{a}</p>
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)

  function calcPrice(monthly) {
    if (monthly === null || monthly === 0) return monthly
    return annual ? +(monthly * 0.8).toFixed(2) : monthly
  }

  function fmtPrice(p) {
    return p === null ? 'Sob consulta' : p === 0 ? 'Grátis' : `R$${p.toFixed(2).replace('.', ',')}`
  }

  return (
    <div className="bg-white text-gray-900 antialiased">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <NavLogo />
          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Como funciona</a>
            <a href="#funcionalidades" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Funcionalidades</a>
            <a href="#precos" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Preços</a>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Entrar</Link>
            <Link href="/signup" className="bg-violet-600 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
              Testar grátis — 7 dias
            </Link>
          </div>
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen
              ? <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              : <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            }
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-6 py-5 flex flex-col gap-4">
            <a href="#como-funciona" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>Como funciona</a>
            <a href="#funcionalidades" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>Funcionalidades</a>
            <a href="#precos" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>Preços</a>
            <Link href="/login" className="text-sm text-gray-600 font-medium">Entrar</Link>
            <Link href="/signup" className="bg-violet-600 text-white text-sm font-bold px-5 py-3 rounded-full text-center">Testar grátis — 7 dias</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-0 px-6 overflow-hidden" style={{ background: '#0B0A1A' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            Feito para o Brasil — em português, em real
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.05] mb-6">
            Você tem os dados.<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              A gente ajuda a entender.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crie gráficos e dashboards em minutos, sem precisar saber nada de tecnologia. Conecte sua planilha, arraste os blocos e pronto.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-violet-600 text-white font-bold px-8 py-4 rounded-full hover:bg-violet-500 transition-all text-base shadow-lg shadow-violet-900/50">
              Comece grátis agora
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </Link>
            <a href="#como-funciona"
              className="inline-flex items-center justify-center border border-white/10 text-gray-300 font-semibold px-8 py-4 rounded-full hover:bg-white/5 transition-all text-base">
              Ver como funciona
            </a>
          </div>
          <p className="text-xs text-gray-600">7 dias grátis · Sem cartão · Cancele quando quiser</p>
        </div>

        {/* Dashboard mockup — desktop */}
        <div className="hidden md:block relative max-w-5xl mx-auto mt-16">
          <div className="absolute -inset-4 rounded-2xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.3) 0%, transparent 60%)' }} />
          <div className="relative rounded-t-2xl overflow-hidden border border-white/10" style={{ background: '#13111F' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5" style={{ background: '#1C1929' }}>
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-4 rounded-md h-6 flex items-center px-3 border border-white/5" style={{ background: '#0B0A1A' }}>
                <span className="text-xs text-gray-500">app.jarbis.cc/dashboards</span>
              </div>
            </div>
            <div className="p-5 grid grid-cols-12 gap-3">
              {[
                { label: 'Total de Vendas', value: 'R$847K', change: '+23%', up: true },
                { label: 'Novos Clientes', value: '1.284', change: '+12%', up: true },
                { label: 'Conversão', value: '4,7%', change: '-0,3%', up: false },
                { label: 'MRR', value: 'R$124K', change: '+8%', up: true },
              ].map((kpi) => (
                <div key={kpi.label} className="col-span-3 rounded-xl p-4 border border-white/5" style={{ background: '#1C1929' }}>
                  <div className="text-xs text-gray-500 mb-1.5">{kpi.label}</div>
                  <div className="text-xl font-black text-white mb-1">{kpi.value}</div>
                  <div className={`text-xs font-semibold ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>{kpi.change}</div>
                </div>
              ))}
              <div className="col-span-8 rounded-xl p-4 border border-white/5" style={{ background: '#1C1929' }}>
                <div className="text-xs text-gray-500 mb-4">Receita por mês</div>
                <div className="flex items-end gap-1.5 h-28">
                  {[40,55,45,70,60,85,75,92,80,68,88,96].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : 'rgba(124,58,237,0.25)' }} />
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map(m => (
                    <div key={m} className="text-[9px] text-gray-600">{m}</div>
                  ))}
                </div>
              </div>
              <div className="col-span-4 rounded-xl p-4 border border-white/5" style={{ background: '#1C1929' }}>
                <div className="text-xs text-gray-500 mb-4">Por canal</div>
                <div className="space-y-3">
                  {[
                    { label: 'Direto', pct: 45, color: '#7c3aed' },
                    { label: 'Orgânico', pct: 30, color: '#06b6d4' },
                    { label: 'Pago', pct: 25, color: '#10b981' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">{item.label}</span>
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
        </div>

        {/* Dashboard mockup — mobile */}
        <div className="md:hidden relative max-w-sm mx-auto mt-10">
          <div className="rounded-2xl overflow-hidden border border-white/10 p-4" style={{ background: '#13111F' }}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ label: 'Vendas', value: 'R$847K' }, { label: 'Clientes', value: '1.284' }].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-3 border border-white/5" style={{ background: '#1C1929' }}>
                  <div className="text-[10px] text-gray-500 mb-1">{kpi.label}</div>
                  <div className="text-base font-black text-white">{kpi.value}</div>
                  <div className="text-[10px] font-semibold text-emerald-400">+23%</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 border border-white/5" style={{ background: '#1C1929' }}>
              <div className="text-[10px] text-gray-500 mb-2">Receita por mês</div>
              <div className="flex items-end gap-1 h-16">
                {[40,55,45,70,60,85,75,92,80,68,88,96].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : 'rgba(124,58,237,0.25)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANTES / DEPOIS ── */}
      <section className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">O problema</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              Reconhece essa situação?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Antes */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                Antes do Jarbis
              </div>
              <ul className="space-y-4">
                {[
                  'Planilhas espalhadas no computador que ninguém entende',
                  'Dados no WhatsApp que somem depois de 7 dias',
                  'Precisa pedir para o sobrinho montar um relatório',
                  'Não sabe o que está vendendo mais esta semana',
                  'Cliente pede relatório e você passa horas no Excel',
                ].map(t => (
                  <li key={t} className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Depois */}
            <div className="bg-violet-50 rounded-2xl p-6 sm:p-8 border border-violet-100">
              <div className="inline-flex items-center gap-2 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Com o Jarbis
              </div>
              <ul className="space-y-4">
                {[
                  'Todos os seus números em um único lugar, atualizado',
                  'Dashboard no celular para ver a qualquer hora',
                  'Você mesmo monta os gráficos em minutos, sem ajuda',
                  'Sabe exatamente o que está vendendo e o que está parado',
                  'Envia o link do relatório pro cliente em 30 segundos',
                ].map(t => (
                  <li key={t} className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="py-20 sm:py-28 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Como funciona</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">3 passos simples</h2>
            <p className="text-lg text-gray-500">Sem configuração complexa, sem precisar chamar o TI.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200" />
            {[
              { step: '01', emoji: '📂', title: 'Jogue seus dados aqui', desc: 'Importe um arquivo Excel, CSV, ou cole o link da sua planilha do Google Sheets. Pronto em menos de 1 minuto.' },
              { step: '02', emoji: '🎨', title: 'Monte seu painel', desc: 'Arraste gráficos, tabelas e indicadores para a tela. A IA pode montar automaticamente — você só ajusta.' },
              { step: '03', emoji: '🔗', title: 'Compartilhe com quem quiser', desc: 'Copie o link e envie pelo WhatsApp, e-mail ou incorpore no seu site. Seus dados ao vivo para todos verem.' },
            ].map((item, i) => (
              <div key={item.step} className="text-center relative">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex flex-col items-center justify-center"
                  style={{ background: i === 1 ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#F5F3FF' }}>
                  <span className={`text-xs font-bold mb-0.5 ${i === 1 ? 'text-violet-200' : 'text-violet-400'}`}>{item.step}</span>
                  <span className="text-2xl">{item.emoji}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Funcionalidades</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">
              Tudo que você precisa,<br className="hidden sm:block" /> nada do que não precisa
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Desenvolvido para PMEs brasileiras que precisam de analytics profissional sem a complexidade e o preço das ferramentas gringas.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50 transition-all group">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-violet-700 transition-colors">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section id="compare" className="py-20 sm:py-28 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Comparativo</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">Por que Jarbis?</h2>
            <p className="text-lg text-gray-500">A única plataforma de BI embarcado pensada para o mercado brasileiro.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[560px] w-full">
                <thead>
                  <tr style={{ background: '#FAFAF8' }} className="border-b border-gray-100">
                    <th className="text-left px-4 sm:px-6 py-4 text-sm font-semibold text-gray-400">Funcionalidade</th>
                    <th className="px-4 sm:px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 font-bold text-sm px-3 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />Jarbis
                      </div>
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-center"><div className="text-sm font-semibold text-gray-400">Luzmo</div></th>
                    <th className="px-4 sm:px-6 py-4 text-center"><div className="text-sm font-semibold text-gray-400">Power BI</div></th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{row.feature}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center"><ComparisonCell value={row.jarbis} /></td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center"><ComparisonCell value={row.luzmo} /></td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center"><ComparisonCell value={row.powerbi} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Preços</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">Preço justo, em real</h2>
            <p className="text-lg text-gray-500 mb-8">Sem surpresas em dólar. Cancele quando quiser.</p>

            {/* Toggle anual/mensal */}
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Anual
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS_DATA.map((plan) => {
              const price = calcPrice(plan.price)
              return (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl p-5 flex flex-col transition-all ${
                    plan.highlight
                      ? 'text-white shadow-xl shadow-violet-200 ring-2 ring-violet-600'
                      : plan.enterprise
                      ? 'bg-gray-900 text-white border border-gray-800'
                      : 'bg-white border border-gray-100 shadow-sm'
                  }`}
                  style={plan.highlight ? { background: 'linear-gradient(145deg, #6d28d9, #7c3aed)' } : {}}
                >
                  {plan.tag && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                      {plan.tag}
                    </div>
                  )}

                  <div className={`text-xs font-bold mb-2 ${plan.highlight ? 'text-violet-200' : plan.enterprise ? 'text-gray-400' : 'text-gray-400'}`}>
                    {plan.name}
                  </div>

                  <div className="mb-1">
                    {price === null ? (
                      <span className={`font-black text-lg ${plan.enterprise ? 'text-white' : 'text-gray-900'}`}>Sob consulta</span>
                    ) : price === 0 ? (
                      <span className={`font-black text-3xl ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>Grátis</span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className={`font-black text-2xl ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                          R${price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className={`text-xs ${plan.highlight ? 'text-violet-300' : plan.enterprise ? 'text-gray-500' : 'text-gray-400'}`}>/mês</span>
                      </div>
                    )}
                  </div>

                  {plan.trialBadge && (
                    <div className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 w-fit">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      7 dias grátis
                    </div>
                  )}
                  {plan.key === 'free' && !plan.trialBadge && (
                    <div className="h-5 mb-2" />
                  )}

                  <p className={`text-xs mb-4 ${plan.highlight ? 'text-violet-200' : plan.enterprise ? 'text-gray-400' : 'text-gray-400'}`}>
                    {plan.desc}
                  </p>

                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-white/20' : plan.enterprise ? 'bg-gray-700' : 'bg-violet-100'}`}>
                          <svg className={`w-2 h-2 ${plan.highlight || plan.enterprise ? 'text-white' : 'text-violet-600'}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className={plan.highlight ? 'text-violet-100' : plan.enterprise ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.enterprise ? (
                    <a href={plan.href} className="block text-center py-2.5 rounded-full font-bold text-xs bg-amber-500 text-white hover:bg-amber-400 transition-colors">
                      {plan.cta}
                    </a>
                  ) : (
                    <Link href={plan.href} className={`block text-center py-2.5 rounded-full font-bold text-xs transition-colors ${
                      plan.highlight ? 'bg-white text-violet-700 hover:bg-violet-50' : plan.key === 'free' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}>
                      {plan.cta}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>

          {annual && (
            <p className="text-center text-xs text-gray-400 mt-4">Cobrado anualmente · Economize 20% em relação ao plano mensal</p>
          )}
          {!annual && (
            <p className="text-center text-xs text-gray-400 mt-4">Todos os planos pagos incluem 7 dias grátis sem cartão · Cancele quando quiser</p>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 sm:py-28 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Dúvidas frequentes</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Perguntas e respostas</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 sm:px-8">
            {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 sm:py-28 px-6 relative overflow-hidden" style={{ background: '#0B0A1A' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.2) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-5 leading-tight">
            Comece hoje.<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Seus dados merecem ser entendidos.
            </span>
          </h2>
          <p className="text-lg text-gray-400 mb-4">
            Acesso completo por 7 dias. Seu primeiro dashboard em 2 minutos.
          </p>
          <p className="text-sm text-gray-600 mb-8">7 dias grátis · Sem cartão · Cancele quando quiser</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-10 py-5 rounded-full hover:bg-violet-500 transition-all text-lg shadow-xl shadow-violet-900/50">
            Criar conta e testar grátis
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-10 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <NavLogo />
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">
              Desenvolvido pela <strong className="text-gray-600">Mazzel Tech</strong>
            </span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/termos" className="hover:text-gray-700 transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-gray-700 transition-colors">Privacidade</Link>
            <Link href="/login" className="hover:text-gray-700 transition-colors">Entrar</Link>
          </div>
          <p className="text-xs text-gray-300">© 2026 Mazzel Tech. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  )
}
