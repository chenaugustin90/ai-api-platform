import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

const plans = [
  { tier: 'free', name: 'Free', price: '$0', credits: '1,000 credits', features: ['API keys', 'Usage dashboard', 'Mock-safe routing'] },
  { tier: 'starter', name: 'Starter', price: '$29', credits: '10,000 credits', features: ['Text + image routing', 'Stripe subscription', 'Usage history'] },
  { tier: 'pro', name: 'Pro', price: '$199', credits: '100,000 credits', features: ['Video job routing', 'Higher credit pool', 'Provider expansion ready'] }
]

export default function Pricing() {
  const [loadingTier, setLoadingTier] = useState('')
  const [error, setError] = useState('')

  async function checkout(tier) {
    if (tier === 'free') return
    setError('')
    setLoadingTier(tier)
    try {
      const response = await api('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ tier }) })
      window.location.href = response.checkout_url
    } catch (err) {
      setError(formatCheckoutError(err.message))
      setLoadingTier('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Scale Layer</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl">Pricing</h1>
        <p className="muted mt-2 text-sm">Subscribe through Stripe Checkout. Credits are added after successful payment.</p>
      </div>
      {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <GlassCard key={plan.tier} className="flex flex-col p-6">
            <h2 className="text-xl font-bold text-white">{plan.name}</h2>
            <div className="mt-3 text-4xl font-bold text-white">{plan.price}<span className="text-sm font-medium text-[#A1A1AA]">/mo</span></div>
            <p className="muted mt-2 text-sm">{plan.credits}</p>
            <div className="my-6 space-y-3">
              {plan.features.map((feature) => (
                <p key={feature} className="flex items-center gap-2 text-sm text-white"><Check className="h-4 w-4 text-[#00E5FF]" /> {feature}</p>
              ))}
            </div>
            <GlassButton className="mt-auto" onClick={() => checkout(plan.tier)} disabled={loadingTier === plan.tier || plan.tier === 'free'}>
              {loadingTier === plan.tier && <Loader2 className="h-4 w-4 animate-spin" />}
              {plan.tier === 'free' ? 'Current base plan' : 'Subscribe'}
            </GlassButton>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

function formatCheckoutError(message) {
  if (message.includes('Stripe is not configured')) {
    return `${message}. Add the Stripe env vars in backend/.env, then restart the backend.`
  }
  return message
}
