'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState('alert.triggered')
  const [newSecret, setNewSecret] = useState(null)
  const [testing, setTesting] = useState({})
  const [testResults, setTestResults] = useState({})
  const [plan, setPlan] = useState('free')

  useEffect(() => {
    load()
    fetch(`${API_URL}/billing/status`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setPlan(d.plan) })
  }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/reports/tenant/webhooks`, { headers: authHeaders() })
      if (r.ok) { const d = await r.json(); setWebhooks(d.items || []) }
    } finally { setLoading(false) }
  }

  async function createWebhook() {
    if (!newUrl.trim()) return
    setCreating(true)
    try {
      const r = await fetch(`${API_URL}/reports/tenant/webhooks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents }),
      })
      if (r.ok) {
        const d = await r.json()
        setNewSecret(d.secret)
        setNewUrl('')
        await load()
      } else {
        const err = await r.json()
        alert(err.detail || 'Erro ao criar webhook')
      }
    } finally { setCreating(false) }
  }

  async function toggleActive(id, current) {
    await fetch(`${API_URL}/reports/tenant/webhooks/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ is_active: !current }),
    })
    await load()
  }

  async function deleteWebhook(id) {
    if (!confirm('Remover este webhook?')) return
    await fetch(`${API_URL}/reports/tenant/webhooks/${id}`, { method: 'DELETE', headers: authHeaders() })
    await load()
  }

  async function testWebhook(id) {
    setTesting(t => ({ ...t, [id]: true }))
    try {
      const r = await fetch(`${API_URL}/reports/tenant/webhooks/${id}/test`, {
        method: 'POST', headers: authHeaders()
      })
      const d = await r.json()
      setTestResults(t => ({ ...t, [id]: d }))
    } finally { setTesting(t => ({ ...t, [id]: false })) }
  }

  const isEnterprise = ['ilimitado', 'enterprise'].includes(plan)

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-black text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">Receba notificações HTTP em tempo real quando eventos acontecerem no Jarbis.</p>
        </div>

        {!isEnterprise && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Webhooks estão disponíveis apenas no plano <strong>Ilimitado</strong>.{' '}
            <a href="/configuracoes/planos" className="underline font-bold">Fazer upgrade</a>
          </div>
        )}

        {/* Criar novo webhook */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Novo webhook</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">URL de destino</label>
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://meusite.com/webhook"
                disabled={!isEnterprise}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Eventos (separados por vírgula)</label>
              <input
                value={newEvents}
                onChange={e => setNewEvents(e.target.value)}
                placeholder="alert.triggered,report.shared"
                disabled={!isEnterprise}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>
            <button
              onClick={createWebhook}
              disabled={!isEnterprise || creating || !newUrl.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {creating ? 'Criando...' : 'Criar webhook'}
            </button>
          </div>

          {newSecret && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-xs font-bold text-emerald-800 mb-1">Webhook criado! Guarde este segredo — ele não será exibido novamente.</div>
              <div className="font-mono text-xs text-emerald-700 break-all bg-white rounded-lg px-2 py-1.5 border border-emerald-200">{newSecret}</div>
              <div className="text-xs text-emerald-600 mt-2">Use o header <code className="bg-emerald-100 px-1 rounded">X-Jarbis-Signature</code> para validar as requisições (HMAC-SHA256).</div>
            </div>
          )}
        </div>

        {/* Lista de webhooks */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl">
              Nenhum webhook configurado ainda.
            </div>
          ) : webhooks.map(w => (
            <div key={w.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-gray-800 truncate">{w.url}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {w.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Eventos: <span className="font-medium text-gray-700">{w.events}</span>
                  </div>
                  {w.last_triggered_at && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Último disparo: {new Date(w.last_triggered_at).toLocaleString('pt-BR')}
                      {w.last_status_code && (
                        <span className={`ml-2 font-bold ${w.last_status_code < 300 ? 'text-emerald-600' : 'text-red-500'}`}>
                          HTTP {w.last_status_code}
                        </span>
                      )}
                    </div>
                  )}
                  {testResults[w.id] && (
                    <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-lg ${testResults[w.id].ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {testResults[w.id].ok
                        ? `Teste enviado com sucesso! Status: ${testResults[w.id].status_code}`
                        : `Erro: ${testResults[w.id].error}`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => testWebhook(w.id)}
                    disabled={testing[w.id]}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {testing[w.id] ? '...' : 'Testar'}
                  </button>
                  <button
                    onClick={() => toggleActive(w.id, w.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                      w.is_active
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {w.is_active ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => deleteWebhook(w.id)}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Docs */}
        <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">Como funciona</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>O Jarbis envia um <code className="bg-white px-1 rounded border border-gray-200 text-xs">POST</code> HTTP para a URL configurada com um payload JSON.</p>
            <p>Cada requisição inclui o header <code className="bg-white px-1 rounded border border-gray-200 text-xs">X-Jarbis-Signature: sha256=&lt;hash&gt;</code> para validação.</p>
            <p className="text-xs text-gray-400">Eventos disponíveis: <span className="font-medium text-gray-500">alert.triggered, report.shared, webhook.test</span></p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
