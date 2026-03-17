'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { BlockConfigPanel, DatasetPanel, CanvasConfigPanel } from '@/components/ReportBuilder'
import DashboardRail from '@/components/DashboardRail'
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
    id: crypto.randomUUID(),
    type,
    title: BLOCK_TYPES.find(b => b.type === type)?.label || type,
    dataset_id: null,
    ...(isFilter ? { filter_col: null, filter_label: '' } : isNoData ? {} : { label_col: null, value_col: null, agg: 'sum' }),
    config: {},
    layout: { x: col, y: Infinity, w: isFilter ? 2 : 3, h: isFilter ? 2 : 2 },
  }
}

// Helper functions returning SVG <g> elements (used inside SVG context)
const KpiCard = ({ x, y, w = 44, h = 22, value, color, title }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="3" fill="white" opacity="0.95"/>
    <text x={x + 5} y={y + 9} fontSize="5.5" fill="#9ca3af" fontFamily="system-ui">{title}</text>
    <text x={x + 5} y={y + 17} fontSize="8" fill={color} fontWeight="700" fontFamily="system-ui">{value}</text>
    <rect x={x + 5} y={y + h - 3} width="12" height="2" rx="1" fill={color}/>
  </g>
)
const CardShell = ({ x, y, w, h, title, children }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="3" fill="white" opacity="0.92"/>
    <text x={x + 5} y={y + 9} fontSize="5.5" fill="#9ca3af" fontFamily="system-ui">{title}</text>
    {children}
  </g>
)

// Ilustrações SVG temáticas por template — blank usa componente separado para poder usar hook
function BlankPreview() {
  const t = useTranslations('dashboardNovo')
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <span className="text-[10px] text-gray-400 font-medium">{t('gallery.blankCanvas')}</span>
    </div>
  )
}

const TPL_PREVIEWS = {
  blank: <BlankPreview />,
  sales_trends: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_st" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f5f3ff"/><stop offset="100%" stopColor="#ede9fe"/></linearGradient><linearGradient id="area_st" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_st)"/>
      {/* KPI row */}
      <KpiCard x={4}  y={4} w={44} h={22} title="Receita" value="R$1,2M" color="#10b981"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Pedidos" value="4.821" color="#6366f1"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Ticket" value="R$256" color="#f59e0b"/>
      <KpiCard x={148} y={4} w={48} h={22} title="Clientes" value="1.893" color="#8b5cf6"/>
      {/* Combo chart */}
      <CardShell x={4} y={30} w={122} h={76} title="Receita + Tendência">
        {[18,24,20,32,28,38,34,44,40,50,46,55].map((h,i)=><rect key={i} x={12+i*9} y={94-h} width="6" height={h} rx="1" fill="#c4b5fd" opacity="0.8"/>)}
        <polyline points="15,76 24,71 33,74 42,64 51,68 60,58 69,62 78,52 87,56 96,46 105,50 114,44" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </CardShell>
      {/* Pie */}
      <CardShell x={130} y={30} w={66} h={76} title="Categorias">
        <circle cx="163" cy="74" r="22" fill="none" stroke="#e0e7ff" strokeWidth="12"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#6366f1" strokeWidth="12" strokeDasharray="44 94" strokeDashoffset="0"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="28 110" strokeDashoffset="-44"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="18 120" strokeDashoffset="-72"/>
        <circle cx="163" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
    </svg>
  ),
  sales_pipeline: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_sp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#eff6ff"/><stop offset="100%" stopColor="#dbeafe"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_sp)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Leads" value="1.840" color="#3b82f6"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Conversão" value="5,2%" color="#10b981"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Pipeline" value="R$4,2M" color="#6366f1"/>
      <KpiCard x={148} y={4} w={48} h={22} title="Fechados" value="95" color="#f59e0b"/>
      {/* Funil horizontal bars */}
      <CardShell x={4} y={30} w={92} h={76} title="Funil">
        {[{w:74,c:'#bfdbfe',l:'Leads'},{w:58,c:'#93c5fd',l:'Qualif.'},{w:44,c:'#60a5fa',l:'Proposta'},{w:30,c:'#3b82f6',l:'Negoc.'},{w:18,c:'#1d4ed8',l:'Fechado'}].map((b,i)=>(
          <g key={i}><rect x={10} y={42+i*11} width={b.w} height="8" rx="2" fill={b.c}/><text x={b.w+14} y={49+i*11} fontSize="5" fill="#6b7280">{b.l}</text></g>
        ))}
      </CardShell>
      {/* Line chart */}
      <CardShell x={100} y={30} w={96} h={76} title="Evolução Pipeline">
        <polyline points="108,92 120,82 132,85 144,70 156,74 168,60 180,65 192,52" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="108,92 120,82 132,85 144,70 156,74 168,60 180,65 192,52 192,100 108,100" fill="rgba(59,130,246,0.08)"/>
        {[92,82,85,70,74,60,65,52].map((y,i)=><circle key={i} cx={108+i*12} cy={y} r="2" fill="#3b82f6"/>)}
      </CardShell>
    </svg>
  ),
  ecommerce: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_ec" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff7ed"/><stop offset="100%" stopColor="#fed7aa" stopOpacity="0.4"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_ec)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Pedidos" value="3.842" color="#f97316"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Receita" value="R$984K" color="#10b981"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Ticket" value="R$256" color="#6366f1"/>
      <KpiCard x={148} y={4} w={48} h={22} title="Conversão" value="3,4%" color="#f59e0b"/>
      {/* Combo chart */}
      <CardShell x={4} y={30} w={122} h={76} title="Pedidos + Receita">
        {[22,28,18,36,30,40,34,46,38,50,44,56].map((h,i)=><rect key={i} x={12+i*9} y={94-h} width="6" height={h} rx="1" fill="#fed7aa"/>)}
        <polyline points="15,72 24,64 33,78 42,56 51,66 60,48 69,58 78,42 87,54 96,38 105,48 114,34" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </CardShell>
      {/* Pie */}
      <CardShell x={130} y={30} w={66} h={76} title="Categorias">
        <circle cx="163" cy="74" r="22" fill="none" stroke="#e5e7eb" strokeWidth="12"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#f97316" strokeWidth="12" strokeDasharray="40 98" strokeDashoffset="0"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#fbbf24" strokeWidth="12" strokeDasharray="28 110" strokeDashoffset="-40"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="20 118" strokeDashoffset="-68"/>
        <circle cx="163" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
    </svg>
  ),
  web_analytics: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_wa" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f0f9ff"/><stop offset="100%" stopColor="#e0f2fe"/></linearGradient><linearGradient id="area_wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2"/><stop offset="100%" stopColor="#0ea5e9" stopOpacity="0"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_wa)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Sessões" value="124K" color="#0ea5e9"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Usuários" value="89K" color="#6366f1"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Pageviews" value="312K" color="#8b5cf6"/>
      <KpiCard x={148} y={4} w={48} h={22} title="Rejeição" value="42,3%" color="#f43f5e"/>
      {/* Area chart large */}
      <CardShell x={4} y={30} w={122} h={76} title="Sessões no Tempo">
        <polyline points="12,92 24,78 36,82 48,62 60,70 72,50 84,58 96,42 108,50 120,36" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polygon points="12,92 24,78 36,82 48,62 60,70 72,50 84,58 96,42 108,50 120,36 120,100 12,100" fill="url(#area_wa)"/>
        {[92,78,82,62,70,50,58,42,50,36].map((y,i)=><circle key={i} cx={12+i*12} cy={y} r="2" fill="#0ea5e9"/>)}
      </CardShell>
      {/* Donut - fontes de tráfego */}
      <CardShell x={130} y={30} w={66} h={76} title="Fontes">
        <circle cx="163" cy="74" r="22" fill="none" stroke="#e0e7ff" strokeWidth="12"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#0ea5e9" strokeWidth="12" strokeDasharray="52 86" strokeDashoffset="0"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#6366f1" strokeWidth="12" strokeDasharray="30 108" strokeDashoffset="-52"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="16 122" strokeDashoffset="-82"/>
        <circle cx="163" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
    </svg>
  ),
  marketing: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#faf5ff"/><stop offset="100%" stopColor="#ede9fe"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_mk)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Investido" value="R$185K" color="#7c3aed"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Leads" value="2.840" color="#6366f1"/>
      <KpiCard x={100} y={4} w={44} h={22} title="CPL" value="R$65" color="#f59e0b"/>
      <KpiCard x={148} y={4} w={48} h={22} title="ROAS" value="4,2x" color="#10b981"/>
      {/* Donut - budget por canal */}
      <CardShell x={4} y={30} w={60} h={76} title="Budget Canal">
        <circle cx="34" cy="74" r="22" fill="none" stroke="#ede9fe" strokeWidth="13"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#7c3aed" strokeWidth="13" strokeDasharray="56 82" strokeDashoffset="0"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#a78bfa" strokeWidth="13" strokeDasharray="34 104" strokeDashoffset="-56"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#c4b5fd" strokeWidth="13" strokeDasharray="22 116" strokeDashoffset="-90"/>
        <circle cx="34" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
      {/* Combo chart - leads + investimento */}
      <CardShell x={68} y={30} w={128} h={76} title="Leads + Investimento">
        {[20,26,18,32,28,38,30,42,36,46,40,52].map((h,i)=><rect key={i} x={76+i*9} y={94-h} width="6" height={h} rx="1" fill="#e9d5ff"/>)}
        <polyline points="79,74 88,66 97,72 106,56 115,62 124,48 133,54 142,42 151,48 160,36 169,42 178,30" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </CardShell>
    </svg>
  ),
  rh_equipe: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_rh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f0fdfa"/><stop offset="100%" stopColor="#ccfbf1"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_rh)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Headcount" value="148" color="#0d9488"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Novas Cont." value="12" color="#10b981"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Turnover" value="4,2%" color="#f43f5e"/>
      <KpiCard x={148} y={4} w={48} h={22} title="eNPS" value="42" color="#8b5cf6"/>
      {/* Bar chart - performance */}
      <CardShell x={4} y={30} w={60} h={76} title="Performance">
        {[{n:'Ana',v:38},{n:'Bruno',v:50},{n:'Carla',v:44},{n:'Diego',v:58},{n:'Elisa',v:35}].map((p,i)=>(
          <g key={i}><rect x={10} y={42+i*10} width={p.v} height="7" rx="2" fill={`rgba(13,148,136,${0.4+i*0.12})`}/><text x={p.v+13} y={48+i*10} fontSize="5" fill="#6b7280">{p.n}</text></g>
        ))}
      </CardShell>
      {/* Pie - áreas */}
      <CardShell x={68} y={30} w={60} h={76} title="Por Área">
        <circle cx="98" cy="74" r="22" fill="none" stroke="#ccfbf1" strokeWidth="13"/>
        <circle cx="98" cy="74" r="22" fill="none" stroke="#0d9488" strokeWidth="13" strokeDasharray="48 90" strokeDashoffset="0"/>
        <circle cx="98" cy="74" r="22" fill="none" stroke="#14b8a6" strokeWidth="13" strokeDasharray="30 108" strokeDashoffset="-48"/>
        <circle cx="98" cy="74" r="22" fill="none" stroke="#2dd4bf" strokeWidth="13" strokeDasharray="20 118" strokeDashoffset="-78"/>
        <circle cx="98" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
      {/* Gauge - satisfação */}
      <CardShell x={132} y={30} w={64} h={76} title="Satisfação">
        <path d="M 142,96 A 22,22 0 0,1 186,96" fill="none" stroke="#ccfbf1" strokeWidth="8" strokeLinecap="round"/>
        <path d="M 142,96 A 22,22 0 0,1 186,96" fill="none" stroke="#0d9488" strokeWidth="8" strokeLinecap="round" strokeDasharray="50 69" strokeDashoffset="0"/>
        <text x="164" y="88" textAnchor="middle" fontSize="9" fill="#0d9488" fontWeight="700" fontFamily="system-ui">78%</text>
      </CardShell>
    </svg>
  ),
  suporte: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_su" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff1f2"/><stop offset="100%" stopColor="#ffe4e6"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_su)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Abertos" value="34" color="#f43f5e"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Resolvidos" value="47" color="#10b981"/>
      <KpiCard x={100} y={4} w={44} h={22} title="TMA (min)" value="8,4" color="#f59e0b"/>
      <KpiCard x={148} y={4} w={48} h={22} title="CSAT" value="92,1%" color="#8b5cf6"/>
      {/* Donut - status */}
      <CardShell x={4} y={30} w={60} h={76} title="Por Status">
        <circle cx="34" cy="74" r="22" fill="none" stroke="#fee2e2" strokeWidth="13"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#f43f5e" strokeWidth="13" strokeDasharray="30 108" strokeDashoffset="0"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#fbbf24" strokeWidth="13" strokeDasharray="20 118" strokeDashoffset="-30"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#10b981" strokeWidth="13" strokeDasharray="44 94" strokeDashoffset="-50"/>
        <circle cx="34" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
      {/* Area - volume */}
      <CardShell x={68} y={30} w={128} h={76} title="Volume ao Longo do Tempo">
        <polyline points="76,92 89,80 102,84 115,68 128,74 141,56 154,62 167,46 180,52 193,40" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polygon points="76,92 89,80 102,84 115,68 128,74 141,56 154,62 167,46 180,52 193,40 193,100 76,100" fill="rgba(244,63,94,0.08)"/>
        {[92,80,84,68,74,56,62,46,52,40].map((y,i)=><circle key={i} cx={76+i*13} cy={y} r="2" fill="#f43f5e"/>)}
      </CardShell>
    </svg>
  ),
  logistica: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fffbeb"/><stop offset="100%" stopColor="#fef3c7"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_lg)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Em Estoque" value="6.820" color="#d97706"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Em Trânsito" value="248" color="#f59e0b"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Lead Time" value="3,2d" color="#10b981"/>
      <KpiCard x={148} y={4} w={48} h={22} title="No Prazo" value="94,7%" color="#6366f1"/>
      {/* Pie status estoque */}
      <CardShell x={4} y={30} w={60} h={76} title="Estoque">
        <circle cx="34" cy="74" r="22" fill="none" stroke="#fef3c7" strokeWidth="13"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#d97706" strokeWidth="13" strokeDasharray="54 84" strokeDashoffset="0"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#f59e0b" strokeWidth="13" strokeDasharray="22 116" strokeDashoffset="-54"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#fbbf24" strokeWidth="13" strokeDasharray="12 126" strokeDashoffset="-76"/>
        <circle cx="34" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
      {/* Line - pedidos no tempo */}
      <CardShell x={68} y={30} w={128} h={76} title="Pedidos no Tempo">
        <polyline points="76,90 89,78 102,82 115,66 128,72 141,54 154,60 167,44 180,50 193,38" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polygon points="76,90 89,78 102,82 115,66 128,72 141,54 154,60 167,44 180,50 193,38 193,100 76,100" fill="rgba(217,119,6,0.08)"/>
        {[90,78,82,66,72,54,60,44,50,38].map((y,i)=><circle key={i} cx={76+i*13} cy={y} r="2" fill="#d97706"/>)}
      </CardShell>
    </svg>
  ),
  educacao: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_ed" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#eef2ff"/><stop offset="100%" stopColor="#e0e7ff"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_ed)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Alunos" value="2.340" color="#6366f1"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Conclusões" value="1.820" color="#10b981"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Taxa" value="77,8%" color="#f59e0b"/>
      <KpiCard x={148} y={4} w={48} h={22} title="NPS Edu." value="68" color="#8b5cf6"/>
      {/* Horizontal bars - progresso cursos */}
      <CardShell x={4} y={30} w={92} h={76} title="Progresso por Curso">
        {[{l:'SQL',p:91},{l:'React',p:85},{l:'Gestão',p:78},{l:'Python',p:72},{l:'Design',p:60}].map((c,i)=>(
          <g key={i}>
            <text x="10" y={44+i*11} fontSize="5.5" fill="#6b7280" fontFamily="system-ui">{c.l}</text>
            <rect x="32" y={37+i*11} width="52" height="6" rx="3" fill="#e0e7ff"/>
            <rect x="32" y={37+i*11} width={52*c.p/100} height="6" rx="3" fill={['#4f46e5','#6366f1','#8b5cf6','#a78bfa','#c4b5fd'][i]}/>
            <text x="88" y={43+i*11} fontSize="5" fill="#6366f1" fontWeight="700" fontFamily="system-ui">{c.p}%</text>
          </g>
        ))}
      </CardShell>
      {/* Line - conclusões no tempo */}
      <CardShell x={100} y={30} w={96} h={76} title="Conclusões no Tempo">
        <polyline points="108,90 120,80 132,83 144,68 156,74 168,58 180,64 192,50" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polygon points="108,90 120,80 132,83 144,68 156,74 168,58 180,64 192,50 192,100 108,100" fill="rgba(99,102,241,0.08)"/>
        {[90,80,83,68,74,58,64,50].map((y,i)=><circle key={i} cx={108+i*12} cy={y} r="2" fill="#6366f1"/>)}
      </CardShell>
    </svg>
  ),
  financeiro: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_fi" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f0fdf4"/><stop offset="100%" stopColor="#dcfce7"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_fi)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Receita" value="R$3,0M" color="#16a34a"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Despesas" value="R$1,4M" color="#f43f5e"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Lucro" value="R$1,6M" color="#10b981"/>
      <KpiCard x={148} y={4} w={48} h={22} title="Margem" value="53,9%" color="#8b5cf6"/>
      {/* Combo receita vs despesas */}
      <CardShell x={4} y={30} w={122} h={76} title="Receita vs Despesas">
        {[28,34,24,40,36,46,38,50].map((h,i)=><rect key={i} x={12+i*14} y={94-h} width="8" height={h} rx="1" fill="#86efac"/>)}
        {[18,22,16,28,24,32,26,36].map((h,i)=><rect key={i} x={21+i*14} y={94-h} width="6" height={h} rx="1" fill="#fca5a5"/>)}
        <polyline points="16,66 30,60 44,68 58,52 72,58 86,44 100,50 114,38" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </CardShell>
      {/* Pie despesas */}
      <CardShell x={130} y={30} w={66} h={76} title="Despesas">
        <circle cx="163" cy="74" r="22" fill="none" stroke="#dcfce7" strokeWidth="12"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#16a34a" strokeWidth="12" strokeDasharray="48 90" strokeDashoffset="0"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#4ade80" strokeWidth="12" strokeDasharray="26 112" strokeDashoffset="-48"/>
        <circle cx="163" cy="74" r="22" fill="none" stroke="#86efac" strokeWidth="12" strokeDasharray="16 122" strokeDashoffset="-74"/>
        <circle cx="163" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
    </svg>
  ),
  executive: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_ex" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#faf5ff"/><stop offset="100%" stopColor="#ede9fe"/></linearGradient><linearGradient id="area_ex" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_ex)"/>
      {/* Text banner */}
      <rect x="4" y="4" width="192" height="20" rx="3" fill="white" opacity="0.7"/>
      <text x="10" y="16" fontSize="6" fill="#374151" fontFamily="system-ui">Sumário Executivo — Q1 2026</text>
      {/* 3 KPIs wide */}
      <KpiCard x={4}  y={28} w={60} h={22} title="Resultado" value="R$8,7M" color="#111827"/>
      <KpiCard x={68} y={28} w={60} h={22} title="Volume" value="14.230" color="#6366f1"/>
      <KpiCard x={132} y={28} w={64} h={22} title="Crescimento" value="+18,4%" color="#10b981"/>
      {/* Area chart */}
      <CardShell x={4} y={54} w={122} h={54} title="Evolução no Período">
        <polyline points="12,96 24,86 36,90 48,74 60,80 72,62 84,68 96,52 108,58 120,44" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polygon points="12,96 24,86 36,90 48,74 60,80 72,62 84,68 96,52 108,58 120,44 120,104 12,104" fill="url(#area_ex)"/>
      </CardShell>
      {/* Donut composição */}
      <CardShell x={130} y={54} w={66} h={54} title="Composição">
        <circle cx="163" cy="88" r="18" fill="none" stroke="#ede9fe" strokeWidth="10"/>
        <circle cx="163" cy="88" r="18" fill="none" stroke="#7c3aed" strokeWidth="10" strokeDasharray="40 73" strokeDashoffset="0"/>
        <circle cx="163" cy="88" r="18" fill="none" stroke="#a78bfa" strokeWidth="10" strokeDasharray="24 89" strokeDashoffset="-40"/>
        <circle cx="163" cy="88" r="18" fill="none" stroke="#c4b5fd" strokeWidth="10" strokeDasharray="16 97" strokeDashoffset="-64"/>
        <circle cx="163" cy="88" r="6" fill="white" opacity="0.92"/>
      </CardShell>
    </svg>
  ),
  media: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_md" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#eef2ff"/><stop offset="100%" stopColor="#e0e7ff"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_md)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Investido" value="R$4,4M" color="#6366f1"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Nº de PIs" value="312" color="#8b5cf6"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Veículos" value="48" color="#06b6d4"/>
      <KpiCard x={148} y={4} w={48} h={22} title="Clientes" value="23" color="#10b981"/>
      {/* Donut por meio */}
      <CardShell x={4} y={30} w={60} h={76} title="Por Meio">
        <circle cx="34" cy="74" r="22" fill="none" stroke="#e0e7ff" strokeWidth="13"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#6366f1" strokeWidth="13" strokeDasharray="52 86" strokeDashoffset="0"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#818cf8" strokeWidth="13" strokeDasharray="30 108" strokeDashoffset="-52"/>
        <circle cx="34" cy="74" r="22" fill="none" stroke="#a5b4fc" strokeWidth="13" strokeDasharray="16 122" strokeDashoffset="-82"/>
        <circle cx="34" cy="74" r="8" fill="white" opacity="0.92"/>
      </CardShell>
      {/* Horizontal bars - top veículos */}
      <CardShell x={68} y={30} w={128} h={76} title="Top Veículos">
        {[{l:'Globo',v:90},{l:'SBT',v:66},{l:'G.Ads',v:60},{l:'Meta',v:48},{l:'Band',v:40},{l:'Record',v:36}].map((b,i)=>(
          <g key={i}><rect x={76} y={42+i*10} width={b.v} height="7" rx="2" fill={`rgba(99,102,241,${0.3+i*0.1})`}/><text x={b.v+79} y={48+i*10} fontSize="5" fill="#6b7280" fontFamily="system-ui">{b.l}</text></g>
        ))}
      </CardShell>
    </svg>
  ),
  okrs_metas: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_ok" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#faf5ff"/><stop offset="100%" stopColor="#ede9fe"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_ok)"/>
      {/* Period banner */}
      <rect x="4" y="4" width="192" height="14" rx="3" fill="white" opacity="0.7"/>
      <text x="10" y="13.5" fontSize="6" fill="#374151" fontFamily="system-ui">OKRs — Q2 2026</text>
      {/* 3 speedometers */}
      {[{cx:35,pct:82,c:'#7c3aed',l:'Receita'},{cx:100,pct:65,c:'#6366f1',l:'NPS'},{cx:165,pct:91,c:'#10b981',l:'Retenção'}].map((g,i)=>(
        <g key={i}>
          <rect x={g.cx-32} y={22} width={64} height={46} rx="3" fill="white" opacity="0.85"/>
          <path d={`M ${g.cx-22},60 A 22,22 0 0,1 ${g.cx+22},60`} fill="none" stroke="#e9d5ff" strokeWidth="7" strokeLinecap="round"/>
          <path d={`M ${g.cx-22},60 A 22,22 0 0,1 ${g.cx+22},60`} fill="none" stroke={g.c} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${g.pct*0.69} 100`}/>
          <text x={g.cx} y="55" textAnchor="middle" fontSize="9" fill={g.c} fontWeight="800" fontFamily="system-ui">{g.pct}%</text>
          <text x={g.cx} y="63" textAnchor="middle" fontSize="5.5" fill="#9ca3af" fontFamily="system-ui">{g.l}</text>
        </g>
      ))}
      {/* Bar + line row */}
      <CardShell x={4} y={72} w={92} h={36} title="Por Equipe">
        {[48,62,55,71,44].map((v,i)=><rect key={i} x={12+i*16} y={96-v*0.3} width="10" height={v*0.3} rx="1" fill={`rgba(124,58,237,${0.3+i*0.1})`}/>)}
      </CardShell>
      <CardShell x={100} y={72} w={96} h={36} title="Evolução Trimestral">
        <polyline points="108,100 120,92 132,95 144,84 156,88 168,76 180,80 192,70" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </CardShell>
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_pf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ecfeff"/><stop offset="100%" stopColor="#cffafe"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_pf)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Projetos" value="12" color="#0891b2"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Budget" value="R$4,8M" color="#06b6d4"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Concluídos" value="7" color="#10b981"/>
      <KpiCard x={148} y={4} w={48} h={22} title="Em Risco" value="2" color="#f43f5e"/>
      {/* Treemap */}
      <CardShell x={4} y={30} w={92} h={76} title="Portfólio por Valor">
        <rect x="10" y="40" width="52" height="32" rx="2" fill="#0891b2"/>
        <text x="36" y="59" textAnchor="middle" fontSize="6" fill="white" fontWeight="600" fontFamily="system-ui">Alpha</text>
        <rect x="65" y="40" width="25" height="32" rx="2" fill="#06b6d4"/>
        <text x="77" y="59" textAnchor="middle" fontSize="5.5" fill="white" fontFamily="system-ui">Beta</text>
        <rect x="10" y="74" width="32" height="26" rx="2" fill="#22d3ee"/>
        <rect x="44" y="74" width="46" height="26" rx="2" fill="#67e8f9"/>
        <text x="67" y="90" textAnchor="middle" fontSize="5.5" fill="#0e7490" fontFamily="system-ui">Delta</text>
      </CardShell>
      {/* Donut status + gauge progresso */}
      <CardShell x={100} y={30} w={44} h={76} title="Status">
        <circle cx="122" cy="74" r="18" fill="none" stroke="#cffafe" strokeWidth="10"/>
        <circle cx="122" cy="74" r="18" fill="none" stroke="#0891b2" strokeWidth="10" strokeDasharray="38 75" strokeDashoffset="0"/>
        <circle cx="122" cy="74" r="18" fill="none" stroke="#fbbf24" strokeWidth="10" strokeDasharray="24 89" strokeDashoffset="-38"/>
        <circle cx="122" cy="74" r="18" fill="none" stroke="#f43f5e" strokeWidth="10" strokeDasharray="13 100" strokeDashoffset="-62"/>
        <circle cx="122" cy="74" r="6" fill="white" opacity="0.92"/>
      </CardShell>
      <CardShell x={148} y={30} w={48} h={76} title="Progresso">
        <path d="M 158,96 A 18,18 0 0,1 190,96" fill="none" stroke="#cffafe" strokeWidth="8" strokeLinecap="round"/>
        <path d="M 158,96 A 18,18 0 0,1 190,96" fill="none" stroke="#0891b2" strokeWidth="8" strokeLinecap="round" strokeDasharray="38 57" strokeDashoffset="0"/>
        <text x="174" y="88" textAnchor="middle" fontSize="8" fill="#0891b2" fontWeight="700" fontFamily="system-ui">68%</text>
      </CardShell>
    </svg>
  ),
  vendas_avancado: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_va" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f5f3ff"/><stop offset="100%" stopColor="#ede9fe"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_va)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Receita" value="R$5,8M" color="#7c3aed"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Meta" value="R$6,0M" color="#6366f1"/>
      {/* Speedometer */}
      <g><rect x="100" y="4" width="44" height="22" rx="3" fill="white" opacity="0.85"/>
        <path d="M 108,22 A 14,14 0 0,1 136,22" fill="none" stroke="#e9d5ff" strokeWidth="5" strokeLinecap="round"/>
        <path d="M 108,22 A 14,14 0 0,1 136,22" fill="none" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" strokeDasharray="29 44" strokeDashoffset="0"/>
        <text x="122" y="20" textAnchor="middle" fontSize="7" fill="#7c3aed" fontWeight="700" fontFamily="system-ui">82%</text>
        <text x="122" y="9" textAnchor="middle" fontSize="4.5" fill="#9ca3af" fontFamily="system-ui">Atingimento</text>
      </g>
      {/* Gauge */}
      <g><rect x="148" y="4" width="48" height="22" rx="3" fill="white" opacity="0.85"/>
        <path d="M 156,22 A 14,14 0 0,1 188,22" fill="none" stroke="#d1fae5" strokeWidth="5" strokeLinecap="round"/>
        <path d="M 156,22 A 14,14 0 0,1 188,22" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeDasharray="32 44" strokeDashoffset="0"/>
        <text x="172" y="20" textAnchor="middle" fontSize="7" fill="#10b981" fontWeight="700" fontFamily="system-ui">78%</text>
        <text x="172" y="9" textAnchor="middle" fontSize="4.5" fill="#9ca3af" fontFamily="system-ui">NPS</text>
      </g>
      {/* Treemap */}
      <CardShell x={4} y={30} w={92} h={76} title="Portfólio por Receita">
        <rect x="10" y="40" width="50" height="28" rx="2" fill="#7c3aed"/>
        <text x="35" y="57" textAnchor="middle" fontSize="5.5" fill="white" fontFamily="system-ui">Produto A</text>
        <rect x="63" y="40" width="27" height="28" rx="2" fill="#a78bfa"/>
        <rect x="10" y="70" width="34" height="30" rx="2" fill="#c4b5fd"/>
        <rect x="46" y="70" width="44" height="30" rx="2" fill="#6366f1"/>
        <text x="68" y="88" textAnchor="middle" fontSize="5.5" fill="white" fontFamily="system-ui">Produto D</text>
      </CardShell>
      {/* Combo full */}
      <CardShell x={100} y={30} w={96} h={76} title="Volume + Receita">
        {[18,24,20,30,26,34,30,38].map((h,i)=><rect key={i} x={108+i*11} y={94-h} width="7" height={h} rx="1" fill="#e9d5ff"/>)}
        <polyline points="111,76 122,68 133,72 144,60 155,64 166,54 177,58 188,48" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </CardShell>
    </svg>
  ),
  operacoes_noc: (
    <svg viewBox="0 0 200 112" className="w-full h-full">
      <defs><linearGradient id="bg_noc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f8fafc"/><stop offset="100%" stopColor="#f1f5f9"/></linearGradient></defs>
      <rect width="200" height="112" fill="url(#bg_noc)"/>
      <KpiCard x={4}  y={4} w={44} h={22} title="Uptime" value="99,8%" color="#10b981"/>
      <KpiCard x={52} y={4} w={44} h={22} title="Alertas" value="3" color="#f59e0b"/>
      <KpiCard x={100} y={4} w={44} h={22} title="Incidentes" value="7" color="#f43f5e"/>
      <KpiCard x={148} y={4} w={48} h={22} title="MTTR" value="14 min" color="#8b5cf6"/>
      {/* Speedometer SLA */}
      <CardShell x={4} y={30} w={60} h={76} title="SLA Cumprimento">
        <path d="M 14,92 A 26,26 0 0,1 58,92" fill="none" stroke="#dcfce7" strokeWidth="9" strokeLinecap="round"/>
        <path d="M 14,92 A 26,26 0 0,1 58,92" fill="none" stroke="#10b981" strokeWidth="9" strokeLinecap="round" strokeDasharray="52 82" strokeDashoffset="0"/>
        <line x1="36" y1="92" x2="50" y2="66" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="36" cy="92" r="3" fill="#374151"/>
        <text x="36" y="82" textAnchor="middle" fontSize="8" fill="#10b981" fontWeight="700" fontFamily="system-ui">94%</text>
      </CardShell>
      {/* Area - latência */}
      <CardShell x={68} y={30} w={128} h={76} title="Latência no Tempo">
        <polyline points="76,90 89,76 102,80 115,64 128,70 141,52 154,58 167,42 180,48 193,36" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polygon points="76,90 89,76 102,80 115,64 128,70 141,52 154,58 167,42 180,48 193,36 193,100 76,100" fill="rgba(99,102,241,0.07)"/>
        {/* Status badges */}
        <rect x="148" y="38" width="34" height="10" rx="2" fill="#dcfce7"/>
        <text x="165" y="46" textAnchor="middle" fontSize="5.5" fill="#16a34a" fontWeight="700" fontFamily="system-ui">Online ✓</text>
        <rect x="148" y="52" width="34" height="10" rx="2" fill="#fef9c3"/>
        <text x="165" y="60" textAnchor="middle" fontSize="5.5" fill="#ca8a04" fontWeight="600" fontFamily="system-ui">1 Alerta</text>
        <rect x="148" y="66" width="34" height="10" rx="2" fill="#fee2e2"/>
        <text x="165" y="74" textAnchor="middle" fontSize="5.5" fill="#dc2626" fontWeight="600" fontFamily="system-ui">SLA 94%</text>
      </CardShell>
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
  const t = useTranslations('dashboardNovo')
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
        <span className="text-gray-500 text-sm">{t('gallery.nav')}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-gray-900 mb-2">{t('gallery.title')}</h1>
            <p className="text-sm text-gray-500 mb-5">{t('gallery.subtitle')}</p>
            <div className="relative max-w-xs mx-auto">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                type="text"
                placeholder={t('gallery.searchPlaceholder')}
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
                  <div className={`w-full h-32 bg-gradient-to-br ${gradientClass} overflow-hidden relative`}>
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
                        <span className="text-[10px] text-gray-300 font-medium">{t('gallery.blocksCount', { n: tpl.blocks.length })}</span>
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
  const t = useTranslations('dashboardNovo')
  const tEditor = useTranslations('dashboardEditor')
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
  const [layoutKey, setLayoutKey] = useState(0)
  const [globalDateFilter, setGlobalDateFilter] = useState({ dateCol: '', dateFrom: '', dateTo: '' })
  const [showAiPanel, setShowAiPanel] = useState(false)
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
    setBlocks(tpl.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })))
    if (tpl.canvasConfig) setCanvasConfig(tpl.canvasConfig)
    setLayoutKey(k => k + 1)
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

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  function sanitizeBlocks(bs) {
    return bs.map(b => ({
      ...b,
      id: UUID_RE.test(b.id) ? b.id : crypto.randomUUID(),
      dataset_id: UUID_RE.test(b.dataset_id) ? b.dataset_id : null,
    }))
  }

  async function handleSave() {
    if (!title.trim()) { setError(t('editor.titleRequired')); return }
    setSaving(true); setError('')
    try {
      const report = await api.reports.create({ title, description: description || null, blocks: sanitizeBlocks(blocks) })
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
          {t('editor.back')}
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <button onClick={() => setTemplateSelected(false)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /></svg>
          {t('editor.templates')}
        </button>

        <div className="relative" ref={addMenuRef}>
          <button onClick={() => setShowAddMenu(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" /></svg>
            {t('editor.addItem')}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" /></svg>
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 grid grid-cols-2 gap-1">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => { addBlock(bt.type); setShowAddMenu(false) }} className="flex flex-col items-start p-2 rounded-lg hover:bg-violet-50 transition-colors text-left">
                  <p className="text-xs font-semibold text-gray-800">{tEditor(`blockTypes.${bt.type}.label`)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{tEditor(`blockTypes.${bt.type}.desc`)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button onClick={() => router.push('/dashboards')} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">{t('editor.cancel')}</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {saving ? t('editor.saving') : t('editor.save')}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6 min-w-0" style={{ backgroundColor: canvasConfig.bgColor || '#f3f4f6' }} onClick={() => setSelectedBlockId(null)}>
          <div className="mb-6" onClick={e => e.stopPropagation()}>
            <input className="text-2xl font-black text-gray-800 bg-transparent outline-none border-b-2 border-transparent focus:border-violet-300 transition-colors py-1 w-full block" placeholder={t('editor.titlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
            <input className="text-sm text-gray-500 bg-transparent outline-none mt-1 w-full block" placeholder={t('editor.descPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <ReportBuilder key={layoutKey} blocks={blocks} onChange={setBlocks} readOnly={false} selectedBlockId={selectedBlockId} onSelectBlock={id => setSelectedBlockId(id)} onBlockAction={(id, action) => { setSelectedBlockId(id); setSidePanel(action); setSidebarOpen(true) }} datasets={datasets} sheetConfig={{ bgColor: canvasConfig.sheetBgColor, dotColor: canvasConfig.dotColor }} />
        </div>

        <aside className={`${sidebarOpen && sidePanel ? 'w-72' : 'w-0'} bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden transition-[width] duration-200`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-widest">
              {sidePanel === 'dados' ? t('sidebar.data') :
               sidePanel === 'filtros' ? t('sidebar.filters') :
               sidePanel === 'comentarios' ? t('sidebar.comments') :
               activeBlock ? t('sidebar.configBlock') : t('sidebar.configDashboard')}
            </span>
            <button onClick={() => { setSidebarOpen(false); setSidePanel(null) }} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {sidePanel === 'dados' && <DatasetPanel datasets={datasets} onDatasetsChange={setDatasets} />}
            {sidePanel === 'config' && (activeBlock ? <BlockConfigPanel block={activeBlock} onChange={updateActiveBlock} datasets={datasets} /> : <CanvasConfigPanel config={canvasConfig} onChange={setCanvasConfig} />)}
            {sidePanel === 'filtros' && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('filters.dateFilterTitle')}</p>
                <div className={`rounded-xl border p-3 space-y-2.5 ${(globalDateFilter.dateFrom || globalDateFilter.dateTo) ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex gap-2">
                    <input type="date" value={globalDateFilter.dateFrom || ''} onChange={e => setGlobalDateFilter(f => ({ ...f, dateFrom: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
                    <span className="text-xs text-gray-400 self-center">{t('filters.dateSeparator')}</span>
                    <input type="date" value={globalDateFilter.dateTo || ''} onChange={e => setGlobalDateFilter(f => ({ ...f, dateTo: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { l: t('filters.today'),   fn: () => { const d = new Date().toISOString().slice(0,10); return { dateFrom: d, dateTo: d } } },
                      { l: t('filters.last7d'),  fn: () => { const d = new Date(); const f = new Date(d); f.setDate(f.getDate()-6); return { dateFrom: f.toISOString().slice(0,10), dateTo: d.toISOString().slice(0,10) } } },
                      { l: t('filters.last30d'), fn: () => { const d = new Date(); const f = new Date(d); f.setDate(f.getDate()-29); return { dateFrom: f.toISOString().slice(0,10), dateTo: d.toISOString().slice(0,10) } } },
                      { l: t('filters.thisMonth'), fn: () => { const d = new Date(); return { dateFrom: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, dateTo: d.toISOString().slice(0,10) } } },
                      { l: t('filters.thisYear'), fn: () => { const d = new Date(); return { dateFrom: `${d.getFullYear()}-01-01`, dateTo: d.toISOString().slice(0,10) } } },
                    ].map(p => (
                      <button key={p.l} onClick={() => setGlobalDateFilter(f => ({ ...f, ...p.fn() }))} className="px-2 py-1 text-[10px] font-medium rounded-lg border border-gray-200 bg-white hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">{p.l}</button>
                    ))}
                  </div>
                  {(globalDateFilter.dateFrom || globalDateFilter.dateTo) && (
                    <button onClick={() => setGlobalDateFilter(f => ({ ...f, dateFrom: '', dateTo: '' }))} className="text-[10px] text-red-400 hover:text-red-600 font-medium">{t('filters.clearDates')}</button>
                  )}
                </div>
              </div>
            )}
            {sidePanel === 'comentarios' && (
              <div className="text-center py-8">
                <p className="text-xs text-gray-400">{t('comments.saveTip')}</p>
              </div>
            )}
          </div>
        </aside>

        <DashboardRail
          blocks={blocks}
          globalDateFilter={globalDateFilter}
          sidePanel={sidePanel}
          sidebarOpen={sidebarOpen}
          selectedBlockId={selectedBlockId}
          togglePanel={togglePanel}
          setSidebarOpen={setSidebarOpen}
          setSidePanel={setSidePanel}
          setShowAiPanel={setShowAiPanel}
        />
      </div>
    </div>
  )
}
