'use client'

import { useRouter } from 'next/navigation'

const PLAN_DISPLAY = {
  free: 'Gratuito',
  solo: 'Solo',
  equipe: 'Profissional',
  ilimitado: 'Ilimitado',
  enterprise: 'Enterprise',
  starter: 'Solo',
  professional: 'Profissional',
}

const FEATURE_LABELS = {
  ai: 'Consulta com IA',
  embed: 'Incorporação (Embed)',
  white_label: 'White-label',
}

export default function UpgradeModal({ errorData, onClose }) {
  const router = useRouter()

  if (!errorData) return null

  const code = errorData?.code
  const isFeature = code === 'feature_not_available'
  const isTrialExpired = code === 'trial_expired'

  const title = isFeature
    ? 'Recurso não disponível no seu plano'
    : isTrialExpired
    ? 'Trial expirado'
    : 'Limite do plano atingido'

  let description = errorData?.message || 'Faça upgrade para continuar.'
  if (isFeature) {
    const featureLabel = FEATURE_LABELS[errorData.feature] || errorData.feature
    const requiredPlan = errorData.required_plan || 'superior'
    description = `"${featureLabel}" está disponível a partir do plano ${requiredPlan}.`
  } else if (isTrialExpired) {
    description = 'Seu período de teste terminou. Escolha um plano para continuar usando o Jarbis.'
  }

  function handleUpgrade() {
    onClose()
    router.push('/configuracoes/planos')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 flex flex-col items-center text-center">
        {/* Ícone */}
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Título */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>

        {/* Descrição */}
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{description}</p>

        {/* Ações */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleUpgrade}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
          >
            Ver planos
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
