'use client'

import { useState, useEffect, memo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '@/lib/api'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16']

const BLOCK_TYPES = {
  kpi:   '🔢',
  bar:   '📊',
  pie:   '🥧',
  line:  '📈',
  table: '📋',
  text:  '📝',
}

function useDataSource(source) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!source) return
    setLoading(true)
    setError(null)
    api.reports.data(source)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [source])

  return { data, loading, error }
}

const KpiBlock = memo(function KpiBlock({ block, data }) {
  if (!data) return <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <p className="text-5xl font-bold text-brand-600">{total.toLocaleString('pt-BR')}</p>
      <p className="text-sm text-gray-500 mt-2">{block.title}</p>
    </div>
  )
})

const BarBlock = memo(function BarBlock({ block, data }) {
  if (!data) return <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})

const PieBlock = memo(function PieBlock({ block, data }) {
  if (!data) return <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => v.toLocaleString('pt-BR')} />
      </PieChart>
    </ResponsiveContainer>
  )
})

const LineBlock = memo(function LineBlock({ block, data }) {
  if (!data) return <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
})

const TableBlock = memo(function TableBlock({ block, data }) {
  if (!data) return <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>
  const total = data.reduce((s, r) => s + r.value, 0)
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{row.label}</td>
              <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{row.value.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-2.5 text-sm text-gray-400 text-right">
                {total > 0 ? ((row.value / total) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

const TextBlock = memo(function TextBlock({ block }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-600 py-2 whitespace-pre-wrap">
      {block.config?.text || <span className="text-gray-400 italic">Sem conteúdo</span>}
    </div>
  )
})

const Block = memo(function Block({ block }) {
  const { data, loading } = useDataSource(block.type !== 'text' ? block.data_source : null)

  const content = () => {
    if (loading) return <div className="text-center text-gray-400 text-sm py-8">Carregando dados...</div>
    switch (block.type) {
      case 'kpi':   return <KpiBlock block={block} data={data} />
      case 'bar':   return <BarBlock block={block} data={data} />
      case 'pie':   return <PieBlock block={block} data={data} />
      case 'line':  return <LineBlock block={block} data={data} />
      case 'table': return <TableBlock block={block} data={data} />
      case 'text':  return <TextBlock block={block} />
      default:      return null
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{BLOCK_TYPES[block.type] || '📦'}</span>
        <h3 className="text-sm font-semibold text-gray-800">{block.title}</h3>
      </div>
      {content()}
    </div>
  )
})

export default function ReportView({ report }) {
  const blocks = report.blocks || []

  if (blocks.length === 0) {
    return (
      <div className="card p-10 text-center text-gray-400">
        <p className="text-lg mb-2">Relatório vazio</p>
        <p className="text-sm">Este relatório não possui blocos configurados.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {blocks
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((block) => (
          <div
            key={block.id}
            className={block.type === 'table' || block.type === 'text' ? 'md:col-span-2' : ''}
          >
            <Block block={block} />
          </div>
        ))}
    </div>
  )
}
