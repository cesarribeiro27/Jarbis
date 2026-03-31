'use client'

import { useState, useEffect } from 'react'


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

function authHeaders() {
  return { 'Content-Type': 'application/json' }
}

const NOTIF_TYPES = [
  { value: 'info',    label: 'Informação', color: 'bg-blue-100 text-blue-700' },
  { value: 'success', label: 'Sucesso',    color: 'bg-emerald-100 text-emerald-700' },
  { value: 'warning', label: 'Aviso',      color: 'bg-amber-100 text-amber-700' },
  { value: 'error',   label: 'Erro',       color: 'bg-red-100 text-red-700' },
]

export default function NotificacoesAdminPage() {
  const [tenants, setTenants] = useState([])
  const [form, setForm] = useState({ title: '', body: '', link: '', type: 'info', tenant_id: '' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/admin/tenants?page_size=500`, { credentials: 'include', headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTenants(d.items || []) })
  }, [])

  async function send() {
    if (!form.title.trim()) return
    setSending(true)
    setResult(null)
    try {
      const body = {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        link: form.link.trim() || null,
        tenant_id: form.tenant_id || null,
      }
      const r = await fetch(`${API_URL}/admin/notifications/broadcast`, { credentials: 'include',
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.ok) {
        setResult({ ok: true, count: d.sent_to })
        setForm(f => ({ ...f, title: '', body: '', link: '' }))
      } else {
        setResult({ ok: false, error: d.detail })
      }
    } finally { setSending(false) }
  }

  return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Notificações in-app</h1>
          <p className="text-gray-500 text-sm mt-1">Envie alertas e avisos diretamente para os usuários do Jarbis.</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {NOTIF_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                    form.type === t.value
                      ? 'border-violet-500 bg-violet-900/40 text-violet-300'
                      : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Destinatário</label>
            <select
              value={form.tenant_id}
              onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
            >
              <option value="">Todos os usuários</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.plan})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Título <span className="text-red-400">*</span></label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Manutenção programada às 23h"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500 placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Mensagem</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={3}
              placeholder="Detalhes da notificação (opcional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500 placeholder:text-gray-600 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Link (opcional)</label>
            <input
              value={form.link}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              placeholder="/configuracoes/planos"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500 placeholder:text-gray-600"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={send}
              disabled={sending || !form.title.trim()}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {sending ? 'Enviando...' : 'Enviar notificação'}
            </button>
            {result && (
              <span className={`text-sm font-medium ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.ok ? `Enviado para ${result.count} usuário(s)` : result.error}
              </span>
            )}
          </div>
        </div>

        {/* Preview */}
        {form.title && (
          <div className="mt-6">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Preview</div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900/50 p-4">
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  form.type === 'success' ? 'bg-emerald-500' :
                  form.type === 'warning' ? 'bg-amber-500' :
                  form.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <div>
                  <div className="text-sm font-semibold text-gray-200">{form.title}</div>
                  {form.body && <div className="text-xs text-gray-400 mt-0.5">{form.body}</div>}
                  {form.link && <div className="text-xs text-violet-400 mt-1">Ver mais →</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Docs */}
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/20 p-4 text-xs text-gray-500 space-y-1">
          <p>As notificações aparecem no <strong className="text-gray-400">sino (🔔)</strong> na barra lateral de cada usuário.</p>
          <p>Notificações não lidas ficam em destaque e um contador aparece no ícone.</p>
        </div>
      </div>
  )
}
