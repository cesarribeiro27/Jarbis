'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

const FREQ_LABELS = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

function CreateModal({ dashboards, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({
    report_id: dashboards[0]?.id || '',
    frequency: 'daily',
    emails: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_URL}/reports/scheduled`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          report_id: form.report_id,
          frequency: form.frequency,
          emails: form.emails.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({ detail: 'Erro' }))
        throw new Error(e.detail || 'Erro ao criar')
      }
      const data = await r.json()
      onCreated(data)
      onClose()
      toast('Relatório agendado criado com sucesso', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Novo relatório agendado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Dashboard</label>
            <select
              required
              value={form.report_id}
              onChange={e => setForm(f => ({ ...f, report_id: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {dashboards.map(d => (
                <option key={d.id} value={d.id}>{d.title || d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Frequência</label>
            <select
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">E-mails destinatários</label>
            <input
              required
              type="text"
              value={form.emails}
              onChange={e => setForm(f => ({ ...f, emails: e.target.value }))}
              placeholder="email1@ex.com, email2@ex.com"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Separados por vírgula</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Agendando...' : 'Criar agendamento'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function RelatoriosAgendadosPage() {
  const toast = useToast()
  const [scheduled, setScheduled] = useState([])
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/reports/scheduled`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      api.reports.list(),
    ])
      .then(([sched, dashes]) => {
        setScheduled(sched || [])
        setDashboards(dashes || [])
      })
      .catch(() => toast('Erro ao carregar dados', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function toggleScheduled(item) {
    setTogglingId(item.id)
    try {
      const r = await fetch(`${API_URL}/reports/scheduled/${item.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      if (!r.ok) throw new Error('Erro ao atualizar')
      const updated = await r.json()
      setScheduled(prev => prev.map(s => s.id === updated.id ? updated : s))
      toast(updated.is_active ? 'Agendamento ativado' : 'Agendamento pausado', 'info')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteScheduled(id) {
    try {
      const r = await fetch(`${API_URL}/reports/scheduled/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!r.ok) throw new Error('Erro ao excluir')
      setScheduled(prev => prev.filter(s => s.id !== id))
      setDeleteConfirmId(null)
      toast('Agendamento excluído', 'success')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Relatórios Agendados</h1>
            <p className="text-sm text-gray-500 mt-1">Envie relatórios por e-mail automaticamente</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Novo agendamento
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : scheduled.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Nenhum relatório agendado</p>
            <p className="text-sm text-gray-400 mb-6">Crie agendamentos para enviar relatórios por e-mail automaticamente.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
            >
              Criar agendamento
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {scheduled.map(item => {
              const dash = dashboards.find(d => d.id === item.report_id)
              const isToggling = togglingId === item.id
              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                    !item.is_active ? 'border-gray-100 dark:border-gray-700 opacity-60' : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.is_active ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <svg className={`w-5 h-5 ${item.is_active ? 'text-violet-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {dash?.title || dash?.name || item.report_id}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.frequency === 'daily' ? 'bg-blue-50 text-blue-600' :
                        item.frequency === 'weekly' ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {FREQ_LABELS[item.frequency] || item.frequency}
                      </span>
                      {!item.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">Pausado</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {Array.isArray(item.emails) ? item.emails.join(', ') : item.emails}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleScheduled(item)}
                      disabled={isToggling}
                      title={item.is_active ? 'Pausar' : 'Ativar'}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                        item.is_active
                          ? 'text-green-500 hover:bg-red-50 hover:text-red-400'
                          : 'text-gray-300 hover:bg-green-50 hover:text-green-500'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                          item.is_active
                            ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        } />
                      </svg>
                    </button>
                    {deleteConfirmId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteScheduled(item.id)} className="text-xs text-red-600 font-semibold px-2 py-1 hover:bg-red-50 rounded">Sim</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-400 px-2 py-1 hover:bg-gray-50 rounded">Não</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        title="Excluir"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && dashboards.length > 0 && (
        <CreateModal
          dashboards={dashboards}
          onClose={() => setShowCreate(false)}
          onCreated={item => setScheduled(prev => [item, ...prev])}
        />
      )}
      {showCreate && dashboards.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mx-4 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2 font-semibold">Nenhum dashboard encontrado</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Crie um dashboard antes de agendar relatórios.</p>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
