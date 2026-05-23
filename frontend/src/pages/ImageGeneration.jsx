import { Copy, Download, Expand, Heart, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import AiLoading from '../components/AiLoading'
import EmptyState from '../components/EmptyState'
import PromptHistory, { saveRecentPrompt } from '../components/PromptHistory'
import { GlassButton, GlassCard, GlassInput, GlassSelect, GlassTextarea } from '../components/ui'

const IMAGE_PROMPT_HISTORY_KEY = 'image_prompt_history'
const IMAGE_HISTORY_DB = 'ai_api_platform_image_history'
const IMAGE_HISTORY_KEY = 'image_generation_history'
const IMAGE_HISTORY_LIMIT = 48
const IMAGE_EXAMPLES = [
  'A translucent AI data cathedral under blue cinematic light',
  'VisionOS style product render of a glass neural engine',
  'Futuristic SaaS dashboard floating inside liquid glass'
]
const ASPECT_RATIO_OPTIONS = [
  { value: '1024x1024', label: 'Square 1:1' },
  { value: '1536x1024', label: 'Landscape 3:2' },
  { value: '1024x1536', label: 'Portrait 2:3' },
  { value: 'auto', label: 'Auto ratio' }
]
const STYLE_OPTIONS = [
  { value: 'auto', label: 'Style auto' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'photoreal', label: 'Photoreal' },
  { value: 'product', label: 'Product render' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'minimal', label: 'Minimal glass' }
]
const COUNT_OPTIONS = [
  { value: '1', label: '1 image' },
  { value: '2', label: '2 images' },
  { value: '3', label: '3 images' },
  { value: '4', label: '4 images' }
]
const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Auto quality' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]
const STYLE_PROMPTS = {
  cinematic: 'Cinematic lighting, premium composition, rich depth, refined color grading.',
  photoreal: 'Photorealistic rendering, natural materials, realistic optics, high detail.',
  product: 'Premium product render, clean studio lighting, precise materials, commercial polish.',
  illustration: 'Editorial illustration style, expressive shapes, sophisticated color, polished finish.',
  minimal: 'Minimal Apple VisionOS liquid glass aesthetic, airy composition, subtle translucency.'
}

export default function ImageGeneration() {
  const [form, setForm] = useState({ provider: 'openai', model: 'gpt-image-2', prompt: '', size: '1024x1024', style: 'auto', count: '1', quality: 'auto' })
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    loadImageHistory().then((history) => {
      if (mounted) setImages(history)
    })
    return () => {
      mounted = false
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    await generate(form.prompt, form)
  }

  async function generate(prompt, route = form) {
    setError('')
    setLoading(true)
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'generating' } }))
    try {
      const result = await api('/api/generate/image', {
        method: 'POST',
        body: JSON.stringify({
          provider: route.provider,
          model: route.model || null,
          prompt: buildStyledPrompt(prompt, route.style),
          size: route.size || '1024x1024',
          quality: route.quality || 'auto',
          count: Number(route.count) || 1
        })
      })
      const imageUrls = result.image_urls?.length ? result.image_urls : [result.output_url || result.image_url || result.url || result.image_urls?.[0]].filter(Boolean)
      const generatedImages = imageUrls.map((outputUrl, index) => ({
        id: `${result.id || crypto.randomUUID()}-${index}`,
        prompt,
        provider: result.provider,
        model: result.model || route.model,
        size: route.size || '1024x1024',
        style: route.style || 'auto',
        count: '1',
        quality: route.quality || 'auto',
        status: result.status,
        output_url: outputUrl,
        created_at: new Date().toISOString()
      }))
      updateImages((current) => [...generatedImages, ...current].slice(0, IMAGE_HISTORY_LIMIT))
      saveRecentPrompt(IMAGE_PROMPT_HISTORY_KEY, prompt)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
    }
  }

  function reusePrompt(prompt) {
    setForm((current) => ({ ...current, prompt }))
  }

  function updateImages(updater) {
    setImages((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      saveImageHistory(next)
      return next
    })
  }

  function deleteImage(id) {
    updateImages((current) => current.filter((image) => image.id !== id))
  }

  return (
    <div className="image-studio space-y-8">
      <div className="relative">
        <p className="eyebrow mb-2">AI Studio</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">Image generation</h1>
        <p className="muted mt-3 max-w-2xl text-sm">Compose cinematic prompts, route across OpenAI or FLUX, and collect generations in a glass masonry board.</p>
      </div>

      <GlassCard as="form" className="studio-composer" onSubmit={submit}>
        <div className="composer-toolbar">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="composer-spark"><Sparkles className="h-4 w-4" /></span>
            Prompt Studio
          </div>
          <div className="lg-pill text-xs">{form.provider} / {form.size} / {form.quality}</div>
        </div>

        <GlassTextarea
          className="studio-prompt"
          placeholder="Describe an ultra-detailed AI image... cinematic lighting, material, camera, mood, composition"
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <GlassSelect value={form.provider} options={['openai', 'flux']} onChange={(e) => setForm({ ...form, provider: e.target.value, model: e.target.value === 'openai' ? 'gpt-image-2' : 'flux-2-pro-preview' })} />
          <GlassSelect value={form.size} options={ASPECT_RATIO_OPTIONS} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <GlassInput placeholder="Model override" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <GlassSelect value={form.style} options={STYLE_OPTIONS} onChange={(e) => setForm({ ...form, style: e.target.value })} />
          <GlassSelect value={form.count} options={COUNT_OPTIONS} onChange={(e) => setForm({ ...form, count: e.target.value })} />
          <GlassSelect value={form.quality} options={QUALITY_OPTIONS} onChange={(e) => setForm({ ...form, quality: e.target.value })} />
        </div>

        <div className="sticky-action-row grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <p className="muted flex items-center text-xs">Uses your logged-in session automatically. API keys are managed separately for external apps.</p>
          <GlassButton type="submit" className="studio-generate" disabled={loading || !form.prompt.trim()}>
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {loading ? 'Generating' : 'Generate'}
          </GlassButton>
        </div>

        {loading && <AiLoading label="Diffusing pixels" detail="Balancing prompt details, provider route, and mock-safe image output..." />}
        {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
      </GlassCard>

      <PromptHistory storageKey={IMAGE_PROMPT_HISTORY_KEY} examples={IMAGE_EXAMPLES} onReuse={reusePrompt} />

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="eyebrow mb-2">Gallery</p>
            <h2 className="text-2xl font-bold text-white">Image history</h2>
          </div>
          <p className="muted text-sm">{images.length} saved locally</p>
        </div>

        {images.length === 0 ? (
          <EmptyState
            title="No generated images yet"
            description="Start with a cinematic prompt or reuse one of these examples to fill the studio wall."
            examples={IMAGE_EXAMPLES}
            onExample={reusePrompt}
            actionLabel="Compose, generate, collect"
          />
        ) : (
          <div className="masonry-gallery">
            {images.map((image, index) => (
              <ImageCard
                key={`${image.id}-${index}`}
                image={image}
                onRegenerate={() => generate(image.prompt, { ...image, count: '1' })}
                onDelete={() => deleteImage(image.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ImageCard({ image, onRegenerate, onDelete }) {
  const [favorite, setFavorite] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  async function copyImageUrl() {
    if (!image.output_url) return
    await navigator.clipboard?.writeText(image.output_url)
    setCopiedUrl(true)
    window.setTimeout(() => setCopiedUrl(false), 1400)
  }

  function fullscreen() {
    if (image.output_url) window.open(image.output_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <GlassCard as="article" variant="media" className="image-card" data-magnetic>
      {image.output_url ? (
        <img src={image.output_url} alt={image.prompt} />
      ) : (
        <div className="flex aspect-square items-center justify-center text-sm text-[#A1A1AA]">{image.status}</div>
      )}
      <div className="image-card-caption">
        <p className="line-clamp-2 text-sm font-semibold text-white">{image.prompt}</p>
        <p className="mt-1 text-xs text-[#A1A1AA]">{image.provider} / {image.model}{image.created_at ? ` / ${formatImageDate(image.created_at)}` : ''}</p>
      </div>
      <div className="image-card-overlay">
        <div>
          <p className="line-clamp-2 text-sm font-semibold text-white">{image.prompt}</p>
          <p className="mt-1 text-xs text-[#A1A1AA]">{image.provider} / {image.model}{image.created_at ? ` / ${formatImageDate(image.created_at)}` : ''}</p>
        </div>
        <div className="image-card-actions flex gap-2">
          <GlassButton variant="ghost" size="icon" className={`image-action ${favorite ? 'is-active' : ''}`} type="button" onClick={() => setFavorite((current) => !current)} aria-label="Favorite image">
            <Heart className="h-4 w-4" />
          </GlassButton>
          {image.output_url && (
            <GlassButton as="a" variant="ghost" size="icon" className="image-action" href={image.output_url} download target="_blank" rel="noreferrer" aria-label="Download image">
              <Download className="h-4 w-4" />
            </GlassButton>
          )}
          <GlassButton variant="ghost" size="icon" className={`image-action ${copiedUrl ? 'is-active' : ''}`} type="button" onClick={copyImageUrl} disabled={!image.output_url} aria-label="Copy image URL">
            <Copy className="h-4 w-4" />
          </GlassButton>
          <GlassButton variant="ghost" size="icon" className="image-action" type="button" onClick={fullscreen} disabled={!image.output_url} aria-label="Open fullscreen">
            <Expand className="h-4 w-4" />
          </GlassButton>
          <GlassButton variant="ghost" size="icon" className="image-action" type="button" onClick={onRegenerate} aria-label="Regenerate image">
            <RefreshCw className="h-4 w-4" />
          </GlassButton>
          <GlassButton variant="ghost" size="icon" className="image-action image-action-danger" type="button" onClick={onDelete} aria-label="Delete image">
            <Trash2 className="h-4 w-4" />
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  )
}

async function loadImageHistory() {
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

function loadLocalStorageImageHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(IMAGE_HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((image) => image?.output_url).slice(0, IMAGE_HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

async function saveImageHistory(images) {
  const history = images.slice(0, IMAGE_HISTORY_LIMIT)
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await openImageHistoryDb()
      await replaceAllImages(db, history)
      return
    } catch {
      saveLocalStorageImageHistory(history)
      return
    }
  }
  saveLocalStorageImageHistory(history)
}

function saveLocalStorageImageHistory(images) {
  try {
    localStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(images.slice(0, IMAGE_HISTORY_LIMIT)))
  } catch {
    // Large base64 image history can exceed browser storage. Keep the UI usable.
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

function sortNewestFirst(a, b) {
  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
}

function buildStyledPrompt(prompt, style) {
  const stylePrompt = STYLE_PROMPTS[style]
  return stylePrompt ? `${prompt}\n\nStyle direction: ${stylePrompt}` : prompt
}

function formatImageDate(value) {
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'saved'
  }
}
