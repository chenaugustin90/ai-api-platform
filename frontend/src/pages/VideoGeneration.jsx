import { Clapperboard, Copy, Expand, Heart, Video } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import AiLoading from '../components/AiLoading'
import EmptyState from '../components/EmptyState'
import PromptHistory, { saveRecentPrompt } from '../components/PromptHistory'
import { GlassButton, GlassCard, GlassInput, GlassSelect, GlassTextarea } from '../components/ui'

const VIDEO_PROMPT_HISTORY_KEY = 'video_prompt_history'
const VIDEO_EXAMPLES = [
  'A slow dolly shot through a glowing glass AI operations room',
  'Macro cinematic video of liquid light flowing through a neural chip',
  'A futuristic SaaS launch teaser with floating holographic charts'
]

export default function VideoGeneration() {
  const [form, setForm] = useState({ provider: 'runway', model: '', prompt: '', duration_seconds: 5 })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'generating' } }))
    try {
      setResult(await api('/api/generate/video', {
        method: 'POST',
        body: JSON.stringify({
          provider: form.provider,
          model: form.model || null,
          prompt: form.prompt,
          duration_seconds: Number(form.duration_seconds) || 5
        })
      }))
      saveRecentPrompt(VIDEO_PROMPT_HISTORY_KEY, form.prompt)
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
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Motion Lab</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl">Video generation</h1>
      </div>
      <GlassCard as="form" className="space-y-4 p-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GlassSelect value={form.provider} options={['runway', 'kling', 'veo']} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <GlassInput placeholder="Model override" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <GlassInput type="number" min="1" max="30" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} />
        </div>
        <GlassTextarea placeholder="Prompt" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
        <div className="sticky-action-row">
          <GlassButton type="submit" className="w-full sm:w-auto" disabled={loading || !form.prompt.trim()}><Clapperboard className="h-4 w-4" /> {loading ? 'Generating' : 'Generate video'}</GlassButton>
        </div>
        {loading && <AiLoading label="AI motion pass" detail="Preparing provider job, timing, and visual continuity..." />}
        {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
        {result && <VideoResultCard result={result} prompt={form.prompt} />}
      </GlassCard>
      <PromptHistory storageKey={VIDEO_PROMPT_HISTORY_KEY} examples={VIDEO_EXAMPLES} onReuse={reusePrompt} />
      {!result && !loading && (
        <EmptyState
          title="No video job in this session"
          description="Draft a motion prompt, pick a provider, and the job summary will appear here."
          examples={VIDEO_EXAMPLES}
          onExample={reusePrompt}
          actionLabel="Prompt, route, render"
        />
      )}
    </div>
  )
}

function VideoResultCard({ result, prompt }) {
  const [favorite, setFavorite] = useState(false)

  return (
    <GlassCard as="article" variant="media" className="generated-media-card generated-video-result" data-magnetic>
      <div className="generated-media-frame">
        <div className="generated-media-placeholder">
          <Video className="h-7 w-7" />
          <span>{result.status}</span>
        </div>
        <div className="generated-media-overlay">
          <div className="generated-media-actions">
            <button type="button" className={`media-action ${favorite ? 'is-active' : ''}`} onClick={() => setFavorite((current) => !current)} aria-label="Favorite video">
              <Heart className="h-4 w-4" />
            </button>
            <button type="button" className="media-action" onClick={() => navigator.clipboard?.writeText(prompt || '')} aria-label="Copy prompt">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" className="media-action" disabled aria-label="Fullscreen unavailable">
              <Expand className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-cyan-50">Job {result.id}: {result.status} via {result.provider}/{result.model}</p>
      <p className="mt-1 line-clamp-2 text-xs text-[#A1A1AA]">{prompt}</p>
    </GlassCard>
  )
}
