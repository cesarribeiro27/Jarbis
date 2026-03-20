"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { api } from "@/lib/api";

export default function QueryLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetch("/reports/query-logs").then(r => {
      setLogs(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statusColor = (s) => s === "ok" ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Query Logs</h1>
        {loading ? (
          <div className="text-gray-500">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Nenhum log registrado ainda.</p>
            <p className="text-sm mt-1">Os logs aparecerão aqui conforme você usar datasets.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dataset</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linhas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cache</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{l.dataset_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{l.query_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{l.duration_ms != null ? `${l.duration_ms}ms` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{l.rows_returned ?? "—"}</td>
                    <td className="px-4 py-3">
                      {l.cached ? <span className="text-purple-600 text-xs font-medium">cache</span> : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
