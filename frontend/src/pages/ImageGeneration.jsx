import { Copy, Download, Expand, Heart, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import AiLoading from '../components/AiLoading'
import EmptyState from '../components/EmptyState'
import PromptHistory, { saveRecentPrompt } from '../components/PromptHistory'
import { GlassButton, GlassCard, GlassInput, GlassSelect, GlassTextarea } from '../components/ui'

const IMAGE_PROMPT_HISTORY_KEY = 'image_prompt_history'
const IMAGE_EXAMPLES = [
  'A translucent AI data cathedral under blue cinematic light',
  'VisionOS style product render of a glass neural engine',
  'Futuristic SaaS dashboard floating inside liquid glass'
]

export default function ImageGeneration() {
  const [form, setForm] = useState({ provider: 'openai', model: 'gpt-image-2', prompt: '', size: '1024x1024' })
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    await generate(form.prompt)
  }

  async function generate(prompt) {
    setError('')
    setLoading(true)
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'generating' } }))
    try {
      const result = await api('/api/generate/image', {
        method: 'POST',
        body: JSON.stringify({
          provider: form.provider,
          model: form.model || null,
          prompt,
          size: form.size
        })
      })
      const image = {
        id: result.id || crypto.randomUUID(),
        prompt,
        provider: result.provider,
        model: result.model || form.model,
        status: result.status,
        output_url: result.output_url || result.image_url || result.url || result.image_urls?.[0] || null
      }
      setImages((current) => [image, ...current])
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
          <div className="lg-pill text-xs">{form.provider} / {form.size}</div>
        </div>

        <GlassTextarea
          className="studio-prompt"
          placeholder="Describe an ultra-detailed AI image... cinematic lighting, material, camera, mood, composition"
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <GlassSelect value={form.provider} options={['openai', 'flux']} onChange={(e) => setForm({ ...form, provider: e.target.value, model: e.target.value === 'openai' ? 'gpt-image-2' : 'flux-2-pro-preview' })} />
          <GlassInput placeholder="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <GlassInput placeholder="Model override" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
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
            <h2 className="text-2xl font-bold text-white">Generated images</h2>
          </div>
          <p className="muted text-sm">{images.length} in this session</p>
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
              <ImageCard key={`${image.id}-${index}`} image={image} onRegenerate={() => generate(image.prompt)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ImageCard({ image, onRegenerate }) {
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
        <div className="image-card-overlay">
        <div>
          <p className="line-clamp-2 text-sm font-semibold text-white">{image.prompt}</p>
          <p className="mt-1 text-xs text-[#A1A1AA]">{image.provider} / {image.model}</p>
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
        </div>
      </div>
    </GlassCard>
  )
}
