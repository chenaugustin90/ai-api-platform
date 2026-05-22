import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, apiKeyRequest, getOrCreateDevelopmentApiKey } from '../api/client'
import EmptyState from '../components/EmptyState'
import { GlassButton, GlassCard, GlassSelect, GlassTextarea } from '../components/ui'
import { AlertTriangle, CalendarClock, Check, Copy, CreditCard, Download, Expand, ExternalLink, Heart, Image, Play, Settings, Sparkles, TerminalSquare, Video, Wand2 } from 'lucide-react'

const DASHBOARD_EXAMPLES = [
  'Generate a glassmorphic AI product image',
  'Create a launch teaser for the API platform',
  'Review usage and tune provider routing'
]

const GENERATOR_CONFIG = {
  text: {
    label: 'Text',
    path: '/api/generate/text',
    credits: 1,
    providers: ['openai', 'deepseek', 'claude'],
    models: {
      openai: ['gpt-4o-mini', 'gpt-4.1-mini'],
      deepseek: ['deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
      claude: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest']
    },
    prompt: 'Write a concise launch note for a premium AI API platform.',
    extra: { max_tokens: 512 }
  },
  image: {
    label: 'Image',
    path: '/api/generate/image',
    credits: 10,
    providers: ['openai'],
    models: {
      openai: ['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1']
    },
    prompt: 'A cinematic VisionOS glass console for an AI API platform',
    extra: { size: '1024x1024' }
  }
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)
  const [generator, setGenerator] = useState(() => initialGeneratorState())
  const [generatorHistory, setGeneratorHistory] = useState([])
  const [generatorError, setGeneratorError] = useState('')
  const [generatorLoading, setGeneratorLoading] = useState(false)

  useEffect(() => {
    api('/api/dashboard').then(setData)
  }, [])

  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return
    setShowCheckoutSuccess(true)
    const timer = window.setTimeout(() => {
      setShowCheckoutSuccess(false)
      setSearchParams((current) => {
        current.delete('checkout')
        current.delete('mode')
        current.delete('tier')
        return current
      }, { replace: true })
    }, 5200)
    return () => window.clearTimeout(timer)
  }, [searchParams, setSearchParams])

  function updateGenerator(patch) {
    setGenerator((current) => {
      const next = { ...current, ...patch }
      if (patch.endpoint && patch.endpoint !== current.endpoint) {
        const config = GENERATOR_CONFIG[patch.endpoint]
        const provider = config.providers[0]
        return {
          endpoint: patch.endpoint,
          provider,
          model: config.models[provider][0],
          prompt: config.prompt
        }
      }
      if (patch.provider && patch.provider !== current.provider) {
        const config = GENERATOR_CONFIG[next.endpoint]
        return { ...next, model: config.models[patch.provider][0] }
      }
      return next
    })
  }

  async function runGeneration(event) {
    event.preventDefault()
    const config = GENERATOR_CONFIG[generator.endpoint]
    const payload = {
      provider: generator.provider,
      model: generator.model,
      prompt: generator.prompt.trim(),
      ...config.extra
    }

    if (!payload.prompt) {
      setGeneratorError('Prompt is required.')
      return
    }

    setGeneratorError('')
    setGeneratorLoading(true)
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'generating' } }))

    try {
      const started = performance.now()
      const result = await sendDashboardGeneration(config.path, payload)
      const elapsed = Math.round(performance.now() - started)
      const record = {
        id: result.id || Date.now(),
        endpoint: generator.endpoint,
        provider: result.provider,
        model: result.model,
        prompt: payload.prompt,
        text: result.text,
        output_url: result.output_url,
        status: result.status || 'completed',
        credits: config.credits,
        elapsed
      }
      setGeneratorHistory((current) => [record, ...current].slice(0, 6))
      const refreshed = await api('/api/dashboard')
      setData(refreshed)
    } catch (err) {
      setGeneratorError(err.message)
    } finally {
      setGeneratorLoading(false)
      window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
    }
  }

  if (!data) return <p className="muted animate-pulse text-sm">Loading dashboard...</p>
  const usage = data.usage
  const generatedText = data.generated_text || []
  const generatedImages = data.generated_images || []
  const generatedVideos = data.generated_videos || []
  const hasGenerations = generatedText.length + generatedImages.length + generatedVideos.length > 0
  const missingProviders = getMissingProviders(data.provider_status)
  return (
    <div className="space-y-6">
      {showCheckoutSuccess && (
        <CheckoutSuccess
          tier={searchParams.get('tier') || data?.billing?.subscription_tier}
          mode={searchParams.get('mode')}
        />
      )}
      <div>
        <p className="eyebrow mb-2">Command Center</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl">Dashboard</h1>
        <p className="muted mt-2 text-sm">Credits, usage, and recent media generations.</p>
      </div>
      {missingProviders.length > 0 && <ProviderWarning missingProviders={missingProviders} />}
      <DashboardGenerator
        generator={generator}
        history={generatorHistory}
        error={generatorError}
        loading={generatorLoading}
        onChange={updateGenerator}
        onSubmit={runGeneration}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Remaining credits" value={usage.credits_remaining} />
        <Metric label="Text credits used" value={usage.by_modality.text || 0} />
        <Metric label="Image credits used" value={usage.by_modality.image || 0} />
      </div>
      {data.billing && <BillingStatus billing={data.billing} />}
      {!hasGenerations && generatorHistory.length === 0 && (
        <EmptyState
          title="Your AI workspace is ready"
          description="Start a generation or jump into a recent workflow to populate the command center."
          examples={DASHBOARD_EXAMPLES}
          actionLabel="Generate"
          actionHref="/images"
        />
      )}
      <TextHistory title="Text generations" items={[...generatorHistory.filter((item) => item.endpoint === 'text'), ...generatedText]} />
      <Gallery title="Generated images" items={generatedImages} type="image" />
      <Gallery title="Generated videos" items={generatedVideos} type="video" />
    </div>
  )
}

function getMissingProviders(providerStatus = {}) {
  const labels = { openai: 'OpenAI', deepseek: 'DeepSeek', claude: 'Claude' }
  return Object.entries(labels)
    .filter(([id]) => providerStatus[id] === false)
    .map(([id, name]) => ({ id, name, status: 'missing' }))
}

function ProviderWarning({ missingProviders }) {
  return (
    <GlassCard as="section" className="provider-warning-card p-5">
      <div className="provider-warning-main">
        <span className="provider-warning-icon">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow mb-1">Provider not configured</p>
          <h2 className="text-xl font-bold text-white">Some AI providers need setup</h2>
          <p className="muted mt-1 text-sm">Add the missing Render environment variables, redeploy, then run a connection test.</p>
        </div>
      </div>
      <div className="provider-warning-list">
        {missingProviders.map((provider) => (
          <span key={provider.id} className="provider-warning-pill">
            {provider.name}
            <small>{provider.status}</small>
          </span>
        ))}
      </div>
      <GlassButton as={Link} to="/settings/providers" variant="secondary">
        <Settings className="h-4 w-4" />
        Setup providers
      </GlassButton>
    </GlassCard>
  )
}

function initialGeneratorState() {
  const config = GENERATOR_CONFIG.text
  const provider = config.providers[0]
  return {
    endpoint: 'text',
    provider,
    model: config.models[provider][0],
    prompt: config.prompt
  }
}

async function sendDashboardGeneration(path, payload) {
  let key = await getOrCreateDevelopmentApiKey()
  try {
    return await apiKeyRequest(path, key, payload)
  } catch (err) {
    if (!/api key|unauthorized|forbidden/i.test(err.message)) throw err
    localStorage.removeItem('development_api_key')
    key = await getOrCreateDevelopmentApiKey()
    return apiKeyRequest(path, key, payload)
  }
}

function DashboardGenerator({ generator, history, error, loading, onChange, onSubmit }) {
  const config = GENERATOR_CONFIG[generator.endpoint]
  const modelOptions = config.models[generator.provider] || []

  return (
    <GlassCard as="form" className="dashboard-generator p-5" onSubmit={onSubmit}>
      <div className="dashboard-generator-header">
        <div className="flex items-center gap-3">
          <span className="dashboard-generator-icon"><TerminalSquare className="h-5 w-5" /></span>
          <div>
            <p className="eyebrow mb-1">Live Generation</p>
            <h2 className="text-xl font-bold text-white">Provider console</h2>
          </div>
        </div>
        <span className={`dashboard-generator-status ${loading ? 'is-loading' : ''}`}>
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? 'Generating' : `${config.credits} credits`}
        </span>
      </div>

      <div className="dashboard-generator-grid">
        <GlassSelect
          value={generator.endpoint}
          options={Object.entries(GENERATOR_CONFIG).map(([value, item]) => ({ value, label: item.label }))}
          onChange={(event) => onChange({ endpoint: event.target.value })}
        />
        <GlassSelect
          value={generator.provider}
          options={config.providers}
          onChange={(event) => onChange({ provider: event.target.value })}
        />
        <GlassSelect
          value={generator.model}
          options={modelOptions}
          onChange={(event) => onChange({ model: event.target.value })}
        />
      </div>

      <div className="dashboard-generator-body">
        <GlassTextarea
          className="dashboard-generator-prompt"
          value={generator.prompt}
          onChange={(event) => onChange({ prompt: event.target.value })}
          placeholder="Prompt the selected provider..."
        />
        <div className="dashboard-generator-side">
          <div className="dashboard-generator-preview">
            <Wand2 className="h-5 w-5 text-[#00E5FF]" />
            <p className="text-sm font-semibold text-white">Ready route</p>
            <p className="muted text-xs">{generator.provider} / {generator.model}</p>
          </div>
          <GlassButton type="submit" disabled={loading}>
            <Play className="h-4 w-4" />
            {loading ? 'Generating' : 'Generate'}
          </GlassButton>
        </div>
      </div>

      {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}

      {history.length > 0 && (
        <div className="dashboard-generator-history">
          {history.slice(0, 3).map((item) => (
            <div key={`${item.endpoint}-${item.id}`} className="dashboard-generator-history-item">
              <span>{item.endpoint}</span>
              <p>{item.text || item.prompt}</p>
              <small>{item.provider} / {item.elapsed} ms / {item.credits} credits</small>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function CheckoutSuccess({ tier, mode }) {
  return (
    <div className="checkout-success" role="status">
      <div className="checkout-success-particles" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => <span key={index} style={{ '--i': index }} />)}
      </div>
      <div className="checkout-success-orb">
        <Check className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-bold text-white">Subscription active</p>
        <p className="text-xs text-[#A1A1AA]">
          {tier ? `${tier} credits added` : 'Credits added'}
          {mode === 'mock' ? ' in mock mode' : ''}
        </p>
      </div>
      <Sparkles className="h-4 w-4 text-[#00E5FF]" />
    </div>
  )
}

function BillingStatus({ billing }) {
  const [loadingPortal, setLoadingPortal] = useState(false)
  const tier = billing.subscription_tier || 'free'
  const status = billing.subscription_status || 'free'
  const periodEnd = billing.subscription_current_period_end ? new Date(billing.subscription_current_period_end) : null

  async function openPortal() {
    setLoadingPortal(true)
    try {
      const response = await api('/api/billing/portal', { method: 'POST' })
      window.location.href = response.portal_url
    } finally {
      setLoadingPortal(false)
    }
  }

  return (
    <GlassCard as="section" className="billing-status-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="billing-status-icon">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow mb-1">Billing</p>
            <h2 className="text-xl font-bold capitalize text-white">{tier} plan</h2>
            <p className="muted mt-1 text-sm">Status: <span className="text-cyan-100">{status}</span></p>
          </div>
        </div>
      <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:w-full">
          {periodEnd && (
            <span className="billing-pill">
              <CalendarClock className="h-3.5 w-3.5" />
              Renews {periodEnd.toLocaleDateString()}
            </span>
          )}
          {billing.customer_portal_available && (
            <GlassButton variant="secondary" onClick={openPortal} disabled={loadingPortal}>
              <ExternalLink className="h-4 w-4" />
              {loadingPortal ? 'Opening' : 'Manage billing'}
            </GlassButton>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

function useAnimatedNumber(value) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const target = Number(value) || 0
    const duration = 900
    const startTime = performance.now()

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    const frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return displayValue
}

function Metric({ label, value }) {
  const animatedValue = useAnimatedNumber(value)
  const percent = Math.max(8, Math.min(100, label.includes('Remaining') ? (Number(value) / 1000) * 100 : Number(value)))
  const bars = Array.from({ length: 7 }, (_, index) => Math.max(18, ((Number(value) + index * 13) % 52) + 18))

  return (
    <GlassCard variant="stat" className="dashboard-metric p-7">
      <div className="metric-progress" style={{ '--progress': percent }}>
        <span />
      </div>
      <div className="dashboard-metric-label">{label}</div>
      <div className="dashboard-metric-number">{animatedValue.toLocaleString()}</div>
      <div className="mini-chart" aria-hidden="true">
        {bars.map((height, index) => <span key={index} style={{ '--bar-height': `${height}%`, '--i': index }} />)}
      </div>
    </GlassCard>
  )
}

function TextHistory({ title, items }) {
  const visibleItems = items.slice(0, 8)

  return (
    <GlassCard as="section" className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {visibleItems.length === 0 ? (
        <p className="muted text-sm">No text generations yet.</p>
      ) : (
        <div className="dashboard-text-history">
          {visibleItems.map((item) => (
            <article key={`text-${item.id}-${item.elapsed || 0}`} className="dashboard-text-item">
              <div>
                <p className="line-clamp-2 text-sm font-semibold text-white">{item.text || item.prompt}</p>
                <p className="mt-1 text-xs text-[#A1A1AA]">{item.provider} / {item.model}</p>
              </div>
              <span>{item.status || 'completed'}</span>
            </article>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function Gallery({ title, items, type }) {
  return (
    <GlassCard as="section" className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {items.length === 0 ? (
        <p className="muted text-sm">No {type}s yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <GeneratedMediaCard key={item.id} item={item} type={type} />
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function GeneratedMediaCard({ item, type }) {
  const [favorite, setFavorite] = useState(false)
  const hasMedia = type === 'image' && item.output_url
  const PlaceholderIcon = type === 'image' ? Image : Video

  function copyPrompt() {
    navigator.clipboard?.writeText(item.prompt || '')
  }

  function fullscreen() {
    if (item.output_url) window.open(item.output_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <GlassCard as="article" variant="media" className="generated-media-card" data-magnetic>
      <div className="generated-media-frame">
        {hasMedia ? (
          <img src={item.output_url} alt={item.prompt} />
        ) : (
          <div className="generated-media-placeholder">
            <PlaceholderIcon className="h-6 w-6" />
            <span>{item.status || 'Queued'}</span>
          </div>
        )}
        <div className="generated-media-overlay">
          <div className="generated-media-actions">
            <button type="button" className={`media-action ${favorite ? 'is-active' : ''}`} onClick={() => setFavorite((current) => !current)} aria-label="Favorite">
              <Heart className="h-4 w-4" />
            </button>
            {item.output_url && (
              <a className="media-action" href={item.output_url} download target="_blank" rel="noreferrer" aria-label="Download">
                <Download className="h-4 w-4" />
              </a>
            )}
            <button type="button" className="media-action" onClick={copyPrompt} aria-label="Copy prompt">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" className="media-action" onClick={fullscreen} aria-label="Fullscreen" disabled={!item.output_url}>
              <Expand className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-white">{item.prompt}</p>
      <p className="mt-1 text-xs text-[#A1A1AA]">{item.provider} / {item.model}</p>
    </GlassCard>
  )
}
