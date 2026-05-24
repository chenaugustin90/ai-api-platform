import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/ToastProvider'
import { GlassButton, GlassCard, GlassSelect, GlassTextarea } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, BookOpen, CalendarClock, Check, Clock3, Copy, CreditCard, Download, Expand, ExternalLink, Heart, Image, KeyRound, Play, RotateCcw, Settings, Share2, Sparkles, SquareTerminal, TerminalSquare, Video, Wand2, X, Zap } from 'lucide-react'
import { addImagesToHistory, saveTextGenerationHistory } from '../utils/generationHistory'
import { savePromptToLibrary, saveRecentPromptGlobal } from '../utils/promptLibrary'
import { createShareLink } from '../utils/share'

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
      claude: ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-3-5-haiku-20241022']
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
  const toast = useToast()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [usageEvents, setUsageEvents] = useState([])
  const [billingHistory, setBillingHistory] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)
  const [generator, setGenerator] = useState(() => initialGeneratorState())
  const [generatorHistory, setGeneratorHistory] = useState([])
  const [generatorError, setGeneratorError] = useState('')
  const [generatorLoading, setGeneratorLoading] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationResult, setGenerationResult] = useState(null)
  const [streamedText, setStreamedText] = useState('')
  const [chartPeriod, setChartPeriod] = useState('daily')
  const abortRef = useRef(null)

  useEffect(() => {
    refreshDashboard()
  }, [])

  async function refreshDashboard() {
    const [dashboardData, eventsData, billingHistoryData] = await Promise.all([
      api('/api/dashboard'),
      api('/api/usage/events').catch(() => []),
      api('/api/billing/history').catch(() => [])
    ])
    setData(dashboardData)
    setUsageEvents(eventsData)
    setBillingHistory(billingHistoryData)
  }

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
    event?.preventDefault()
    const config = GENERATOR_CONFIG[generator.endpoint]
    const payload = {
      provider: generator.provider,
      model: generator.model,
      prompt: generator.prompt.trim(),
      ...config.extra
    }

    if (!payload.prompt) {
      setGeneratorError('Prompt is required.')
      toast.error('Prompt is required.')
      return
    }

    setGeneratorError('')
    setGeneratorLoading(true)
    setGenerationProgress(8)
    setGenerationResult(null)
    setStreamedText('')
    saveRecentPromptGlobal(payload.prompt)
    abortRef.current = new AbortController()
    const progressTimer = window.setInterval(() => {
      setGenerationProgress((current) => Math.min(92, current + Math.max(3, Math.round((92 - current) * 0.18))))
    }, 420)
    toast.loading('Routing request through the selected provider.', 'Generating')
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'generating' } }))

    try {
      const started = performance.now()
      const result = await sendDashboardGeneration(config.path, payload, abortRef.current.signal)
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
        credits: result.credits_used || config.credits,
        elapsed
      }
      setGenerationProgress(100)
      setGenerationResult(record)
      animateStream(record.text || (record.output_url ? 'Image generation completed.' : 'Generation completed.'))
      setGeneratorHistory((current) => [record, ...current].slice(0, 6))
      if (generator.endpoint === 'text') {
        saveTextGenerationHistory({
          prompt: payload.prompt,
          response: record.text || '',
          text: record.text || '',
          provider: record.provider,
          model: record.model,
          created_at: new Date().toISOString()
        })
      }
      if (generator.endpoint === 'image') {
        const imageUrls = result.image_urls?.length ? result.image_urls : [record.output_url].filter(Boolean)
        await addImagesToHistory(imageUrls.map((outputUrl, index) => ({
          id: `${record.id}-${index}`,
          prompt: payload.prompt,
          provider: record.provider,
          model: record.model,
          size: config.extra.size,
          style: 'auto',
          quality: 'auto',
          count: '1',
          status: record.status,
          output_url: outputUrl,
          created_at: new Date().toISOString()
        })))
      }
      await refreshDashboard()
      toast.success(`${config.label} generation completed.`)
    } catch (err) {
      if (err.name === 'AbortError') {
        setGeneratorError('Generation canceled.')
        toast.info('Generation canceled.')
      } else {
        setGeneratorError(err.message)
        toast.error(err.message)
      }
    } finally {
      window.clearInterval(progressTimer)
      setGeneratorLoading(false)
      abortRef.current = null
      window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort()
    setGeneratorLoading(false)
    setGenerationProgress(0)
  }

  function retryGeneration() {
    runGeneration()
  }

  async function copyResult() {
    const value = generationResult?.text || generationResult?.output_url || ''
    if (!value) return
    await navigator.clipboard?.writeText(value)
    toast.success('Result copied.')
  }

  async function shareResult() {
    if (!generationResult) return
    try {
      await createShareLink({
        modality: generationResult.endpoint === 'image' ? 'image' : 'text',
        prompt: generationResult.prompt,
        text: generationResult.text,
        output_url: generationResult.output_url,
        provider: generationResult.provider,
        model: generationResult.model
      })
      toast.success('Share URL copied to clipboard.', 'Share link ready')
    } catch (err) {
      toast.error(err.message, 'Could not create share link')
    }
  }

  function favoritePrompt() {
    savePromptToLibrary(generator.prompt, { favorite: true })
    toast.success('Prompt saved to library.')
  }

  function animateStream(text) {
    const cleanText = text || ''
    setStreamedText('')
    let index = 0
    const timer = window.setInterval(() => {
      index += Math.max(1, Math.ceil(cleanText.length / 42))
      setStreamedText(cleanText.slice(0, index))
      if (index >= cleanText.length) window.clearInterval(timer)
    }, 28)
  }

  if (!data) return <p className="muted animate-pulse text-sm">Loading dashboard...</p>
  const usage = data.usage
  const generatedText = data.generated_text || []
  const generatedImages = data.generated_images || []
  const generatedVideos = data.generated_videos || []
  const hasGenerations = generatedText.length + generatedImages.length + generatedVideos.length > 0
  const missingProviders = getMissingProviders(data.provider_status)
  const recentGenerations = buildRecentGenerations(generatorHistory, generatedText, generatedImages, generatedVideos)
  const chartData = buildUsageChartData(usageEvents, chartPeriod)
  return (
    <div className="space-y-6">
      {showCheckoutSuccess && (
        <CheckoutSuccess
          tier={searchParams.get('tier') || data?.billing?.subscription_tier}
          mode={searchParams.get('mode')}
        />
      )}
      <DashboardHero user={user} usage={usage} billing={data.billing} recentGenerations={recentGenerations} />
      {data.billing && !data.billing.payment_configured && <BillingSetupWarning missing={data.billing.missing_payment_config || []} />}
      {missingProviders.length > 0 && <ProviderWarning missingProviders={missingProviders} />}
      <DashboardGenerator
        generator={generator}
        history={generatorHistory}
        error={generatorError}
        loading={generatorLoading}
        progress={generationProgress}
        result={generationResult}
        streamedText={streamedText}
        onChange={updateGenerator}
        onSubmit={runGeneration}
        onCancel={cancelGeneration}
        onRetry={retryGeneration}
        onCopy={copyResult}
        onShare={shareResult}
        onFavoritePrompt={favoritePrompt}
      />
      <QuickActions />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Remaining credits" value={usage.credits_remaining} />
        <Metric label="Text credits used" value={usage.by_modality.text || 0} />
        <Metric label="Image credits used" value={usage.by_modality.image || 0} />
      </div>
      <div className="dashboard-insights-grid">
        <UsageChart title="Usage chart" data={chartData} period={chartPeriod} onPeriodChange={setChartPeriod} />
        <CreditsTrendChart creditsRemaining={usage.credits_remaining} events={usageEvents} />
      </div>
      {data.billing && <BillingStatus billing={data.billing} />}
      <DashboardBillingHistory records={billingHistory} />
      {!hasGenerations && generatorHistory.length === 0 && (
        <EmptyState
          title="Your AI workspace is ready"
          description="Start a generation or jump into a recent workflow to populate the command center."
          examples={DASHBOARD_EXAMPLES}
          actionLabel="Generate"
          actionHref="/images"
        />
      )}
      <RecentGenerations items={recentGenerations} />
      <TextHistory title="Text generations" items={[...generatorHistory.filter((item) => item.endpoint === 'text'), ...generatedText]} />
      <Gallery title="Generated images" items={generatedImages} type="image" />
      <Gallery title="Generated videos" items={generatedVideos} type="video" />
    </div>
  )
}

function BillingSetupWarning({ missing }) {
  return (
    <GlassCard className="billing-config-warning p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="provider-warning-icon">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow mb-1">Stripe setup required</p>
            <h2 className="text-xl font-bold text-white">Payments are paused until Stripe is fully configured.</h2>
            <p className="muted mt-2 text-sm">Missing: {missing.length ? missing.join(', ') : 'Stripe environment variables'}</p>
          </div>
        </div>
        <GlassButton as={Link} to="/pricing" variant="secondary">Review pricing</GlassButton>
      </div>
    </GlassCard>
  )
}

function DashboardHero({ user, usage, billing, recentGenerations }) {
  const displayName = getDisplayName(user)
  const plan = billing?.subscription_tier || 'free'
  const status = billing?.subscription_status || 'active'
  const generationCount = recentGenerations.length

  return (
    <section className="dashboard-hero grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div>
        <p className="eyebrow mb-2">Command Center</p>
        <h1 className="title-gradient dashboard-greeting text-3xl font-bold sm:text-4xl">Welcome back, {displayName}</h1>
        <p className="muted mt-2 text-sm">Your AI workspace is ready: {Number(usage.credits_remaining || 0).toLocaleString()} credits, {Number(usage.total_events || 0).toLocaleString()} requests, and {generationCount} recent generations.</p>
      </div>
      <div className="dashboard-account-summary flex flex-wrap gap-2 md:justify-end" aria-label="Account summary">
        <span className="lg-pill">
          <strong>{Number(usage.credits_remaining || 0).toLocaleString()}</strong>
          credits
        </span>
        <span className="lg-pill">
          <strong>{plan}</strong>
          plan
        </span>
        <span className="lg-pill">
          <strong>{status}</strong>
          status
        </span>
      </div>
    </section>
  )
}

function getDisplayName(user) {
  if (user?.full_name) return user.full_name.split(' ')[0]
  if (user?.email) return user.email.split('@')[0]
  return 'there'
}

function formatDateTime(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Unknown'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(amountCents, currency = 'usd') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase()
  }).format((Number(amountCents) || 0) / 100)
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

function QuickActions() {
  const actions = [
    { label: 'Generate text', href: '/playground', icon: SquareTerminal },
    { label: 'Open prompt library', href: '/prompt-library', icon: BookOpen },
    { label: 'Create API key', href: '/api-keys', icon: KeyRound },
    { label: 'Provider setup', href: '/settings/providers', icon: Settings },
  ]
  return (
    <div className="quick-actions-grid">
      {actions.map(({ label, href, icon: Icon }) => (
        <GlassCard key={label} as={Link} to={href} className="quick-action-card" data-magnetic>
          <span><Icon className="h-4 w-4" /></span>
          <strong>{label}</strong>
        </GlassCard>
      ))}
    </div>
  )
}

function UsageChart({ title, data, period, onPeriodChange }) {
  const maxValue = Math.max(1, ...data.map((item) => item.credits))
  return (
    <GlassCard as="section" className="dashboard-chart-card p-5">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow mb-1">Daily / Weekly / Monthly</p>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="chart-period-control">
          {['daily', 'weekly', 'monthly'].map((option) => (
            <button key={option} type="button" className={period === option ? 'is-active' : ''} onClick={() => onPeriodChange(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="usage-bar-chart" aria-label={title}>
        {data.map((item) => (
          <div key={item.label} className="usage-bar-column">
            <span className="usage-bar-value">{item.credits}</span>
            <span className="usage-bar" style={{ height: `${Math.max(8, (item.credits / maxValue) * 100)}%` }} />
            <small>{item.label}</small>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function CreditsTrendChart({ creditsRemaining, events }) {
  const points = buildCreditsTrend(creditsRemaining, events)
  const maxValue = Math.max(1, ...points.map((point) => point.value))
  const path = points.map((point, index) => {
    const x = (index / Math.max(1, points.length - 1)) * 100
    const y = 100 - (point.value / maxValue) * 82 - 8
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')

  return (
    <GlassCard as="section" className="dashboard-chart-card p-5">
      <div className="dashboard-section-head">
        <div>
          <p className="eyebrow mb-1">Credits trend</p>
          <h2 className="text-xl font-bold text-white">{Number(creditsRemaining).toLocaleString()} remaining</h2>
        </div>
        <Zap className="h-5 w-5 text-[#00E5FF]" />
      </div>
      <svg className="credits-trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Credits trend chart">
        <path d={`${path} L 100 100 L 0 100 Z`} className="credits-trend-fill" />
        <path d={path} className="credits-trend-line" />
      </svg>
      <div className="credits-trend-labels">
        {points.map((point) => <span key={point.label}>{point.label}</span>)}
      </div>
    </GlassCard>
  )
}

function RecentGenerations({ items }) {
  return (
    <GlassCard as="section" className="p-5">
      <div className="dashboard-section-head mb-4">
        <div>
          <p className="eyebrow mb-1">Recent generations</p>
          <h2 className="text-xl font-bold text-white">Latest activity</h2>
        </div>
        <Clock3 className="h-5 w-5 text-[#00E5FF]" />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No generations yet"
          description="Start from a prompt suggestion or use a quick action to create your first result."
          examples={DASHBOARD_EXAMPLES}
          actionLabel="Open Playground"
          actionHref="/playground"
        />
      ) : (
        <div className="recent-generation-list">
          {items.slice(0, 8).map((item) => (
            <article key={`${item.modality}-${item.id}-${item.created_at || item.elapsed || 0}`} className="recent-generation-item">
              <span>{item.modality || item.endpoint}</span>
              <div>
                <p>{item.text || item.prompt}</p>
                <small>{item.provider} / {item.model}</small>
              </div>
              <strong>{item.status || 'completed'}</strong>
            </article>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function buildRecentGenerations(sessionItems, textItems, imageItems, videoItems) {
  return [
    ...sessionItems.map((item) => ({ ...item, modality: item.endpoint, created_at: new Date().toISOString() })),
    ...textItems,
    ...imageItems,
    ...videoItems,
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

function buildUsageChartData(events, period = 'daily') {
  if (period === 'weekly') {
    return Array.from({ length: 4 }, (_, index) => {
      const start = new Date()
      start.setDate(start.getDate() - (3 - index) * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const credits = events
        .filter((event) => {
          const created = new Date(event.created_at)
          return created >= start && created <= end
        })
        .reduce((sum, event) => sum + Number(event.credits_used || 0), 0)
      return { label: `W${index + 1}`, credits }
    })
  }

  if (period === 'monthly') {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - index), 1)
      const month = date.getMonth()
      const year = date.getFullYear()
      const credits = events
        .filter((event) => {
          const created = new Date(event.created_at)
          return created.getMonth() === month && created.getFullYear() === year
        })
        .reduce((sum, event) => sum + Number(event.credits_used || 0), 0)
      return { label: date.toLocaleDateString(undefined, { month: 'short' }), credits }
    })
  }

  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return date
  })
  return labels.map((date) => {
    const day = date.toISOString().slice(0, 10)
    const credits = events
      .filter((event) => String(event.created_at || '').slice(0, 10) === day)
      .reduce((sum, event) => sum + Number(event.credits_used || 0), 0)
    return { label: date.toLocaleDateString(undefined, { weekday: 'short' }), credits }
  })
}

function buildCreditsTrend(creditsRemaining, events) {
  const daily = buildUsageChartData(events, 'daily')
  let running = Number(creditsRemaining || 0) + daily.reduce((sum, item) => sum + item.credits, 0)
  return daily.map((item) => {
    running -= item.credits
    return { label: item.label, value: running }
  })
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

async function sendDashboardGeneration(path, payload, signal) {
  return api(path, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal
  })
}

function DashboardGenerator({ generator, history, error, loading, progress, result, streamedText, onChange, onSubmit, onCancel, onRetry, onCopy, onShare, onFavoritePrompt }) {
  const config = GENERATOR_CONFIG[generator.endpoint]
  const modelOptions = config.models[generator.provider] || []
  const statusLabel = loading ? progress < 35 ? 'Preparing request' : progress < 75 ? 'Provider thinking' : 'Finalizing output' : progress === 100 ? 'Completed' : `${config.credits} credits`

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
          {loading ? statusLabel : `${config.credits} credits`}
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
          <div className="dashboard-generator-actions">
            <GlassButton type="submit" disabled={loading}>
              <Play className="h-4 w-4" />
              {loading ? 'Generating' : 'Generate'}
            </GlassButton>
            {loading && (
              <GlassButton type="button" variant="secondary" onClick={onCancel}>
                <X className="h-4 w-4" />
                Cancel
              </GlassButton>
            )}
          </div>
        </div>
      </div>

      {(loading || progress > 0) && (
        <div className="generation-progress">
          <div className="generation-progress-top">
            <span>{statusLabel}</span>
            <strong>{progress}%</strong>
          </div>
          <div className="generation-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {(result || streamedText) && (
        <div className="generation-result-panel">
          <div className="generation-result-head">
            <span className="provider-section-title">
              <Sparkles className="h-3.5 w-3.5" />
              Latest result
            </span>
            <div className="generation-result-actions">
              <button type="button" onClick={onFavoritePrompt} aria-label="Favorite prompt"><Heart className="h-4 w-4" /></button>
              <button type="button" onClick={onCopy} aria-label="Copy result"><Copy className="h-4 w-4" /></button>
              <button type="button" onClick={onShare} aria-label="Create share link"><Share2 className="h-4 w-4" /></button>
              <button type="button" onClick={onRetry} aria-label="Retry generation"><RotateCcw className="h-4 w-4" /></button>
            </div>
          </div>
          {result?.output_url ? (
            <img className="generation-result-image" src={result.output_url} alt={result.prompt} />
          ) : (
            <p className="generation-stream-text">{streamedText}<span aria-hidden="true" /></p>
          )}
        </div>
      )}

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

function DashboardBillingHistory({ records }) {
  const visibleRecords = records.slice(0, 5)

  return (
    <GlassCard as="section" className="billing-history-panel p-5">
      <div className="dashboard-section-head mb-4">
        <div>
          <p className="eyebrow mb-1">Payment history</p>
          <h2 className="text-xl font-bold text-white">Billing activity</h2>
        </div>
        <CreditCard className="h-5 w-5 text-[#00E5FF]" />
      </div>
      {visibleRecords.length === 0 ? (
        <p className="muted text-sm">No billing records yet.</p>
      ) : (
        <div className="billing-history-list">
          {visibleRecords.map((record) => (
            <article key={record.id} className="billing-history-row">
              <div className="billing-history-icon"><CreditCard className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <h3>{record.description || record.purchase_type}</h3>
                <p>{formatDateTime(record.created_at)} / {record.status} / {record.mode}</p>
              </div>
              <div className="billing-history-amount">
                <strong>{formatCurrency(record.amount_cents, record.currency)}</strong>
                <span>+{Number(record.credits || 0).toLocaleString()} credits</span>
              </div>
            </article>
          ))}
        </div>
      )}
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
  const toast = useToast()
  const visibleItems = items.slice(0, 8)

  async function shareText(item) {
    const text = item.text || item.response
    if (!text) {
      toast.info('This saved dashboard row does not include a text response yet.')
      return
    }
    try {
      await createShareLink({
        modality: 'text',
        prompt: item.prompt,
        text,
        provider: item.provider,
        model: item.model
      })
      toast.success('Share URL copied to clipboard.', 'Share link ready')
    } catch (err) {
      toast.error(err.message, 'Could not create share link')
    }
  }

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
              <button type="button" className="media-action" onClick={() => shareText(item)} aria-label="Create share link">
                <Share2 className="h-4 w-4" />
              </button>
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
  const toast = useToast()
  const [favorite, setFavorite] = useState(false)
  const [sharing, setSharing] = useState(false)
  const hasMedia = type === 'image' && item.output_url
  const PlaceholderIcon = type === 'image' ? Image : Video

  function copyPrompt() {
    navigator.clipboard?.writeText(item.prompt || '')
  }

  function fullscreen() {
    if (item.output_url) window.open(item.output_url, '_blank', 'noopener,noreferrer')
  }

  async function shareMedia() {
    if (!hasMedia) return
    setSharing(true)
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
      setSharing(false)
    }
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
            <button type="button" className={`media-action ${sharing ? 'is-active' : ''}`} onClick={shareMedia} aria-label="Create share link" disabled={!hasMedia || sharing}>
              <Share2 className="h-4 w-4" />
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
