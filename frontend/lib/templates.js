/**
 * Templates prontos de dashboard.
 * Cada template define título, descrição, blocos e layout.
 * Os blocos têm dataset_id=null para o usuário conectar os dados.
 */

let _id = 1
function bid() { return `tpl_block_${_id++}_${Math.random().toString(36).slice(2, 7)}` }

export const TEMPLATES = [
  {
    id: 'blank',
    title: 'Em branco',
    description: 'Comece do zero e adicione blocos manualmente.',
    icon: '📄',
    color: 'bg-gray-100',
    tags: [],
    blocks: [],
  },

  {
    id: 'sales',
    title: 'Análise de Vendas',
    description: 'KPIs de receita, volume por produto, tendência mensal e tabela de detalhes.',
    icon: '📊',
    color: 'bg-green-50',
    tags: ['vendas', 'receita'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Receita Total',       dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { accent_color: '#10b981', size: '4xl', format: 'currency' }, layout: { x: 0,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Total de Pedidos',    dataset_id: null, label_col: null, value_col: null, agg: 'count', config: { accent_color: '#6366f1', size: '4xl' },                       layout: { x: 3,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Ticket Médio',        dataset_id: null, label_col: null, value_col: null, agg: 'avg',   config: { accent_color: '#f59e0b', size: '4xl', format: 'currency' },   layout: { x: 6,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Únicos',     dataset_id: null, label_col: null, value_col: null, agg: 'count', config: { accent_color: '#8b5cf6', size: '4xl' },                       layout: { x: 9,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar',   title: 'Receita por Produto', dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { format: 'currency' },                                         layout: { x: 0,  y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'line',  title: 'Tendência Mensal',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { format: 'currency', color: '#10b981' },                       layout: { x: 6,  y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Mix por Categoria',   dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: {},                                                              layout: { x: 0,  y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento',        dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: {},                                                              layout: { x: 4,  y: 6, w: 8, h: 4 } },
    ],
  },

  {
    id: 'media',
    title: 'Performance de Mídia',
    description: 'Investimento por canal, distribuição de verba e ranking de veículos.',
    icon: '📡',
    color: 'bg-indigo-50',
    tags: ['mídia', 'investimento', 'agência'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Investimento Total',   dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { accent_color: '#6366f1', size: '4xl', format: 'currency' }, layout: { x: 0,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Número de PIs',        dataset_id: null, label_col: null, value_col: null, agg: 'count', config: { accent_color: '#8b5cf6', size: '4xl' },                     layout: { x: 3,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Veículos Ativos',      dataset_id: null, label_col: null, value_col: null, agg: 'count', config: { accent_color: '#06b6d4', size: '4xl' },                     layout: { x: 6,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Atendidos',   dataset_id: null, label_col: null, value_col: null, agg: 'count', config: { accent_color: '#10b981', size: '4xl' },                     layout: { x: 9,  y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Investimento por Meio', dataset_id: null, label_col: null, value_col: null, agg: 'sum',  config: { format: 'currency' },                                        layout: { x: 0,  y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Top Veículos',         dataset_id: null, label_col: null, value_col: null, agg: 'sum',  config: { format: 'currency' },                                        layout: { x: 4,  y: 2, w: 8, h: 4 } },
      { id: bid(), type: 'area',  title: 'Evolução do Investimento', dataset_id: null, label_col: null, value_col: null, agg: 'sum', config: { format: 'currency', color: '#6366f1' },                   layout: { x: 0,  y: 6, w: 8, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento por Cliente', dataset_id: null, label_col: null, value_col: null, agg: 'sum', config: { format: 'currency' },                                      layout: { x: 8,  y: 6, w: 4, h: 4 } },
    ],
  },

  {
    id: 'executive',
    title: 'Relatório Executivo',
    description: 'Visão consolidada para apresentações de diretoria com KPIs, tendência e análise comparativa.',
    icon: '🎯',
    color: 'bg-purple-50',
    tags: ['executivo', 'diretoria'],
    blocks: [
      { id: bid(), type: 'text',  title: 'Sumário Executivo',    config: { text: 'Insira aqui o sumário do período analisado...', text_color: '#374151' },                                               layout: { x: 0,  y: 0, w: 12, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Resultado Principal',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { accent_color: '#111827', size: '4xl', format: 'currency' }, layout: { x: 0,  y: 2, w: 4, h: 3 } },
      { id: bid(), type: 'kpi',   title: 'Volume',               dataset_id: null, label_col: null, value_col: null, agg: 'count', config: { accent_color: '#6366f1', size: '4xl' },                     layout: { x: 4,  y: 2, w: 4, h: 3 } },
      { id: bid(), type: 'kpi',   title: 'Crescimento',          dataset_id: null, label_col: null, value_col: null, agg: 'avg',   config: { accent_color: '#10b981', size: '4xl', format: 'percent' },  layout: { x: 8,  y: 2, w: 4, h: 3 } },
      { id: bid(), type: 'area',  title: 'Evolução no Período',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { color: '#6366f1', format: 'currency' },                     layout: { x: 0,  y: 5, w: 8, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Composição',           dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: {},                                                            layout: { x: 8,  y: 5, w: 4, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Comparativo',          dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: {},                                                            layout: { x: 0,  y: 9, w: 12, h: 4 } },
    ],
  },

  {
    id: 'campaign',
    title: 'Acompanhamento de Campanha',
    description: 'Monitore uma campanha específica com filtros dinâmicos, KPIs e métricas por veículo.',
    icon: '📣',
    color: 'bg-orange-50',
    tags: ['campanha', 'acompanhamento'],
    blocks: [
      { id: bid(), type: 'filter', title: 'Filtrar por Período', filter_col: null, filter_label: 'Período', dataset_id: null, config: {},                                                                  layout: { x: 0,  y: 0, w: 4, h: 2 } },
      { id: bid(), type: 'filter', title: 'Filtrar por Canal',   filter_col: null, filter_label: 'Canal',   dataset_id: null, config: {},                                                                  layout: { x: 4,  y: 0, w: 4, h: 2 } },
      { id: bid(), type: 'filter', title: 'Filtrar por Região',  filter_col: null, filter_label: 'Região',  dataset_id: null, config: {},                                                                  layout: { x: 8,  y: 0, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Verba Investida',      dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { accent_color: '#f59e0b', size: '4xl', format: 'currency' }, layout: { x: 0,  y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Inserções / GRPs',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { accent_color: '#6366f1', size: '4xl' },                     layout: { x: 4,  y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Cobertura',            dataset_id: null, label_col: null, value_col: null, agg: 'avg',   config: { accent_color: '#10b981', size: '4xl', format: 'percent' },  layout: { x: 8,  y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'bar',   title: 'Verba por Veículo',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: { format: 'currency' },                                        layout: { x: 0,  y: 4, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Mix de Canais',        dataset_id: null, label_col: null, value_col: null, agg: 'sum',   config: {},                                                            layout: { x: 6,  y: 4, w: 6, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento por Praça', dataset_id: null, label_col: null, value_col: null, agg: 'sum', config: { format: 'currency' },                                        layout: { x: 0,  y: 8, w: 12, h: 4 } },
    ],
  },
]
