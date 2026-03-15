/**
 * Templates prontos de dashboard.
 * Blocos com static_data exibem dados de exemplo até o usuário conectar um dataset real.
 */

let _id = 1
function bid() { return `tpl_block_${_id++}_${Math.random().toString(36).slice(2, 7)}` }

// ── Dados de exemplo reutilizáveis ────────────────────────────────────────────

const MESES     = [{ label: 'Jan', value: 84200 }, { label: 'Fev', value: 91500 }, { label: 'Mar', value: 78300 }, { label: 'Abr', value: 105600 }, { label: 'Mai', value: 112400 }, { label: 'Jun', value: 98700 }, { label: 'Jul', value: 121300 }, { label: 'Ago', value: 134900 }, { label: 'Set', value: 118600 }, { label: 'Out', value: 143200 }, { label: 'Nov', value: 156800 }, { label: 'Dez', value: 189400 }]
const PRODUTOS  = [{ label: 'Produto A', value: 342000 }, { label: 'Produto B', value: 218500 }, { label: 'Produto C', value: 187900 }, { label: 'Produto D', value: 145300 }, { label: 'Produto E', value: 98700 }]
const CATEGORIAS= [{ label: 'Eletrônicos', value: 342000 }, { label: 'Vestuário', value: 218500 }, { label: 'Casa', value: 187900 }, { label: 'Esporte', value: 145300 }, { label: 'Outros', value: 98700 }]
const CANAIS    = [{ label: 'TV', value: 1850000 }, { label: 'Digital', value: 1240000 }, { label: 'OOH', value: 680000 }, { label: 'Rádio', value: 420000 }, { label: 'Impresso', value: 210000 }]
const VEICULOS  = [{ label: 'Globo', value: 780000 }, { label: 'SBT', value: 520000 }, { label: 'Google Ads', value: 490000 }, { label: 'Meta Ads', value: 380000 }, { label: 'Band', value: 310000 }, { label: 'Record', value: 290000 }]
const REGIOES   = [{ label: 'SP', value: 1240000 }, { label: 'RJ', value: 680000 }, { label: 'MG', value: 420000 }, { label: 'RS', value: 310000 }, { label: 'PR', value: 280000 }]
const ETAPAS    = [{ label: 'Leads', value: 1840 }, { label: 'Qualificados', value: 920 }, { label: 'Proposta', value: 410 }, { label: 'Negociação', value: 210 }, { label: 'Fechado', value: 95 }]
const PAGINAS   = [{ label: '/home', value: 42800 }, { label: '/produto', value: 31200 }, { label: '/planos', value: 18900 }, { label: '/blog', value: 14300 }, { label: '/contato', value: 7600 }]
const EQUIPE    = [{ label: 'Ana', value: 48 }, { label: 'Bruno', value: 62 }, { label: 'Carla', value: 55 }, { label: 'Diego', value: 71 }, { label: 'Elisa', value: 44 }]
const TICKETS   = [{ label: 'Aberto', value: 34 }, { label: 'Em andamento', value: 21 }, { label: 'Aguardando', value: 12 }, { label: 'Resolvido', value: 143 }]
const ESTOQUE   = [{ label: 'Disponível', value: 4820 }, { label: 'Reservado', value: 1230 }, { label: 'Em trânsito', value: 680 }, { label: 'Avariado', value: 45 }]
const CURSOS    = [{ label: 'React', value: 85 }, { label: 'Python', value: 72 }, { label: 'Design', value: 60 }, { label: 'SQL', value: 91 }, { label: 'Gestão', value: 78 }]
const RECEITAS  = [{ label: 'Jan', value: 420000 }, { label: 'Fev', value: 385000 }, { label: 'Mar', value: 510000 }, { label: 'Abr', value: 475000 }, { label: 'Mai', value: 590000 }, { label: 'Jun', value: 630000 }]
const DESPESAS  = [{ label: 'Pessoal', value: 210000 }, { label: 'Marketing', value: 85000 }, { label: 'Infra', value: 42000 }, { label: 'Adm', value: 31000 }, { label: 'Outros', value: 18000 }]
const PROJETOS  = [{ label: 'Alpha', value: 1200000 }, { label: 'Beta', value: 780000 }, { label: 'Gamma', value: 540000 }, { label: 'Delta', value: 320000 }]

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

  // ── Vendas ────────────────────────────────────────────────────────────────

  {
    id: 'sales_trends',
    title: 'Tendências de Vendas',
    description: 'KPIs de receita, tendência mensal com combo chart, volume por produto e mix de categorias.',
    icon: '📈',
    color: 'bg-violet-50',
    tags: ['vendas', 'receita', 'tendência'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Receita Total',        dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 1234500 }],  config: { accent_color: '#10b981', size: '4xl', format: 'currency' }, layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Total de Pedidos',     dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 4821 }],     config: { accent_color: '#6366f1', size: '4xl' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Ticket Médio',         dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 256 }],      config: { accent_color: '#f59e0b', size: '4xl', format: 'currency' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Únicos',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1893 }],     config: { accent_color: '#8b5cf6', size: '4xl' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'combo', title: 'Receita + Tendência',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 8, h: 5 } },
      { id: bid(), type: 'pie',   title: 'Mix por Categoria',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 8, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'bar',   title: 'Receita por Produto',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 7, w: 6, h: 5 } },
      { id: bid(), type: 'table', title: 'Detalhamento',         dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: {},                                                            layout: { x: 6, y: 7, w: 6, h: 5 } },
    ],
  },

  {
    id: 'sales_pipeline',
    title: 'Pipeline de Vendas',
    description: 'Funil de conversão, KPIs de oportunidade, evolução do pipeline e ranking de produtos.',
    icon: '🚀',
    color: 'bg-blue-50',
    tags: ['vendas', 'pipeline', 'funil', 'crm'],
    badges: ['vendas'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Leads Ativos',         dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1840 }],     config: { accent_color: '#3b82f6', size: '4xl' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Conversão',    dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 5.2 }],      config: { accent_color: '#10b981', size: '4xl', format: 'percent' },   layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Valor do Pipeline',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4200000 }],  config: { accent_color: '#6366f1', size: '4xl', format: 'currency' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Negócios Fechados',    dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 95 }],       config: { accent_color: '#f59e0b', size: '4xl' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar_h', title: 'Funil de Conversão',   dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: ETAPAS,                                config: {},                                                            layout: { x: 0, y: 2, w: 5, h: 5 } },
      { id: bid(), type: 'line',  title: 'Evolução do Pipeline', dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { format: 'currency', color: '#3b82f6' },                       layout: { x: 5, y: 2, w: 7, h: 5 } },
      { id: bid(), type: 'table', title: 'Oportunidades Abertas',dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 7, w: 12, h: 5 } },
    ],
  },

  {
    id: 'vendas_avancado',
    title: 'Vendas Avançado',
    description: 'Análise aprofundada com Treemap de portfólio, bolhas de correlação, combo e gauge de meta.',
    icon: '🎯',
    color: 'bg-purple-50',
    tags: ['vendas', 'avançado', 'correlação'],
    badges: ['novo'],
    blocks: [
      { id: bid(), type: 'kpi',         title: 'Receita',              dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 5820000 }], config: { accent_color: '#7c3aed', size: '4xl', format: 'currency' },  layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'Meta do Mês',          dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 6000000 }], config: { accent_color: '#6366f1', size: '4xl', format: 'currency' },  layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'speedometer', title: 'Atingimento da Meta',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 82 }],      config: { gauge_max: 100, color: '#7c3aed', format: 'percent' },        layout: { x: 6, y: 0, w: 3, h: 4 } },
      { id: bid(), type: 'gauge',       title: 'Satisfação NPS',       dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 78 }],      config: { gauge_max: 100, color: '#10b981', format: 'percent' },        layout: { x: 9, y: 0, w: 3, h: 4 } },
      { id: bid(), type: 'treemap',     title: 'Portfólio por Receita',dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                             config: {},                                                            layout: { x: 0, y: 2, w: 6, h: 5 } },
      { id: bid(), type: 'combo',       title: 'Volume + Receita',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { format: 'currency' },                                        layout: { x: 0, y: 7, w: 12, h: 5 } },
    ],
  },

  // ── E-commerce / Digital ───────────────────────────────────────────────────

  {
    id: 'ecommerce',
    title: 'E-commerce',
    description: 'Métricas de loja online: pedidos, conversão, produtos mais vendidos e receita por categoria.',
    icon: '🛒',
    color: 'bg-orange-50',
    tags: ['e-commerce', 'loja', 'produtos'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Pedidos do Mês',       dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 3842 }],     config: { accent_color: '#f97316', size: '4xl' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Receita',              dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 984200 }],   config: { accent_color: '#10b981', size: '4xl', format: 'currency' },  layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Ticket Médio',         dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 256 }],      config: { accent_color: '#6366f1', size: '4xl', format: 'currency' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Conversão',    dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 3.4 }],      config: { accent_color: '#f59e0b', size: '4xl', format: 'percent' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'combo', title: 'Pedidos + Receita',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 7, h: 5 } },
      { id: bid(), type: 'pie',   title: 'Receita por Categoria',dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 7, y: 2, w: 5, h: 5 } },
      { id: bid(), type: 'bar',   title: 'Top Produtos',         dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 7, w: 6, h: 5 } },
      { id: bid(), type: 'table', title: 'Produtos Detalhados',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 6, y: 7, w: 6, h: 5 } },
    ],
  },

  {
    id: 'web_analytics',
    title: 'Análise Web',
    description: 'Sessões, usuários, bounceRate, páginas mais visitadas e fontes de tráfego.',
    icon: '🌐',
    color: 'bg-sky-50',
    tags: ['web', 'analytics', 'tráfego', 'seo'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Sessões',              dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 124800 }],   config: { accent_color: '#0ea5e9', size: '4xl' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Usuários Únicos',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 89400 }],    config: { accent_color: '#6366f1', size: '4xl' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Pageviews',            dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 312000 }],   config: { accent_color: '#8b5cf6', size: '4xl' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Rejeição',     dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 42.3 }],     config: { accent_color: '#f43f5e', size: '4xl', format: 'percent' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'area',  title: 'Sessões no Tempo',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#0ea5e9' },                                           layout: { x: 0, y: 2, w: 8, h: 5 } },
      { id: bid(), type: 'pie',   title: 'Fontes de Tráfego',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                                config: {},                                                            layout: { x: 8, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'bar_h', title: 'Páginas Mais Visitadas',dataset_id: null, label_col: null, value_col: null, agg: 'sum',  static_data: PAGINAS,                               config: {},                                                            layout: { x: 0, y: 7, w: 12, h: 5 } },
    ],
  },

  // ── Marketing / Mídia ─────────────────────────────────────────────────────

  {
    id: 'marketing',
    title: 'Marketing Digital',
    description: 'ROI por canal, funil de leads, distribuição de budget e performance de campanhas.',
    icon: '📣',
    color: 'bg-purple-50',
    tags: ['marketing', 'roi', 'campanhas'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Investimento',         dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 185000 }],   config: { accent_color: '#7c3aed', size: '4xl', format: 'currency' },  layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Leads Gerados',        dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 2840 }],     config: { accent_color: '#6366f1', size: '4xl' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'CPL',                  dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 65 }],       config: { accent_color: '#f59e0b', size: '4xl', format: 'currency' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'ROAS',                 dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 4.2 }],      config: { accent_color: '#10b981', size: '4xl' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Budget por Canal',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                                config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'combo', title: 'Leads + Investimento', dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#7c3aed' },                                           layout: { x: 4, y: 2, w: 8, h: 5 } },
      { id: bid(), type: 'bar',   title: 'Performance por Canal',dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                                config: { format: 'currency' },                                        layout: { x: 0, y: 7, w: 12, h: 5 } },
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
      { id: bid(), type: 'kpi',   title: 'Investimento Total',      dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4400000 }], config: { accent_color: '#6366f1', size: '4xl', format: 'currency' }, layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Número de PIs',           dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 312 }],      config: { accent_color: '#8b5cf6', size: '4xl' },                     layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Veículos Ativos',         dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 48 }],       config: { accent_color: '#06b6d4', size: '4xl' },                     layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Atendidos',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 23 }],       config: { accent_color: '#10b981', size: '4xl' },                     layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Investimento por Meio',   dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                               config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'bar_h', title: 'Top Veículos',            dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: VEICULOS,                             config: { format: 'currency' },                                        layout: { x: 4, y: 2, w: 8, h: 5 } },
      { id: bid(), type: 'area',  title: 'Evolução do Investimento',dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { format: 'currency', color: '#6366f1' },                      layout: { x: 0, y: 7, w: 8, h: 5 } },
      { id: bid(), type: 'table', title: 'Detalhamento por Canal',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                               config: { format: 'currency' },                                        layout: { x: 8, y: 7, w: 4, h: 5 } },
    ],
  },

  // ── Executivo / OKRs ──────────────────────────────────────────────────────

  {
    id: 'executive',
    title: 'Relatório Executivo',
    description: 'Visão consolidada para diretoria com KPIs, tendência e análise comparativa regional.',
    icon: '🎩',
    color: 'bg-fuchsia-50',
    tags: ['executivo', 'diretoria'],
    blocks: [
      { id: bid(), type: 'text',  title: 'Sumário Executivo',    config: { text: 'Insira aqui o sumário do período analisado...', text_color: '#374151' },                                                 layout: { x: 0, y: 0, w: 12, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Resultado Principal',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 8750000 }], config: { accent_color: '#111827', size: '4xl', format: 'currency' }, layout: { x: 0, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Volume',               dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 14230 }],   config: { accent_color: '#6366f1', size: '4xl' },                     layout: { x: 4, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Crescimento',          dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 18.4 }],    config: { accent_color: '#10b981', size: '4xl', format: 'percent' },  layout: { x: 8, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'area',  title: 'Evolução no Período',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { color: '#6366f1', format: 'currency' },                      layout: { x: 0, y: 4, w: 8, h: 5 } },
      { id: bid(), type: 'pie',   title: 'Composição',           dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                           config: {},                                                            layout: { x: 8, y: 4, w: 4, h: 5 } },
      { id: bid(), type: 'bar',   title: 'Comparativo Regional', dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: REGIOES,                              config: { format: 'currency' },                                        layout: { x: 0, y: 9, w: 12, h: 5 } },
    ],
  },

  {
    id: 'okrs_metas',
    title: 'OKRs e Metas',
    description: 'Acompanhe objetivos e resultados-chave com velocímetros, gauges e progresso por equipe.',
    icon: '🏆',
    color: 'bg-violet-50',
    tags: ['okr', 'metas', 'objetivos', 'kpis'],
    badges: ['novo'],
    blocks: [
      { id: bid(), type: 'text',       title: 'Período',              config: { text: 'OKRs — Q2 2026', text_color: '#374151' },                                                              layout: { x: 0, y: 0, w: 12, h: 1 } },
      { id: bid(), type: 'speedometer',title: 'Receita vs Meta',      dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 82 }],  config: { gauge_max: 100, color: '#7c3aed', format: 'percent' },    layout: { x: 0, y: 1, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer',title: 'NPS vs Meta',          dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 65 }],  config: { gauge_max: 100, color: '#6366f1', format: 'percent' },    layout: { x: 4, y: 1, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer',title: 'Retenção vs Meta',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 91 }],  config: { gauge_max: 100, color: '#10b981', format: 'percent' },    layout: { x: 8, y: 1, w: 4, h: 4 } },
      { id: bid(), type: 'bar',        title: 'OKRs por Equipe',      dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: EQUIPE,                           config: {},                                                          layout: { x: 0, y: 5, w: 6, h: 5 } },
      { id: bid(), type: 'line',       title: 'Evolução Trimestral',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                            config: { color: '#7c3aed' },                                         layout: { x: 6, y: 5, w: 6, h: 5 } },
    ],
  },

  {
    id: 'portfolio',
    title: 'Portfólio de Projetos',
    description: 'Visão do portfólio com Treemap de valor, status dos projetos e alocação de recursos.',
    icon: '📂',
    color: 'bg-cyan-50',
    tags: ['projetos', 'portfólio', 'gestão'],
    badges: ['novo'],
    blocks: [
      { id: bid(), type: 'kpi',     title: 'Projetos Ativos',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 12 }],       config: { accent_color: '#0891b2', size: '4xl' },                     layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',     title: 'Budget Total',         dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4840000 }],  config: { accent_color: '#06b6d4', size: '4xl', format: 'currency' }, layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',     title: 'Concluídos',           dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 7 }],        config: { accent_color: '#10b981', size: '4xl' },                     layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',     title: 'Em Risco',             dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 2 }],        config: { accent_color: '#f43f5e', size: '4xl' },                     layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'treemap', title: 'Portfólio por Valor',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PROJETOS,                              config: {},                                                           layout: { x: 0, y: 2, w: 6, h: 5 } },
      { id: bid(), type: 'pie',     title: 'Status dos Projetos',  dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                               config: {},                                                           layout: { x: 6, y: 2, w: 3, h: 5 } },
      { id: bid(), type: 'gauge',   title: 'Progresso Geral',      dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 68 }],       config: { gauge_max: 100, color: '#0891b2' },                         layout: { x: 9, y: 2, w: 3, h: 5 } },
      { id: bid(), type: 'table',   title: 'Projetos Detalhados',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: PROJETOS,                              config: { format: 'currency' },                                       layout: { x: 0, y: 7, w: 12, h: 5 } },
    ],
  },

  // ── RH / Pessoas ──────────────────────────────────────────────────────────

  {
    id: 'rh_equipe',
    title: 'RH e Equipe',
    description: 'Headcount, performance individual, absenteísmo, cursos concluídos e satisfação.',
    icon: '👥',
    color: 'bg-teal-50',
    tags: ['rh', 'pessoas', 'equipe', 'headcount'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Headcount',            dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 148 }],     config: { accent_color: '#0d9488', size: '4xl' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Novas Contratações',   dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 12 }],      config: { accent_color: '#10b981', size: '4xl' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Turnover',             dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 4.2 }],     config: { accent_color: '#f43f5e', size: '4xl', format: 'percent' },   layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'eNPS',                 dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 42 }],      config: { accent_color: '#8b5cf6', size: '4xl' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar',   title: 'Performance por Pessoa',dataset_id: null, label_col: null, value_col: null, agg: 'sum',  static_data: EQUIPE,                                config: {},                                                            layout: { x: 0, y: 2, w: 5, h: 5 } },
      { id: bid(), type: 'pie',   title: 'Composição por Área',  dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 5, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'gauge', title: 'Satisfação da Equipe', dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 78 }],       config: { gauge_max: 100, color: '#0d9488', format: 'percent' },        layout: { x: 9, y: 2, w: 3, h: 5 } },
      { id: bid(), type: 'bar_h', title: 'Cursos Concluídos',    dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: CURSOS,                                config: { format: 'percent' },                                         layout: { x: 0, y: 7, w: 12, h: 5 } },
    ],
  },

  // ── Operações / Suporte ───────────────────────────────────────────────────

  {
    id: 'suporte',
    title: 'Suporte ao Cliente',
    description: 'Tickets por status, tempo de resolução, CSAT, volume por canal e ranking de agentes.',
    icon: '🎧',
    color: 'bg-rose-50',
    tags: ['suporte', 'tickets', 'atendimento', 'csat'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Tickets Abertos',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 34 }],       config: { accent_color: '#f43f5e', size: '4xl' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Resolvidos Hoje',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 47 }],       config: { accent_color: '#10b981', size: '4xl' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'TMA (min)',            dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 8.4 }],      config: { accent_color: '#f59e0b', size: '4xl' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'CSAT',                 dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 92.1 }],     config: { accent_color: '#8b5cf6', size: '4xl', format: 'percent' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Tickets por Status',   dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                               config: {},                                                            layout: { x: 0, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'area',  title: 'Volume ao Longo do Tempo',dataset_id: null, label_col: null, value_col: null, agg: 'sum', static_data: MESES,                                config: { color: '#f43f5e' },                                           layout: { x: 4, y: 2, w: 8, h: 5 } },
      { id: bid(), type: 'bar',   title: 'Tickets por Agente',   dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: EQUIPE,                                config: {},                                                            layout: { x: 0, y: 7, w: 6, h: 5 } },
      { id: bid(), type: 'table', title: 'Detalhamento de Tickets',dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                             config: {},                                                            layout: { x: 6, y: 7, w: 6, h: 5 } },
    ],
  },

  {
    id: 'logistica',
    title: 'Logística e Estoque',
    description: 'Nível de estoque, pedidos em trânsito, distribuição regional e performance de entrega.',
    icon: '🚚',
    color: 'bg-amber-50',
    tags: ['logística', 'estoque', 'entregas'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Itens em Estoque',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 6820 }],     config: { accent_color: '#d97706', size: '4xl' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Pedidos em Trânsito',  dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 248 }],      config: { accent_color: '#f59e0b', size: '4xl' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Lead Time Médio (d)',  dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 3.2 }],      config: { accent_color: '#10b981', size: '4xl' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Entregas no Prazo',    dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 94.7 }],     config: { accent_color: '#6366f1', size: '4xl', format: 'percent' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Status do Estoque',    dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: ESTOQUE,                               config: {},                                                            layout: { x: 0, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'line',  title: 'Pedidos no Tempo',     dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#d97706' },                                           layout: { x: 4, y: 2, w: 8, h: 5 } },
      { id: bid(), type: 'bar_h', title: 'Entregas por Região',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: REGIOES,                               config: {},                                                            layout: { x: 0, y: 7, w: 6, h: 5 } },
      { id: bid(), type: 'table', title: 'Detalhamento',         dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: ESTOQUE,                               config: {},                                                            layout: { x: 6, y: 7, w: 6, h: 5 } },
    ],
  },

  {
    id: 'operacoes_noc',
    title: 'Operações / NOC',
    description: 'Uptime dos serviços, alertas ativos, SLAs, latência e status em tempo real.',
    icon: '🖥️',
    color: 'bg-slate-50',
    tags: ['operações', 'noc', 'uptime', 'sla'],
    badges: ['novo'],
    blocks: [
      { id: bid(), type: 'kpi',         title: 'Uptime',               dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 99.8 }], config: { accent_color: '#10b981', size: '4xl', format: 'percent' },    layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'Alertas Ativos',       dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 3 }],     config: { accent_color: '#f59e0b', size: '4xl' },                       layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'Incidentes (30d)',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 7 }],     config: { accent_color: '#f43f5e', size: '4xl' },                       layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'MTTR (min)',            dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 14 }],    config: { accent_color: '#8b5cf6', size: '4xl' },                       layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'speedometer', title: 'SLA Cumprimento',       dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 94 }],   config: { gauge_max: 100, color: '#10b981', format: 'percent' },         layout: { x: 0, y: 2, w: 4, h: 5 } },
      { id: bid(), type: 'area',        title: 'Latência no Tempo',     dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: MESES,                              config: { color: '#6366f1' },                                            layout: { x: 4, y: 2, w: 8, h: 5 } },
      { id: bid(), type: 'pie',         title: 'Alertas por Tipo',      dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                            config: {},                                                             layout: { x: 0, y: 7, w: 4, h: 5 } },
      { id: bid(), type: 'table',       title: 'Incidentes Recentes',   dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                            config: {},                                                             layout: { x: 4, y: 7, w: 8, h: 5 } },
    ],
  },

  // ── Educação / Financeiro ─────────────────────────────────────────────────

  {
    id: 'educacao',
    title: 'Educação e Treinamento',
    description: 'Progresso de cursos, conclusões, NPS educacional e engajamento por aluno.',
    icon: '🎓',
    color: 'bg-indigo-50',
    tags: ['educação', 'treinamento', 'cursos', 'lms'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Alunos Ativos',        dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 2340 }],     config: { accent_color: '#6366f1', size: '4xl' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Conclusões',           dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1820 }],     config: { accent_color: '#10b981', size: '4xl' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Conclusão',    dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 77.8 }],     config: { accent_color: '#f59e0b', size: '4xl', format: 'percent' },   layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'NPS Educacional',      dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 68 }],       config: { accent_color: '#8b5cf6', size: '4xl' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar_h', title: 'Progresso por Curso',  dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: CURSOS,                                config: { format: 'percent' },                                         layout: { x: 0, y: 2, w: 6, h: 5 } },
      { id: bid(), type: 'line',  title: 'Conclusões no Tempo',  dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: MESES,                                 config: { color: '#6366f1' },                                           layout: { x: 6, y: 2, w: 6, h: 5 } },
      { id: bid(), type: 'table', title: 'Ranking de Cursos',    dataset_id: null, label_col: null, value_col: null, agg: 'count', static_data: CURSOS,                                config: { format: 'percent' },                                         layout: { x: 0, y: 7, w: 12, h: 5 } },
    ],
  },

  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'DRE simplificado, receitas vs despesas, fluxo de caixa e análise de lucratividade.',
    icon: '💰',
    color: 'bg-green-50',
    tags: ['financeiro', 'dre', 'fluxo de caixa'],
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Receita Bruta',        dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 3010000 }],  config: { accent_color: '#16a34a', size: '4xl', format: 'currency' },  layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Despesas Totais',      dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 1386000 }],  config: { accent_color: '#f43f5e', size: '4xl', format: 'currency' },  layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Lucro Líquido',        dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 1624000 }],  config: { accent_color: '#10b981', size: '4xl', format: 'currency' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Margem Líquida',       dataset_id: null, label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 53.9 }],     config: { accent_color: '#8b5cf6', size: '4xl', format: 'percent' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'combo', title: 'Receita vs Despesas',  dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: RECEITAS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 7, h: 5 } },
      { id: bid(), type: 'pie',   title: 'Composição das Despesas',dataset_id: null, label_col: null, value_col: null, agg: 'sum',  static_data: DESPESAS,                             config: { format: 'currency' },                                        layout: { x: 7, y: 2, w: 5, h: 5 } },
      { id: bid(), type: 'area',  title: 'Fluxo de Caixa',       dataset_id: null, label_col: null, value_col: null, agg: 'sum',   static_data: RECEITAS,                              config: { color: '#16a34a', format: 'currency' },                       layout: { x: 0, y: 7, w: 12, h: 5 } },
    ],
  },
]
