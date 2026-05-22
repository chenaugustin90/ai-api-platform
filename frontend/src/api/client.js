const configuredApiUrl = (import.meta.env.VITE_API_URL || 'https://ai-api-platform-pnut.onrender.com').replace(/\/$/, '')
export const API_URL = resolveApiUrl(configuredApiUrl)
export const MOCK_PROVIDERS_ENABLED = import.meta.env.VITE_ALLOW_MOCK_PROVIDERS === 'true'

function resolveApiUrl(configuredUrl) {
  if (typeof window === 'undefined') return configuredUrl

  try {
    const apiUrl = new URL(configuredUrl)
    const pageHost = window.location.hostname
    const apiIsLocalhost = ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname)
    const pageIsLocalhost = ['localhost', '127.0.0.1', '::1'].includes(pageHost)

    if (apiIsLocalhost && !pageIsLocalhost) {
      apiUrl.hostname = pageHost
      apiUrl.port = apiUrl.port || '8002'
      apiUrl.protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
      return apiUrl.toString().replace(/\/$/, '')
    }
  } catch {
    return configuredUrl
  }

  return configuredUrl
}

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

export async function apiKeyRequest(path, apiKey, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(body)
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
  if (detail?.provider && detail?.error) return `${detail.provider} request failed. Check provider configuration, model access, and quota.`
  if (detail?.message) return detail.message
  return 'Request failed. Please check provider configuration, model access, and credits.'
}
