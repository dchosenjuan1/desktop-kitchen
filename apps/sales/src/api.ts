const BASE = import.meta.env.VITE_API_URL || ''

function getToken(): string | null {
  return localStorage.getItem('sales_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('sales_token')
    localStorage.removeItem('sales_rep')
    window.location.hash = '#/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }

  return res.json()
}

// Auth
export const login = (email: string, password: string) =>
  request<import('./types').LoginResponse>('/api/sales/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

// Rep
export const getProfile = () =>
  request<import('./types').ProfileResponse>('/api/sales/me')

export const getProspects = (params?: { status?: string; search?: string }) => {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.search) q.set('search', params.search)
  const qs = q.toString()
  return request<import('./types').Prospect[]>(`/api/sales/prospects${qs ? `?${qs}` : ''}`)
}

export const createProspect = (data: Record<string, unknown>) =>
  request<import('./types').Prospect>('/api/sales/prospects', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateProspect = (id: string, data: Record<string, unknown>) =>
  request<import('./types').Prospect>(`/api/sales/prospects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const getCommissions = () =>
  request<import('./types').Commission[]>('/api/sales/commissions')

// Manager
export const getManagerReps = () =>
  request<import('./types').RepWithStats[]>('/api/sales/manager/reps')

export const getManagerProspects = (params?: { rep_id?: string; status?: string }) => {
  const q = new URLSearchParams()
  if (params?.rep_id) q.set('rep_id', params.rep_id)
  if (params?.status) q.set('status', params.status)
  const qs = q.toString()
  return request<import('./types').Prospect[]>(`/api/sales/manager/prospects${qs ? `?${qs}` : ''}`)
}

export const getManagerCommissions = (params?: { status?: string; rep_id?: string }) => {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.rep_id) q.set('rep_id', params.rep_id)
  const qs = q.toString()
  return request<import('./types').Commission[]>(`/api/sales/manager/commissions${qs ? `?${qs}` : ''}`)
}

export const updateCommission = (id: string, data: { status: string; notes?: string }) =>
  request<import('./types').Commission>(`/api/sales/manager/commissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const createRep = (data: { full_name: string; email: string; phone?: string; is_manager?: boolean; password?: string }) =>
  request<import('./types').SalesRep>('/api/sales/manager/reps', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const setRepPassword = (id: string, password: string) =>
  request<{ success: boolean }>(`/api/sales/manager/reps/${id}/set-password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  })

export const getVelocity = (months?: number) => {
  const q = new URLSearchParams()
  if (months) q.set('months', String(months))
  const qs = q.toString()
  return request<import('./types').VelocityData>(`/api/sales/manager/velocity${qs ? `?${qs}` : ''}`)
}

// Demo data
export const generateDemo = (prospectId: string) =>
  request<{ run_id: string; summary: Record<string, number> }>('/api/sales/demo/generate', {
    method: 'POST',
    body: JSON.stringify({ prospect_id: prospectId }),
  })

export const getDemoStatus = (prospectId: string) =>
  request<import('./types').DemoStatusResponse>(`/api/sales/demo/status/${prospectId}`)

export const deleteDemo = (prospectId: string) =>
  request<{ deleted: Record<string, number> }>(`/api/sales/demo/${prospectId}`, { method: 'DELETE' })
