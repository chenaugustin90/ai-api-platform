import { api } from '../api/client'

export async function createShareLink(payload) {
  const share = await api('/api/shares', {
    method: 'POST',
    body: JSON.stringify(normalizePayload(payload))
  })
  await navigator.clipboard?.writeText(share.url)
  return share
}

function normalizePayload(payload) {
  const base = {
    modality: payload.modality,
    prompt: payload.prompt || 'Untitled generation',
    provider: payload.provider || null,
    model: payload.model || null,
    title: payload.title || null
  }

  if (payload.modality === 'image') {
    return { ...base, output_url: payload.output_url || payload.url || null }
  }

  return { ...base, text: payload.text || payload.response || payload.result || '' }
}
