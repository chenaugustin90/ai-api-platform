const injectedEnv = typeof process !== 'undefined' ? process.env || {} : {}
const configuredApiUrl = (
  injectedEnv.BACKEND_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '')
export const API_URL = configuredApiUrl
export const FRONTEND_URL = (
  injectedEnv.FRONTEND_URL ||
  import.meta.env.VITE_FRONTEND_URL ||
  ''
).replace(/\/$/, '')
export const MOCK_PROVIDERS_ENABLED = import.meta.env.VITE_ALLOW_MOCK_PROVIDERS === 'true'

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

export async function api(path, options = {}) {
  if (!API_URL) throw new Error('Missing BACKEND_URL. Configure the production backend URL before using the API.')
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const text = await response.text()
  const data = safeParseJson(text)
  if (!response.ok) {
    throw new Error(formatApiError(data))
  }
  return data
}

export async function apiKeyRequest(path, apiKey, body, options = {}) {
  if (!API_URL) throw new Error('Missing BACKEND_URL. Configure the production backend URL before using the API.')
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(body),
    signal: options.signal
  })
  const text = await response.text()
  const data = safeParseJson(text)
  if (!response.ok) throw new Error(formatApiError(data))
  return data
}

export async function getOrCreateDevelopmentApiKey() {
  const cached = localStorage.getItem('development_api_key')
  if (cached) return cached

  const created = await api('/api/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name: `Development mock key ${new Date().toISOString()}` })
  })
  localStorage.setItem('development_api_key', created.key)
  return created.key
}

function safeParseJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

function formatApiError(data) {
  const detail = data?.detail || data
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message || 'Invalid request').join(', ')
  if (detail?.provider && detail?.message) return detail.message
  if (detail?.provider && detail?.error) return `${detail.provider} request failed. Check provider configuration, model access, and quota.`
  if (detail?.code === 'stripe_not_configured' && Array.isArray(detail.missing)) return `${detail.message} Missing: ${detail.missing.join(', ')}.`
  if (detail?.message) return detail.message
  return 'Request failed. Please check provider configuration, model access, and credits.'
}
