'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState(null)   // chave recém-criada (mostrar uma vez)

  const [form, setForm] = useState({ name: '', scopes: 'read', expires_in_days: '' })
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch(`${API_URL}/reports/api-keys`, {
      headers: authHeaders(),
    })
    if (r.ok) setKeys(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createKey(e) {
    e.preventDefault()
    setCreating(true)
    const body = { name: form.name, scopes: form.scopes }
    if (form.expires_in_days) body.expires_in_days = parseInt(form.expires_in_days)
    const r = await fetch(`${API_URL}/reports/api-keys`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify(body),
    })
    if (r.ok) {
      const d = await r.json()
      setNewKey(d)
      setShowCreate(false)
      setForm({ name: '', scopes: 'read', expires_in_days: '' })
      load()
    }
    setCreating(false)
  }

  async function revokeKey(keyId) {
    if (!confirm('Revogar esta API key? Integrações que a usam vão parar de funcionar.')) return
    await fetch(`${API_URL}/reports/api-keys/${keyId}`, {
      method: 'DELETE', headers: authHeaders(),
    })
    load()
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href="/configuracoes" className="hover:text-gray-700 transition-colors">Configurações</Link>
              <span>→</span>
              <span>API Keys</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Chaves de API</h1>
            <p className="text-sm text-gray-500 mt-0.5">Integre o Jarbis com seus sistemas via API</p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors"
          >
            + Nova chave
          </button>
        </div>

        {/* Alerta de nova chave criada */}
        {newKey && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800 mb-2">
              Chave criada! Copie agora — ela não será exibida novamente.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-emerald-200 rounded-lg px-3 py-2 text-emerald-900 font-mono break-all">
                {newKey.key}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(newKey.key); }}
                className="flex-shrink-0 px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-bold"
              >
                Copiar
              </button>
            </div>
            <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 transition-colors">
              Fechar aviso
            </button>
          </div>
        )}

        {/* Formulário de criação */}
        {showCreate && (
          <form onSubmit={createKey} className="rounded-2xl border border-violet-100 bg-violet-50 p-5 mb-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Nova chave de API</h3>
            <input
              type="text" required
              placeholder="Nome descritivo (ex: Integração Zapier)"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Escopos</label>
                <select
                  value={form.scopes} onChange={e => setForm(f => ({ ...f, scopes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white"
                >
                  <option value="read">Leitura</option>
                  <option value="read,write">Leitura + Escrita</option>
                  <option value="read,embed">Leitura + Embed</option>
                  <option value="read,write,embed">Acesso completo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Expirar em (dias)</label>
                <input
                  type="number" min="1" placeholder="Nunca"
                  value={form.expires_in_days} onChange={e => setForm(f => ({ ...f, expires_in_days: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating || !form.name}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                {creating ? 'Criando...' : 'Criar chave'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-gray-400 text-center py-12 text-sm rounded-2xl border border-gray-200 border-dashed">
            Nenhuma API key criada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className={`rounded-xl border p-4 flex items-center gap-4 ${k.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{k.name}</span>
                    {!k.is_active && (
                      <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-md font-bold">Revogada</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <code className="text-xs font-mono text-gray-500">{k.key_prefix}...</code>
                    <span className="text-xs text-gray-400">{k.scopes}</span>
                    {k.expires_at && (
                      <span className="text-xs text-amber-600">Expira {fmtDate(k.expires_at)}</span>
                    )}
                    {k.last_used_at && (
                      <span className="text-xs text-gray-400">Usado {fmtDate(k.last_used_at)}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Criada em {fmtDate(k.created_at)}</div>
                </div>
                {k.is_active && (
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    Revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documentação básica */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Como usar</h3>
          <p className="text-xs text-gray-500 mb-3">Envie sua API key no header de autenticação em todas as requisições:</p>
          <code className="block text-xs font-mono bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700">
            Authorization: Bearer jrb_live_...
          </code>
        </div>
      </div>
    </AppLayout>
  )
}
