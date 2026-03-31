import Link from 'next/link'
import { LogoWithText } from '@/components/logos/JarbisLogo'

export const metadata = {
  title: 'Termos de Uso — Jarbis',
  description: 'Termos e condições de uso da plataforma Jarbis.',
}

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar simples */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoWithText size={28} />
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Entrar
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-violet-600 font-semibold text-sm mb-3 uppercase tracking-wide">Legal</p>
          <h1 className="text-4xl font-black text-gray-900 mb-4">Termos de Uso</h1>
          <p className="text-gray-500 text-sm">Última atualização: 31 de março de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma Jarbis, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize nossos serviços. Estes termos se aplicam a todos os usuários, incluindo administradores, colaboradores e visitantes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Descrição do Serviço</h2>
            <p>
              O Jarbis é uma plataforma de Business Intelligence (BI) embarcado que permite criar dashboards interativos, conectar fontes de dados, gerar relatórios, compartilhar visualizações e rastrear links de campanhas de marketing. O serviço é oferecido pela <strong>Mazzel Tech</strong>, empresa do grupo Mazzel AG.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Cadastro e Conta</h2>
            <p>Para utilizar o Jarbis, você deve:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Ter pelo menos 18 anos ou representar uma empresa legalmente constituída;</li>
              <li>Fornecer informações verdadeiras, precisas e completas no cadastro;</li>
              <li>Manter a confidencialidade de sua senha e credenciais de acesso;</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Planos e Pagamentos</h2>
            <p>
              O Jarbis oferece um plano gratuito com recursos limitados e planos pagos com funcionalidades avançadas. Os valores são cobrados em reais (BRL) conforme a tabela de preços vigente. Assinaturas são renovadas automaticamente até que o usuário cancele. O cancelamento pode ser feito a qualquer momento pelo painel de configurações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Uso Aceitável</h2>
            <p>Você concorda em não utilizar o Jarbis para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Violar leis brasileiras ou internacionais aplicáveis;</li>
              <li>Publicar, transmitir ou armazenar conteúdo ilegal, ofensivo ou prejudicial;</li>
              <li>Fazer engenharia reversa, copiar ou redistribuir o software;</li>
              <li>Interferir no funcionamento dos servidores ou redes do Jarbis;</li>
              <li>Usar scrapers, bots ou automações não autorizadas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Propriedade dos Dados</h2>
            <p>
              Você mantém todos os direitos sobre os dados que carrega na plataforma. Ao utilizar o Jarbis, você nos concede uma licença limitada para processar seus dados exclusivamente com o objetivo de fornecer o serviço contratado. Não vendemos seus dados a terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Propriedade Intelectual</h2>
            <p>
              O Jarbis, incluindo seu código-fonte, design, marca, logotipos e conteúdo, é propriedade da Mazzel Tech. Estes elementos são protegidos por leis de propriedade intelectual. Nenhuma parte deste serviço pode ser reproduzida sem autorização prévia por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Disponibilidade e SLA</h2>
            <p>
              Nos esforçamos para manter o Jarbis disponível 99,5% do tempo. No entanto, podemos interromper o serviço temporariamente para manutenção, atualizações ou em casos de força maior. Não garantimos disponibilidade ininterrupta e não somos responsáveis por danos causados por indisponibilidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitação de Responsabilidade</h2>
            <p>
              Na extensão máxima permitida por lei, a Mazzel Tech não será responsável por danos indiretos, incidentais, especiais ou consequentes decorrentes do uso ou impossibilidade de uso do serviço. Nossa responsabilidade total não excederá o valor pago pelo usuário nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Rescisão</h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar sua conta a qualquer momento, por justa causa, em caso de violação destes termos. Você pode encerrar sua conta a qualquer momento através do painel de configurações. Ao encerrar, seus dados serão excluídos conforme nossa política de privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes termos periodicamente. Notificaremos você sobre mudanças relevantes por e-mail ou através da plataforma. O uso continuado do serviço após a notificação constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Lei Aplicável</h2>
            <p>
              Estes termos são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas serão resolvidas no foro da comarca de São Paulo/SP, com exclusão de qualquer outro por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contato</h2>
            <p>
              Dúvidas sobre estes termos? Entre em contato:{' '}
              <a href="mailto:suporte@jarbis.cc" className="text-violet-600 hover:underline">suporte@jarbis.cc</a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer simples */}
      <footer className="border-t border-gray-100 px-6 py-8 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2026 Mazzel Tech. Todos os direitos reservados.</span>
          <div className="flex gap-6">
            <Link href="/termos" className="hover:text-gray-700 transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-gray-700 transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
