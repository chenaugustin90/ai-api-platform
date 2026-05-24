import { Copy, Download, Expand, Heart, RefreshCw, Share2, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import AiLoading from '../components/AiLoading'
import EmptyState from '../components/EmptyState'
import PromptHistory, { saveRecentPrompt } from '../components/PromptHistory'
import { useToast } from '../components/ToastProvider'
import { GlassButton, GlassCard, GlassInput, GlassSelect, GlassTextarea } from '../components/ui'
import { IMAGE_HISTORY_LIMIT, deleteImageHistory, loadImageHistory, saveImageHistory } from '../utils/generationHistory'
import { createShareLink } from '../utils/share'

const IMAGE_PROMPT_HISTORY_KEY = 'image_prompt_history'
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
  const toast = useToast()
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

  async function deleteImage(id) {
    const next = await deleteImageHistory(id)
    setImages(next)
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
                onShare={async () => {
                  try {
                    await createShareLink({
                      modality: 'image',
                      prompt: image.prompt,
                      output_url: image.output_url,
                      provider: image.provider,
                      model: image.model
                    })
                    toast.success('Share URL copied to clipboard.', 'Share link ready')
                  } catch (err) {
                    toast.error(err.message, 'Could not create share link')
                  }
                }}
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

function ImageCard({ image, onShare, onRegenerate, onDelete }) {
  const [favorite, setFavorite] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function copyImageUrl() {
    if (!image.output_url) return
    await navigator.clipboard?.writeText(image.output_url)
    setCopiedUrl(true)
    window.setTimeout(() => setCopiedUrl(false), 1400)
  }

  function fullscreen() {
    if (image.output_url) window.open(image.output_url, '_blank', 'noopener,noreferrer')
  }

  async function shareImage() {
    if (!image.output_url) return
    setSharing(true)
    try {
      await onShare()
    } finally {
      setSharing(false)
    }
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
          <GlassButton variant="ghost" size="icon" className={`image-action ${sharing ? 'is-active' : ''}`} type="button" onClick={shareImage} disabled={!image.output_url || sharing} aria-label="Create share link">
            <Share2 className={`h-4 w-4 ${sharing ? 'animate-pulse' : ''}`} />
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
