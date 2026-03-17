'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAdminRole } from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const PLAN_OPTIONS = [
  { value: 'all',       label: 'Todos os planos' },
  { value: 'solo',      label: 'Solo' },
  { value: 'equipe',    label: 'Profissional' },
  { value: 'ilimitado', label: 'Equipe' },
]

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function StatusBadge({ coupon }) {
  const now = new Date()
  if (!coupon.is_active) return <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">Desativado</span>
  if (coupon.is_expired) return <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-400">Expirado</span>
  if (coupon.is_exhausted) return <span className="text-xs px-2 py-0.5 rounded bg-orange-900/40 text-orange-400">Esgotado</span>
  return <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400">Ativo</span>
}

function DiscountBadge({ coupon }) {
  if (coupon.discount_type === 'percent') {
    return <span className="text-lg font-black text-violet-400">{coupon.discount_value}% off</span>
  }
  return <span className="text-lg font-black text-violet-400">R${parseFloat(coupon.discount_value).toFixed(2)} off</span>
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '',
  applicable_plans: 'all',
  max_uses: '',
  valid_until: '',
}

export default function AdminCuponsPage() {
  const { role } = useAdminRole()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editId, setEditId] = useState(null)

  const canEdit = role === 'full' || role === 'vendas'

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/admin/coupons`, { headers: authHeaders() })
      const data = await r.json()
      setCoupons(data.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Auto-gera código a partir da descrição
  function autoCode(desc) {
    return desc
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        applicable_plans: form.applicable_plans,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      }

      const url = editId ? `${API_URL}/admin/coupons/${editId}` : `${API_URL}/admin/coupons`
      const method = editId ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) })
      const data = await r.json()
      if (!r.ok) { setError(data.detail || 'Erro ao salvar.'); return }

      setSuccess(editId ? 'Cupom atualizado!' : `Cupom ${data.code} criado!`)
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(coupon) {
    await fetch(`${API_URL}/admin/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ is_active: !coupon.is_active }),
    })
    load()
  }

  async function handleDelete(coupon) {
    if (!confirm(`Deletar o cupom "${coupon.code}" permanentemente?`)) return
    await fetch(`${API_URL}/admin/coupons/${coupon.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    load()
  }

  function openEdit(coupon) {
    setForm({
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      applicable_plans: coupon.applicable_plans,
      max_uses: coupon.max_uses ?? '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : '',
    })
    setEditId(coupon.id)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const activeCoupons = coupons.filter(c => c.is_active && !c.is_expired && !c.is_exhausted)
  const totalUses = coupons.reduce((s, c) => s + (c.used_count || 0), 0)

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Cupons & Descontos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Crie códigos promocionais para conversão e campanhas de vendas.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); setError(''); setSuccess('') }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Novo cupom
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs text-gray-500 mb-1">Cupons ativos</div>
            <div className="text-3xl font-black text-emerald-400">{activeCoupons.length}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs text-gray-500 mb-1">Total de cupons</div>
            <div className="text-3xl font-black text-white">{coupons.length}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs text-gray-500 mb-1">Total de usos</div>
            <div className="text-3xl font-black text-violet-400">{totalUses}</div>
          </div>
        </div>

        {/* Formulário */}
        {showForm && canEdit && (
          <div className="bg-gray-900 border border-violet-800/30 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-5">{editId ? 'Editar cupom' : 'Novo cupom'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Código do cupom *</label>
                  <input
                    required
                    disabled={!!editId}
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="Ex: LANCAMENTO30"
                    className="w-full bg-gray-800 border border-gray-700 disabled:opacity-50 text-white font-mono text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500 uppercase"
                  />
                  <p className="text-xs text-gray-600 mt-1">Apenas letras e números, sem espaços.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Descrição interna</label>
                  <input
                    value={form.description}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        description: e.target.value,
                        code: f.code || autoCode(e.target.value),
                      }))
                    }}
                    placeholder="Ex: Lançamento — 30% off primeiro mês"
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Tipo de desconto</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  >
                    <option value="percent">Percentual (% off)</option>
                    <option value="fixed">Valor fixo (R$ off)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">
                    Valor {form.discount_type === 'percent' ? '(%)' : '(R$)'} *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    max={form.discount_type === 'percent' ? '100' : undefined}
                    step="0.01"
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percent' ? '30' : '50.00'}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Planos aplicáveis</label>
                  <select
                    value={form.applicable_plans}
                    onChange={e => setForm(f => ({ ...f, applicable_plans: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  >
                    {PLAN_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">
                    Limite de usos <span className="text-gray-600">(vazio = ilimitado)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    placeholder="Ex: 100"
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">
                    Válido até <span className="text-gray-600">(vazio = sem expiração)</span>
                  </label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  {saving ? 'Salvando...' : (editId ? 'Salvar alterações' : 'Criar cupom')}
                </button>
              </div>
            </form>
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
            {success}
          </div>
        )}

        {/* Lista de cupons */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white">Todos os cupons ({coupons.length})</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="text-gray-600 text-sm">Nenhum cupom cadastrado.</div>
              {canEdit && <div className="text-gray-700 text-xs">Clique em "Novo cupom" para criar o primeiro.</div>}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {coupons.map(coupon => (
                <div key={coupon.id} className={`px-6 py-4 flex items-center gap-4 ${!coupon.is_active || coupon.is_expired || coupon.is_exhausted ? 'opacity-60' : ''}`}>
                  {/* Código + desconto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <code className="text-sm font-mono font-bold text-white bg-gray-800 px-2 py-0.5 rounded">
                        {coupon.code}
                      </code>
                      <StatusBadge coupon={coupon} />
                    </div>
                    {coupon.description && (
                      <div className="text-xs text-gray-500">{coupon.description}</div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                      <span>
                        Planos: {coupon.applicable_plans === 'all' ? 'todos' : coupon.applicable_plans}
                      </span>
                      <span>·</span>
                      <span>
                        Usos: {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ''}
                      </span>
                      {coupon.valid_until && (
                        <>
                          <span>·</span>
                          <span>Expira: {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Desconto */}
                  <div className="text-right">
                    <DiscountBadge coupon={coupon} />
                  </div>

                  {/* Ações */}
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`p-1.5 rounded-lg transition-colors ${coupon.is_active ? 'text-emerald-600 hover:text-red-400 hover:bg-red-900/20' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-900/20'}`}
                        title={coupon.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {coupon.is_active
                          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                        }
                      </button>
                      {role === 'full' && (
                        <button
                          onClick={() => handleDelete(coupon)}
                          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Deletar permanentemente"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
