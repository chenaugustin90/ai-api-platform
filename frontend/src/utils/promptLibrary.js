export const PROMPT_LIBRARY_KEY = 'prompt_library_items'
export const RECENT_PROMPTS_KEY = 'prompt_library_recent'

export const PROMPT_CATEGORIES = ['Product', 'Marketing', 'Image', 'Video', 'Code', 'Research']

export function readPromptLibrary() {
  try {
    return JSON.parse(localStorage.getItem(PROMPT_LIBRARY_KEY) || '[]')
  } catch {
    return []
  }
}

export function writePromptLibrary(items) {
  localStorage.setItem(PROMPT_LIBRARY_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('prompt-library-updated'))
  return items
}

export function savePromptToLibrary(prompt, options = {}) {
  const cleanPrompt = prompt.trim()
  if (!cleanPrompt) return readPromptLibrary()
  const existing = readPromptLibrary().filter((item) => item.prompt !== cleanPrompt)
  const item = {
    id: options.id || crypto.randomUUID(),
    title: options.title || cleanPrompt.slice(0, 58),
    prompt: cleanPrompt,
    category: options.category || inferCategory(cleanPrompt),
    favorite: Boolean(options.favorite),
    createdAt: options.createdAt || Date.now(),
    updatedAt: Date.now(),
  }
  return writePromptLibrary([item, ...existing].slice(0, 80))
}

export function togglePromptFavorite(id) {
  return writePromptLibrary(readPromptLibrary().map((item) => (
    item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item
  )))
}

export function removePromptFromLibrary(id) {
  return writePromptLibrary(readPromptLibrary().filter((item) => item.id !== id))
}

export function readRecentPrompts() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PROMPTS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveRecentPromptGlobal(prompt) {
  const cleanPrompt = prompt.trim()
  if (!cleanPrompt) return readRecentPrompts()
  const next = [
    { id: crypto.randomUUID(), prompt: cleanPrompt, createdAt: Date.now() },
    ...readRecentPrompts().filter((item) => item.prompt !== cleanPrompt)
  ].slice(0, 12)
  localStorage.setItem(RECENT_PROMPTS_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('prompt-library-updated'))
  return next
}

export function inferCategory(prompt) {
  const text = prompt.toLowerCase()
  if (text.includes('image') || text.includes('render') || text.includes('cinematic')) return 'Image'
  if (text.includes('video') || text.includes('motion') || text.includes('dolly')) return 'Video'
  if (text.includes('code') || text.includes('api') || text.includes('debug')) return 'Code'
  if (text.includes('campaign') || text.includes('launch') || text.includes('copy')) return 'Marketing'
  if (text.includes('research') || text.includes('compare') || text.includes('analyze')) return 'Research'
  return 'Product'
}
