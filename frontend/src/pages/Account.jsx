import { AlertTriangle, BarChart3, Camera, Check, Copy, CreditCard, ExternalLink, KeyRound, Plus, ShieldCheck, Trash2, UserCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { GlassButton, GlassCard, GlassInput } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import { useAuth } from '../context/AuthContext'

const AVATAR_KEY = 'ai_platform_avatar'

export default function Account() {
  const { user } = useAuth()
  const toast = useToast()
  const [avatar, setAvatar] = useState(() => localStorage.getItem(AVATAR_KEY) || '')
  const [dashboard, setDashboard] = useState(null)
  const [usage, setUsage] = useState(null)
  const [billingHistory, setBillingHistory] = useState([])
  const [keys, setKeys] = useState([])
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [copied, setCopied] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  const activeKeys = useMemo(() => keys.filter((key) => key.is_active).length, [keys])
  const billing = dashboard?.billing || {
    subscription_tier: user?.subscription_tier || 'free',
    subscription_status: user?.subscription_status || 'free',
    credits_remaining: user?.credits_remaining || 0,
    missing_payment_config: []
  }

  useEffect(() => {
    loadAccount()
  }, [])

  async function loadAccount() {
    setLoading(true)
    try {
      const [dashboardData, usageData, keyData, billingHistoryData] = await Promise.all([
        api('/api/dashboard'),
        api('/api/usage/summary'),
        api('/api/api-keys'),
        api('/api/billing/history').catch(() => [])
      ])
      setDashboard(dashboardData)
      setUsage(usageData)
      setKeys(keyData)
      setBillingHistory(billingHistoryData)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  function uploadAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      setAvatar(result)
      localStorage.setItem(AVATAR_KEY, result)
      toast.success('Avatar updated')
    }
    reader.readAsDataURL(file)
  }

  async function createKey(event) {
    event.preventDefault()
    setCreating(true)
    try {
      const created = await api('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: keyName.trim() || `Account key ${keys.length + 1}` })
      })
      setNewKey(created)
      setKeyName('')
      toast.success('API key created')
      await loadAccount()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(key) {
    if (!key.is_active) return
    setRevokingId(key.id)
    try {
      await api(`/api/api-keys/${key.id}`, { method: 'DELETE' })
      toast.success('API key revoked')
      await loadAccount()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setRevokingId(null)
    }
  }

  async function copy(value, label = 'Copied') {
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(value)
      toast.success(label)
      window.setTimeout(() => setCopied(''), 1400)
    } catch {
      toast.error('Clipboard unavailable')
    }
  }

  async function openCustomerPortal() {
    setOpeningPortal(true)
    try {
      const response = await api('/api/billing/portal', { method: 'POST' })
      window.location.href = response.portal_url
    } catch (error) {
      toast.error(error.message)
    } finally {
      setOpeningPortal(false)
    }
  }

  if (loading) return <p className="muted animate-pulse text-sm">Loading account...</p>

  return (
    <div className="account-page space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="eyebrow mb-2">Control Room</p>
          <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">Account</h1>
          <p className="muted mt-3 max-w-2xl text-sm">Profile, subscription, usage, and API access in one production-ready workspace.</p>
        </div>
        <div className="account-status-strip">
          <span><ShieldCheck className="h-4 w-4" /> {activeKeys} active keys</span>
          <span><CreditCard className="h-4 w-4" /> {formatPlan(billing.subscription_tier)}</span>
        </div>
      </div>

      <div className="account-grid">
        <GlassCard as="section" className="account-profile-card p-5">
          <div className="account-avatar-wrap">
            <div className="account-avatar">
              {avatar ? <img src={avatar} alt="" /> : <UserCircle className="h-16 w-16" />}
            </div>
            <label className="account-avatar-upload" data-magnetic>
              <Camera className="h-4 w-4" />
              Upload avatar
              <input type="file" accept="image/*" onChange={uploadAvatar} />
            </label>
          </div>
          <div className="account-profile-copy">
            <p className="eyebrow mb-2">Profile</p>
            <h2>{user?.full_name || 'AI Platform user'}</h2>
            <p>{user?.email}</p>
          </div>
        </GlassCard>

        <GlassCard as="section" className="account-billing-card p-5">
          <p className="eyebrow mb-2">Subscription</p>
          <div className="account-plan-row">
            <div>
              <h2>{formatPlan(billing.subscription_tier)}</h2>
              <p>{formatPlanStatus(billing.subscription_status)}</p>
            </div>
            <span className="account-credit-badge">{Number(billing.credits_remaining || 0).toLocaleString()} credits</span>
          </div>
          <div className="account-meter">
            <span style={{ width: `${Math.min(100, Math.max(6, ((billing.credits_remaining || 0) / 100000) * 100))}%` }} />
          </div>
          {billing.next_billing_date && <p className="mt-3 text-sm">Next billing date {formatDate(billing.next_billing_date)}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <GlassButton as="a" href="/pricing" variant="secondary">Manage plan</GlassButton>
            {billing.customer_portal_available && (
              <GlassButton type="button" variant="secondary" onClick={openCustomerPortal} disabled={openingPortal}>
                <ExternalLink className="h-4 w-4" />
                {openingPortal ? 'Opening' : 'Customer portal'}
              </GlassButton>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="account-stat-grid">
        <AccountStat icon={BarChart3} label="Requests" value={usage?.total_events || 0} />
        <AccountStat icon={SparkMini} label="Credits used" value={usage?.total_credits_used || 0} />
        <AccountStat icon={KeyRound} label="Tokens" value={usage?.total_tokens || 0} />
      </div>

      <GlassCard as="section" className="billing-history-panel p-5">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-1">Billing History</p>
            <h2 className="text-xl font-semibold text-white">Payments and credits</h2>
          </div>
          <span className="account-credit-badge">{billingHistory.length} records</span>
        </div>
        <div className="billing-history-list">
          {billingHistory.map((record) => (
            <article key={record.id} className="billing-history-row">
              <div className="billing-history-icon"><CreditCard className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <h3>{record.description || formatPlan(record.tier || record.purchase_type)}</h3>
                <p>{formatDate(record.created_at)} / {record.status} / {record.mode}</p>
              </div>
              <div className="billing-history-amount">
                <strong>{formatCurrency(record.amount_cents, record.currency)}</strong>
                <span>+{Number(record.credits || 0).toLocaleString()} credits</span>
              </div>
            </article>
          ))}
          {billingHistory.length === 0 && <div className="api-key-empty">No billing records yet.</div>}
        </div>
      </GlassCard>

      <GlassCard as="section" className="account-keys-panel p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-1">Developer Access</p>
            <h2 className="text-xl font-semibold text-white">API key management</h2>
            <p className="muted mt-2 text-sm">Keys are shown only once. Copy newly created keys before leaving this page.</p>
          </div>
          <span className="account-warning"><AlertTriangle className="h-4 w-4" /> One-time reveal</span>
        </div>

        <form className="account-key-form" onSubmit={createKey}>
          <GlassInput placeholder="Key name, e.g. Production server" value={keyName} onChange={(event) => setKeyName(event.target.value)} />
          <GlassButton type="submit" disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? 'Creating' : 'Create key'}
          </GlassButton>
        </form>

        {newKey && (
          <div className="account-key-reveal">
            <code>{newKey.key}</code>
            <button type="button" onClick={() => copy(newKey.key, 'API key copied')} aria-label="Copy new API key">
              {copied === newKey.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}

        <div className="account-key-list">
          {keys.map((key) => (
            <article key={key.id} className={`account-key-row ${key.is_active ? '' : 'is-revoked'}`}>
              <div className="account-key-icon"><KeyRound className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3>{key.name}</h3>
                  <span className={`api-key-status ${key.is_active ? 'is-active' : 'is-inactive'}`}>{key.is_active ? 'Active' : 'Revoked'}</span>
                </div>
                <div className="account-key-meta">
                  <code>{key.key_prefix}...</code>
                  <span>Created {formatDate(key.created_at)}</span>
                  <span>Last used {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}</span>
                </div>
              </div>
              <button type="button" className="account-copy-button" onClick={() => copy(`${key.key_prefix}...`, 'Key prefix copied')} aria-label="Copy key prefix">
                {copied === `${key.key_prefix}...` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <button type="button" className="api-key-revoke" disabled={!key.is_active || revokingId === key.id} onClick={() => revokeKey(key)}>
                <Trash2 className="h-4 w-4" />
                {revokingId === key.id ? 'Revoking' : 'Revoke'}
              </button>
            </article>
          ))}
          {keys.length === 0 && <div className="api-key-empty">No API keys yet.</div>}
        </div>
      </GlassCard>
    </div>
  )
}

function AccountStat({ icon: Icon, label, value }) {
  return (
    <GlassCard className="account-stat-card p-5">
      <span><Icon className="h-4 w-4" /></span>
      <p>{label}</p>
      <strong>{Number(value || 0).toLocaleString()}</strong>
    </GlassCard>
  )
}

function SparkMini(props) {
  return <BarChart3 {...props} />
}

function formatPlan(value) {
  return String(value || 'free').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPlanStatus(value) {
  const status = String(value || 'free')
  if (status === 'free') return 'Free workspace'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value) {
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
