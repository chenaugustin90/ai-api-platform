import { Activity, Bot, Copy, Image, Plus, Trash2, Video, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

export default function Usage() {
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])
  const [keys, setKeys] = useState([])
  const [newKey, setNewKey] = useState(null)

  async function load() {
    const [summaryData, eventsData, keysData] = await Promise.all([
      api('/api/usage/summary'),
      api('/api/usage/events'),
      api('/api/api-keys')
    ])
    setSummary(summaryData)
    setEvents(eventsData)
    setKeys(keysData)
  }

  useEffect(() => {
    load()
  }, [])

  async function createKey() {
    const created = await api('/api/api-keys', { method: 'POST', body: JSON.stringify({ name: `Key ${keys.length + 1}` }) })
    setNewKey(created.key)
    await load()
  }

  async function revoke(id) {
    await api(`/api/api-keys/${id}`, { method: 'DELETE' })
    await load()
  }

  if (!summary) return <p className="muted animate-pulse text-sm">Loading usage...</p>

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Telemetry</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl">Usage</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Credits remaining" value={summary.credits_remaining} />
        <Stat label="Total events" value={summary.total_events} />
        <Stat label="Total tokens" value={summary.total_tokens} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <UsageBreakdown title="Credits by provider" items={summary.by_provider} />
        <UsageBreakdown title="Credits by model" items={summary.by_model} />
      </div>
      <GlassCard as="section" className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">API keys</h2>
          <GlassButton onClick={createKey}><Plus className="h-4 w-4" /> New key</GlassButton>
        </div>
        {newKey && (
          <div className="lg-alert mt-4 overflow-auto p-4 text-sm">
            <GlassButton className="float-right" variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(newKey)} aria-label="Copy API key"><Copy className="h-4 w-4" /></GlassButton>
            <code>{newKey}</code>
          </div>
        )}
        <div className="mt-4 divide-y divide-white/10">
          {keys.map((key) => (
            <div key={key.id} className="flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-white">{key.name} <code className="text-[#A1A1AA]">{key.key_prefix}...</code></span>
              <GlassButton variant="secondary" onClick={() => revoke(key.id)}><Trash2 className="h-4 w-4" /> Revoke</GlassButton>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard as="section" className="usage-timeline-panel p-5">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Activity</p>
            <h2 className="text-xl font-semibold text-white">Usage timeline</h2>
          </div>
          <span className="lg-pill text-xs">{events.length} events</span>
        </div>
        <div className="usage-timeline">
          {events.map((event) => <UsageEvent key={event.id} event={event} />)}
          {events.length === 0 && <p className="muted text-sm">No usage events yet.</p>}
        </div>
      </GlassCard>
    </div>
  )
}

function UsageBreakdown({ title, items = {} }) {
  const rows = Object.entries(items).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 6)
  return (
    <GlassCard className="usage-breakdown-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="lg-pill text-xs">{rows.length} tracked</span>
      </div>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="usage-breakdown-row">
            <span>{label}</span>
            <strong>{Number(value).toLocaleString()} credits</strong>
          </div>
        ))}
        {rows.length === 0 && <p className="muted text-sm">No usage recorded yet.</p>}
      </div>
    </GlassCard>
  )
}

function Stat({ label, value }) {
  return (
    <GlassCard className="p-5">
      <div className="text-3xl font-bold text-white">{Number(value).toLocaleString()}</div>
      <div className="muted mt-1 text-sm">{label}</div>
    </GlassCard>
  )
}

function UsageEvent({ event }) {
  const Icon = event.modality === 'image' ? Image : event.modality === 'video' ? Video : Bot
  return (
    <article className="usage-event-card" data-magnetic>
      <div className="usage-event-line" aria-hidden="true" />
      <div className="usage-provider-icon">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-pulse" aria-label="Completed" />
          <h3 className="text-sm font-semibold capitalize text-white">{event.modality || 'request'}</h3>
          <span className="text-xs text-[#A1A1AA]">{relativeTime(event.created_at)}</span>
        </div>
        <p className="mt-1 truncate text-sm text-[#DFFBFF]">{event.provider} / {event.model}</p>
        <div className="usage-event-details">
          <span><Activity className="h-3.5 w-3.5" /> ID {event.id}</span>
          <span><Zap className="h-3.5 w-3.5" /> {new Date(event.created_at).toLocaleString()}</span>
        </div>
      </div>
      <span className="credit-badge">{Number(event.credits_used || 0).toLocaleString()} credits</span>
    </article>
  )
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'just now'
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
