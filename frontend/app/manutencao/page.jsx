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
          Em desenvolvimento
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
          Algo incrível
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(90deg, #A78BFA, #818CF8)',
            }}
          >
            está a caminho
          </span>
        </h1>

        {/* Subtítulo */}
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          Estamos finalizando os últimos detalhes do Jarbis — o BI embarcado feito para empresas brasileiras.
          <br />
          Em breve você terá acesso completo.
        </p>

        {/* Barra de progresso */}
        <div className="w-full max-w-xs mb-10">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progresso</span>
            <span>Em breve</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: '72%',
                background: 'linear-gradient(90deg, #7C3AED, #6366F1)',
                animation: 'progress-shine 2.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* CTA email */}
        <p className="text-gray-500 text-sm">
          Quer saber mais ou fazer parceria?{' '}
          <a
            href="mailto:comercial@jarbis.cc"
            className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            comercial@jarbis.cc
          </a>
        </p>
      </div>

      {/* Rodapé */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
        <p className="text-xs text-gray-600 font-medium tracking-wide uppercase">
          Transformando Sorte em Estratégia
        </p>
        <p className="text-xs text-gray-700">
          © {new Date().getFullYear()} Jarbis. Todos os direitos reservados.
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes progress-shine {
          0%   { opacity: 0.7; }
          50%  { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
