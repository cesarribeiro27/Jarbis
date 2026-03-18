import Link from 'next/link'
import { LogoA } from '@/components/logos/JarbisLogo'

export const metadata = {
  title: 'Política de Privacidade — Jarbis',
  description: 'Como o Jarbis coleta, usa e protege seus dados pessoais.',
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar simples */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoA size={28} />
            <span className="font-black text-[17px] tracking-tight text-gray-900">jarbis</span>
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
          <h1 className="text-4xl font-black text-gray-900 mb-4">Política de Privacidade</h1>
          <p className="text-gray-500 text-sm">Última atualização: 18 de março de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introdução</h2>
            <p>
              A Mazzel Tech, responsável pela plataforma Jarbis, está comprometida com a proteção de seus dados pessoais. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Dados que Coletamos</h2>
            <p>Coletamos as seguintes categorias de dados:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Dados de cadastro:</strong> nome, e-mail, senha (criptografada), nome da empresa;</li>
              <li><strong>Dados de uso:</strong> dashboards criados, datasets carregados, frequência de acesso, funcionalidades utilizadas;</li>
              <li><strong>Dados de pagamento:</strong> processados pelo Stripe — não armazenamos dados de cartão;</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional, logs de acesso;</li>
              <li><strong>Cookies:</strong> essenciais para autenticação e preferências do usuário.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Como Usamos seus Dados</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Fornecer e manter o serviço contratado;</li>
              <li>Processar pagamentos e gerenciar assinaturas;</li>
              <li>Enviar comunicações sobre sua conta, atualizações e novidades do produto;</li>
              <li>Analisar o uso da plataforma para melhorar funcionalidades;</li>
              <li>Prevenir fraudes e garantir a segurança da plataforma;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Base Legal (LGPD)</h2>
            <p>O tratamento de seus dados se baseia nas seguintes hipóteses legais:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Execução de contrato:</strong> para fornecer os serviços contratados;</li>
              <li><strong>Legítimo interesse:</strong> para segurança, prevenção de fraudes e melhoria do serviço;</li>
              <li><strong>Consentimento:</strong> para envio de comunicações de marketing (você pode revogar a qualquer momento);</li>
              <li><strong>Obrigação legal:</strong> quando exigido por lei.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Compartilhamento de Dados</h2>
            <p>
              Não vendemos seus dados. Compartilhamos informações apenas com parceiros necessários para operar o serviço:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Stripe:</strong> processamento de pagamentos;</li>
              <li><strong>Railway:</strong> infraestrutura de servidores (backend);</li>
              <li><strong>Vercel:</strong> infraestrutura de servidores (frontend);</li>
              <li><strong>Resend:</strong> envio de e-mails transacionais.</li>
            </ul>
            <p className="mt-3">Todos os parceiros seguem políticas de privacidade compatíveis com a LGPD e GDPR.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Armazenamento e Segurança</h2>
            <p>
              Seus dados são armazenados em servidores seguros hospedados na América do Norte e Europa. Utilizamos criptografia TLS em trânsito e AES-256 em repouso para dados sensíveis. Senhas são armazenadas com hash bcrypt. Realizamos auditorias de segurança periodicamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pelo período necessário para prestar o serviço. Após o cancelamento da conta, seus dados são excluídos em até 90 dias, exceto quando a retenção for exigida por lei (ex.: dados fiscais, por até 5 anos).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Seus Direitos (LGPD)</h2>
            <p>Como titular dos dados, você tem direito a:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Confirmar a existência de tratamento de seus dados;</li>
              <li>Acessar seus dados pessoais;</li>
              <li>Corrigir dados incorretos ou desatualizados;</li>
              <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Portabilidade dos dados a outro fornecedor;</li>
              <li>Revogar consentimento a qualquer momento;</li>
              <li>Opor-se ao tratamento realizado com base em legítimo interesse.</li>
            </ul>
            <p className="mt-3">
              Para exercer seus direitos, entre em contato: <a href="mailto:suporte@jarbis.cc" className="text-violet-600 hover:underline">suporte@jarbis.cc</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento de terceiros para fins publicitários. Você pode configurar seu navegador para bloquear cookies, mas isso pode afetar o funcionamento do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Menores de Idade</h2>
            <p>
              O Jarbis não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se identificarmos que dados de um menor foram coletados sem consentimento parental, os excluiremos imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Atualizações desta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. A versão mais recente estará sempre disponível nesta página. Mudanças relevantes serão comunicadas por e-mail com pelo menos 15 dias de antecedência.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Encarregado de Dados (DPO)</h2>
            <p>
              Responsável pela proteção de dados (DPO):<br />
              <strong>Mazzel Tech</strong><br />
              E-mail: <a href="mailto:suporte@jarbis.cc" className="text-violet-600 hover:underline">suporte@jarbis.cc</a>
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
