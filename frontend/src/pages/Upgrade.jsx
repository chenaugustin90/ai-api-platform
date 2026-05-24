import { ArrowRight, CreditCard, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

export default function Upgrade() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    api('/api/usage/summary').then(setSummary).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Credit Control</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">Upgrade</h1>
        <p className="muted mt-3 max-w-2xl text-sm">A billing upgrade flow will live here. For now, use this page to review credits and jump into plan selection.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_0.8fr]">
        <GlassCard className="upgrade-hero-card p-6">
          <div className="pricing-plan-icon">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">More credits, higher throughput</h2>
          <p className="muted mt-3 text-sm leading-6">Self-serve upgrades can connect to Stripe Checkout when your production prices are ready. The current credit system already deducts usage by model and records every successful request.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <GlassButton as={Link} to="/pricing">
              <CreditCard className="h-4 w-4" />
              View plans
            </GlassButton>
            <GlassButton as={Link} to="/usage" variant="secondary">
              Usage stats
              <ArrowRight className="h-4 w-4" />
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="eyebrow mb-2">Balance</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-white">{Number(summary?.credits_remaining || 0).toLocaleString()}</span>
            <span className="pb-2 text-sm font-semibold text-[#A1A1AA]">credits</span>
          </div>
          <div className="mt-6 grid gap-3">
            <UpgradeMetric icon={Zap} label="Credits used" value={summary?.total_credits_used || 0} />
            <UpgradeMetric icon={Sparkles} label="Requests" value={summary?.total_events || 0} />
            <UpgradeMetric icon={CreditCard} label="Tokens" value={summary?.total_tokens || 0} />
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

function UpgradeMetric({ icon: Icon, label, value }) {
  return (
    <div className="upgrade-metric-row">
      <span><Icon className="h-4 w-4" /></span>
      <p>{label}</p>
      <strong>{Number(value).toLocaleString()}</strong>
    </div>
  )
}
