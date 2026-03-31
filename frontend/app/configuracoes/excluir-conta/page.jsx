'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarbis-production.up.railway.app'

export default function ExcluirContaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete(e) {
    e.preventDefault()
    if (confirm !== 'EXCLUIR') {
      setError('Digite EXCLUIR para confirmar.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Erro ao excluir conta.')
        return
      }
      // Limpa localStorage e redireciona
      localStorage.clear()
      router.push('/?account_deleted=1')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 flex items-center gap-1">
            ← Voltar
          </button>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Excluir conta</h1>
          <p className="text-gray-500 text-sm mt-1">Conforme a LGPD (Lei 13.709/2018), voce tem o direito de solicitar a exclusao de todos os seus dados.</p>
        </div>

        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/10 p-5 mb-6">
          <div className="font-semibold text-red-700 dark:text-red-400 mb-2">Esta acao e permanente e nao pode ser desfeita</div>
          <ul className="text-sm text-red-600/80 dark:text-red-400/70 space-y-1 list-disc list-inside">
            <li>Todos os dashboards e relatorios serao excluidos</li>
            <li>Todos os datasets e dados importados serao excluidos</li>
            <li>Todos os usuarios da conta serao removidos</li>
            <li>Sua assinatura sera cancelada imediatamente</li>
            <li>Nao sera possivel recuperar os dados apos a exclusao</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Confirme sua senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Sua senha atual"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Digite <span className="font-mono font-black text-red-600">EXCLUIR</span> para confirmar
            </label>
            <input
              type="text"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              placeholder="EXCLUIR"
            />
          </div>
          <button
            type="submit"
            disabled={loading || confirm !== 'EXCLUIR' || !password}
            className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Excluindo...' : 'Excluir minha conta permanentemente'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
