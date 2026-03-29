'use client'

export default function ConsentBanner({ onAccept, onDecline }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#1E1E2E] border border-[#E2E8F0] dark:border-[#2D2D3D] rounded-2xl shadow-lg p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-[#f5f3ff] dark:bg-[#2D2D3D] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#6D28D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A2E] dark:text-[#F1F5F9] mb-1">Cookies e privacidade</p>
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">
              Usamos cookies de análise para entender como o Jarbis é usado e melhorar sua experiência.
              Seus dados são tratados de acordo com o{' '}
              <a href="https://jarbis.cc/privacidade" target="_blank" rel="noopener noreferrer" className="text-[#6D28D9] hover:underline">
                GDPR
              </a>.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#2D2D3D] rounded-xl text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#f5f3ff] dark:hover:bg-[#2D2D3D] transition-colors"
          >
            Apenas essenciais
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm bg-[#6D28D9] hover:bg-[#7C3AED] text-white rounded-xl font-semibold transition-colors"
          >
            Aceitar cookies
          </button>
        </div>
      </div>
    </div>
  )
}
