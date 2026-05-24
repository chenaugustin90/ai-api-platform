import { Building2, Check, CreditCard, Loader2, ShieldCheck, Sparkles, WalletCards, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

const plans = [
  {
    tier: 'free',
    icon: Sparkles,
    name: 'Free',
    price: '$0',
    credits: '100 credits',
    limits: 'Development API limits',
    description: 'Explore generation, usage tracking, docs, and provider onboarding.',
    features: ['API keys', 'Usage dashboard', 'Prompt library', 'Provider onboarding']
  },
  {
    tier: 'pro',
    icon: Zap,
    name: 'Pro',
    price: '$9.99',
    credits: '5,000 credits/month',
    limits: 'Production API limits',
    description: 'Scale real text and image workloads with billing and provider telemetry.',
    features: ['Real provider routing', 'Higher credit pool', 'Stripe subscription', 'Generation history']
  },
  {
    tier: 'enterprise',
    icon: Building2,
    name: 'Enterprise',
    price: '$29.99',
    credits: '25,000 credits/month',
    limits: 'Dedicated API limits',
    description: 'For teams that need custom provider governance, procurement, and rollout support.',
    features: ['Custom credit pools', 'Provider governance', 'Priority support', 'Security review support']
  }
]

const creditPacks = [
  { pack_id: 'boost', name: 'Credit Boost', price: '$19', credits: '5,000 credits', detail: 'For small bursts and demos.' },
  { pack_id: 'scale', name: 'Scale Pack', price: '$79', credits: '25,000 credits', detail: 'For image batches and heavier testing.' },
  { pack_id: 'max', name: 'Max Pack', price: '$249', credits: '100,000 credits', detail: 'For production workloads without changing plans.' }
]

export default function Pricing() {
  const [loadingKey, setLoadingKey] = useState('')
  const [error, setError] = useState('')
  const [billingConfig, setBillingConfig] = useState(null)

  useEffect(() => {
    api('/api/billing/config').then(setBillingConfig).catch((err) => setError(err.message))
  }, [])

  const checkoutReady = billingConfig?.ready_for_checkout === true

  async function checkoutSubscription(tier) {
    if (tier === 'free') return
    if (!checkoutReady) {
      setError(missingConfigMessage(billingConfig))
      return
    }
    await startCheckout(`subscription-${tier}`, {
      purchase_type: 'subscription',
      tier
    })
  }

  async function checkoutCredits(packId) {
    if (!checkoutReady) {
      setError(missingConfigMessage(billingConfig))
      return
    }
    await startCheckout(`credits-${packId}`, {
      purchase_type: 'credits',
      pack_id: packId
    })
  }

  async function startCheckout(key, payload) {
    setError('')
    setLoadingKey(key)
    try {
      const response = await api('/api/billing/checkout', { method: 'POST', body: JSON.stringify(payload) })
      window.location.href = response.checkout_url
    } catch (err) {
      setError(formatCheckoutError(err.message))
      setLoadingKey('')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Scale Layer</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl">Pricing</h1>
        <p className="muted mt-2 max-w-2xl text-sm">Subscribe for recurring credits or buy one-time credit packs through Stripe Checkout.</p>
      </div>

      <PaymentMethodsStrip />
      {billingConfig && !billingConfig.ready_for_checkout && (
        <GlassCard className="billing-config-warning p-4">
          <p className="eyebrow mb-2">Stripe setup required</p>
          <h2 className="text-lg font-bold text-white">Payments are paused until production Stripe variables are configured.</h2>
          <p className="muted mt-2 text-sm">Missing: {billingConfig.missing.join(', ')}</p>
        </GlassCard>
      )}
      {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}

      <section className="space-y-4">
        <div>
          <p className="eyebrow mb-2">Subscriptions</p>
          <h2 className="text-2xl font-bold text-white">Monthly plans</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon
            const key = `subscription-${plan.tier}`
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
                <GlassButton className="mt-auto" onClick={() => checkoutSubscription(plan.tier)} disabled={loadingKey === key || plan.tier === 'free' || !checkoutReady}>
                  {loadingKey === key && <Loader2 className="h-4 w-4 animate-spin" />}
                  {plan.tier === 'free' ? 'Current base plan' : 'Subscribe'}
                </GlassButton>
              </GlassCard>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow mb-2">One-time credits</p>
          <h2 className="text-2xl font-bold text-white">Top up without changing plans</h2>
          <p className="muted mt-2 max-w-2xl text-sm">Credit packs are one-time Stripe payments and support local wallet methods when eligible.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {creditPacks.map((pack) => {
            const key = `credits-${pack.pack_id}`
            return (
              <GlassCard key={pack.pack_id} className="credit-pack-card p-5">
                <div className="pricing-plan-icon">
                  <WalletCards className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{pack.name}</h3>
                <p className="mt-2 text-3xl font-black text-white">{pack.price}</p>
                <p className="pricing-plan-limit">{pack.credits}</p>
                <p className="muted mt-3 text-sm">{pack.detail}</p>
                <GlassButton className="mt-5 w-full" onClick={() => checkoutCredits(pack.pack_id)} disabled={loadingKey === key || !checkoutReady}>
                  {loadingKey === key && <Loader2 className="h-4 w-4 animate-spin" />}
                  Buy credits
                </GlassButton>
              </GlassCard>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function PaymentMethodsStrip() {
  const methods = ['Credit cards', 'Debit cards', 'Apple Pay', 'Google Pay', 'Alipay', 'WeChat Pay']
  return (
    <GlassCard className="payment-method-strip p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="billing-status-icon"><CreditCard className="h-5 w-5" /></span>
          <div>
            <p className="eyebrow mb-1">Stripe Checkout</p>
            <h2 className="text-lg font-bold text-white">Unified payment layer</h2>
          </div>
        </div>
        <div className="payment-method-list">
          {methods.map((method) => (
            <span key={method}><ShieldCheck className="h-3.5 w-3.5" /> {method}</span>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}

function formatCheckoutError(message) {
  if (message.includes('Stripe is not configured')) {
    return `${message}. Add the Stripe env vars in Render, then redeploy the backend.`
  }
  return message
}

function missingConfigMessage(config) {
  if (!config?.missing?.length) return 'Stripe payments are not ready yet.'
  return `Stripe payments are not ready. Missing: ${config.missing.join(', ')}.`
}
