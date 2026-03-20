'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useRouter } from 'next/navigation'

export default function SubOrgsPage() {
  const [suborgs, setSuborgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeSuborg, setActiveSuborg] = useState(null)
  const toast = useToast()
  const router = useRouter()

  useEffect(() => {
    // Carrega o contexto ativo do localStorage
    const stored = typeof window !== 'undefined' ? localStorage.getItem('jarbis_suborg_id') : null
    const storedName = typeof window !== 'undefined' ? localStorage.getItem('jarbis_suborg_name') : null
    if (stored) setActiveSuborg({ id: stored, name: storedName })

    api.suborgs.list()
      .then(data => setSuborgs(data || []))
      .catch(() => toast('Erro ao carregar sub-organizações', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const suborg = await api.suborgs.create({ name: name.trim() })
      setSuborgs(prev => [suborg, ...prev])
      setName('')
      setShowModal(false)
      toast('Sub-organização criada', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao criar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSwitch(suborg) {
    try {
      await api.suborgs.switch(suborg.id)
      localStorage.setItem('jarbis_suborg_id', String(suborg.id))
      localStorage.setItem('jarbis_suborg_name', suborg.name)
      setActiveSuborg({ id: String(suborg.id), name: suborg.name })
      toast(`Contexto alterado para: ${suborg.name}`, 'success')
      router.push('/dashboard')
    } catch (err) {
      toast(err.message || 'Erro ao alternar contexto', 'error')
    }
  }

  function handleExitSuborg() {
    localStorage.removeItem('jarbis_suborg_id')
    localStorage.removeItem('jarbis_suborg_name')
    setActiveSuborg(null)
    toast('Voltou ao contexto principal', 'success')
    router.push('/dashboard')
  }

  async function handleDeactivate(suborg) {
    if (!confirm(`Desativar "${suborg.name}"?`)) return
    try {
      await api.suborgs.update(suborg.id, { is_active: false })
      setSuborgs(prev => prev.map(s => s.id === suborg.id ? { ...s, is_active: false } : s))
      toast('Sub-organização desativada', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao desativar', 'error')
    }
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Sub-organizações</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crie workspaces separados para clientes ou filiais, gerenciados pela sua conta.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Nova sub-org
          </button>
        </div>

        {/* Banner contexto ativo */}
        {activeSuborg && (
          <div className="mb-6 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Você está gerenciando: <strong>{activeSuborg.name}</strong>
            </div>
            <button onClick={handleExitSuborg} className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-semibold">
              Voltar ao contexto principal
            </button>
          </div>
        )}

        {/* Info de plano */}
        <div className="mb-6 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Recurso exclusivo do plano <strong>Ilimitado</strong>. Cada sub-org tem seus próprios dashboards e datasets.
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"/>
          </div>
        ) : suborgs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <p className="text-sm">Nenhuma sub-organização ainda.</p>
            <p className="text-xs mt-1">Clique em &quot;Nova sub-org&quot; para começar.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {suborgs.map(suborg => (
              <div key={suborg.id} className={`bg-white dark:bg-gray-800 border rounded-2xl px-5 py-4 flex items-center justify-between gap-4 ${activeSuborg?.id === String(suborg.id) ? 'border-violet-300 dark:border-violet-600' : 'border-gray-100 dark:border-gray-700'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{suborg.name}</span>
                    {!suborg.is_active && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-full">INATIVA</span>
                    )}
                    {activeSuborg?.id === String(suborg.id) && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-full">ATIVA</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{suborg.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {suborg.is_active && activeSuborg?.id !== String(suborg.id) && (
                    <button
                      onClick={() => handleSwitch(suborg)}
                      className="px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                    >
                      Acessar
                    </button>
                  )}
                  {suborg.is_active && (
                    <button
                      onClick={() => handleDeactivate(suborg)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-700 transition-colors"
                    >
                      Desativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nova sub-org */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-96 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Nova sub-organização</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nome</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Agência XYZ, Filial São Paulo..."
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50">
                  {saving ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
