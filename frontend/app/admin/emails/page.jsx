'use client'

import { useState } from 'react'


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
  { id: 'custom', label: 'Mensagem Personalizada', subject: '', body: '', raw: false },
  {
    id: 'novidades',
    label: 'Novidades da Plataforma',
    subject: 'O jarbis está evoluindo. Veja o que ficou pronto.',
    raw: true,
    body: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>O jarbis está evoluindo - e rápido.</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Inter',Arial,sans-serif;color:#1A1A2E;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
        <tr>
          <td bgcolor="#0B0A1A" style="background:#0B0A1A;border-radius:16px 16px 0 0;padding:40px 32px 36px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;"><img src="https://jarbis.cc/logo-email.svg" alt="jarbis" width="40" height="40" style="display:block;border-radius:10px;" /></td>
                      <td style="padding-left:12px;vertical-align:middle;"><span style="color:#ffffff;font-weight:900;font-size:22px;letter-spacing:-0.05em;">jar<span style="color:#A78BFA;">b</span>is</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 14px;">
              <tr><td width="40" height="1" bgcolor="#4C3880" style="background:#4C3880;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
            <p style="margin:0;font-size:12px;font-weight:600;color:#A78BFA;letter-spacing:0.12em;text-transform:uppercase;">Novidades da plataforma</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:40px 32px;border-radius:0 0 16px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <p style="margin:0 0 8px;font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-0.4px;">O jarbis está evoluindo. E rápido.</p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#6B7280;">Temos trabalhado muito para deixar a plataforma mais inteligente, mais rápida e muito mais gostosa de usar. Aqui está o que ficou pronto.</p>
            <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 28px;" />
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
              <tr>
                <td width="44" valign="top"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="12" fill="#f5f3ff"/><rect x="14" y="10" width="12" height="20" rx="3" stroke="#6D28D9" stroke-width="1.75"/><circle cx="20" cy="26.5" r="1" fill="#6D28D9"/></svg></td>
                <td style="padding-left:14px;">
                  <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1A1A2E;">Funciona no celular. De verdade.</p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#6B7280;">Seus dashboards agora funcionam em qualquer celular, em qualquer orientação. Abra no seu celular e veja seus dados do mesmo jeito que no computador.</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
              <tr>
                <td width="44" valign="top"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="12" fill="#f5f3ff"/><path d="M24.5 12.5l3 3-10 10-3.5.5.5-3.5 10-10z" stroke="#6D28D9" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 28h14" stroke="#6D28D9" stroke-width="1.75" stroke-linecap="round"/></svg></td>
                <td style="padding-left:14px;">
                  <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1A1A2E;">Editor visual repensado</p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#6B7280;">Barra flutuante de ações, arraste de colunas direto para o canvas e sugestões inteligentes de gráfico. Criar um dashboard agora leva minutos, não horas.</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
              <tr>
                <td width="44" valign="top"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="12" fill="#f5f3ff"/><path d="M13 20h14M20 13v14" stroke="#6D28D9" stroke-width="1.75" stroke-linecap="round"/><path d="M15 15l10 10M25 15L15 25" stroke="#6D28D9" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/></svg></td>
                <td style="padding-left:14px;">
                  <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1A1A2E;">KPIs com fórmula personalizada</p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#6B7280;">Calcule margem, ticket médio, crescimento e qualquer outra métrica composta. Defina a fórmula direto no bloco sem precisar preparar a planilha antes.</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
              <tr>
                <td width="44" valign="top"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="12" fill="#f5f3ff"/><path d="M20 13l1.5 3.5L25 18l-3.5 1.5L20 23l-1.5-3.5L15 18l3.5-1.5L20 13z" stroke="#6D28D9" stroke-width="1.6" stroke-linejoin="round"/><path d="M26 24l.75 1.75L28.5 26.5l-1.75.75L26 29l-.75-1.75L23.5 26.5l1.75-.75L26 24z" stroke="#7C3AED" stroke-width="1.4" stroke-linejoin="round"/></svg></td>
                <td style="padding-left:14px;">
                  <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1A1A2E;">Jarbis IA entende seus dados</p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#6B7280;">Clique em "Perguntar" e faça qualquer pergunta em português. O Jarbis IA lê suas tabelas e responde com contexto. Sem SQL. Sem fórmulas. Só a resposta que você precisa.</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td width="44" valign="top"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="12" fill="#f5f3ff"/><path d="M17 16l-4 4 4 4M23 16l4 4-4 4" stroke="#6D28D9" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 14l-2 12" stroke="#6D28D9" stroke-width="1.75" stroke-linecap="round" opacity="0.5"/></svg></td>
                <td style="padding-left:14px;">
                  <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1A1A2E;">Embed gratuito para todos</p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#6B7280;">Cole seu dashboard em qualquer site, relatório ou apresentação. Disponível em todos os planos, inclusive no gratuito.</p>
                </td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 28px;" />
            <p style="margin:0 0 16px;font-size:17px;font-weight:800;letter-spacing:-0.3px;">3 coisas para experimentar agora</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr><td width="28" valign="top" style="padding-top:2px;"><div style="width:22px;height:22px;background:#6D28D9;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:800;color:white;">1</div></td><td style="padding-left:10px;font-size:14px;line-height:1.6;color:#1A1A2E;"><strong>Abra um dashboard no seu celular.</strong> Gire para horizontal e veja os gráficos lado a lado como no computador.</td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr><td width="28" valign="top" style="padding-top:2px;"><div style="width:22px;height:22px;background:#6D28D9;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:800;color:white;">2</div></td><td style="padding-left:10px;font-size:14px;line-height:1.6;color:#1A1A2E;"><strong>Clique em "Perguntar"</strong> em qualquer dashboard e escreva: <em>"Quais são os 5 clientes que mais compraram?"</em></td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;"><tr><td width="28" valign="top" style="padding-top:2px;"><div style="width:22px;height:22px;background:#6D28D9;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:800;color:white;">3</div></td><td style="padding-left:10px;font-size:14px;line-height:1.6;color:#1A1A2E;"><strong>Crie um bloco de KPI com fórmula.</strong> Calcule sua margem bruta direto no dashboard sem mexer na planilha.</td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="https://jarbis.cc/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6D28D9 0%,#7C3AED 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:-0.2px;">Acessar minha conta &rarr;</a></td></tr></table>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#94A3B8;text-align:center;">Tem dúvidas ou sugestões? Responda este e-mail. Lemos tudo.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 16px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;font-style:italic;">Inteligência de dados para quem faz acontecer.</p>
            <p style="margin:0;font-size:11px;color:#94A3B8;"><a href="https://jarbis.cc" style="color:#6D28D9;text-decoration:none;">jarbis.cc</a>&nbsp;&middot;&nbsp;<a href="https://jarbis.cc/configuracoes" style="color:#94A3B8;text-decoration:none;">Cancelar inscrição</a></p>
            <p style="margin:8px 0 0;font-size:10px;color:#CBD5E1;">Desenvolvido pela Mazzel Tech</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_admin_token') : null
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

  const [rawHtml, setRawHtml] = useState(false)
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
      setRawHtml(!!t.raw)
    }
    setPreview(null)
    setResult(null)
  }

  function buildPayload() {
    return {
      subject,
      body_html: bodyHtml,
      raw_html: rawHtml,
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
  )
}
