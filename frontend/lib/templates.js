/**
 * Templates prontos de dashboard.
 * Blocos com static_data exibem dados de exemplo até o usuário conectar um dataset real.
 */

function bid() { return crypto.randomUUID() }

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
const FONTES    = [{ label: 'Orgânico', value: 48200 }, { label: 'Pago', value: 31400 }, { label: 'Direto', value: 22800 }, { label: 'Social', value: 14600 }, { label: 'Email', value: 7800 }]
const CANAIS_MKT= [{ label: 'Google Ads', value: 72000 }, { label: 'Meta Ads', value: 54000 }, { label: 'Email', value: 28000 }, { label: 'SEO', value: 18000 }, { label: 'Afiliados', value: 13000 }]
const SERVICOS  = [{ label: 'API', value: 99.97 }, { label: 'Web', value: 99.92 }, { label: 'DB', value: 99.99 }, { label: 'Auth', value: 99.85 }, { label: 'CDN', value: 100 }]

// Layout padrão: KPIs h:2 (y:0), charts h:4 (y:2,6,10), totalizando ~14 linhas
// rowHeight=52: h:2=112px, h:4=232px — proporcional e legível

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
    description: 'KPIs de receita, tendência mensal, volume por produto, mix de categorias e ranking regional.',
    icon: '📈',
    color: 'bg-violet-50',
    tags: ['vendas', 'receita', 'tendência'],
    canvasConfig: { bgColor: '#c4b5fd', sheetBgColor: '#ede9fe', dotColor: 'rgba(109,40,217,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Receita Total',        dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 1234500 }],  config: { accent_color: '#10b981', size: '4xl', format: 'currency', delta: '+8.3', delta_label: 'vs. mês ant.' }, layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Total de Pedidos',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 4821 }],     config: { accent_color: '#6366f1', size: '4xl', delta: '+15.7', delta_label: 'vs. mês ant.' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Ticket Médio',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 256 }],      config: { accent_color: '#f59e0b', size: '4xl', format: 'currency', delta: '+5.2', delta_label: 'vs. mês ant.' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Únicos',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1893 }],     config: { accent_color: '#8b5cf6', size: '4xl', delta: '+12.1', delta_label: 'vs. mês ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'combo', title: 'Receita Mensal',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Mix por Categoria',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 6, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Meta do Mês',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 82 }],        config: { gauge_max: 100, color: '#10b981', format: 'percent' },        layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Receita por Produto',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'line',  title: 'Evolução de Pedidos',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#6366f1' },                                           layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'gauge', title: 'NPS do Cliente',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 74 }],        config: { gauge_max: 100, color: '#8b5cf6', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Receita por Região',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: REGIOES,                               config: { format: 'currency' },                                        layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento por Produto', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum', static_data: PRODUTOS,                            config: { format: 'currency' },                                        layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  {
    id: 'sales_pipeline',
    title: 'Pipeline de Vendas',
    description: 'Funil de conversão, KPIs de oportunidade, origem dos leads, evolução do pipeline e ranking.',
    icon: '🚀',
    color: 'bg-blue-50',
    tags: ['vendas', 'pipeline', 'funil', 'crm'],
    badges: ['vendas'],
    canvasConfig: { bgColor: '#93c5fd', sheetBgColor: '#dbeafe', dotColor: 'rgba(37,99,235,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Leads Ativos',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1840 }],     config: { accent_color: '#3b82f6', size: '4xl', delta: '+18.4', delta_label: 'vs. mês ant.' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Conversão',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 5.2 }],      config: { accent_color: '#10b981', size: '4xl', format: 'percent', delta: '+2.1', delta_label: 'vs. período ant.' },   layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Valor do Pipeline',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4200000 }],  config: { accent_color: '#6366f1', size: '4xl', format: 'currency', delta: '+11.6', delta_label: 'vs. mês ant.' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Negócios Fechados',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 95 }],       config: { accent_color: '#f59e0b', size: '4xl', delta: '+22.4', delta_label: 'vs. mês ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar_h', title: 'Funil de Conversão',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: ETAPAS,                                config: {},                                                            layout: { x: 0, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'line',  title: 'Evolução do Pipeline', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { format: 'currency', color: '#3b82f6' },                       layout: { x: 5, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Conversão vs Meta', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum', static_data: [{ label: 'Total', value: 73 }],     config: { gauge_max: 100, color: '#3b82f6', format: 'percent' },        layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Origem dos Leads',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: FONTES,                                config: {},                                                            layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'combo', title: 'Leads vs Fechamentos', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#3b82f6' },                                           layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Ticket Médio',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 68 }],        config: { gauge_max: 100, color: '#10b981' },                          layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'table', title: 'Oportunidades Abertas', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 10, w: 12, h: 4 } },
    ],
  },

  {
    id: 'vendas_avancado',
    title: 'Vendas Avançado',
    description: 'Análise aprofundada com treemap, correlações, combo e múltiplos indicadores de meta.',
    icon: '🎯',
    color: 'bg-purple-50',
    tags: ['vendas', 'avançado', 'correlação'],
    badges: ['novo'],
    canvasConfig: { bgColor: '#d8b4fe', sheetBgColor: '#f3e8ff', dotColor: 'rgba(124,58,237,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',         title: 'Receita',              dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 5820000 }], config: { accent_color: '#7c3aed', size: '4xl', format: 'currency', delta: '+9.7', delta_label: 'vs. mês ant.' },  layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'Meta do Mês',          dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 6000000 }], config: { accent_color: '#6366f1', size: '4xl', format: 'currency', delta: '+3.5', delta_label: 'vs. meta' },  layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'Clientes Novos',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 284 }],      config: { accent_color: '#10b981', size: '4xl', delta: '+14.3', delta_label: 'vs. mês ant.' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'NPS',                  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 78 }],       config: { accent_color: '#f59e0b', size: '4xl', delta: '+6.1', delta_label: 'vs. período ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'treemap',     title: 'Portfólio por Receita',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                             config: {},                                                            layout: { x: 0, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'combo',       title: 'Receita + Volume',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { format: 'currency' },                                        layout: { x: 5, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Atingimento da Meta',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 82 }],      config: { gauge_max: 100, color: '#7c3aed', format: 'percent' },        layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar',         title: 'Receita por Produto',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                             config: { format: 'currency' },                                        layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'area',        title: 'Tendência Acumulada',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                config: { color: '#7c3aed', format: 'currency' },                      layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'gauge',       title: 'Satisfação NPS',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 78 }],      config: { gauge_max: 100, color: '#10b981', format: 'percent' },        layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'pie',         title: 'Mix por Categoria',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                           config: {},                                                            layout: { x: 0, y: 10, w: 4, h: 4 } },
      { id: bid(), type: 'table',       title: 'Ranking de Produtos',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                             config: { format: 'currency' },                                        layout: { x: 4, y: 10, w: 8, h: 4 } },
    ],
  },

  // ── E-commerce / Digital ───────────────────────────────────────────────────

  {
    id: 'ecommerce',
    title: 'E-commerce',
    description: 'Pedidos, conversão, receita por categoria, top produtos, abandono de carrinho e LTV.',
    icon: '🛒',
    color: 'bg-orange-50',
    tags: ['e-commerce', 'loja', 'produtos'],
    canvasConfig: { bgColor: '#fdba74', sheetBgColor: '#ffedd5', dotColor: 'rgba(234,88,12,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Pedidos do Mês',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 3842 }],     config: { accent_color: '#f97316', size: '4xl', delta: '+13.8', delta_label: 'vs. mês ant.' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Receita',              dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 984200 }],   config: { accent_color: '#10b981', size: '4xl', format: 'currency', delta: '+10.5', delta_label: 'vs. mês ant.' },  layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Ticket Médio',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 256 }],      config: { accent_color: '#6366f1', size: '4xl', format: 'currency', delta: '+4.9', delta_label: 'vs. mês ant.' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Conversão',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 3.4 }],      config: { accent_color: '#f59e0b', size: '4xl', format: 'percent', delta: '+3.4', delta_label: 'vs. período ant.' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'area',  title: 'Pedidos no Tempo',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#f97316' },                                           layout: { x: 0, y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Receita por Categoria',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 6, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Conversão vs Meta', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg', static_data: [{ label: 'Total', value: 68 }],      config: { gauge_max: 100, color: '#f97316', format: 'percent' },        layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Top Produtos',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'combo', title: 'Receita + Pedidos',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { format: 'currency' },                                        layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Retenção de Clientes', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 61 }],        config: { gauge_max: 100, color: '#10b981', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Receita por Região',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: REGIOES,                               config: { format: 'currency' },                                        layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Produtos Detalhados',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PRODUTOS,                              config: { format: 'currency' },                                        layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  {
    id: 'web_analytics',
    title: 'Análise Web',
    description: 'Sessões, usuários, bounce rate, fontes de tráfego, páginas mais visitadas e conversões.',
    icon: '🌐',
    color: 'bg-sky-50',
    tags: ['web', 'analytics', 'tráfego', 'seo'],
    canvasConfig: { bgColor: '#7dd3fc', sheetBgColor: '#e0f2fe', dotColor: 'rgba(2,132,199,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Sessões',              dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 124800 }],   config: { accent_color: '#0ea5e9', size: '4xl', delta: '+16.2', delta_label: 'em 30 dias' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Usuários Únicos',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 89400 }],    config: { accent_color: '#6366f1', size: '4xl', delta: '+19.1', delta_label: 'em 30 dias' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Pageviews',            dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 312000 }],   config: { accent_color: '#8b5cf6', size: '4xl', delta: '+21.3', delta_label: 'em 30 dias' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Rejeição',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 42.3 }],     config: { accent_color: '#f43f5e', size: '4xl', format: 'percent', delta: '-5.8', delta_label: 'vs. período ant.' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'area',  title: 'Sessões no Tempo',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#0ea5e9' },                                           layout: { x: 0, y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Fontes de Tráfego',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: FONTES,                                config: {},                                                            layout: { x: 6, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Taxa de Conversão', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg', static_data: [{ label: 'Total', value: 58 }],      config: { gauge_max: 100, color: '#0ea5e9', format: 'percent' },        layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Páginas Mais Visitadas',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: PAGINAS,                               config: {},                                                            layout: { x: 0, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'line',  title: 'Novos vs Recorrentes', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#6366f1' },                                           layout: { x: 5, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Engajamento',          dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 64 }],        config: { gauge_max: 100, color: '#8b5cf6', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Canais de Tráfego',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: FONTES,                                config: {},                                                            layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhe de Páginas',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PAGINAS,                               config: {},                                                            layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  // ── Marketing / Mídia ─────────────────────────────────────────────────────

  {
    id: 'marketing',
    title: 'Marketing Digital',
    description: 'ROI por canal, funil de leads, CPL, ROAS, distribuição de budget e performance de campanhas.',
    icon: '📣',
    color: 'bg-purple-50',
    tags: ['marketing', 'roi', 'campanhas'],
    canvasConfig: { bgColor: '#d8b4fe', sheetBgColor: '#f3e8ff', dotColor: 'rgba(124,58,237,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Investimento Total',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 185000 }],   config: { accent_color: '#7c3aed', size: '4xl', format: 'currency', delta: '-4.2', delta_label: 'vs. mês ant.' },  layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Leads Gerados',        dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 2840 }],     config: { accent_color: '#6366f1', size: '4xl', delta: '+17.9', delta_label: 'vs. mês ant.' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'CPL',                  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 65 }],       config: { accent_color: '#f59e0b', size: '4xl', format: 'currency', delta: '-6.3', delta_label: 'vs. mês ant.' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'ROAS',                 dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 4.2 }],      config: { accent_color: '#10b981', size: '4xl', delta: '+7.4', delta_label: 'vs. período ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'combo', title: 'Leads + Investimento', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#7c3aed' },                                           layout: { x: 0, y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Budget por Canal',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS_MKT,                            config: { format: 'currency' },                                        layout: { x: 6, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'ROI Geral',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 76 }],        config: { gauge_max: 100, color: '#7c3aed', format: 'percent' },       layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Performance por Canal',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS_MKT,                            config: { format: 'currency' },                                        layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'area',  title: 'CPL ao Longo do Tempo',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: MESES,                                 config: { color: '#f59e0b', format: 'currency' },                      layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Taxa de Conversão',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 58 }],        config: { gauge_max: 100, color: '#10b981', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Leads por Canal',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS_MKT,                            config: {},                                                            layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Campanhas Detalhadas', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS_MKT,                            config: { format: 'currency' },                                        layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  {
    id: 'media',
    title: 'Performance de Mídia',
    description: 'Investimento por canal, share of voice, top veículos, sazonalidade e custo por ponto.',
    icon: '📡',
    color: 'bg-indigo-50',
    tags: ['mídia', 'investimento', 'agência'],
    canvasConfig: { bgColor: '#a5b4fc', sheetBgColor: '#e0e7ff', dotColor: 'rgba(79,70,229,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Investimento Total',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4400000 }],  config: { accent_color: '#6366f1', size: '4xl', format: 'currency', delta: '+8.9', delta_label: 'vs. mês ant.' },  layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Número de PIs',        dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 312 }],      config: { accent_color: '#8b5cf6', size: '4xl', delta: '+12.5', delta_label: 'vs. mês ant.' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Veículos Ativos',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 48 }],       config: { accent_color: '#06b6d4', size: '4xl', delta: '+4.5', delta_label: 'em 30 dias' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Clientes Atendidos',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 23 }],       config: { accent_color: '#10b981', size: '4xl', delta: '+6.7', delta_label: 'vs. mês ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Investimento por Meio',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CANAIS,                                config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Top Veículos',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: VEICULOS,                              config: { format: 'currency' },                                        layout: { x: 4, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Share of Voice', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 38 }],        config: { gauge_max: 100, color: '#6366f1', format: 'percent' },       layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'area',  title: 'Investimento Mensal',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { format: 'currency', color: '#6366f1' },                      layout: { x: 0, y: 6, w: 6, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Investimento por Canal',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: CANAIS,                                config: { format: 'currency' },                                        layout: { x: 6, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Eficiência de Mídia',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 72 }],        config: { gauge_max: 100, color: '#06b6d4', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'treemap', title: 'Verba por Veículo',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: VEICULOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento por Canal',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: CANAIS,                                config: { format: 'currency' },                                        layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  // ── Executivo / OKRs ──────────────────────────────────────────────────────

  {
    id: 'executive',
    title: 'Relatório Executivo',
    description: 'Visão consolidada para diretoria: resultado, tendências, composição regional e análise comparativa.',
    icon: '🎩',
    color: 'bg-fuchsia-50',
    tags: ['executivo', 'diretoria'],
    canvasConfig: { bgColor: '#e9d5ff', sheetBgColor: '#fdf4ff', dotColor: 'rgba(147,51,234,0.07)' },
    blocks: [
      { id: bid(), type: 'text',  title: 'Sumário Executivo', config: { text: 'Desempenho consolidado do período. Receita acima da meta em 8,4%. Expansão de 12% em clientes ativos.', text_color: '#374151' }, layout: { x: 0, y: 0, w: 12, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Resultado Principal',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 8750000 }],  config: { accent_color: '#111827', size: '4xl', format: 'currency', delta: '+8.4', delta_label: 'vs. período ant.' },  layout: { x: 0, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Volume de Operações',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 14230 }],    config: { accent_color: '#6366f1', size: '4xl', delta: '+13.2', delta_label: 'vs. período ant.' },                      layout: { x: 4, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Crescimento YoY',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 18.4 }],     config: { accent_color: '#10b981', size: '4xl', format: 'percent', delta: '+2.6', delta_label: 'vs. meta' },   layout: { x: 8, y: 2, w: 4, h: 2 } },
      { id: bid(), type: 'combo', title: 'Resultado vs Projeção', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: MESES,                                 config: { color: '#6366f1', format: 'currency' },                      layout: { x: 0, y: 4, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Composição',           dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 6, y: 4, w: 3, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Meta Anual',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 87 }],        config: { gauge_max: 100, color: '#111827', format: 'percent' },       layout: { x: 9, y: 4, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Comparativo Regional', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: REGIOES,                               config: { format: 'currency' },                                        layout: { x: 0, y: 8, w: 5, h: 4 } },
      { id: bid(), type: 'area',  title: 'Evolução Histórica',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: RECEITAS,                              config: { color: '#6366f1', format: 'currency' },                      layout: { x: 5, y: 8, w: 4, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Satisfação dos Clientes', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg', static_data: [{ label: 'Total', value: 82 }],      config: { gauge_max: 100, color: '#10b981', format: 'percent' },       layout: { x: 9, y: 8, w: 3, h: 4 } },
      { id: bid(), type: 'table', title: 'Desempenho por Área',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: CATEGORIAS,                            config: { format: 'currency' },                                        layout: { x: 0, y: 12, w: 12, h: 4 } },
    ],
  },

  {
    id: 'okrs_metas',
    title: 'OKRs e Metas',
    description: 'Acompanhe todos os objetivos e resultados-chave com velocímetros, progresso por equipe e evolução trimestral.',
    icon: '🏆',
    color: 'bg-violet-50',
    tags: ['okr', 'metas', 'objetivos', 'kpis'],
    badges: ['novo'],
    canvasConfig: { bgColor: '#c4b5fd', sheetBgColor: '#ede9fe', dotColor: 'rgba(109,40,217,0.07)' },
    blocks: [
      { id: bid(), type: 'text',       title: 'Período', config: { text: 'OKRs — Q2 2026  ·  Semana 11 de 13', text_color: '#374151' }, layout: { x: 0, y: 0, w: 12, h: 1 } },
      { id: bid(), type: 'speedometer',title: 'Receita vs Meta',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 82 }],  config: { gauge_max: 100, color: '#7c3aed', format: 'percent' },    layout: { x: 0, y: 1, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer',title: 'NPS vs Meta',          dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 65 }],  config: { gauge_max: 100, color: '#6366f1', format: 'percent' },    layout: { x: 4, y: 1, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer',title: 'Retenção vs Meta',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 91 }],  config: { gauge_max: 100, color: '#10b981', format: 'percent' },    layout: { x: 8, y: 1, w: 4, h: 4 } },
      { id: bid(), type: 'kpi',        title: 'Clientes Ativos',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1840 }], config: { accent_color: '#7c3aed', size: '4xl', delta: '+14.8', delta_label: 'vs. mês ant.' },                   layout: { x: 0, y: 5, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',        title: 'Receita Recorrente',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 284000 }], config: { accent_color: '#10b981', size: '4xl', format: 'currency', delta: '+9.2', delta_label: 'vs. mês ant.' }, layout: { x: 3, y: 5, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',        title: 'Churn Rate',           dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 2.4 }],  config: { accent_color: '#f43f5e', size: '4xl', format: 'percent', delta: '-3.2', delta_label: 'vs. mês ant.' }, layout: { x: 6, y: 5, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',        title: 'Novos Clientes',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 148 }],  config: { accent_color: '#6366f1', size: '4xl', delta: '+22.1', delta_label: 'vs. mês ant.' },                   layout: { x: 9, y: 5, w: 3, h: 2 } },
      { id: bid(), type: 'bar',        title: 'OKRs por Equipe',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: EQUIPE,                           config: {},                                                          layout: { x: 0, y: 7, w: 5, h: 4 } },
      { id: bid(), type: 'line',       title: 'Evolução Trimestral',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                            config: { color: '#7c3aed' },                                         layout: { x: 5, y: 7, w: 4, h: 4 } },
      { id: bid(), type: 'gauge',      title: 'Engajamento de Equipe',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 76 }],  config: { gauge_max: 100, color: '#6366f1', format: 'percent' },    layout: { x: 9, y: 7, w: 3, h: 4 } },
      { id: bid(), type: 'table',      title: 'OKRs Detalhados',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: EQUIPE,                           config: {},                                                          layout: { x: 0, y: 11, w: 12, h: 4 } },
    ],
  },

  {
    id: 'portfolio',
    title: 'Portfólio de Projetos',
    description: 'Visão completa do portfólio: treemap de valor, status, progresso, cronograma e alocação de recursos.',
    icon: '📂',
    color: 'bg-cyan-50',
    tags: ['projetos', 'portfólio', 'gestão'],
    badges: ['novo'],
    canvasConfig: { bgColor: '#67e8f9', sheetBgColor: '#cffafe', dotColor: 'rgba(8,145,178,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',     title: 'Projetos Ativos',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 12 }],       config: { accent_color: '#0891b2', size: '4xl', delta: '+20.0', delta_label: 'em 30 dias' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',     title: 'Budget Total',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 4840000 }],  config: { accent_color: '#06b6d4', size: '4xl', format: 'currency', delta: '+5.8', delta_label: 'vs. meta' },  layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',     title: 'Concluídos',           dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 7 }],        config: { accent_color: '#10b981', size: '4xl', delta: '+16.7', delta_label: 'em 30 dias' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',     title: 'Em Risco',             dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 2 }],        config: { accent_color: '#f43f5e', size: '4xl', delta: '-8.1', delta_label: 'vs. mês ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'treemap', title: 'Portfólio por Valor',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PROJETOS,                              config: {},                                                            layout: { x: 0, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'pie',     title: 'Status dos Projetos',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                               config: {},                                                            layout: { x: 5, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'gauge',   title: 'Progresso Geral',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 68 }],        config: { gauge_max: 100, color: '#0891b2' },                         layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar',     title: 'Budget por Projeto',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PROJETOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'line',    title: 'Entregas ao Longo do Tempo', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum', static_data: MESES,                             config: { color: '#0891b2' },                                          layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'SLA de Entrega',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 88 }],        config: { gauge_max: 100, color: '#06b6d4', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'table',   title: 'Projetos Detalhados',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: PROJETOS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 10, w: 12, h: 4 } },
    ],
  },

  // ── RH / Pessoas ──────────────────────────────────────────────────────────

  {
    id: 'rh_equipe',
    title: 'RH e Equipe',
    description: 'Headcount, performance, turnover, absenteísmo, satisfação, cursos e composição por área.',
    icon: '👥',
    color: 'bg-teal-50',
    tags: ['rh', 'pessoas', 'equipe', 'headcount'],
    canvasConfig: { bgColor: '#5eead4', sheetBgColor: '#ccfbf1', dotColor: 'rgba(15,118,110,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Headcount',            dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 148 }],     config: { accent_color: '#0d9488', size: '4xl', delta: '+5.4', delta_label: 'em 30 dias' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Novas Contratações',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 12 }],      config: { accent_color: '#10b981', size: '4xl', delta: '+20.0', delta_label: 'vs. mês ant.' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Turnover',             dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 4.2 }],     config: { accent_color: '#f43f5e', size: '4xl', format: 'percent', delta: '-3.7', delta_label: 'vs. mês ant.' },   layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'eNPS',                 dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 42 }],      config: { accent_color: '#8b5cf6', size: '4xl', delta: '+7.9', delta_label: 'vs. período ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar',   title: 'Performance por Pessoa',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: EQUIPE,                                config: {},                                                            layout: { x: 0, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Composição por Área',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 4, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Satisfação da Equipe', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 78 }],        config: { gauge_max: 100, color: '#0d9488', format: 'percent' },       layout: { x: 8, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Cursos Concluídos',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: CURSOS,                                config: { format: 'percent' },                                         layout: { x: 0, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'line',  title: 'Headcount ao Longo do Tempo', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum', static_data: MESES,                            config: { color: '#0d9488' },                                          layout: { x: 5, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Meta de Treinamento', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg', static_data: [{ label: 'Total', value: 84 }],    config: { gauge_max: 100, color: '#10b981', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'area',  title: 'Absenteísmo Mensal',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: MESES,                                 config: { color: '#f43f5e' },                                          layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento da Equipe',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: EQUIPE,                                config: {},                                                            layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  // ── Operações / Suporte ───────────────────────────────────────────────────

  {
    id: 'suporte',
    title: 'Suporte ao Cliente',
    description: 'Tickets por status, CSAT, TMA, volume por agente, FCR e evolução do atendimento.',
    icon: '🎧',
    color: 'bg-rose-50',
    tags: ['suporte', 'tickets', 'atendimento', 'csat'],
    canvasConfig: { bgColor: '#fda4af', sheetBgColor: '#ffe4e6', dotColor: 'rgba(225,29,72,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Tickets Abertos',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 34 }],       config: { accent_color: '#f43f5e', size: '4xl', delta: '-7.3', delta_label: 'vs. mês ant.' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Resolvidos Hoje',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 47 }],       config: { accent_color: '#10b981', size: '4xl', delta: '+15.6', delta_label: 'em 30 dias' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'TMA (min)',            dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 8.4 }],      config: { accent_color: '#f59e0b', size: '4xl', delta: '-4.8', delta_label: 'vs. mês ant.' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'CSAT',                 dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 92.1 }],     config: { accent_color: '#8b5cf6', size: '4xl', format: 'percent', delta: '+2.3', delta_label: 'vs. mês ant.' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Tickets por Status',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                               config: {},                                                            layout: { x: 0, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'area',  title: 'Volume de Atendimentos',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: MESES,                                 config: { color: '#f43f5e' },                                          layout: { x: 4, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'CSAT vs Meta',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 92 }],        config: { gauge_max: 100, color: '#8b5cf6', format: 'percent' },       layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Tickets por Agente',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: EQUIPE,                                config: {},                                                            layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'line',  title: 'TMA ao Longo do Tempo',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: MESES,                                 config: { color: '#f59e0b' },                                          layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'gauge', title: 'FCR (1ª Resolução)',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 78 }],        config: { gauge_max: 100, color: '#10b981', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Tickets por Categoria',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento de Tickets',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                             config: {},                                                            layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  {
    id: 'logistica',
    title: 'Logística e Estoque',
    description: 'Nível de estoque, pedidos em trânsito, OTD, lead time, distribuição regional e ruptura.',
    icon: '🚚',
    color: 'bg-amber-50',
    tags: ['logística', 'estoque', 'entregas'],
    canvasConfig: { bgColor: '#fcd34d', sheetBgColor: '#fef3c7', dotColor: 'rgba(180,83,9,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Itens em Estoque',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 6820 }],     config: { accent_color: '#d97706', size: '4xl', delta: '+6.2', delta_label: 'em 30 dias' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Pedidos em Trânsito',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 248 }],      config: { accent_color: '#f59e0b', size: '4xl', delta: '+18.3', delta_label: 'vs. mês ant.' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Lead Time Médio (d)',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 3.2 }],      config: { accent_color: '#10b981', size: '4xl', delta: '-3.9', delta_label: 'vs. mês ant.' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'OTD',                  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 94.7 }],     config: { accent_color: '#6366f1', size: '4xl', format: 'percent', delta: '+2.8', delta_label: 'vs. meta' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'pie',   title: 'Status do Estoque',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: ESTOQUE,                               config: {},                                                            layout: { x: 0, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'line',  title: 'Pedidos no Tempo',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: MESES,                                 config: { color: '#d97706' },                                           layout: { x: 4, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'OTD vs Meta',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 95 }],        config: { gauge_max: 100, color: '#d97706', format: 'percent' },       layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Entregas por Região',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: REGIOES,                               config: {},                                                            layout: { x: 0, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'area',  title: 'Lead Time ao Longo do Tempo', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg', static_data: MESES,                            config: { color: '#f59e0b' },                                          layout: { x: 5, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Nível de Serviço',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 88 }],        config: { gauge_max: 100, color: '#10b981', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Recebimento vs Expedição', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum', static_data: MESES,                              config: {},                                                            layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Detalhamento de Estoque', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum', static_data: ESTOQUE,                              config: {},                                                            layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  {
    id: 'operacoes_noc',
    title: 'Operações / NOC',
    description: 'Uptime, SLA, alertas ativos, latência, incidentes por tipo e performance por serviço.',
    icon: '🖥️',
    color: 'bg-slate-50',
    tags: ['operações', 'noc', 'uptime', 'sla'],
    badges: ['novo'],
    canvasConfig: { bgColor: '#cbd5e1', sheetBgColor: '#f1f5f9', dotColor: 'rgba(71,85,105,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',         title: 'Uptime Geral',         dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 99.8 }],  config: { accent_color: '#10b981', size: '4xl', format: 'percent', delta: '+2.1', delta_label: 'em 30 dias' },   layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'Alertas Ativos',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 3 }],     config: { accent_color: '#f59e0b', size: '4xl', delta: '-5.6', delta_label: 'vs. mês ant.' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'Incidentes (30d)',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 7 }],     config: { accent_color: '#f43f5e', size: '4xl', delta: '-7.1', delta_label: 'vs. mês ant.' },                      layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',         title: 'MTTR (min)',           dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 14 }],    config: { accent_color: '#8b5cf6', size: '4xl', delta: '-6.8', delta_label: 'vs. mês ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'speedometer', title: 'SLA Cumprimento',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 94 }],   config: { gauge_max: 100, color: '#10b981', format: 'percent' },        layout: { x: 0, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'area',        title: 'Latência no Tempo',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: MESES,                              config: { color: '#6366f1' },                                           layout: { x: 4, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'gauge',       title: 'Disponibilidade',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 99 }],   config: { gauge_max: 100, color: '#10b981', format: 'percent' },        layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'bar',         title: 'Uptime por Serviço',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: SERVICOS,                          config: { format: 'percent' },                                          layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'line',        title: 'Incidentes por Mês',   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: MESES,                              config: { color: '#f43f5e' },                                          layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'pie',         title: 'Alertas por Tipo',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                            config: {},                                                            layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar_h',       title: 'MTTR por Serviço',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: SERVICOS,                          config: {},                                                            layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table',       title: 'Incidentes Recentes',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: TICKETS,                            config: {},                                                            layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  // ── Educação / Financeiro ─────────────────────────────────────────────────

  {
    id: 'educacao',
    title: 'Educação e Treinamento',
    description: 'Alunos ativos, taxa de conclusão, progresso por curso, NPS educacional e engajamento.',
    icon: '🎓',
    color: 'bg-indigo-50',
    tags: ['educação', 'treinamento', 'cursos', 'lms'],
    canvasConfig: { bgColor: '#a5b4fc', sheetBgColor: '#e0e7ff', dotColor: 'rgba(79,70,229,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Alunos Ativos',        dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 2340 }],     config: { accent_color: '#6366f1', size: '4xl', delta: '+14.6', delta_label: 'em 30 dias' },                      layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Conclusões',           dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: [{ label: 'Total', value: 1820 }],     config: { accent_color: '#10b981', size: '4xl', delta: '+19.5', delta_label: 'em 30 dias' },                      layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Taxa de Conclusão',    dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 77.8 }],     config: { accent_color: '#f59e0b', size: '4xl', format: 'percent', delta: '+4.7', delta_label: 'vs. período ant.' },   layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'NPS Educacional',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 68 }],       config: { accent_color: '#8b5cf6', size: '4xl', delta: '+5.9', delta_label: 'vs. período ant.' },                      layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'bar_h', title: 'Progresso por Curso',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: CURSOS,                                config: { format: 'percent' },                                         layout: { x: 0, y: 2, w: 5, h: 4 } },
      { id: bid(), type: 'line',  title: 'Conclusões no Tempo',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: MESES,                                 config: { color: '#6366f1' },                                           layout: { x: 5, y: 2, w: 4, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Meta de Conclusão', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg', static_data: [{ label: 'Total', value: 78 }],       config: { gauge_max: 100, color: '#6366f1', format: 'percent' },       layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Alunos por Área',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: CATEGORIAS,                            config: {},                                                            layout: { x: 0, y: 6, w: 4, h: 4 } },
      { id: bid(), type: 'combo', title: 'Matrículas + Conclusões', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum', static_data: MESES,                                config: { color: '#6366f1' },                                           layout: { x: 4, y: 6, w: 5, h: 4 } },
      { id: bid(), type: 'gauge', title: 'Engajamento',           dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',  static_data: [{ label: 'Total', value: 71 }],        config: { gauge_max: 100, color: '#8b5cf6', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Top Instrutores',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',  static_data: EQUIPE,                                config: {},                                                            layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'Ranking de Cursos',     dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'count', static_data: CURSOS,                               config: { format: 'percent' },                                         layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },

  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'DRE, receita vs despesas, fluxo de caixa, margem, composição de custos e análise de lucratividade.',
    icon: '💰',
    color: 'bg-green-50',
    tags: ['financeiro', 'dre', 'fluxo de caixa'],
    canvasConfig: { bgColor: '#86efac', sheetBgColor: '#dcfce7', dotColor: 'rgba(22,101,52,0.07)' },
    blocks: [
      { id: bid(), type: 'kpi',   title: 'Receita Bruta',        dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 3010000 }],  config: { accent_color: '#16a34a', size: '4xl', format: 'currency', delta: '+11.4', delta_label: 'vs. mês ant.' },  layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Despesas Totais',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 1386000 }],  config: { accent_color: '#f43f5e', size: '4xl', format: 'currency', delta: '-4.6', delta_label: 'vs. mês ant.' },  layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Lucro Líquido',        dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: [{ label: 'Total', value: 1624000 }],  config: { accent_color: '#10b981', size: '4xl', format: 'currency', delta: '+13.7', delta_label: 'vs. mês ant.' },  layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'kpi',   title: 'Margem Líquida',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 53.9 }],     config: { accent_color: '#8b5cf6', size: '4xl', format: 'percent', delta: '+3.8', delta_label: 'vs. período ant.' },   layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: bid(), type: 'combo', title: 'Receita vs Despesas',  dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: RECEITAS,                              config: { format: 'currency' },                                        layout: { x: 0, y: 2, w: 6, h: 4 } },
      { id: bid(), type: 'pie',   title: 'Composição de Despesas',dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: DESPESAS,                              config: { format: 'currency' },                                        layout: { x: 6, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'speedometer', title: 'Margem vs Meta', dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',   static_data: [{ label: 'Total', value: 84 }],        config: { gauge_max: 100, color: '#16a34a', format: 'percent' },       layout: { x: 9, y: 2, w: 3, h: 4 } },
      { id: bid(), type: 'area',  title: 'Fluxo de Caixa',       dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',   static_data: RECEITAS,                              config: { color: '#16a34a', format: 'currency' },                      layout: { x: 0, y: 6, w: 6, h: 4 } },
      { id: bid(), type: 'bar_h', title: 'Maiores Despesas',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: DESPESAS,                              config: { format: 'currency' },                                        layout: { x: 6, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'gauge', title: 'ROI',                   dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'avg',  static_data: [{ label: 'Total', value: 71 }],        config: { gauge_max: 100, color: '#8b5cf6', format: 'percent' },       layout: { x: 9, y: 6, w: 3, h: 4 } },
      { id: bid(), type: 'bar',   title: 'Receita por Área',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: CATEGORIAS,                            config: { format: 'currency' },                                        layout: { x: 0, y: 10, w: 5, h: 4 } },
      { id: bid(), type: 'table', title: 'DRE Simplificado',      dataset_id: '__onboarding__', label_col: null, value_col: null, agg: 'sum',  static_data: DESPESAS,                              config: { format: 'currency' },                                        layout: { x: 5, y: 10, w: 7, h: 4 } },
    ],
  },
]
