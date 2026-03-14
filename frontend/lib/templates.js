/**
 * Templates prontos de dashboard.
 * Blocos com static_data exibem dados de exemplo até o usuário conectar um dataset real.
 */

let _id = 1
function bid() { return `tpl_block_${_id++}_${Math.random().toString(36).slice(2, 7)}` }

// ── Dados de exemplo reutilizáveis ────────────────────────────────────────────

const MESES   = [{ label: 'Jan', value: 84200 }, { label: 'Fev', value: 91500 }, { label: 'Mar', value: 78300 }, { label: 'Abr', value: 105600 }, { label: 'Mai', value: 112400 }, { label: 'Jun', value: 98700 }, { label: 'Jul', value: 121300 }, { label: 'Ago', value: 134900 }, { label: 'Set', value: 118600 }, { label: 'Out', value: 143200 }, { label: 'Nov', value: 156800 }, { label: 'Dez', value: 189400 }]
const PRODUTOS = [{ label: 'Produto A', value: 342000 }, { label: 'Produto B', value: 218500 }, { label: 'Produto C', value: 187900 }, { label: 'Produto D', value: 145300 }, { label: 'Produto E', value: 98700 }]
const CATEGORIAS = [{ label: 'Eletrônicos', value: 342000 }, { label: 'Vestuário', value: 218500 }, { label: 'Casa', value: 187900 }, { label: 'Esporte', value: 145300 }, { label: 'Outros', value: 98700 }]
const CANAIS = [{ label: 'TV', value: 1850000 }, { label: 'Digital', value: 1240000 }, { label: 'OOH', value: 680000 }, { label: 'Rádio', value: 420000 }, { label: 'Impresso', value: 210000 }]
const VEICULOS = [{ label: 'Globo', value: 780000 }, { label: 'SBT', value: 520000 }, { label: 'Google Ads', value: 490000 }, { label: 'Meta Ads', value: 380000 }, { label: 'Band', value: 310000 }, { label: 'Record', value: 290000 }]
const REGIOES = [{ label: 'SP', value: 1240000 }, { label: 'RJ', value: 680000 }, { label: 'MG', value: 420000 }, { label: 'RS', value: 310000 }, { label: 'PR', value: 280000 }]

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
      { id: bid(), type: 'kpi',   title: 'Receita Total',       dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 1234500 }], config: { accent_color: '#10b981', size: '4xl', format: 'currency' }, layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Total de Pedidos',    dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 4821 }],    config: { accent_color: '#6366f1', size: '4xl' },                       layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Ticket Médio',        dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 256 }],     config: { accent_color: '#f59e0b', size: '4xl', format: 'currency' },   layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Únicos',     dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1893 }],    config: { accent_color: '#8b5cf6', size: '4xl' },                       layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar',   title: 'Receita por Produto', dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                             config: { format: 'currency' },                                         layout: { x: 0, y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'line',  title: 'Tendência Mensal',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { format: 'currency', color: '#10b981' },                        layout: { x: 6, y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Mix por Categoria',   dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                           config: {},                                                              layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento',        dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                             config: {},                                                              layout: { x: 4, y: 6, w: 8, h: 4 } },
    ],
  },

  {
    id: 'media',
    title: 'Performance de Mídia',
    description: 'Investimento por canal, distribuição de verba e ranking de veículos.',
    icon: '📡',
    color: 'bg-violet-50',
    tags: ['mídia', 'investimento', 'agência'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Investimento Total',      dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4400000 }], config: { accent_color: '#6366f1', size: '4xl', format: 'currency' }, layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Número de PIs',           dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 312 }],      config: { accent_color: '#8b5cf6', size: '4xl' },                     layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Veículos Ativos',         dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 48 }],       config: { accent_color: '#06b6d4', size: '4xl' },                     layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Atendidos',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 23 }],       config: { accent_color: '#10b981', size: '4xl' },                     layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Investimento por Meio',   dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                               config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Top Veículos',            dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: VEICULOS,                             config: { format: 'currency' },                                        layout: { x: 4, y: 2, w: 8, h: 4 } },
      { id: bid(), type: 'area',  title: 'Evolução do Investimento',dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { format: 'currency', color: '#6366f1' },                      layout: { x: 0, y: 6, w: 8, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento por Canal',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                               config: { format: 'currency' },                                        layout: { x: 8, y: 6, w: 4, h: 4 } },
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
      { id: bid(), type: 'text',  title: 'Sumário Executivo',    config: { text: 'Insira aqui o sumário do período analisado...', text_color: '#374151' },                                                 layout: { x: 0, y: 0, w: 12, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Resultado Principal',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 8750000 }], config: { accent_color: '#111827', size: '4xl', format: 'currency' }, layout: { x: 0, y: 2, w: 4, h: 3 } },
      { id: bid(), type: 'kpi',   title: 'Volume',               dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 14230 }],   config: { accent_color: '#6366f1', size: '4xl' },                     layout: { x: 4, y: 2, w: 4, h: 3 } },
      { id: bid(), type: 'kpi',   title: 'Crescimento',          dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 18.4 }],    config: { accent_color: '#10b981', size: '4xl', format: 'percent' },  layout: { x: 8, y: 2, w: 4, h: 3 } },
      { id: bid(), type: 'area',  title: 'Evolução no Período',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { color: '#6366f1', format: 'currency' },                      layout: { x: 0, y: 5, w: 8, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Composição',           dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                           config: {},                                                            layout: { x: 8, y: 5, w: 4, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Comparativo Regional', dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: REGIOES,                              config: {},                                                            layout: { x: 0, y: 9, w: 12, h: 4 } },
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
      { id: bid(), type: 'filter', title: 'Filtrar por Período', filter_col: null, filter_label: 'Período', dataset_id: null, config: {},                                                                   layout: { x: 0, y: 0, w: 4, h: 2 } },
      { id: bid(), type: 'filter', title: 'Filtrar por Canal',   filter_col: null, filter_label: 'Canal',   dataset_id: null, config: {},                                                                   layout: { x: 4, y: 0, w: 4, h: 2 } },
      { id: bid(), type: 'filter', title: 'Filtrar por Região',  filter_col: null, filter_label: 'Região',  dataset_id: null, config: {},                                                                   layout: { x: 8, y: 0, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Verba Investida',      dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 2850000 }], config: { accent_color: '#f59e0b', size: '4xl', format: 'currency' }, layout: { x: 0, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Inserções / GRPs',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4812 }],    config: { accent_color: '#6366f1', size: '4xl' },                     layout: { x: 4, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Cobertura',            dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 72.3 }],    config: { accent_color: '#10b981', size: '4xl', format: 'percent' },  layout: { x: 8, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'bar',   title: 'Verba por Veículo',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: VEICULOS,                             config: { format: 'currency' },                                        layout: { x: 0, y: 4, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Mix de Canais',        dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                               config: {},                                                            layout: { x: 6, y: 4, w: 6, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento por Praça',dataset_id: null, label_col: null, value_col: null, agg: 'sum',  static_data: REGIOES,                              config: { format: 'currency' },                                        layout: { x: 0, y: 8, w: 12, h: 4 } },
    ],
  },
]
