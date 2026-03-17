const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jarbis_user')
      localStorage.removeItem('jarbis_trial_days')
      window.location.href = '/login'
    }
    return
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }))
    const detail = error.detail
    const message = Array.isArray(detail)
      ? detail.map(e => e.msg || JSON.stringify(e)).join('; ')
      : (typeof detail === 'string' ? detail : 'Erro na requisição')
    if (response.status === 422) {
      console.error('[API 422] URL:', path, '| Erro:', message)
    }
    throw new Error(message)
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
  fetch: (path, options = {}) => apiFetch(path, options),

  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (name, email, password) =>
    apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  verifyEmail: (email, code) =>
    apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) }),

  resendVerification: (email) =>
    apiFetch('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  me: () => apiFetch('/auth/me'),

  users: {
    list: () => apiFetch('/auth/users'),
    invite: (data) => apiFetch('/auth/users/invite', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  reports: {
    list: () => apiFetch('/reports'),
    get: (id) => apiFetch(`/reports/${id}`),
    create: (data) => apiFetch('/reports', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/reports/${id}`, { method: 'DELETE' }),
    share: (id) => apiFetch(`/reports/${id}/share`, { method: 'POST' }),
    clone: (id) => apiFetch(`/reports/${id}/clone`, { method: 'POST' }),
    public: (token) => apiFetch(`/reports/public/${token}`),
    data: (source, params = {}) => apiFetch(`/reports/data/${source}?${buildQS(params)}`),
    datasets: {
      list: () => apiFetch('/reports/datasets'),
      upload: (formData) =>
        fetch(`${API_URL}/reports/datasets/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }).then(async (r) => {
          if (r.status === 401) { localStorage.removeItem('jarbis_user'); window.location.href = '/login'; return }
          if (!r.ok) { const e = await r.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
          return r.json()
        }),
      createApi: (data) => apiFetch('/reports/datasets/api', { method: 'POST', body: JSON.stringify(data) }),
      sync: (id) => apiFetch(`/reports/datasets/${id}/sync`, { method: 'POST' }),
      setSchedule: (id, intervalMinutes) => apiFetch(`/reports/datasets/${id}/schedule`, { method: 'PATCH', body: JSON.stringify({ refresh_interval_minutes: intervalMinutes }) }),
      delete: (id) => apiFetch(`/reports/datasets/${id}`, { method: 'DELETE' }),
      // Query v1 — legado (mantido para compatibilidade)
      query: (id, labelCol, valueCol, agg = 'sum', filterCol = null, filterVal = null, dateCol = null, dateFrom = null, dateTo = null) =>
        apiFetch(`/reports/datasets/${id}/query?${buildQS({ label_col: labelCol, value_col: valueCol, agg, filter_col: filterCol, filter_val: filterVal, date_col: dateCol, date_from: dateFrom, date_to: dateTo })}`),
      // Query v2 — motor estruturado (dimensões, métricas, filtros, date_range)
      queryV2: (id, req) =>
        apiFetch(`/reports/datasets/${id}/query`, { method: 'POST', body: JSON.stringify(req) }),
      // Colunas com tipos detectados automaticamente
      columns: (id) => apiFetch(`/reports/datasets/${id}/columns`),
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
    publicQueryV2: (token, id, req) =>
      fetch(`${API_URL}/reports/public/${token}/datasets/${id}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || 'Erro') })),
  },

  billing: {
    status: () => apiFetch('/billing/status'),
    checkout: (priceId) => apiFetch('/billing/checkout', { method: 'POST', body: JSON.stringify({ price_id: priceId }) }),
    portal: () => apiFetch('/billing/portal', { method: 'POST' }),
    addonCheckout: () => apiFetch('/billing/addon/checkout', { method: 'POST' }),
  },
}
