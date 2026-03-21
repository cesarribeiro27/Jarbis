'use client'

import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function TableExample({ title, badge, badgeColor, headers, rows, note }) {
  const colors = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${colors[badgeColor]}`}>{badge}</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-1.5 text-[11px] text-gray-400 italic">{note}</p>}
    </div>
  )
}

export default function BoasPraticasPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/datasets" className="text-sm text-gray-400 hover:text-violet-600 transition-colors">Fontes</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">Boas práticas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Como estruturar seus dados</h1>
          <p className="text-gray-500">O Jarbis funciona melhor com dados em formato tabular — linhas e colunas, como uma tabela de banco de dados. Esta página explica o que funciona bem e o que evitar.</p>
        </div>

        {/* O que é um banco de dados */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">O que o Jarbis considera "banco de dados"</h2>
          <p className="text-sm text-gray-500 mb-4">Uma planilha com estrutura de banco de dados tem uma linha de cabeçalho seguida de linhas de dados — cada linha é um registro, cada coluna é um atributo.</p>

          <TableExample
            title="Estrutura ideal"
            badge="Funciona perfeitamente"
            badgeColor="green"
            headers={['Data', 'Cliente', 'Produto', 'Valor (R$)', 'Quantidade', 'Status']}
            rows={[
              ['2024-01-15', 'Empresa A', 'Plano Pro', '297,00', '1', 'Pago'],
              ['2024-01-16', 'Empresa B', 'Plano Essential', '97,00', '1', 'Pago'],
              ['2024-01-17', 'Empresa C', 'Plano Pro', '297,00', '1', 'Pendente'],
              ['2024-01-18', 'Empresa A', 'Add-on IA', '19,00', '2', 'Pago'],
            ]}
            note="Cada linha = 1 transação. Colunas com tipos consistentes. Sem fórmulas de soma/total."
          />
        </section>

        {/* Regras */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Regras para um bom banco de dados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { ok: true, text: 'Primeira linha com nomes das colunas (cabeçalho)' },
              { ok: true, text: 'Uma linha por registro/transação/evento' },
              { ok: true, text: 'Cada coluna com um tipo de dado consistente' },
              { ok: true, text: 'Datas no formato YYYY-MM-DD ou DD/MM/YYYY' },
              { ok: true, text: 'Valores numéricos sem símbolo de moeda (ou com R$)' },
              { ok: true, text: 'Células vazias para dados ausentes (não "N/A" manual)' },
              { ok: false, text: 'Linhas de totais ou subtotais misturadas nos dados' },
              { ok: false, text: 'Células mescladas horizontalmente ou verticalmente' },
              { ok: false, text: 'Cabeçalhos em múltiplas linhas' },
              { ok: false, text: 'Colunas com tipos mistos (texto e número na mesma)' },
              { ok: false, text: 'Fórmulas que referenciam outras abas não exportadas' },
              { ok: false, text: 'Abas de dashboard/gráfico usadas como fonte de dados' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                {item.ok ? <CheckIcon /> : <XIcon />}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* O que evitar */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Exemplos do que evitar</h2>
          <div className="flex flex-col gap-6">
            <TableExample
              title="Linha de total misturada"
              badge="Não funciona"
              badgeColor="red"
              headers={['Mês', 'Receita', 'Clientes']}
              rows={[
                ['Janeiro', '10.000', '15'],
                ['Fevereiro', '12.000', '18'],
                ['TOTAL', '22.000', '33'],
              ]}
              note="A linha TOTAL vai ser tratada como mais um mês, distorcendo somas e médias."
            />

            <TableExample
              title="Cabeçalho em múltiplas linhas"
              badge="Não funciona"
              badgeColor="red"
              headers={['', 'Janeiro', 'Fevereiro', 'Março']}
              rows={[
                ['Receita', '10.000', '12.000', '9.000'],
                ['Custos', '6.000', '7.000', '5.500'],
                ['Lucro', '4.000', '5.000', '3.500'],
              ]}
              note="Formato de tabela dinâmica — o Jarbis não consegue identificar as dimensões corretamente."
            />

            <TableExample
              title="Estrutura correta do mesmo exemplo"
              badge="Funciona"
              badgeColor="green"
              headers={['Mês', 'Tipo', 'Valor']}
              rows={[
                ['2024-01', 'Receita', '10000'],
                ['2024-01', 'Custos', '6000'],
                ['2024-01', 'Lucro', '4000'],
                ['2024-02', 'Receita', '12000'],
                ['2024-02', 'Custos', '7000'],
              ]}
              note="Formato normalizado (long format) — cada linha é um fato, não uma coluna por período."
            />
          </div>
        </section>

        {/* Tipos de coluna */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Tipos de coluna suportados</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: '#',
                color: 'bg-blue-50 text-blue-600',
                title: 'Número',
                examples: ['1234.56', 'R$ 1.234,56', '1,234.56', '45%'],
                note: 'Símbolos de moeda e formatos BR/US são convertidos automaticamente.',
              },
              {
                icon: 'Aa',
                color: 'bg-violet-50 text-violet-600',
                title: 'Texto',
                examples: ['São Paulo', 'Empresa ABC', 'Pago', 'SIM/NAO'],
                note: 'Usado para dimensões: cliente, categoria, status, cidade.',
              },
              {
                icon: '📅',
                color: 'bg-emerald-50 text-emerald-600',
                title: 'Data',
                examples: ['2024-01-15', '15/01/2024', '01/2024', '2024-01'],
                note: 'O Jarbis detecta automaticamente e agrupa por dia, mês, trimestre ou ano.',
              },
            ].map((t) => (
              <div key={t.title} className="border border-gray-200 rounded-xl p-4">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold mb-3 ${t.color}`}>{t.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-2">{t.title}</h3>
                <div className="flex flex-wrap gap-1 mb-2">
                  {t.examples.map(ex => (
                    <code key={ex} className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{ex}</code>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">{t.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Múltiplas abas */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Google Sheets / Excel com múltiplas abas</h2>
          <p className="text-sm text-gray-500 mb-4">É comum ter uma planilha com abas mistas — algumas com dados brutos e outras com análises. O Jarbis identifica automaticamente qual aba parece um banco de dados.</p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Exemplo de planilha com múltiplas abas</p>
            <div className="flex flex-col gap-2">
              {[
                { name: 'BASE_LIMPA', type: 'data', desc: '312 linhas · 15 colunas · banco de dados', suggested: true },
                { name: 'BASE_DADOS', type: 'data', desc: '450 linhas · 15 colunas · banco de dados', suggested: false },
                { name: 'ANALISE', type: 'summary', desc: '8 linhas · parece resumo analítico', suggested: false },
                { name: 'DASHBOARD', type: 'empty', desc: 'Vazia ou apenas visual', suggested: false },
                { name: 'CLIENTES', type: 'summary', desc: '12 linhas · parece tabela resumo', suggested: false },
              ].map(s => (
                <div key={s.name} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${s.type === 'data' ? 'border-violet-200 bg-violet-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{s.name}</span>
                    {s.suggested && <span className="text-[10px] text-emerald-600 font-medium">✦ sugerida</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{s.desc}</span>
                    {s.type === 'data' && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">banco de dados</span>}
                    {s.type === 'summary' && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">resumo</span>}
                    {s.type === 'empty' && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-full font-medium">vazia</span>}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-400">O Jarbis sugere automaticamente a aba marcada com ✦. Você pode escolher outra se preferir.</p>
          </div>
        </section>

        {/* CTA */}
        <div className="flex items-center justify-between p-5 bg-violet-50 border border-violet-200 rounded-2xl">
          <div>
            <p className="font-semibold text-violet-800">Pronto para importar seus dados?</p>
            <p className="text-sm text-violet-600 mt-0.5">Conecte uma planilha ou faça upload de um CSV/Excel.</p>
          </div>
          <Link href="/datasets" className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap">
            Ir para Fontes
          </Link>
        </div>

      </div>
    </AppLayout>
  )
}
