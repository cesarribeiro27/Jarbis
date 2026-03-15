'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'Editor drag-and-drop',
    desc: 'Monte dashboards profissionais arrastando blocos. Sem código, sem complicação.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: 'Embed em qualquer sistema',
    desc: 'Incorpore seus dashboards em qualquer site ou app com uma linha de código.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    title: 'Conecte suas fontes',
    desc: 'Importe CSVs, conecte APIs externas e sincronize automaticamente com seus dados.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: 'IA nativa em português',
    desc: 'Faça perguntas sobre seus dados em português e receba respostas instantâneas.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'Alertas inteligentes',
    desc: 'Configure thresholds e receba notificações quando suas métricas saírem do esperado.',
    color: 'bg-red-100 text-red-500',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: 'Compartilhamento white-label',
    desc: 'Gere links públicos com sua marca para compartilhar relatórios com seus clientes.',
    color: 'bg-purple-100 text-purple-600',
  },
]

const PLANS = [
  {
    name: 'Teste',
    price: 'Grátis',
    period: '',
    desc: '7 dias para explorar tudo',
    features: ['2 dashboards', '1 dataset', 'Link público', 'Embed básico'],
    cta: 'Começar teste gratuito',
    highlight: false,
    tag: null,
  },
  {
    name: 'Starter',
    price: 'R$197',
    period: '/mês',
    desc: 'Para times em crescimento',
    features: ['10 dashboards', '5 datasets', 'Alertas', 'Embed avançado', '3 usuários', 'Suporte por e-mail'],
    cta: 'Assinar Starter',
    highlight: false,
    tag: null,
  },
  {
    name: 'Business',
    price: 'R$349',
    period: '/mês',
    desc: 'Para operações em escala',
    features: ['30 dashboards', '20 datasets', 'IA em português', 'Filtros avançados', '10 usuários', 'Suporte em 24h'],
    cta: 'Assinar Business',
    highlight: true,
    tag: 'Mais popular',
  },
  {
    name: 'Pro',
    price: 'R$597',
    period: '/mês',
    desc: 'Para empresas que exigem mais',
    features: ['Dashboards ilimitados', 'Datasets ilimitados', 'White-label', 'Usuários ilimitados', 'Suporte via chat', 'Onboarding por videochamada'],
    cta: 'Assinar Pro',
    highlight: false,
    tag: null,
  },
  {
    name: 'Professional',
    price: 'R$799',
    period: '/mês',
    desc: 'Para revendedores e agências',
    features: ['Tudo do Pro', 'Multi-tenant', 'Marca própria completa', 'Painel de clientes', 'API dedicada', 'Suporte via WhatsApp'],
    cta: 'Assinar Professional',
    highlight: false,
    tag: 'White-label total',
  },
  {
    name: 'Empresa',
    price: 'Sob consulta',
    period: '',
    desc: 'Para grandes operações',
    features: ['Tudo do Professional', 'Gerente de conta dedicado', 'SLA contratual garantido', 'Onboarding e treinamento', 'Integrações customizadas', 'Contrato anual'],
    cta: 'Falar com comercial',
    highlight: false,
    tag: 'Enterprise',
  },
]

const COMPARISON = [
  { feature: 'Preço inicial', jarbis: 'Grátis por 7 dias', luzmo: '$1.000+/mês', powerbi: 'R$60/usuário' },
  { feature: 'Interface em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Suporte em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Embed via iframe', jarbis: true, luzmo: true, powerbi: 'Complexo' },
  { feature: 'IA em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Setup em minutos', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Plano de teste gratuito', jarbis: true, luzmo: false, powerbi: false },
]

function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="absolute inset-0 bg-violet-600 rounded-xl rotate-[8deg]" />
        <div className="absolute inset-0 bg-violet-500 rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <rect x="3" y="10" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="8" y="6" width="4" height="11" rx="1" fill="white" />
            <rect x="13" y="3" width="4" height="14" rx="1" fill="white" fillOpacity="0.7" />
          </svg>
        </div>
      </div>
      <span className={`font-black text-xl tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}>
        Jarbis
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

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="bg-white text-gray-900 antialiased">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Preços</a>
            <a href="#compare" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Comparativo</a>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Entrar</Link>
            <Link href="/signup" className="bg-violet-600 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
              Testar grátis por 7 dias
            </Link>
          </div>
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            )}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-6 py-5 flex flex-col gap-4">
            <a href="#features" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>Funcionalidades</a>
            <a href="#pricing" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>Preços</a>
            <a href="#compare" className="text-sm text-gray-600 font-medium" onClick={() => setMenuOpen(false)}>Comparativo</a>
            <Link href="/login" className="text-sm text-gray-600 font-medium">Entrar</Link>
            <Link href="/signup" className="bg-violet-600 text-white text-sm font-bold px-5 py-3 rounded-full text-center">Testar grátis por 7 dias</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative pt-28 pb-0 px-6 overflow-hidden" style={{ background: '#0B0A1A' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            BI embarcado feito para o Brasil
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.05] mb-6">
            Seus dados,<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              visíveis para todos
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crie dashboards interativos, incorpore analytics no seu produto e compartilhe insights com clientes. Sem precisar de uma equipe de dados.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-violet-600 text-white font-bold px-8 py-4 rounded-full hover:bg-violet-500 transition-all text-base shadow-lg shadow-violet-900/50">
              Testar grátis por 7 dias
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </Link>
            <a href="#features"
              className="inline-flex items-center justify-center border border-white/10 text-gray-300 font-semibold px-8 py-4 rounded-full hover:bg-white/5 transition-all text-base">
              Ver como funciona
            </a>
          </div>
          <p className="text-sm text-gray-600">7 dias de acesso completo · Setup em 2 minutos</p>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="absolute -inset-4 rounded-2xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.3) 0%, transparent 60%)' }} />

          <div className="relative rounded-t-2xl overflow-hidden border border-white/10"
            style={{ background: '#13111F' }}>
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
                  {[40, 55, 45, 70, 60, 85, 75, 92, 80, 68, 88, 96].map((h, i) => (
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
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Funcionalidades</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">
              Tudo que você precisa,<br />nada do que não precisa
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Desenvolvido para times brasileiros que precisam de analytics profissional sem a complexidade e o preço das ferramentas gringas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
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

      {/* HOW IT WORKS */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Como funciona</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">Pronto em minutos</h2>
            <p className="text-lg text-gray-500">Sem configuração complexa, sem engenheiro de dados necessário.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200" />

            {[
              { step: '01', title: 'Conecte seus dados', desc: 'Importe um CSV ou conecte sua API. Seus dados ficam prontos em segundos.' },
              { step: '02', title: 'Monte seu dashboard', desc: 'Arraste gráficos, tabelas e KPIs para o canvas. Configure tudo com cliques.' },
              { step: '03', title: 'Compartilhe ou incorpore', desc: 'Gere um link público ou embed o dashboard direto no seu produto.' },
            ].map((item, i) => (
              <div key={item.step} className="text-center relative">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex flex-col items-center justify-center relative"
                  style={{ background: i === 1 ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#F5F3FF' }}>
                  <span className={`text-xs font-bold mb-0.5 ${i === 1 ? 'text-violet-200' : 'text-violet-400'}`}>{item.step}</span>
                  <span className={`text-2xl font-black ${i === 1 ? 'text-white' : 'text-violet-700'}`}>
                    {['→', '⊞', '↗'][i]}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="compare" className="py-28 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Comparativo</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">Por que Jarbis?</h2>
            <p className="text-lg text-gray-500">A única plataforma de BI embarcado pensada para o mercado brasileiro.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAFAF8' }} className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Funcionalidade</th>
                  <th className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 font-bold text-sm px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                      Jarbis
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="text-sm font-semibold text-gray-400">Luzmo</div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="text-sm font-semibold text-gray-400">Power BI</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center"><ComparisonCell value={row.jarbis} /></td>
                    <td className="px-6 py-4 text-center"><ComparisonCell value={row.luzmo} /></td>
                    <td className="px-6 py-4 text-center"><ComparisonCell value={row.powerbi} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 font-semibold text-sm mb-3 tracking-wide uppercase">Preços</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-5">Preço justo, em real</h2>
            <p className="text-lg text-gray-500">Sem surpresas em dólar. Cancele quando quiser.</p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {PLANS.map((plan) => {
              const isEnterprise = plan.name === 'Empresa'
              return (
              <div key={plan.name}
                className={`rounded-2xl p-5 relative flex flex-col ${
                  plan.highlight
                    ? 'text-white'
                    : isEnterprise
                    ? 'bg-gray-900 text-white border border-gray-800'
                    : 'bg-white border border-gray-100'
                }`}
                style={plan.highlight ? { background: 'linear-gradient(145deg, #6d28d9, #7c3aed)' } : {}}>

                {plan.tag && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-black px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap ${
                    plan.highlight ? 'bg-amber-400 text-amber-900' : isEnterprise ? 'bg-gray-700 text-gray-300' : 'bg-violet-100 text-violet-700'
                  }`}>
                    {plan.tag}
                  </div>
                )}

                <div className={`text-xs font-bold mb-3 ${plan.highlight ? 'text-violet-200' : isEnterprise ? 'text-gray-400' : 'text-gray-400'}`}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`font-black ${isEnterprise ? 'text-lg text-white' : 'text-3xl'} ${plan.highlight ? 'text-white' : isEnterprise ? '' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-xs ${plan.highlight ? 'text-violet-300' : isEnterprise ? 'text-gray-500' : 'text-gray-400'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-xs mb-5 ${plan.highlight ? 'text-violet-200' : isEnterprise ? 'text-gray-400' : 'text-gray-400'}`}>
                  {plan.desc}
                </p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-white/20' : isEnterprise ? 'bg-gray-700' : 'bg-violet-100'}`}>
                        <svg className={`w-2.5 h-2.5 ${plan.highlight || isEnterprise ? 'text-white' : 'text-violet-600'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className={plan.highlight ? 'text-violet-100' : isEnterprise ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                {isEnterprise ? (
                  <a href="mailto:comercial@mazzelag.com"
                    className="block text-center py-3 rounded-full font-bold text-xs transition-all bg-white text-gray-900 hover:bg-gray-100">
                    {plan.cta}
                  </a>
                ) : (
                  <Link href="/signup"
                    className={`block text-center py-3 rounded-full font-bold text-xs transition-all ${
                      plan.highlight
                        ? 'bg-white text-violet-700 hover:bg-violet-50'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}>
                    {plan.cta}
                  </Link>
                )}
              </div>
            )})}
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            Todos os planos pagos incluem 7 dias de teste gratuito para conhecer a plataforma.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: '#0B0A1A' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.2) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-5 leading-tight">
            Comece hoje,<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              com 7 dias grátis
            </span>
          </h2>
          <p className="text-lg text-gray-400 mb-10">
            Acesso completo por 7 dias. Seu primeiro dashboard em 2 minutos.
          </p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-10 py-5 rounded-full hover:bg-violet-500 transition-all text-lg shadow-xl shadow-violet-900/50">
            Criar conta e testar grátis
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-10 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo />
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
