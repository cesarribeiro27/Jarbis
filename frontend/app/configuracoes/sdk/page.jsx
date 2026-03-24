"use client";
import AppLayout from "@/components/AppLayout";

export default function SDKPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SDK React</h1>
        <p className="text-gray-500 mb-6">Embeba dashboards Jarbis em qualquer aplicação React.</p>

        <div className="space-y-6">
          {/* Installation */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">1. Instalação</h2>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm font-mono overflow-x-auto">
              npm install @jarbis/react-embed
            </pre>
          </div>

          {/* Usage */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">2. Uso básico</h2>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre">{`import { JarbisDashboard } from '@jarbis/react-embed';

export default function App() {
  return (
    <JarbisDashboard
      token="seu-token-de-embed"
      height={600}
    />
  );
}`}</pre>
          </div>

          {/* With filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">3. Com filtros e eventos</h2>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre">{`<JarbisDashboard
  token="seu-token"
  height={500}
  filters={{ regiao: "Sul", ano: "2024" }}
  onEvent={(event) => {
    console.log("Clicou em:", event.label, event.value);
  }}
/>`}</pre>
          </div>

          {/* Props table */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">4. Props disponíveis</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600">Prop</th>
                  <th className="text-left py-2 text-gray-600">Tipo</th>
                  <th className="text-left py-2 text-gray-600">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['token', 'string', 'Token de embed (obrigatório)'],
                  ['host', 'string', 'URL base do Jarbis (padrão: jarbis.cc)'],
                  ['height', 'number | string', 'Altura do iframe (padrão: 600)'],
                  ['width', 'number | string', 'Largura do iframe (padrão: 100%)'],
                  ['theme', "'light' | 'dark'", 'Tema de cores'],
                  ['filters', 'Record<string, string>', 'Filtros pré-aplicados'],
                  ['onEvent', 'function', 'Callback ao clicar em elementos'],
                  ['className', 'string', 'Classe CSS do container'],
                ].map(([prop, type, desc]) => (
                  <tr key={prop}>
                    <td className="py-2 font-mono text-purple-700">{prop}</td>
                    <td className="py-2 text-gray-500 font-mono text-xs">{type}</td>
                    <td className="py-2 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
