const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('jarbis_token')
}

async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jarbis_token')
      localStorage.removeItem('jarbis_user')
      window.location.href = '/login'
    }
    return
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error(error.detail || 'Erro na requisição')
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') return null
  return response.json()
}

function buildQS(params) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) v.forEach(item => qs.append(k, item))
    else qs.set(k, String(v))
  })
  return qs.toString()
}

export const api = {
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (name, email, password) =>
    apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  me: () => apiFetch('/auth/me'),

  users: {
    list: () => apiFetch('/auth/users'),
    invite: (data) => apiFetch('/auth/users/invite', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  vehicles: {
    list: (params = {}) => apiFetch(`/vehicles?${buildQS(params)}`),
    get: (id) => apiFetch(`/vehicles/${id}`),
    enrich: (id, overwrite = false) => apiFetch(`/vehicles/${id}/enrich?overwrite=${overwrite}`, { method: 'POST' }),
  },

  municipios: {
    list: (params = {}) => apiFetch(`/municipios?${buildQS(params)}`),
    get: (codigo) => apiFetch(`/municipios/${codigo}`),
    bulk: (codes) => apiFetch(`/municipios/bulk?codes=${codes.join(',')}`),
  },

  reports: {
    list: () => apiFetch('/reports'),
    get: (id) => apiFetch(`/reports/${id}`),
    create: (data) => apiFetch('/reports', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/reports/${id}`, { method: 'DELETE' }),
    share: (id) => apiFetch(`/reports/${id}/share`, { method: 'POST' }),
    public: (token) => apiFetch(`/reports/public/${token}`),
    data: (source, params = {}) => apiFetch(`/reports/data/${source}?${buildQS(params)}`),
    datasets: {
      list: () => apiFetch('/reports/datasets'),
      upload: (formData) =>
        fetch(`${API_URL}/reports/datasets/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        }).then(async (r) => {
          if (r.status === 401) { localStorage.removeItem('lumetra_token'); window.location.href = '/login'; return }
          if (!r.ok) { const e = await r.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
          return r.json()
        }),
      createApi: (data) => apiFetch('/reports/datasets/api', { method: 'POST', body: JSON.stringify(data) }),
      sync: (id) => apiFetch(`/reports/datasets/${id}/sync`, { method: 'POST' }),
      setSchedule: (id, intervalMinutes) => apiFetch(`/reports/datasets/${id}/schedule`, { method: 'PATCH', body: JSON.stringify({ refresh_interval_minutes: intervalMinutes }) }),
      delete: (id) => apiFetch(`/reports/datasets/${id}`, { method: 'DELETE' }),
      query: (id, labelCol, valueCol, agg = 'sum', filterCol = null, filterVal = null, dateCol = null, dateFrom = null, dateTo = null) =>
        apiFetch(`/reports/datasets/${id}/query?${buildQS({ label_col: labelCol, value_col: valueCol, agg, filter_col: filterCol, filter_val: filterVal, date_col: dateCol, date_from: dateFrom, date_to: dateTo })}`),
    },
    alerts: {
      list: () => apiFetch('/reports/alerts'),
      create: (data) => apiFetch('/reports/alerts', { method: 'POST', body: JSON.stringify(data) }),
      check: (id) => apiFetch(`/reports/alerts/${id}/check`, { method: 'POST' }),
      toggle: (id, isActive) => apiFetch(`/reports/alerts/${id}?is_active=${isActive}`, { method: 'PATCH' }),
      delete: (id) => apiFetch(`/reports/alerts/${id}`, { method: 'DELETE' }),
    },
    aiQuery: (datasetId, question) =>
      apiFetch('/reports/ai-query', { method: 'POST', body: JSON.stringify({ dataset_id: datasetId, question }) }),
    publicQuery: (token, id, labelCol, valueCol, agg = 'sum', filterCol = null, filterVal = null, dateCol = null, dateFrom = null, dateTo = null) =>
      fetch(`${API_URL}/reports/public/${token}/datasets/${id}/query?${buildQS({ label_col: labelCol, value_col: valueCol, agg, filter_col: filterCol, filter_val: filterVal, date_col: dateCol, date_from: dateFrom, date_to: dateTo })}`)
        .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Erro') })),
  },

  ooh: {
    template: () => `${API_URL}/ooh/template.csv`,
    uploadCsv: (formData) =>
      fetch(`${API_URL}/ooh/campaigns/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      }).then(async (r) => {
        if (r.status === 401) { localStorage.removeItem('lumetra_token'); window.location.href = '/login'; return }
        if (!r.ok) { const e = await r.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
        return r.json()
      }),
    campaigns: {
      list: () => apiFetch('/ooh/campaigns'),
      get: (id) => apiFetch(`/ooh/campaigns/${id}`),
      createShare: (id) => apiFetch(`/ooh/campaigns/${id}/share`, { method: 'POST' }),
      revokeShare: (id) => apiFetch(`/ooh/campaigns/${id}/share`, { method: 'DELETE' }),
    },
    public: (token) => apiFetch(`/ooh/share/${token}`),
  },

  social: {
    sync: (vehicleId) => apiFetch(`/social/sync/${vehicleId}`, { method: 'POST' }),
  },

  audience: {
    ranking: (params = {}) => apiFetch(`/audience/ranking?${buildQS(params)}`),
    compare: (ids) => apiFetch(`/audience/compare?${ids.map(id => `ids=${id}`).join('&')}`),
  },

  analytics: {
    dashboard: () => apiFetch('/analytics/dashboard'),
  },

  luzmo: {
    embedToken: (dashboardId) =>
      apiFetch('/analytics/luzmo/embed-token', {
        method: 'POST',
        body: JSON.stringify({ dashboard_id: dashboardId }),
      }),
  },

  organograma: {
    list: () => apiFetch('/organograma'),
    create: (data) => apiFetch('/organograma', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/organograma/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/organograma/${id}`, { method: 'DELETE' }),
    getShare: () => apiFetch('/organograma/share'),
    createShare: () => apiFetch('/organograma/share', { method: 'POST' }),
    revokeShare: () => apiFetch('/organograma/share', { method: 'DELETE' }),
    public: (token) => apiFetch(`/organograma/public/${token}`),
  },

  clients: {
    list: () => apiFetch('/clients'),
    get: (id) => apiFetch(`/clients/${id}`),
    create: (data) => apiFetch('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/clients/${id}`, { method: 'DELETE' }),
    plans: (id) => apiFetch(`/clients/${id}/plans`),
  },

  mediaPlans: {
    list: () => apiFetch('/media-plans'),
    materialItems: () => apiFetch('/media-plans/items/material'),
    get: (id) => apiFetch(`/media-plans/${id}`),
    delete: (id) => apiFetch(`/media-plans/${id}`, { method: 'DELETE' }),
    updateItem: (planId, itemId, data) =>
      apiFetch(`/media-plans/${planId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    upload: (formData) =>
      fetch(`${API_URL}/media-plans/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      }).then(async (r) => {
        if (r.status === 401) { localStorage.removeItem('lumetra_token'); window.location.href = '/login'; return }
        if (!r.ok) { const e = await r.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
        return r.json()
      }),
  },

  importers: {
    anatel: {
      trigger: () => apiFetch('/importers/anatel', { method: 'POST' }),
      status: () => apiFetch('/importers/anatel/status'),
    },
    ibge: {
      trigger: () => apiFetch('/importers/ibge', { method: 'POST' }),
      status: () => apiFetch('/importers/ibge/status'),
    },
    cnpjEnrich: {
      trigger: (overwrite = false) => apiFetch(`/importers/cnpj-enrich?overwrite=${overwrite}`, { method: 'POST' }),
      status: () => apiFetch('/importers/cnpj-enrich/status'),
    },
  },
}
