'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'

function applyMask(value, type) {
  const digits = value.replace(/\D/g, '')
  if (type === 'cpf') {
    return digits.slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  if (type === 'cnpj') {
    return digits.slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
  if (type === 'cep') {
    return digits.slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2')
  }
  return value
}

export default function FiscalPage() {
  const toast = useToast()
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [fiscal, setFiscal] = useState({
    fiscal_type: 'pj',
    cpf: '', cnpj: '', razao_social: '', fiscal_email: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    inscricao_municipal: '', inscricao_estadual: '',
  })

  useEffect(() => {
    api.billing.getFiscalProfile()
      .then(data => setFiscal(f => ({ ...f, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setField(field) {
    return (e) => setFiscal(f => ({ ...f, [field]: e.target.value }))
  }

  async function fetchViaCep() {
    const digits = fiscal.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setFiscal(f => ({
          ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro:     data.bairro     || f.bairro,
          cidade:     data.localidade || f.cidade,
          estado:     data.uf         || f.estado,
        }))
      }
    } catch { /* ignore */ } finally {
      setCepLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.billing.saveFiscalProfile(fiscal)
      toast('Dados fiscais salvos com sucesso.', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao salvar dados fiscais.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-gray-100'

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse mb-4 w-48" />
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Dados Fiscais</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Informações utilizadas para emissão da Nota Fiscal de Serviço (NFS-e) das suas assinaturas.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">

          {/* PF / PJ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipo de pessoa</label>
            <div className="flex gap-2">
              {[['pj', 'Pessoa Jurídica (CNPJ)'], ['pf', 'Pessoa Física (CPF)']].map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => setFiscal(f => ({ ...f, fiscal_type: val }))}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${fiscal.fiscal_type === val ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Documento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {fiscal.fiscal_type === 'pf' ? 'CPF' : 'CNPJ'}
            </label>
            <input
              type="text" inputMode="numeric"
              value={fiscal.fiscal_type === 'pf' ? fiscal.cpf : fiscal.cnpj}
              onChange={e => {
                const masked = applyMask(e.target.value, fiscal.fiscal_type === 'pf' ? 'cpf' : 'cnpj')
                setFiscal(f => ({ ...f, [fiscal.fiscal_type === 'pf' ? 'cpf' : 'cnpj']: masked }))
              }}
              placeholder={fiscal.fiscal_type === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
              className={`${inputClass} font-mono`}
            />
          </div>

          {/* Nome / Razão Social */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {fiscal.fiscal_type === 'pf' ? 'Nome completo' : 'Razão Social'}
            </label>
            <input type="text" value={fiscal.razao_social} onChange={setField('razao_social')}
              placeholder={fiscal.fiscal_type === 'pf' ? 'João da Silva' : 'Empresa Ltda'}
              className={inputClass} />
          </div>

          {/* Email para NF */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Email para receber a NF <span className="text-xs font-normal text-gray-400">(pode ser diferente do email da conta)</span>
            </label>
            <input type="email" value={fiscal.fiscal_email} onChange={setField('fiscal_email')}
              placeholder="financeiro@empresa.com.br" className={inputClass} />
          </div>

          {/* CEP */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">CEP</label>
            <div className="flex gap-2">
              <input type="text" inputMode="numeric" value={fiscal.cep}
                onChange={e => setFiscal(f => ({ ...f, cep: applyMask(e.target.value, 'cep') }))}
                placeholder="00000-000" maxLength={9}
                className={`${inputClass} flex-1 font-mono`} />
              <button type="button" onClick={fetchViaCep}
                disabled={cepLoading || fiscal.cep.replace(/\D/g,'').length !== 8}
                className="px-4 py-2.5 border border-violet-300 text-violet-600 text-xs font-bold rounded-xl hover:bg-violet-50 transition-colors disabled:opacity-40 whitespace-nowrap">
                {cepLoading ? 'Buscando...' : 'Buscar endereço'}
              </button>
            </div>
          </div>

          {/* Logradouro + Número */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Logradouro</label>
              <input type="text" value={fiscal.logradouro} onChange={setField('logradouro')}
                placeholder="Rua das Flores" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Número</label>
              <input type="text" value={fiscal.numero} onChange={setField('numero')}
                placeholder="100" className={inputClass} />
            </div>
          </div>

          {/* Complemento + Bairro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Complemento <span className="text-xs font-normal text-gray-400">(opcional)</span>
              </label>
              <input type="text" value={fiscal.complemento} onChange={setField('complemento')}
                placeholder="Sala 3" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bairro</label>
              <input type="text" value={fiscal.bairro} onChange={setField('bairro')}
                placeholder="Centro" className={inputClass} />
            </div>
          </div>

          {/* Cidade + Estado */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Cidade</label>
              <input type="text" value={fiscal.cidade} onChange={setField('cidade')}
                placeholder="São Paulo" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
              <input type="text" value={fiscal.estado} onChange={setField('estado')}
                placeholder="SP" maxLength={2} className={`${inputClass} uppercase`} />
            </div>
          </div>

          {/* Inscrições (PJ) */}
          {fiscal.fiscal_type === 'pj' && (
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-700 pt-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Inscrição Municipal <span className="text-xs font-normal text-gray-400">(para NFS-e)</span>
                </label>
                <input type="text" value={fiscal.inscricao_municipal} onChange={setField('inscricao_municipal')}
                  placeholder="0000000" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Inscrição Estadual <span className="text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <input type="text" value={fiscal.inscricao_estadual} onChange={setField('inscricao_estadual')}
                  placeholder="Isento" className={inputClass} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">Esses dados também são solicitados no momento do pagamento.</p>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-violet-600 text-white font-bold text-sm rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar dados fiscais'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
