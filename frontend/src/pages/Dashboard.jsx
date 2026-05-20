import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import { GlassButton, GlassCard } from '../components/ui'
import { CalendarClock, Check, Copy, CreditCard, Download, Expand, ExternalLink, Heart, Image, Sparkles, Video } from 'lucide-react'

const DASHBOARD_EXAMPLES = [
  'Generate a glassmorphic AI product image',
  'Create a launch teaser for the API platform',
  'Review usage and tune provider routing'
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)

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

  if (!data) return <p className="muted animate-pulse text-sm">Loading dashboard...</p>
  const usage = data.usage
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Remaining credits" value={usage.credits_remaining} />
        <Metric label="Image credits used" value={usage.by_modality.image || 0} />
        <Metric label="Video credits used" value={usage.by_modality.video || 0} />
      </div>
      {data.billing && <BillingStatus billing={data.billing} />}
      {data.generated_images.length === 0 && data.generated_videos.length === 0 && (
        <EmptyState
          title="Your AI workspace is ready"
          description="Start a generation or jump into a recent workflow to populate the command center."
          examples={DASHBOARD_EXAMPLES}
          actionLabel="Generate"
          actionHref="/images"
        />
      )}
      <Gallery title="Generated images" items={data.generated_images} type="image" />
      <Gallery title="Generated videos" items={data.generated_videos} type="video" />
    </div>
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
