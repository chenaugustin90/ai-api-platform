import { AlertTriangle, Check, Clipboard, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { GlassButton, GlassCard, GlassInput } from '../components/ui'

export default function ApiKeys() {
  const [keys, setKeys] = useState([])
  const [name, setName] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState(null)
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')
  const activeCount = useMemo(() => keys.filter((key) => key.is_active).length, [keys])

  async function load() {
    setLoading(true)
    try {
      setKeys(await api('/api/api-keys'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('new_api_key')
    if (stored) {
      try {
        setNewKey(JSON.parse(stored))
      } catch {
        setNewKey(null)
      }
      sessionStorage.removeItem('new_api_key')
    }
    load()
  }, [])

  async function createKey(event) {
    event.preventDefault()
    setCreating(true)
    try {
      const created = await api('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() || `Key ${keys.length + 1}` })
      })
      setNewKey(created)
      setName('')
      showToast('API key created')
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(key) {
    if (!key.is_active) return
    setRevokingId(key.id)
    try {
      await api(`/api/api-keys/${key.id}`, { method: 'DELETE' })
      showToast('API key revoked')
      await load()
    } finally {
      setRevokingId(null)
    }
  }

  async function copy(value, label = 'Copied') {
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(value)
      showToast(label)
      window.setTimeout(() => setCopied(''), 1300)
    } catch {
      showToast('Clipboard unavailable')
    }
  }

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1700)
  }

  if (loading) return <p className="muted animate-pulse text-sm">Loading API keys...</p>

  return (
    <div className="api-keys-page space-y-6">
      {toast && <div className="api-key-toast">{toast}</div>}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-2">Access Control</p>
          <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">API Keys</h1>
          <p className="muted mt-3 max-w-2xl text-sm">Create, copy, monitor, and revoke keys used by generation endpoints.</p>
        </div>
        <div className="api-key-summary">
          <ShieldCheck className="h-4 w-4" />
          {activeCount} active / {keys.length} total
        </div>
      </div>

      <GlassCard as="section" className="api-key-warning p-5">
        <div className="api-key-warning-icon">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Keys are shown only once</h2>
          <p className="muted mt-1 text-sm">Copy the full API key immediately after creation. Existing keys only expose their prefix for identification.</p>
        </div>
      </GlassCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <GlassCard as="form" className="api-key-create p-5" onSubmit={createKey}>
          <div className="mb-4 flex items-center gap-3">
            <span className="docs-section-icon"><KeyRound className="h-4 w-4" /></span>
            <div>
              <p className="eyebrow mb-1">Create</p>
              <h2 className="text-xl font-semibold text-white">New API key</h2>
            </div>
          </div>
          <GlassInput placeholder="Key name, e.g. Production server" value={name} onChange={(event) => setName(event.target.value)} />
          <GlassButton className="mt-4 w-full" type="submit" disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? 'Creating' : 'Create key'}
          </GlassButton>

          {newKey && (
            <div className="api-key-reveal">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{newKey.name}</p>
                <button className="api-key-copy" type="button" onClick={() => copy(newKey.key, 'API key copied')} aria-label="Copy API key">
                  {copied === newKey.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <code>{newKey.key}</code>
            </div>
          )}
        </GlassCard>

        <GlassCard as="section" className="api-key-list p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">Manage</p>
              <h2 className="text-xl font-semibold text-white">Existing keys</h2>
            </div>
            <span className="lg-pill text-xs">{keys.length} keys</span>
          </div>

          <div className="grid gap-3">
            {keys.map((key) => (
              <ApiKeyCard
                key={key.id}
                apiKey={key}
                copied={copied}
                revoking={revokingId === key.id}
                onCopy={copy}
                onRevoke={revokeKey}
              />
            ))}
            {keys.length === 0 && (
              <div className="api-key-empty">
                <Clipboard className="h-5 w-5" />
                <span>No API keys yet.</span>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

function ApiKeyCard({ apiKey, copied, revoking, onCopy, onRevoke }) {
  const usage = apiKey.usage ?? apiKey.credits_used ?? apiKey.total_credits_used
  const hasUsage = usage !== undefined && usage !== null
  const prefixText = `${apiKey.key_prefix}...`

  return (
    <article className={`api-key-card ${apiKey.is_active ? '' : 'is-revoked'}`} data-magnetic>
      <div className="api-key-card-icon">
        <KeyRound className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-white">{apiKey.name}</h3>
          <span className={`api-key-status ${apiKey.is_active ? 'is-active' : 'is-inactive'}`}>{apiKey.is_active ? 'Active' : 'Revoked'}</span>
        </div>
        <div className="api-key-prefix">
          <code>{prefixText}</code>
          <button type="button" onClick={() => onCopy(prefixText, 'Key prefix copied')} aria-label="Copy key prefix">
            {copied === prefixText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="api-key-meta">
          <span>Created {formatDate(apiKey.created_at)}</span>
          <span>Last used {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Never'}</span>
          <span>{hasUsage ? `${Number(usage).toLocaleString()} credits` : 'Usage per key not reported yet'}</span>
        </div>
      </div>
      <button className="api-key-revoke" type="button" disabled={!apiKey.is_active || revoking} onClick={() => onRevoke(apiKey)}>
        <Trash2 className="h-4 w-4" />
        {revoking ? 'Revoking' : 'Revoke'}
      </button>
    </article>
  )
}

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}
