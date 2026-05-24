import { Check, CreditCard, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const [billing, setBilling] = useState(null)

  useEffect(() => {
    api('/api/billing/status').then(setBilling).catch(() => setBilling(null))
  }, [])

  const isMock = searchParams.get('mode') === 'mock'

  return (
    <div className="payment-result-page">
      <GlassCard className="payment-result-card p-8">
        <div className="checkout-success-orb mx-auto mb-5">
          <Check className="h-8 w-8" />
        </div>
        <p className="eyebrow mb-3 text-center">Payment complete</p>
        <h1 className="title-gradient text-center text-4xl font-bold sm:text-5xl">Credits are ready</h1>
        <p className="muted mx-auto mt-4 max-w-xl text-center text-sm">
          {isMock ? 'Mock checkout completed. Real Stripe will take over automatically once Stripe keys and prices are configured.' : 'Stripe confirmed your checkout. Webhooks update your plan, credits, and billing history automatically.'}
        </p>
        <div className="payment-result-stats">
          <span><Sparkles className="h-4 w-4" /> {Number(billing?.credits_remaining || 0).toLocaleString()} credits</span>
          <span><CreditCard className="h-4 w-4" /> {formatPlan(billing?.subscription_tier)}</span>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <GlassButton as={Link} to="/dashboard">Open dashboard</GlassButton>
          <GlassButton as={Link} to="/account" variant="secondary">View billing history</GlassButton>
        </div>
      </GlassCard>
    </div>
  )
}

function formatPlan(value) {
  return String(value || 'free').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
