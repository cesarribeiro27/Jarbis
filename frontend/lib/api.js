const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path, options = {}) {
  const { _noSuborg, ...fetchOptions } = options
  options = fetchOptions
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
  const suborgId = !_noSuborg && typeof window !== 'undefined' ? localStorage.getItem('jarbis_suborg_id') : null
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(suborgId ? { 'X-Suborg-ID': suborgId } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 401) {
    // Em rotas de auth (login/signup/verify) o 401 significa credenciais erradas —
    // não redirecionar, apenas lançar o erro para o formulário exibir a mensagem.
    const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/signup') || path.startsWith('/auth/verify-email') || path.startsWith('/auth/resend')
    if (!isAuthRoute && typeof window !== 'undefined') {
      localStorage.removeItem('jarbis_user')
      localStorage.removeItem('jarbis_trial_days')
      localStorage.removeItem('jarbis_token')
      window.location.href = '/login'
      return
    }
    const errorData = await response.json().catch(() => ({}))
    const detail = errorData.detail
    const message = typeof detail === 'string' ? detail : 'Credenciais inválidas'
    throw new Error(message)
  }

  if (response.status === 429) {
    throw new Error('Muitas requisições. Aguarde um momento e tente novamente.')
  }

  if (response.status === 402 || response.status === 403) {
    const errorData = await response.json().catch(() => ({}))
    const detail = errorData.detail || {}
    const payload = typeof detail === 'object' ? detail : { code: 'error', message: String(detail) }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('upgrade-required', { detail: payload }))
    }
    throw new Error(payload.message || 'Acesso negado')
  }

  if (!response.ok) {
    const error = await response.json().catch(async () => {
      const raw = await response.text().catch(() => '')
      if (raw) console.error('[API] non-JSON response', response.status, response.url, raw.slice(0, 300))
      return { detail: response.status === 404 ? 'not found' : 'Erro desconhecido' }
    })
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

  signup: (name, email, password, ref = null, utms = {}) => {
    const qs = ref ? `?ref=${encodeURIComponent(ref)}` : ''
    return apiFetch(`/auth/signup${qs}`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password, ...utms }),
    })
  },

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
      upload: (formData) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
        return fetch(`${API_URL}/reports/datasets/upload`, {
          method: 'POST',
          credentials: 'include',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        }).then(async (r) => {
          if (r.status === 401) { localStorage.removeItem('jarbis_user'); window.location.href = '/login'; return }
          if (!r.ok) { const e = await r.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
          return r.json()
        })
      },
      fetchGoogleSheets: (url) =>
        apiFetch(`/reports/datasets/google-sheets-sheets?url=${encodeURIComponent(url)}`),
      getExcelSheets: (formData) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jarbis_token') : null
        return fetch(`${API_URL}/reports/datasets/excel-sheets`, {
          method: 'POST',
          credentials: 'include',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        }).then(async (r) => {
          if (!r.ok) { const e = await r.json().catch(() => ({ detail: 'Erro' })); throw new Error(e.detail) }
          return r.json()
        })
      },
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
      // Retorna (ou cria) o dataset de demonstração do tenant (sem contexto de sub-org)
      getOnboarding: () => apiFetch('/reports/onboarding-dataset', { _noSuborg: true }),
      // Linhas brutas paginadas
      rows: (id, limit = 50, offset = 0) => apiFetch(`/reports/datasets/${id}/rows?limit=${limit}&offset=${offset}`),
      // Renomear dataset
      update: (id, data) => apiFetch(`/reports/datasets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      // Remover coluna
      deleteColumn: (id, col) => apiFetch(`/reports/datasets/${id}/columns/${encodeURIComponent(col)}`, { method: 'DELETE' }),
      // Status do cache Warp
      warpStatus: (id) => apiFetch(`/reports/datasets/${id}/warp-status`),
    },
    alerts: {
      list: () => apiFetch('/reports/alerts'),
      create: (data) => apiFetch('/reports/alerts', { method: 'POST', body: JSON.stringify(data) }),
      check: (id) => apiFetch(`/reports/alerts/${id}/check`, { method: 'POST' }),
      toggle: (id, isActive) => apiFetch(`/reports/alerts/${id}?is_active=${isActive}`, { method: 'PATCH' }),
      delete: (id) => apiFetch(`/reports/alerts/${id}`, { method: 'DELETE' }),
    },
    collections: {
      list: () => apiFetch('/reports/collections'),
      create: (data) => apiFetch('/reports/collections', { method: 'POST', body: JSON.stringify(data) }),
      delete: (id) => apiFetch(`/reports/collections/${id}`, { method: 'DELETE' }),
      listReports: (id) => apiFetch(`/reports/collections/${id}/reports`),
      addReport: (collectionId, reportId) => apiFetch(`/reports/collections/${collectionId}/reports/${reportId}`, { method: 'POST' }),
      removeReport: (collectionId, reportId) => apiFetch(`/reports/collections/${collectionId}/reports/${reportId}`, { method: 'DELETE' }),
    },
    aiQuery: (datasetId, question) =>
      apiFetch('/reports/ai-query', { method: 'POST', body: JSON.stringify({ dataset_id: datasetId, question }) }),
    generateDashboard: (datasetId, objetivo) =>
      apiFetch('/reports/generate-dashboard', { method: 'POST', body: JSON.stringify({ dataset_id: datasetId, objetivo: objetivo || null }) }),
    aiUsage: () => apiFetch('/reports/ai-usage'),
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

  suborgs: {
    list: () => apiFetch('/tenants/sub-orgs'),
    create: (data) => apiFetch('/tenants/sub-orgs', { method: 'POST', body: JSON.stringify(data) }),
    get: (id) => apiFetch(`/tenants/sub-orgs/${id}`),
    update: (id, data) => apiFetch(`/tenants/sub-orgs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/tenants/sub-orgs/${id}`, { method: 'DELETE' }),
    switch: (id) => apiFetch(`/tenants/sub-orgs/${id}/switch`, { method: 'POST' }),
  },

  billing: {
    status: () => apiFetch('/billing/status'),
    checkout: (priceId) => apiFetch('/billing/checkout', { method: 'POST', body: JSON.stringify({ price_id: priceId }) }),
    checkoutByPlan: (plan) => apiFetch('/billing/checkout/plan', { method: 'POST', body: JSON.stringify({ plan }) }),
    portal: () => apiFetch('/billing/portal', { method: 'POST' }),
    addonCheckout: () => apiFetch('/billing/addon/checkout', { method: 'POST' }),
    addonDashCheckout: () => apiFetch('/billing/addon/dashboard/checkout', { method: 'POST' }),
    addonDatasetCheckout: () => apiFetch('/billing/addon/dataset/checkout', { method: 'POST' }),
    addonAiCheckout: () => apiFetch('/billing/addon/ai/checkout', { method: 'POST' }),
  },
}
