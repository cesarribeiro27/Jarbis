'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const PRESET_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#dc2626', '#d97706',
  '#0891b2', '#7c3aed', '#db2777', '#4f46e5', '#16a34a',
]

export default function PersonalizacaoPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [billingName, setBillingName] = useState('')
  const [saved, setSaved] = useState(false)
  const [savedBilling, setSavedBilling] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/reports/tenant/customization`, { credentials: 'include', headers: JSON_HEADERS })
      if (r.ok) {
        const d = await r.json()
        setData(d)
        setLogoUrl(d.custom_logo_url || '')
        setColor(d.primary_color || '#7c3aed')
        setBillingName(d.billing_name || '')
      }
    } finally { setLoading(false) }
  }

  async function saveBilling() {
    setSavingBilling(true)
    try {
      const r = await fetch(`${API_URL}/reports/tenant/customization`, {
        method: 'PATCH',
        credentials: 'include',
        headers: JSON_HEADERS,
        body: JSON.stringify({ billing_name: billingName.trim() || null }),
      })
      if (r.ok) {
        setSavedBilling(true)
        setTimeout(() => setSavedBilling(false), 2500)
      } else {
        const err = await r.json()
        alert(err.detail || 'Erro ao salvar')
      }
    } finally { setSavingBilling(false) }
  }

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/reports/tenant/customization`, {
        method: 'PATCH',
        credentials: 'include',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          custom_logo_url: logoUrl.trim() || null,
          primary_color: color,
        }),
      })
      if (r.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const err = await r.json()
        alert(err.detail || 'Erro ao salvar')
      }
    } finally { setSaving(false) }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  )

  const isEnterprise = data?.white_label_enabled

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-black text-gray-900">Personalização</h1>
          <p className="text-sm text-gray-500 mt-1">Customize a aparência do Jarbis com a identidade visual da sua empresa.</p>
        </div>

        {!isEnterprise && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            White-label está disponível apenas no plano <strong>Business</strong> ou superior.{' '}
            <a href="/configuracoes/planos" className="underline font-bold">Fazer upgrade</a>
          </div>
        )}

        <div className="space-y-5">
          {/* Nome na fatura */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Nome na fatura</h2>
            <p className="text-xs text-gray-500 mb-3">
              Como o seu nome aparece nas faturas e no extrato bancário. Se deixar em branco, será usado o nome da sua conta.
            </p>
            <input
              value={billingName}
              onChange={e => setBillingName(e.target.value)}
              placeholder="Ex: Minha Empresa Ltda"
              maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">Se vazio, exibe <strong>Jarbis.cc</strong> por padrão.</p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={saveBilling}
                disabled={savingBilling}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {savingBilling ? 'Salvando...' : 'Salvar nome'}
              </button>
              {savedBilling && <span className="text-xs text-emerald-600 font-medium">Salvo!</span>}
            </div>
          </div>

          {/* Logo */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Logo personalizada</h2>
            <p className="text-xs text-gray-500 mb-3">URL da imagem da logo (PNG, SVG recomendado). Exibida no login e nas páginas públicas.</p>
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://meusite.com/logo.svg"
              disabled={!isEnterprise}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 disabled:opacity-50 disabled:bg-gray-50"
            />
            {logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">Preview:</span>
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-8 object-contain max-w-[200px]"
                  onError={e => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          {/* Cor primária */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Cor primária</h2>
            <p className="text-xs text-gray-500 mb-3">Cor usada em botões, links e destaques. Formato HEX (#RRGGBB).</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => isEnterprise && setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'hover:scale-105'} ${!isEnterprise ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={e => isEnterprise && setColor(e.target.value)}
                disabled={!isEnterprise}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                value={color}
                onChange={e => {
                  const v = e.target.value
                  if (v.startsWith('#') && v.length <= 7) setColor(v)
                }}
                placeholder="#7c3aed"
                disabled={!isEnterprise}
                className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-violet-400 disabled:opacity-50 disabled:bg-gray-50"
              />
              {/* Preview button */}
              <div
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: color }}
              >
                Preview
              </div>
            </div>
          </div>

          {/* Botão salvar */}
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={!isEnterprise || saving}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar personalização'}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">Salvo com sucesso!</span>}
          </div>
        </div>

        {/* Nota sobre aplicação */}
        <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
          As personalizações são aplicadas nas páginas de dashboards públicos e no portal de acesso white-label.
          A interface administrativa do Jarbis mantém o visual padrão.
        </div>
      </div>
    </AppLayout>
  )
}
