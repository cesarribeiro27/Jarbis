'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  {
    icon: '📊',
    title: 'Editor drag-and-drop',
    desc: 'Monte dashboards profissionais arrastando blocos. Sem código, sem complicação.',
  },
  {
    icon: '🔗',
    title: 'Embed em qualquer sistema',
    desc: 'Incorpore seus dashboards em qualquer site ou app com uma linha de código.',
  },
  {
    icon: '📁',
    title: 'Conecte suas fontes de dados',
    desc: 'Importe CSVs, conecte APIs externas e sincronize automaticamente.',
  },
  {
    icon: '🤖',
    title: 'IA nativa em português',
    desc: 'Faça perguntas sobre seus dados em português e receba respostas instantâneas.',
  },
  {
    icon: '🔔',
    title: 'Alertas inteligentes',
    desc: 'Configure thresholds e receba notificações quando métricas saírem do esperado.',
  },
  {
    icon: '🌐',
    title: 'Compartilhamento público',
    desc: 'Gere links públicos com white-label para compartilhar com clientes.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: 'Grátis',
    period: '',
    desc: 'Para começar a explorar',
    features: ['2 dashboards', '1 dataset', 'Link público', 'Embed básico'],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    name: 'Starter',
    price: 'R$97',
    period: '/mês',
    desc: 'Para times em crescimento',
    features: ['10 dashboards', '5 datasets', 'Alertas', 'Embed avançado', '3 usuários'],
    cta: 'Começar agora',
    highlight: true,
  },
  {
    name: 'Pro',
    price: 'R$297',
    period: '/mês',
    desc: 'Para empresas que escalam',
    features: ['Ilimitado', 'AI em português', 'White-label', 'Usuários ilimitados', 'Suporte prioritário'],
    cta: 'Falar com vendas',
    highlight: false,
  },
]

const COMPARISON = [
  { feature: 'Preço inicial', jarbis: 'Grátis', luzmo: '$1.000+/mês', powerbi: 'R$60/usuário' },
  { feature: 'Interface em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Suporte em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Embed via iframe/SDK', jarbis: true, luzmo: true, powerbi: 'Complexo' },
  { feature: 'IA em português', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Setup em minutos', jarbis: true, luzmo: false, powerbi: false },
  { feature: 'Plano gratuito', jarbis: true, luzmo: false, powerbi: false },
]

function CheckIcon() {
  return <span className="text-indigo-600 font-bold">✓</span>
}
function CrossIcon() {
  return <span className="text-gray-300 font-bold">✗</span>
}

function ComparisonCell({ value }) {
  if (value === true) return <CheckIcon />
  if (value === false) return <CrossIcon />
  return <span className="text-sm text-gray-500">{value}</span>
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="bg-white text-gray-900">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">J</span>
            </div>
            <span className="font-black text-gray-900 text-lg">Jarbis</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Preços</a>
            <a href="#compare" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Comparativo</a>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Entrar</Link>
            <Link href="/signup" className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Começar grátis
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 h-0.5 bg-gray-900 mb-1"></div>
            <div className="w-5 h-0.5 bg-gray-900 mb-1"></div>
            <div className="w-5 h-0.5 bg-gray-900"></div>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4">
            <a href="#features" className="text-sm text-gray-600">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-gray-600">Preços</a>
            <a href="#compare" className="text-sm text-gray-600">Comparativo</a>
            <Link href="/login" className="text-sm text-gray-600">Entrar</Link>
            <Link href="/signup" className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg text-center">Começar grátis</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-br from-white via-indigo-50/30 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            BI embarcado feito para o Brasil
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6">
            Dashboards que<br />
            <span className="text-indigo-600">qualquer empresa</span><br />
            pode ter
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crie relatórios interativos, incorpore analytics no seu produto e compartilhe insights com seus clientes — sem precisar de uma equipe de dados.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="bg-indigo-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors text-lg">
              Começar grátis →
            </Link>
            <a href="#features" className="border border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors text-lg">
              Ver funcionalidades
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4">Sem cartão de crédito · Setup em 2 minutos</p>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <div className="flex-1 mx-4 bg-white border border-gray-200 rounded-md h-6 flex items-center px-3">
                <span className="text-xs text-gray-400">app.jarbis.cc/dashboards</span>
              </div>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4 bg-gray-50/50">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Total de Vendas</div>
                <div className="text-2xl font-black text-gray-900">R$847K</div>
                <div className="text-xs text-green-600 font-semibold mt-1">↑ 23% vs mês anterior</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Novos Clientes</div>
                <div className="text-2xl font-black text-gray-900">1.284</div>
                <div className="text-xs text-green-600 font-semibold mt-1">↑ 12% vs mês anterior</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Taxa de Conversão</div>
                <div className="text-2xl font-black text-indigo-600">4,7%</div>
                <div className="text-xs text-red-500 font-semibold mt-1">↓ 0,3% vs mês anterior</div>
              </div>
              <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 mb-3">Vendas por mês</div>
                <div className="flex items-end gap-2 h-20">
                  {[40, 65, 50, 80, 70, 95, 85, 100, 90, 75, 88, 92].map((h, i) => (
                    <div key={i} className="flex-1 bg-indigo-100 rounded-t-sm" style={{ height: `${h}%` }}>
                      <div className="w-full bg-indigo-500 rounded-t-sm" style={{ height: `${h}%` }}></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 mb-3">Por canal</div>
                <div className="space-y-2">
                  {[['Direto', 45], ['Orgânico', 30], ['Pago', 25]].map(([label, pct]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
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
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Tudo que você precisa, nada do que não precisa</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Desenvolvido para times brasileiros que precisam de analytics profissional sem a complexidade — e o preço — das ferramentas gringas.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-6 hover:bg-indigo-50/50 transition-colors border border-transparent hover:border-indigo-100">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Pronto em minutos</h2>
            <p className="text-lg text-gray-500">Sem configuração complexa, sem engenheiro de dados necessário.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Conecte seus dados', desc: 'Importe um CSV ou conecte sua API. Seus dados ficam prontos para visualizar.' },
              { step: '02', title: 'Monte seu dashboard', desc: 'Arraste gráficos, tabelas e KPIs para o canvas. Configure com cliques.' },
              { step: '03', title: 'Compartilhe ou incorpore', desc: 'Gere um link público ou embed o dashboard direto no seu produto.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-indigo-600 text-white font-black text-lg rounded-2xl flex items-center justify-center mx-auto mb-4">{item.step}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="compare" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Por que Jarbis?</h2>
            <p className="text-lg text-gray-500">A única plataforma de BI embarcado pensada para o mercado brasileiro.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Funcionalidade</th>
                  <th className="px-6 py-4 text-center">
                    <div className="text-sm font-black text-indigo-600">Jarbis</div>
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
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="px-6 py-3.5 text-sm text-gray-700">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.jarbis} /></td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.luzmo} /></td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.powerbi} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Preço justo, em real</h2>
            <p className="text-lg text-gray-500">Sem surpresas em dólar. Cancele quando quiser.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`bg-white rounded-2xl p-8 border ${plan.highlight ? 'border-indigo-500 shadow-lg shadow-indigo-100 relative' : 'border-gray-100'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Mais popular
                  </div>
                )}
                <div className="text-sm font-semibold text-gray-500 mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-400 mb-6">{plan.desc}</p>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-indigo-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Comece hoje, de graça</h2>
          <p className="text-lg text-gray-500 mb-8">Sem cartão de crédito. Sem prazo. Seu primeiro dashboard em 2 minutos.</p>
          <Link href="/signup" className="inline-block bg-indigo-600 text-white font-bold px-10 py-4 rounded-xl hover:bg-indigo-700 transition-colors text-lg">
            Criar conta grátis →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <span className="text-white font-black text-xs">J</span>
            </div>
            <span className="font-black text-gray-900">Jarbis</span>
            <span className="text-gray-300 mx-2">·</span>
            <span className="text-xs text-gray-400">Desenvolvido pela <strong className="text-gray-600">Mazzel Tech</strong></span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/termos" className="hover:text-gray-600">Termos</Link>
            <Link href="/privacidade" className="hover:text-gray-600">Privacidade</Link>
            <Link href="/login" className="hover:text-gray-600">Entrar</Link>
          </div>
          <p className="text-xs text-gray-300">© 2026 Mazzel Tech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
