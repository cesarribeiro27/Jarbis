export default function ManutencaoPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo / ícone */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          Em manutenção
        </h1>
        <p className="text-gray-400 text-lg mb-2">
          Estamos fazendo melhorias no Jarbis.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Voltamos em breve com novidades. Obrigado pela paciência!
        </p>

        <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm text-gray-400">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          Previsão: em breve
        </div>

        <p className="mt-10 text-xs text-gray-600">
          Dúvidas? <a href="mailto:suporte@jarbis.cc" className="text-indigo-400 hover:underline">suporte@jarbis.cc</a>
        </p>
      </div>
    </div>
  )
}
