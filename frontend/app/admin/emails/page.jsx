'use client'

import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const TEMPLATES = [
  {
    id: 'trial_ending',
    label: 'Trial Encerrando',
    subject: 'Seu trial no Jarbis está acabando',
    body: `<p style="color:#374151;font-size:15px;line-height:1.6;">Seu período de avaliação gratuita está chegando ao fim.</p>
<p style="color:#374151;font-size:15px;line-height:1.6;">Continue aproveitando todos os recursos do Jarbis — faça o upgrade agora e não perca o acesso aos seus dashboards.</p>
<div style="text-align:center;margin:32px 0;">
  <a href="https://jarbis.cc/configuracoes/planos" style="background:#4f46e5;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Ver planos →</a>
</div>`,
  },
  {
    id: 'inativo',
    label: 'Reengajamento',
    subject: 'Sentimos sua falta no Jarbis',
    body: `<p style="color:#374151;font-size:15px;line-height:1.6;">Faz um tempo que não te vemos por aqui!</p>
<p style="color:#374151;font-size:15px;line-height:1.6;">Seus dashboards estão te esperando. Que tal voltar e conferir as novidades que adicionamos?</p>
<div style="text-align:center;margin:32px 0;">
  <a href="https://jarbis.cc/dashboard" style="background:#4f46e5;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Acessar agora →</a>
</div>`,
  },
  {
    id: 'pagamento',
    label: 'Lembrete de Pagamento',
    subject: 'Ação necessária: pagamento pendente',
    body: `<p style="color:#374151;font-size:15px;line-height:1.6;">Identificamos um problema com o pagamento da sua assinatura.</p>
<p style="color:#374151;font-size:15px;line-height:1.6;">Para evitar a interrupção do acesso, por favor atualize seu método de pagamento.</p>
<div style="text-align:center;margin:32px 0;">
  <a href="https://jarbis.cc/configuracoes/planos" style="background:#dc2626;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Regularizar pagamento →</a>
</div>`,
  },
  { id: 'custom', label: 'Mensagem Personalizada', subject: '', body: '' },
]

const PLAN_OPTIONS = [
  { value: '', label: 'Todos os planos' },
  { value: 'free', label: 'Gratuito' },
  { value: 'starter', label: 'Solo' },
  { value: 'professional', label: 'Profissional' },
  { value: 'enterprise', label: 'Enterprise' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativo' },
  { value: 'trial', label: 'Em trial' },
  { value: 'past_due', label: 'Pagamento pendente' },
]

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export default function AdminEmailsPage() {
  const [templateId, setTemplateId] = useState('trial_ending')
  const [subject, setSubject] = useState(TEMPLATES[0].subject)
  const [bodyHtml, setBodyHtml] = useState(TEMPLATES[0].body)
  const [segmentPlan, setSegmentPlan] = useState('')
  const [segmentStatus, setSegmentStatus] = useState('')
  const [trialDaysMax, setTrialDaysMax] = useState('')

  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function selectTemplate(id) {
    setTemplateId(id)
    const t = TEMPLATES.find(t => t.id === id)
    if (t) {
      setSubject(t.subject)
      setBodyHtml(t.body)
    }
    setPreview(null)
    setResult(null)
  }

  function buildPayload() {
    return {
      subject,
      body_html: bodyHtml,
      segment_plan: segmentPlan || null,
      segment_status: segmentStatus || null,
      segment_trial_days_max: trialDaysMax ? parseInt(trialDaysMax) : null,
    }
  }

  async function handlePreview() {
    setPreviewing(true)
    setError('')
    setPreview(null)
    try {
      const r = await fetch(`${API_URL}/admin/emails/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify(buildPayload()),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.detail || 'Erro ao buscar destinatários'); return }
      setPreview(d)
    } catch { setError('Erro de conexão') } finally { setPreviewing(false) }
  }

  async function handleSend() {
    if (!preview) { setError('Clique em "Ver destinatários" primeiro.'); return }
    if (!subject.trim()) { setError('Assunto é obrigatório.'); return }
    if (!bodyHtml.trim()) { setError('Conteúdo é obrigatório.'); return }

    setSending(true)
    setError('')
    setResult(null)
    try {
      const r = await fetch(`${API_URL}/admin/emails/send-campaign`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify(buildPayload()),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.detail || 'Erro ao enviar'); return }
      setResult(d)
      setPreview(null)
    } catch { setError('Erro de conexão') } finally { setSending(false) }
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Email Dispatch</h1>
          <p className="text-gray-500 text-sm mt-1">Envie emails segmentados para owners de tenants</p>
        </div>

        {result ? (
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-black text-emerald-400">Campanha enviada!</h2>
            <p className="text-gray-400 text-sm mt-2">
              <strong className="text-white">{result.sent}</strong> emails enviados com sucesso
              {result.failed > 0 && <span className="text-red-400"> · {result.failed} falhas</span>}
            </p>
            <button
              onClick={() => { setResult(null); setPreview(null) }}
              className="mt-6 px-6 py-2 rounded-xl border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Nova campanha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Configuração */}
            <div className="lg:col-span-3 space-y-5">

              {/* Template */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t.id)}
                      className={`text-xs font-medium px-3 py-2 rounded-xl border transition-colors text-left ${
                        templateId === t.id
                          ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                          : 'border-gray-700 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assunto */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Assunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-600"
                  placeholder="Assunto do email"
                />
              </div>

              {/* Corpo HTML */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Conteúdo (HTML)</label>
                <textarea
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                  rows={10}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-violet-600 resize-none"
                  placeholder="<p>Corpo do email em HTML...</p>"
                />
                <p className="text-[10px] text-gray-600 mt-1">Use <code className="text-gray-500">&#123;&#123;tenant_name&#125;&#125;</code> — será substituído automaticamente pelo nome da empresa.</p>
              </div>

            </div>

            {/* Segmentação + preview */}
            <div className="lg:col-span-2 space-y-5">

              <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Segmentação</h3>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Plano</label>
                  <select
                    value={segmentPlan}
                    onChange={e => { setSegmentPlan(e.target.value); setPreview(null) }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-violet-600"
                  >
                    {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Status</label>
                  <select
                    value={segmentStatus}
                    onChange={e => { setSegmentStatus(e.target.value); setPreview(null) }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-violet-600"
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Trial expira em ≤ N dias</label>
                  <input
                    type="number"
                    value={trialDaysMax}
                    onChange={e => { setTrialDaysMax(e.target.value); setPreview(null) }}
                    min={1} max={30}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-violet-600"
                    placeholder="ex: 3"
                  />
                </div>

                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  className="w-full py-2 rounded-xl border border-gray-600 text-xs text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {previewing ? 'Buscando...' : '👁 Ver destinatários'}
                </button>
              </div>

              {/* Preview resultado */}
              {preview && (
                <div className="rounded-2xl border border-violet-800/40 bg-violet-900/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      {preview.count} destinatário{preview.count !== 1 ? 's' : ''}
                    </span>
                    {preview.count > 20 && (
                      <span className="text-[10px] text-gray-500">mostrando 20</span>
                    )}
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {preview.recipients.map((r, i) => (
                      <div key={i} className="text-xs text-gray-400">
                        <span className="text-white">{r.tenant_name}</span>
                        <span className="text-gray-600"> · {r.owner_email}</span>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={sending || preview.count === 0}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                  >
                    {sending ? 'Enviando...' : `📨 Enviar para ${preview.count} tenants`}
                  </button>
                </div>
              )}

              {error && !preview && (
                <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
