export const API_URL = (import.meta.env.VITE_API_URL || 'https://ai-api-platform-pnut.onrender.com').replace(/\/$/, '')
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
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : JSON.stringify(data?.detail || data))
  }
  return data
}

export async function apiKeyRequest(path, apiKey, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(body)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
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
