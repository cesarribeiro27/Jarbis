'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function toCode(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
}

export default function AdminNovoAfiliadoPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', code: '', commission_percent: '20', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleNameChange = (v) => {
    set('name', v)
    if (!form.code || form.code === toCode(form.name)) {
      set('code', toCode(v))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const r = await fetch(`${API_URL}/admin/affiliates`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        commission_percent: parseFloat(form.commission_percent) || 0,
      }),
    })
    if (r.ok) {
      const d = await r.json()
      router.push(`/admin/afiliados/${d.id}`)
    } else {
      const d = await r.json().catch(() => ({}))
      setError(d.detail || 'Erro ao cadastrar afiliado.')
      setSaving(false)
    }
  }

  return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin/afiliados" className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Novo Afiliado</h1>
            <p className="text-gray-500 text-sm mt-0.5">Cadastre um parceiro de indicação</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 space-y-5">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">Nome *</label>
            <input
              required
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Nome completo ou empresa"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">
              Código de indicação *
              <span className="ml-2 text-gray-600 font-normal">Único, será usado na URL</span>
            </label>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 focus-within:border-violet-600">
              <span className="text-gray-600 text-xs select-none">jarbis.cc/signup?ref=</span>
              <input
                required
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="CODIGO10"
                maxLength={20}
                className="flex-1 bg-transparent text-sm font-mono font-bold text-violet-400 placeholder-gray-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">
              Comissão (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.commission_percent}
              onChange={e => set('commission_percent', e.target.value)}
              className="w-32 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">
              Notas internas
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Observações sobre o parceiro, contrato, etc."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-600 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Link
              href="/admin/afiliados"
              className="flex-1 text-center px-4 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Cadastrando...' : 'Cadastrar afiliado'}
            </button>
          </div>
        </form>
      </div>
  )
}
