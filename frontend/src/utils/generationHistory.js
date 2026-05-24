export const TEXT_HISTORY_KEY = 'text_generation_history'
export const IMAGE_HISTORY_DB = 'ai_api_platform_image_history'
export const IMAGE_HISTORY_KEY = 'image_generation_history'
export const IMAGE_HISTORY_LIMIT = 48
export const TEXT_HISTORY_LIMIT = 100

export function loadTextGenerationHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEXT_HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.sort(sortNewestFirst).slice(0, TEXT_HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

export function saveTextGenerationHistory(record) {
  const next = [
    { ...record, id: record.id || crypto.randomUUID(), type: 'text', created_at: record.created_at || new Date().toISOString() },
    ...loadTextGenerationHistory()
  ].slice(0, TEXT_HISTORY_LIMIT)
  localStorage.setItem(TEXT_HISTORY_KEY, JSON.stringify(next))
  return next
}

export function deleteTextGenerationHistory(id) {
  const next = loadTextGenerationHistory().filter((item) => item.id !== id)
  localStorage.setItem(TEXT_HISTORY_KEY, JSON.stringify(next))
  return next
}

export async function loadImageHistory() {
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await openImageHistoryDb()
      const images = await readAllImages(db)
      return images.sort(sortNewestFirst).slice(0, IMAGE_HISTORY_LIMIT)
    } catch {
      return loadLocalStorageImageHistory()
    }
  }
  return loadLocalStorageImageHistory()
}

export async function saveImageHistory(images) {
  const history = images.slice(0, IMAGE_HISTORY_LIMIT)
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await openImageHistoryDb()
      await replaceAllImages(db, history)
      return history
    } catch {
      saveLocalStorageImageHistory(history)
      return history
    }
  }
  saveLocalStorageImageHistory(history)
  return history
}

export async function addImagesToHistory(images) {
  const current = await loadImageHistory()
  const next = [...images, ...current].slice(0, IMAGE_HISTORY_LIMIT)
  await saveImageHistory(next)
  return next
}

export async function deleteImageHistory(id) {
  const next = (await loadImageHistory()).filter((image) => image.id !== id)
  await saveImageHistory(next)
  return next
}

export function sortNewestFirst(a, b) {
  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
}

function loadLocalStorageImageHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(IMAGE_HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((image) => image?.output_url).slice(0, IMAGE_HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

function saveLocalStorageImageHistory(images) {
  try {
    localStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(images.slice(0, IMAGE_HISTORY_LIMIT)))
  } catch {
    // Large base64 image history can exceed browser storage. IndexedDB is the primary store.
  }
}

function openImageHistoryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_HISTORY_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readAllImages(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('images', 'readonly').objectStore('images').getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function replaceAllImages(db, images) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('images', 'readwrite')
    const store = transaction.objectStore('images')
    store.clear()
    images.forEach((image) => store.put(image))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
