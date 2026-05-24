import { Copy, Image, RefreshCw, Search, Share2, Sparkles, Trash2, Type } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../components/ToastProvider'
import { GlassButton, GlassCard, GlassInput } from '../components/ui'
import { addImagesToHistory, deleteImageHistory, deleteTextGenerationHistory, loadImageHistory, loadTextGenerationHistory, saveTextGenerationHistory } from '../utils/generationHistory'
import { createShareLink } from '../utils/share'

const STYLE_PROMPTS = {
  cinematic: 'Cinematic lighting, premium composition, rich depth, refined color grading.',
  photoreal: 'Photorealistic rendering, natural materials, realistic optics, high detail.',
  product: 'Premium product render, clean studio lighting, precise materials, commercial polish.',
  illustration: 'Editorial illustration style, expressive shapes, sophisticated color, polished finish.',
  minimal: 'Minimal Apple VisionOS liquid glass aesthetic, airy composition, subtle translucency.'
}

export default function History() {
  const toast = useToast()
  const [textItems, setTextItems] = useState([])
  const [imageItems, setImageItems] = useState([])
  const [query, setQuery] = useState('')
  const [loadingId, setLoadingId] = useState('')
  const [sharingId, setSharingId] = useState('')

  useEffect(() => {
    refreshHistory()
  }, [])

  async function refreshHistory() {
    const [texts, images] = await Promise.all([
      Promise.resolve(loadTextGenerationHistory()),
      loadImageHistory()
    ])
    setTextItems(texts)
    setImageItems(images)
  }

  const filteredText = useMemo(() => filterItems(textItems, query), [textItems, query])
  const filteredImages = useMemo(() => filterItems(imageItems, query), [imageItems, query])

  async function regenerateText(item) {
    setLoadingId(item.id)
    try {
      const result = await api('/api/generate/text', {
        method: 'POST',
        body: JSON.stringify({
          provider: item.provider || 'openai',
          model: item.model || null,
          prompt: item.prompt,
          max_tokens: item.max_tokens || 512
        })
      })
      setTextItems(saveTextGenerationHistory({
        prompt: item.prompt,
        response: result.text || '',
        text: result.text || '',
        provider: result.provider,
        model: result.model,
        created_at: new Date().toISOString()
      }))
    } finally {
      setLoadingId('')
    }
  }

  async function regenerateImage(item) {
    setLoadingId(item.id)
    try {
      const result = await api('/api/generate/image', {
        method: 'POST',
        body: JSON.stringify({
          provider: item.provider || 'openai',
          model: item.model || 'gpt-image-2',
          prompt: buildStyledPrompt(item.prompt, item.style),
          size: item.size || '1024x1024',
          quality: item.quality || 'auto',
          count: 1
        })
      })
      const imageUrls = result.image_urls?.length ? result.image_urls : [result.output_url].filter(Boolean)
      const next = await addImagesToHistory(imageUrls.map((outputUrl, index) => ({
        id: `${result.id || crypto.randomUUID()}-${index}`,
        prompt: item.prompt,
        provider: result.provider,
        model: result.model,
        size: item.size || '1024x1024',
        style: item.style || 'auto',
        quality: item.quality || 'auto',
        count: '1',
        status: result.status,
        output_url: outputUrl,
        created_at: new Date().toISOString()
      })))
      setImageItems(next)
    } finally {
      setLoadingId('')
    }
  }

  function deleteText(id) {
    setTextItems(deleteTextGenerationHistory(id))
  }

  async function deleteImage(id) {
    setImageItems(await deleteImageHistory(id))
  }

  async function shareText(item) {
    setSharingId(item.id)
    try {
      await createShareLink({
        modality: 'text',
        prompt: item.prompt,
        text: item.response || item.text || '',
        provider: item.provider,
        model: item.model
      })
      toast.success('Share URL copied to clipboard.', 'Share link ready')
    } catch (err) {
      toast.error(err.message, 'Could not create share link')
    } finally {
      setSharingId('')
    }
  }

  async function shareImage(item) {
    setSharingId(item.id)
    try {
      await createShareLink({
        modality: 'image',
        prompt: item.prompt,
        output_url: item.output_url,
        provider: item.provider,
        model: item.model
      })
      toast.success('Share URL copied to clipboard.', 'Share link ready')
    } catch (err) {
      toast.error(err.message, 'Could not create share link')
    } finally {
      setSharingId('')
    }
  }

  return (
    <div className="history-page space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-2">Generation Archive</p>
          <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">History</h1>
          <p className="muted mt-3 max-w-2xl text-sm">Search saved text responses and locally stored image generations.</p>
        </div>
        <div className="history-search">
          <Search className="h-4 w-4" />
          <GlassInput placeholder="Search history..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      <HistorySection icon={Type} title="Text" count={filteredText.length}>
        {filteredText.length === 0 ? (
          <HistoryEmpty label="No saved text generations" />
        ) : (
          <div className="history-card-grid">
            {filteredText.map((item) => (
              <TextHistoryCard
                key={item.id}
                item={item}
                loading={loadingId === item.id}
                sharing={sharingId === item.id}
                onShare={() => shareText(item)}
                onRegenerate={() => regenerateText(item)}
                onDelete={() => deleteText(item.id)}
              />
            ))}
          </div>
        )}
      </HistorySection>

      <HistorySection icon={Image} title="Images" count={filteredImages.length}>
        {filteredImages.length === 0 ? (
          <HistoryEmpty label="No saved image generations" />
        ) : (
          <div className="history-image-grid">
            {filteredImages.map((item) => (
              <ImageHistoryCard
                key={item.id}
                item={item}
                loading={loadingId === item.id}
                sharing={sharingId === item.id}
                onShare={() => shareImage(item)}
                onRegenerate={() => regenerateImage(item)}
                onDelete={() => deleteImage(item.id)}
              />
            ))}
          </div>
        )}
      </HistorySection>
    </div>
  )
}

function HistorySection({ icon: Icon, title, count, children }) {
  return (
    <GlassCard as="section" className="history-section p-5">
      <div className="dashboard-section-head mb-4">
        <div className="flex items-center gap-3">
          <span className="composer-spark"><Icon className="h-4 w-4" /></span>
          <div>
            <p className="eyebrow mb-1">{title}</p>
            <h2 className="text-xl font-bold text-white">{count} saved</h2>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-[#00E5FF]" />
      </div>
      {children}
    </GlassCard>
  )
}

function TextHistoryCard({ item, loading, sharing, onShare, onRegenerate, onDelete }) {
  return (
    <article className="history-card">
      <div>
        <p className="history-prompt">{item.prompt}</p>
        <p className="history-response">{item.response || item.text}</p>
      </div>
      <HistoryMeta item={item} />
      <HistoryActions value={item.response || item.text || ''} loading={loading} sharing={sharing} onShare={onShare} onRegenerate={onRegenerate} onDelete={onDelete} />
    </article>
  )
}

function ImageHistoryCard({ item, loading, sharing, onShare, onRegenerate, onDelete }) {
  return (
    <article className="history-card history-image-card">
      <img src={item.output_url} alt={item.prompt} />
      <div>
        <p className="history-prompt">{item.prompt}</p>
        <p className="history-response">{item.size || '1024x1024'} / {item.style || 'auto'} / {item.quality || 'auto'}</p>
      </div>
      <HistoryMeta item={item} />
      <HistoryActions value={item.output_url || ''} loading={loading} sharing={sharing} onShare={onShare} onRegenerate={onRegenerate} onDelete={onDelete} />
    </article>
  )
}

function HistoryMeta({ item }) {
  return (
    <p className="history-meta">
      {item.provider || 'provider'} / {item.model || 'model'} / {formatDate(item.created_at)}
    </p>
  )
}

function HistoryActions({ value, loading, sharing, onShare, onRegenerate, onDelete }) {
  return (
    <div className="history-actions">
      <button type="button" onClick={() => navigator.clipboard?.writeText(value)} aria-label="Copy result">
        <Copy className="h-4 w-4" />
      </button>
      <button type="button" onClick={onShare} disabled={sharing} aria-label="Create share link">
        <Share2 className={`h-4 w-4 ${sharing ? 'animate-pulse' : ''}`} />
      </button>
      <button type="button" onClick={onRegenerate} disabled={loading} aria-label="Regenerate">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <button type="button" onClick={onDelete} aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function HistoryEmpty({ label }) {
  return <div className="history-empty">{label}</div>
}

function filterItems(items, query) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return items
  return items.filter((item) => [
    item.prompt,
    item.response,
    item.text,
    item.provider,
    item.model,
    item.style,
    item.quality
  ].filter(Boolean).join(' ').toLowerCase().includes(normalized))
}

function buildStyledPrompt(prompt, style) {
  const stylePrompt = STYLE_PROMPTS[style]
  return stylePrompt ? `${prompt}\n\nStyle direction: ${stylePrompt}` : prompt
}

function formatDate(value) {
  if (!value) return 'saved'
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
