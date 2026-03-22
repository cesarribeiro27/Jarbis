'use client'

import { LogoA } from '../../components/logos/JarbisLogo'

export default function ManutencaoPage() {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4"
      style={{ background: '#0B0A1A' }}
    >
      {/* Orbs de fundo */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 animate-pulse"
        style={{
          background: 'radial-gradient(circle, #6D28D9 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-15 animate-pulse"
        style={{
          background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)',
          filter: 'blur(100px)',
          animationDelay: '1s',
        }}
      />

      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">

        {/* Logo */}
        <div className="mb-3 flex justify-center">
          <LogoA size={64} light />
        </div>
        <p className="text-white font-bold text-2xl tracking-tight mb-8">
          jarbis
        </p>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-amber-300 font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          Manutenção em andamento
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
          Voltamos
          <br />
          <span
            className="bg-clip-text text-transparent"

            style={{
              backgroundImage: 'linear-gradient(90deg, #A78BFA, #818CF8)',
            }}
          >
            em breve
          </span>
        </h1>

        {/* Subtítulo */}
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          Estamos realizando uma manutenção programada para melhorar sua experiência.
          <br />
          O Jarbis voltará a funcionar em instantes.
        </p>

        {/* Ícone de ferramenta animado */}
        <div className="mb-10 flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10">
          <svg
            className="w-8 h-8 text-violet-400"
            style={{ animation: 'spin-slow 4s linear infinite' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
            />
          </svg>
        </div>

        {/* Contato */}
        <p className="text-gray-500 text-sm">
          Dúvidas urgentes?{' '}
          <a
            href="mailto:suporte@jarbis.cc"
            className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            suporte@jarbis.cc
          </a>
        </p>
      </div>

      {/* Rodapé */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
        <p className="text-xs text-gray-700">
          © {new Date().getFullYear()} Jarbis. Todos os direitos reservados.
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
