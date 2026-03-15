'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { BlockConfigPanel, DatasetPanel, CanvasConfigPanel } from '@/components/ReportBuilder'
import { TEMPLATES } from '@/lib/templates'

const ReportBuilder = dynamic(() => import('@/components/ReportBuilder'), { ssr: false })

const BLOCK_TYPES = [
  { type: 'kpi',         label: 'KPI',          desc: 'Número em destaque' },
  { type: 'bar',         label: 'Barras',        desc: 'Comparar categorias' },
  { type: 'bar_h',       label: 'Barras H',      desc: 'Barras horizontais' },
  { type: 'area',        label: 'Área',          desc: 'Evolução acumulada' },
  { type: 'line',        label: 'Linhas',        desc: 'Evolução no tempo' },
  { type: 'pie',         label: 'Pizza',         desc: 'Distribuição %' },
  { type: 'combo',       label: 'Combo',         desc: 'Barra + linha' },
  { type: 'gauge',       label: 'Gauge',         desc: 'Indicador circular' },
  { type: 'speedometer', label: 'Velocímetro',   desc: 'Indicador semicircular' },
  { type: 'treemap',     label: 'Treemap',       desc: 'Hierarquia por área' },
  { type: 'bubble',      label: 'Bolhas',        desc: 'Dispersão por volume' },
  { type: 'slider',      label: 'Slider',        desc: 'Filtro por faixa' },
  { type: 'scatter',     label: 'Dispersão',     desc: 'Correlação XY' },
  { type: 'table',       label: 'Tabela',        desc: 'Dados em linhas' },
  { type: 'text',        label: 'Texto',         desc: 'Comentários' },
  { type: 'filter',      label: 'Filtro',        desc: 'Filtrar dados' },
  { type: 'image',       label: 'Imagem',        desc: 'Foto ou logo' },
]

let counter = 0
function newBlock(type) {
  const isFilter = type === 'filter'
  const isNoData = isFilter || type === 'text' || type === 'image'
  const col = isFilter ? (counter % 6) * 2 : (counter % 4) * 3
  return {
    id: `block_${++counter}_${Date.now()}`,
    type,
    title: BLOCK_TYPES.find(b => b.type === type)?.label || type,
    dataset_id: null,
    ...(isFilter ? { filter_col: null, filter_label: '' } : isNoData ? {} : { label_col: null, value_col: null, agg: 'sum' }),
    config: {},
    layout: { x: col, y: Infinity, w: isFilter ? 2 : 3, h: isFilter ? 2 : 2 },
  }
}

// Ilustrações SVG temáticas por template
const TPL_PREVIEWS = {
  blank: (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <span className="text-[10px] text-gray-400 font-medium">Canvas em branco</span>
    </div>
  ),
  sales_trends: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#f5f3ff"/>
      {[20,35,28,50,42,62,55,75,65,88].map((h,i) => <rect key={i} x={10+i*19} y={95-h} width="12" height={h} rx="2" fill={i===9?'#7c3aed':'#c4b5fd'}/>)}
      <polyline points="16,75 35,60 54,68 73,45 92,53 111,30 130,38 149,20 168,28 187,12" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  sales_pipeline: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#eff6ff"/>
      {[{y:8,w:180,label:'Leads',c:'#bfdbfe'},{y:28,w:140,label:'Qualif.',c:'#93c5fd'},{y:48,w:100,label:'Proposta',c:'#60a5fa'},{y:68,w:65,label:'Negoc.',c:'#3b82f6'},{y:88,w:35,label:'Fechado',c:'#1d4ed8'}].map((s,i)=>(
        <g key={i}><rect x={(200-s.w)/2} y={s.y} width={s.w} height="14" rx="3" fill={s.c}/><text x="100" y={s.y+10} textAnchor="middle" fontSize="7" fill="white" fontWeight="600">{s.label}</text></g>
      ))}
    </svg>
  ),
  ecommerce: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#fff7ed"/>
      <rect x="10" y="20" width="28" height="60" rx="3" fill="#fed7aa"/>
      <rect x="46" y="35" width="28" height="45" rx="3" fill="#fdba74"/>
      <rect x="82" y="10" width="28" height="70" rx="3" fill="#f97316"/>
      <rect x="118" y="28" width="28" height="52" rx="3" fill="#fed7aa"/>
      <rect x="154" y="42" width="28" height="38" rx="3" fill="#fdba74"/>
      <polyline points="24,18 60,33 96,8 132,26 168,40" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round"/>
    </svg>
  ),
  web_analytics: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#f0f9ff"/>
      <polyline points="10,80 35,55 60,65 85,30 110,45 135,20 160,35 185,15" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="10,80 35,55 60,65 85,30 110,45 135,20 160,35 185,15 185,100 10,100" fill="rgba(14,165,233,0.1)"/>
      {[10,35,60,85,110,135,160,185].map((x,i) => <circle key={i} cx={x} cy={[80,55,65,30,45,20,35,15][i]} r="3" fill="#0ea5e9"/>)}
    </svg>
  ),
  marketing: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#faf5ff"/>
      <circle cx="60" cy="50" r="38" fill="none" stroke="#e9d5ff" strokeWidth="20"/>
      <circle cx="60" cy="50" r="38" fill="none" stroke="#7c3aed" strokeWidth="20" strokeDasharray="72 167" strokeDashoffset="0"/>
      <circle cx="60" cy="50" r="38" fill="none" stroke="#a78bfa" strokeWidth="20" strokeDasharray="48 191" strokeDashoffset="-72"/>
      <circle cx="60" cy="50" r="38" fill="none" stroke="#c4b5fd" strokeWidth="20" strokeDasharray="40 199" strokeDashoffset="-120"/>
      <rect x="120" y="15" width="65" height="12" rx="3" fill="#7c3aed"/>
      <rect x="120" y="34" width="50" height="12" rx="3" fill="#a78bfa"/>
      <rect x="120" y="53" width="38" height="12" rx="3" fill="#c4b5fd"/>
      <rect x="120" y="72" width="55" height="12" rx="3" fill="#ede9fe"/>
    </svg>
  ),
  rh_equipe: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#f0fdfa"/>
      {[0,1,2,3,4].map(i=>(
        <g key={i} transform={`translate(${20+i*36},0)`}>
          <circle cx="18" cy="28" r="10" fill={['#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488'][i]}/>
          <rect x="4" y="42" width="28" height={[25,38,30,45,20][i]} rx="3" fill={['#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488'][i]}/>
        </g>
      ))}
    </svg>
  ),
  suporte: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#fff1f2"/>
      {[{x:10,y:10,w:55,h:22,c:'#fecdd3',tc:'#f43f5e',l:'Aberto'},{x:72,y:10,w:55,h:22,c:'#fde68a',tc:'#d97706',l:'Em andamento'},{x:134,y:10,w:56,h:22,c:'#bbf7d0',tc:'#16a34a',l:'Resolvido'}].map((col,ci)=>(
        <g key={ci}><rect x={col.x} y={col.y} width={col.w} height={col.h} rx="3" fill={col.c}/><text x={col.x+col.w/2} y={col.y+14} textAnchor="middle" fontSize="7" fill={col.tc} fontWeight="700">{col.l}</text></g>
      ))}
      {[1,2,3].map(row=>([10,72,134].map((x,ci)=>(
        <rect key={`${row}-${ci}`} x={x} y={10+row*26} width={[55,55,56][ci]} height="20" rx="3" fill={['#fecdd3','#fde68a','#bbf7d0'][ci]} opacity={1-row*0.2}/>
      ))))}
    </svg>
  ),
  logistica: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#fffbeb"/>
      <polyline points="15,80 55,80 75,55 110,55 130,30 175,30" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3"/>
      <circle cx="15" cy="80" r="6" fill="#d97706"/>
      <circle cx="175" cy="30" r="6" fill="#10b981"/>
      <circle cx="75" cy="55" r="5" fill="#f59e0b" opacity="0.8"/>
      <circle cx="130" cy="30" r="5" fill="#f59e0b" opacity="0.8"/>
      <rect x="140" y="50" width="50" height="30" rx="4" fill="#fde68a"/>
      <rect x="155" y="60" width="20" height="12" rx="2" fill="#d97706"/>
      <circle cx="150" cy="82" r="5" fill="#92400e"/>
      <circle cx="178" cy="82" r="5" fill="#92400e"/>
    </svg>
  ),
  educacao: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#eef2ff"/>
      {[{l:'React',p:85},{l:'Python',p:72},{l:'Design',p:60},{l:'SQL',p:91}].map((c,i)=>(
        <g key={i} transform={`translate(0,${i*22+8})`}>
          <text x="10" y="12" fontSize="8" fill="#4b5563" fontWeight="500">{c.l}</text>
          <rect x="50" y="4" width="130" height="10" rx="5" fill="#e0e7ff"/>
          <rect x="50" y="4" width={130*c.p/100} height="10" rx="5" fill={['#6366f1','#8b5cf6','#a78bfa','#4f46e5'][i]}/>
          <text x="186" y="12" fontSize="7" fill="#6366f1" fontWeight="700">{c.p}%</text>
        </g>
      ))}
    </svg>
  ),
  financeiro: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#f0fdf4"/>
      {[{x:10,h:40,c:'#86efac'},{x:30,h:55,c:'#4ade80'},{x:50,h:35,c:'#86efac'},{x:70,h:65,c:'#22c55e'},{x:90,h:48,c:'#4ade80'},{x:110,h:70,c:'#16a34a'},{x:130,h:58,c:'#22c55e'},{x:150,h:80,c:'#15803d'},{x:170,h:72,c:'#166534'}].map((b,i)=>(
        <rect key={i} x={b.x} y={95-b.h} width="16" height={b.h} rx="2" fill={b.c}/>
      ))}
      <polyline points="18,55 38,40 58,60 78,30 98,47 118,25 138,32 158,15 178,23" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" strokeLinecap="round"/>
    </svg>
  ),
  executive: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#faf5ff"/>
      <rect x="10" y="10" width="55" height="28" rx="4" fill="#7c3aed"/>
      <rect x="73" y="10" width="55" height="28" rx="4" fill="#6366f1"/>
      <rect x="136" y="10" width="54" height="28" rx="4" fill="#8b5cf6"/>
      <text x="37" y="28" textAnchor="middle" fontSize="11" fill="white" fontWeight="900">R$2.4M</text>
      <text x="100" y="28" textAnchor="middle" fontSize="11" fill="white" fontWeight="900">+18%</text>
      <text x="163" y="28" textAnchor="middle" fontSize="11" fill="white" fontWeight="900">4.8k</text>
      <polyline points="10,80 40,65 70,70 100,48 130,55 160,35 190,40" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="10,80 40,65 70,70 100,48 130,55 160,35 190,40 190,100 10,100" fill="rgba(124,58,237,0.08)"/>
    </svg>
  ),
  media: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#eef2ff"/>
      <circle cx="70" cy="50" r="38" fill="none" stroke="#e0e7ff" strokeWidth="18"/>
      <circle cx="70" cy="50" r="38" fill="none" stroke="#6366f1" strokeWidth="18" strokeDasharray="85 154"/>
      <circle cx="70" cy="50" r="38" fill="none" stroke="#818cf8" strokeWidth="18" strokeDasharray="50 189" strokeDashoffset="-85"/>
      <circle cx="70" cy="50" r="38" fill="none" stroke="#a5b4fc" strokeWidth="18" strokeDasharray="40 199" strokeDashoffset="-135"/>
      <rect x="125" y="20" width="65" height="12" rx="3" fill="#6366f1"/>
      <rect x="125" y="38" width="50" height="12" rx="3" fill="#818cf8"/>
      <rect x="125" y="56" width="38" height="12" rx="3" fill="#a5b4fc"/>
      <rect x="125" y="74" width="55" height="12" rx="3" fill="#e0e7ff"/>
    </svg>
  ),
  okrs_metas: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#faf5ff"/>
      {[{cx:35,cy:65,label:'Receita',pct:82,c:'#7c3aed'},{cx:100,cy:65,label:'Clientes',pct:65,c:'#6366f1'},{cx:165,cy:65,label:'NPS',pct:91,c:'#8b5cf6'}].map((g,i)=>(
        <g key={i}>
          <path d={`M ${g.cx-24},${g.cy} A 24,24 0 0,1 ${g.cx+24},${g.cy}`} fill="none" stroke="#e9d5ff" strokeWidth="7" strokeLinecap="round"/>
          <path d={`M ${g.cx-24},${g.cy} A 24,24 0 0,1 ${g.cx+24},${g.cy}`} fill="none" stroke={g.c} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${g.pct*0.754} 100`}/>
          <text x={g.cx} y={g.cy-6} textAnchor="middle" fontSize="9" fill={g.c} fontWeight="900">{g.pct}%</text>
          <text x={g.cx} y={g.cy+14} textAnchor="middle" fontSize="7" fill="#6b7280">{g.label}</text>
        </g>
      ))}
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#ecfeff"/>
      <rect x="8" y="8" width="90" height="55" rx="3" fill="#0891b2"/>
      <text x="53" y="40" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">Produto A</text>
      <text x="53" y="53" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.8)">R$1.2M</text>
      <rect x="103" y="8" width="45" height="55" rx="3" fill="#06b6d4"/>
      <text x="125" y="38" textAnchor="middle" fontSize="8" fill="white" fontWeight="600">B</text>
      <rect x="153" y="8" width="39" height="55" rx="3" fill="#67e8f9"/>
      <text x="172" y="38" textAnchor="middle" fontSize="8" fill="#0e7490" fontWeight="600">C</text>
      <rect x="8" y="68" width="55" height="26" rx="3" fill="#a5f3fc"/>
      <rect x="68" y="68" width="45" height="26" rx="3" fill="#06b6d4"/>
      <rect x="118" y="68" width="74" height="26" rx="3" fill="#0891b2"/>
    </svg>
  ),
  vendas_avancado: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#f5f3ff"/>
      {[25,38,30,55,45,70,58].map((h,i)=><rect key={i} x={10+i*26} y={90-h} width="18" height={h} rx="2" fill="rgba(124,58,237,0.25)"/>)}
      <polyline points="19,65 45,52 71,60 97,35 123,45 149,20 175,32" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {[65,52,60,35,45,20,32].map((y,i)=><circle key={i} cx={19+i*26} cy={y} r="3.5" fill="#7c3aed"/>)}
    </svg>
  ),
  operacoes_noc: (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <rect width="200" height="100" fill="#f8fafc"/>
      <path d="M 30,85 A 50,50 0 0,1 130,85" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
      <path d="M 30,85 A 50,50 0 0,1 130,85" fill="none" stroke="#10b981" strokeWidth="14" strokeLinecap="round" strokeDasharray="110 157" />
      <line x1="80" y1="85" x2="108" y2="42" stroke="#1f2937" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="80" cy="85" r="5" fill="#374151"/>
      <text x="80" y="78" textAnchor="middle" fontSize="9" fill="#374151" fontWeight="900">99.8%</text>
      <rect x="148" y="15" width="44" height="18" rx="3" fill="#dcfce7"/>
      <text x="170" y="28" textAnchor="middle" fontSize="8" fill="#16a34a" fontWeight="700">Online</text>
      <rect x="148" y="40" width="44" height="18" rx="3" fill="#fef9c3"/>
      <text x="170" y="53" textAnchor="middle" fontSize="8" fill="#ca8a04" fontWeight="700">1 Alerta</text>
      <rect x="148" y="65" width="44" height="18" rx="3" fill="#fee2e2"/>
      <text x="170" y="78" textAnchor="middle" fontSize="8" fill="#dc2626" fontWeight="700">SLA 94%</text>
    </svg>
  ),
}

// Cores de fundo por categoria
const TPL_COLORS = {
  blank:          'from-gray-50 to-gray-100',
  sales_trends:   'from-violet-50 to-purple-50',
  sales_pipeline: 'from-blue-50 to-indigo-50',
  ecommerce:      'from-orange-50 to-amber-50',
  web_analytics:  'from-sky-50 to-cyan-50',
  marketing:      'from-purple-50 to-violet-50',
  rh_equipe:      'from-teal-50 to-emerald-50',
  suporte:        'from-rose-50 to-pink-50',
  logistica:      'from-amber-50 to-yellow-50',
  educacao:       'from-indigo-50 to-blue-50',
  financeiro:     'from-green-50 to-emerald-50',
  executive:      'from-violet-50 to-fuchsia-50',
  media:          'from-indigo-50 to-violet-50',
  okrs_metas:     'from-purple-50 to-violet-50',
  portfolio:      'from-cyan-50 to-sky-50',
  vendas_avancado:'from-violet-50 to-purple-50',
  operacoes_noc:  'from-slate-50 to-gray-50',
}

function TemplateGallery({ onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = TEMPLATES.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.tags || []).some(tag => tag.includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#f8f7fc] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 h-[60px] flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm shadow-violet-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>
          </svg>
        </div>
        <span className="text-gray-900 font-black text-[15px] tracking-tight">Jarbis</span>
        <span className="text-gray-300 text-sm">·</span>
        <span className="text-gray-500 text-sm">Novo Dashboard</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-gray-900 mb-2">Escolha um template</h1>
            <p className="text-sm text-gray-500 mb-5">Comece do zero ou use um template pronto — basta conectar seus dados.</p>
            <div className="relative max-w-xs mx-auto">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                type="text"
                placeholder="Buscar template..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(tpl => {
              const preview = TPL_PREVIEWS[tpl.id]
              const gradientClass = TPL_COLORS[tpl.id] || 'from-gray-50 to-gray-100'
              return (
                <button
                  key={tpl.id}
                  onClick={() => onSelect(tpl)}
                  className="group text-left bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100 transition-all duration-200"
                >
                  {/* Preview ilustrado */}
                  <div className={`w-full h-28 bg-gradient-to-br ${gradientClass} overflow-hidden relative`}>
                    {preview}
                    {tpl.badges && tpl.badges.length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {tpl.badges.slice(0,2).map(b => (
                          <span key={b} className="text-[9px] bg-violet-600 text-white font-bold px-1.5 py-0.5 rounded-full capitalize">{b}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base leading-none">{tpl.icon}</span>
                      <p className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors text-sm leading-tight">{tpl.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{tpl.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-wrap gap-1">
                        {(tpl.tags || []).slice(0,2).map(tag => (
                          <span key={tag} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{tag}</span>
                        ))}
                      </div>
                      {tpl.blocks?.length > 0 && (
                        <span className="text-[10px] text-gray-300 font-medium">{tpl.blocks.length} blocos</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NovoDashboardPage() {
  const router = useRouter()
  const [templateSelected, setTemplateSelected] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [blocks, setBlocks] = useState([])
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidePanel, setSidePanel] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [canvasConfig, setCanvasConfig] = useState({ bgColor: '', sheetBgColor: '' })
  const addMenuRef = useRef()

  useEffect(() => {
    api.reports.datasets.list().then(setDatasets).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function applyTemplate(tpl) {
    setTitle(tpl.id === 'blank' ? '' : tpl.title)
    setBlocks(tpl.blocks.map((b, i) => ({ ...b, id: `tpl_${tpl.id}_${i}_${Date.now()}` })))
    setTemplateSelected(true)
  }

  if (!templateSelected) return <TemplateGallery onSelect={applyTemplate} />

  function addBlock(type) {
    const block = newBlock(type)
    setBlocks(prev => [...prev, block])
    setSelectedBlockId(block.id)
  }

  function updateActiveBlock(updated) {
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  function togglePanel(panel) {
    if (sidePanel === panel && sidebarOpen) { setSidebarOpen(false); setSidePanel(null) }
    else { setSidePanel(panel); setSidebarOpen(true) }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Informe o título'); return }
    setSaving(true); setError('')
    try {
      const report = await api.reports.create({ title, description: description || null, blocks })
      router.push(`/dashboards/${report.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const activeBlock = blocks.find(b => b.id === selectedBlockId)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f7fc]">
      <div className="bg-white border-b border-gray-100 px-4 h-[52px] flex items-center gap-2 shrink-0">
        <button onClick={() => router.push('/dashboards')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Voltar
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <button onClick={() => setTemplateSelected(false)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /></svg>
          Templates
        </button>

        <div className="relative" ref={addMenuRef}>
          <button onClick={() => setShowAddMenu(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" /></svg>
            Adicionar item
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" /></svg>
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 grid grid-cols-2 gap-1">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => { addBlock(bt.type); setShowAddMenu(false) }} className="flex flex-col items-start p-2 rounded-lg hover:bg-violet-50 transition-colors text-left">
                  <p className="text-xs font-semibold text-gray-800">{bt.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{bt.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button onClick={() => router.push('/dashboards')} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Salvar dashboard'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6 min-w-0" style={{ backgroundColor: canvasConfig.bgColor || '#f3f4f6' }} onClick={() => setSelectedBlockId(null)}>
          <div className="mb-6" onClick={e => e.stopPropagation()}>
            <input className="text-2xl font-black text-gray-800 bg-transparent outline-none border-b-2 border-transparent focus:border-violet-300 transition-colors py-1 w-full block" placeholder="Título do dashboard..." value={title} onChange={e => setTitle(e.target.value)} />
            <input className="text-sm text-gray-500 bg-transparent outline-none mt-1 w-full block" placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <ReportBuilder blocks={blocks} onChange={setBlocks} readOnly={false} selectedBlockId={selectedBlockId} onSelectBlock={id => setSelectedBlockId(id)} onBlockAction={(id, action) => { setSelectedBlockId(id); setSidePanel(action); setSidebarOpen(true) }} datasets={datasets} sheetConfig={{ bgColor: canvasConfig.sheetBgColor }} />
        </div>

        <aside className={`${sidebarOpen && sidePanel ? 'w-72' : 'w-0'} bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden transition-[width] duration-200`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">{sidePanel === 'dados' ? 'Dados' : activeBlock ? 'Configurar bloco' : 'Dashboard'}</span>
            <button onClick={() => { setSidebarOpen(false); setSidePanel(null) }} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {sidePanel === 'dados' && <DatasetPanel datasets={datasets} onDatasetsChange={setDatasets} />}
            {sidePanel === 'config' && (activeBlock ? <BlockConfigPanel block={activeBlock} onChange={updateActiveBlock} datasets={datasets} /> : <CanvasConfigPanel config={canvasConfig} onChange={setCanvasConfig} />)}
          </div>
        </aside>

        <div className="w-12 bg-white border-l border-gray-100 flex flex-col items-center py-3 gap-1 shrink-0">
          <button title="Dados" onClick={() => togglePanel('dados')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'dados' && sidebarOpen ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" /></svg>
          </button>
          <button title="Configurar" onClick={() => togglePanel('config')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${sidePanel === 'config' && sidebarOpen ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeWidth={1.5} /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
