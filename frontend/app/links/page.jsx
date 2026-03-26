'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'

function IconLink() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function NewCampaignModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const data = await api('/links/campaigns', { method: 'POST', body: JSON.stringify({ name: name.trim(), description: description.trim() || null }) })
      onCreated(data)
      onClose()
    } catch (err) {
      showToast(err.message || 'Erro ao criar campanha', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Nova campanha</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Agrupe seus links por campanha para organizar e acompanhar o desempenho.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome da campanha *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Claro_Março2026_WhatsApp"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Contexto da campanha, cliente, período..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-sm font-medium text-white transition-colors">
              {loading ? 'Criando...' : 'Criar campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CampaignCard({ campaign, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
          <IconLink />
        </div>
        <span className="mt-1 text-violet-500 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconArrow />
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1 truncate">{campaign.name}</h3>
      {campaign.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{campaign.description}</p>
      )}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">{campaign.links_count}</span> {campaign.links_count === 1 ? 'link' : 'links'}
        </span>
        <span className="text-gray-200 dark:text-gray-700">·</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(campaign.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </button>
  )
}

export default function LinksPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api('/links/campaigns').then(data => {
      setCampaigns(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function handleCreated(campaign) {
    setCampaigns(prev => [campaign, ...prev])
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Links de campanha</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Encurte, identifique e rastreie seus links por campanha.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors shadow-sm"
          >
            <IconPlus />
            Nova campanha
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-400 mb-4">
              <IconLink />
            </div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma campanha ainda</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-6">
              Crie uma campanha para começar a encurtar e rastrear seus links.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-medium text-white transition-colors"
            >
              <IconPlus />
              Nova campanha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} onClick={() => router.push(`/links/${c.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewCampaignModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </AppLayout>
  )
}
