import { BarChart3, CreditCard, Settings as SettingsIcon, Sparkles, UserCircle, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../components/ui'

const settingsLinks = [
  { label: 'Providers', text: 'Connection status, models, setup guides, and live tests.', href: '/settings/providers', icon: SettingsIcon },
  { label: 'Pricing', text: 'Plans, checkout, credits, and subscription options.', href: '/pricing', icon: CreditCard },
  { label: 'Usage', text: 'Usage timeline, provider spend, and credit analytics.', href: '/usage', icon: BarChart3 },
  { label: 'Upgrade', text: 'Credit limits, plan comparison, and upgrade options.', href: '/upgrade', icon: Sparkles },
  { label: 'Account', text: 'Profile, subscription status, billing history, and keys.', href: '/settings/account', icon: UserCircle },
  { label: 'Workspace', text: 'Generation console, recent activity, and operational overview.', href: '/settings/workspace', icon: Sparkles },
  { label: 'Billing', text: 'Payment success, cancellation, and customer portal flows.', href: '/pricing', icon: WalletCards }
]

export default function Settings() {
  return (
    <div className="settings-page space-y-6">
      <section className="settings-hero">
        <p className="eyebrow mb-3">Settings</p>
        <h1 className="title-gradient text-4xl font-bold md:text-6xl">Operations live here.</h1>
        <p className="muted mt-4 max-w-2xl text-sm">
          Provider health, billing, usage, and production setup are available when you need them, without crowding the creation flow.
        </p>
      </section>
      <div className="settings-grid">
        {settingsLinks.map(({ label, text, href, icon: Icon }) => (
          <GlassCard key={label} as={Link} to={href} className="settings-card" data-magnetic>
            <span><Icon className="h-5 w-5" /></span>
            <div>
              <h2>{label}</h2>
              <p>{text}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
