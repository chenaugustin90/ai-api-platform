import { Building2, Check, Loader2, Sparkles, Zap } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

const plans = [
  {
    tier: 'free',
    icon: Sparkles,
    name: 'Free',
    price: '$0',
    credits: '1,000 credits/month',
    limits: 'Development API limits',
    description: 'Explore generation, usage tracking, docs, and mock-safe provider routing.',
    features: ['API keys', 'Usage dashboard', 'Prompt library', 'Provider onboarding']
  },
  {
    tier: 'pro',
    icon: Zap,
    name: 'Pro',
    price: '$199',
    credits: '100,000 credits/month',
    limits: 'Production API limits',
    description: 'Scale real text and image workloads with billing and provider telemetry.',
    features: ['Real provider routing', 'Higher credit pool', 'Stripe subscription', 'Generation history']
  },
  {
    tier: 'enterprise',
    icon: Building2,
    name: 'Enterprise',
    price: 'Custom',
    credits: 'Custom credits/month',
    limits: 'Dedicated API limits',
    description: 'For teams that need custom provider governance, procurement, and rollout support.',
    features: ['Custom credit pools', 'Provider governance', 'Priority implementation support', 'Security review support']
  }
]

export default function Pricing() {
  const [loadingTier, setLoadingTier] = useState('')
  const [error, setError] = useState('')

  async function checkout(tier) {
    if (tier === 'free') return
    if (tier === 'enterprise') {
      window.location.href = 'mailto:sales@example.com?subject=Enterprise%20AI%20API%20Platform'
      return
    }
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
        <p className="muted mt-2 max-w-2xl text-sm">Choose a credit plan for your AI API workload. Stripe Checkout is used for paid self-serve plans; Enterprise starts with a sales conversation.</p>
      </div>
      {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon
          return (
            <GlassCard key={plan.tier} className={`pricing-plan-card flex flex-col p-6 ${plan.tier === 'pro' ? 'is-featured' : ''}`}>
              <div className="pricing-plan-icon">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">{plan.name}</h2>
              <div className="mt-3 text-4xl font-bold text-white">{plan.price}{plan.tier !== 'enterprise' && <span className="text-sm font-medium text-[#A1A1AA]">/mo</span>}</div>
              <p className="muted mt-2 text-sm">{plan.credits}</p>
              <p className="pricing-plan-limit">{plan.limits}</p>
              <p className="muted mt-3 text-sm leading-6">{plan.description}</p>
              <div className="my-6 space-y-3">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm text-white"><Check className="h-4 w-4 text-[#00E5FF]" /> {feature}</p>
                ))}
              </div>
              <GlassButton className="mt-auto" onClick={() => checkout(plan.tier)} disabled={loadingTier === plan.tier || plan.tier === 'free'}>
                {loadingTier === plan.tier && <Loader2 className="h-4 w-4 animate-spin" />}
                {plan.tier === 'free' ? 'Current base plan' : plan.tier === 'enterprise' ? 'Contact sales' : 'Subscribe'}
              </GlassButton>
            </GlassCard>
          )
        })}
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
