import { Activity, CheckCircle2, ExternalLink, FlaskConical, KeyRound, RefreshCw, Settings, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { API_URL, api } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

export default function ProviderSettings() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)
  const [testing, setTesting] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [testResults, setTestResults] = useState({})

  async function loadStatus() {
    setError('')
    setRefreshing(true)
    try {
      const [status, healthStatus] = await Promise.all([
        api('/api/providers/status'),
        api('/health/providers').catch(() => null)
      ])
      setData(status)
      setHealth(healthStatus)
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const healthProviders = Object.fromEntries((health?.providers || []).map((provider) => [provider.id, provider]))
  const providers = data?.providers.map((provider) => ({
    ...provider,
    ...(healthProviders[provider.id] || {})
  })) || []
  const connectedCount = health?.summary
    ? `${health.summary.connected}/${health.summary.total}`
    : `${providers.filter((provider) => provider.configured).length}/${providers.length}`

  async function testProvider(provider) {
    setTesting(provider.id)
    setTestResults((current) => ({ ...current, [provider.id]: null }))
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'thinking' } }))
    try {
      const result = await api('/api/providers/test', {
        method: 'POST',
        body: JSON.stringify({ provider: provider.id })
      })
      setTestResults((current) => ({ ...current, [provider.id]: result }))
      await loadStatus()
    } catch (err) {
      setTestResults((current) => ({
        ...current,
        [provider.id]: { provider: provider.id, success: false, latency: 0, message: err.message }
      }))
    } finally {
      setTesting('')
      window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
    }
  }

  if (!data && !error) return <p className="muted animate-pulse text-sm">Loading provider settings...</p>

  return (
    <div className="provider-settings-page space-y-6">
      <div className="provider-settings-hero">
        <div>
          <p className="eyebrow mb-2">Settings / AI Providers</p>
          <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">AI Providers</h1>
          <p className="muted mt-3 max-w-2xl text-sm">Configure upstream model providers, verify environment variables, and run live connection checks.</p>
        </div>
        <GlassButton variant="secondary" onClick={loadStatus} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </GlassButton>
      </div>

      {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}

      {data && (
        <GlassCard className="provider-overview p-5">
          <div>
            <p className="eyebrow mb-1">Runtime</p>
            <h2 className="text-xl font-bold text-white">Production provider health</h2>
          </div>
          <div className="provider-overview-grid">
            <ProviderRuntimeMetric label="Fallback mode" value={data.allow_mock_providers ? 'Enabled' : 'Disabled'} />
            {health && <ProviderRuntimeMetric label="Effective mode" value={health.fallback_mode ? 'Mock fallback' : 'Real providers'} />}
            <ProviderRuntimeMetric label="Image model" value={data.openai_image_model} />
            <ProviderRuntimeMetric label="Connected" value={connectedCount} />
            <ProviderRuntimeMetric label="Backend URL" value={API_URL || 'Missing BACKEND_URL'} />
          </div>
        </GlassCard>
      )}

      <div className="provider-settings-grid">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            testing={testing === provider.id}
            result={testResults[provider.id]}
            onTest={() => testProvider(provider)}
          />
        ))}
      </div>
    </div>
  )
}

function ProviderRuntimeMetric({ label, value }) {
  return (
    <div className="provider-runtime-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ProviderCard({ provider, testing, result, onTest }) {
  const StatusIcon = provider.configured ? CheckCircle2 : XCircle
  const statusLabel = provider.configured ? 'connected' : 'disconnected'

  return (
    <GlassCard as="article" className="provider-card p-5">
      <div className="provider-card-header">
        <div className="flex items-center gap-3">
          <span className={`provider-card-icon ${provider.configured ? 'is-connected' : 'is-missing'}`}>
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">{provider.name}</h2>
            <p className="muted text-xs">{provider.env_var}</p>
          </div>
        </div>
        <span className={`provider-status ${provider.configured ? 'is-connected' : 'is-missing'}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </span>
      </div>
      <div className="provider-mode-row">
        <span className={`provider-mode-pill is-${provider.execution_mode || 'unknown'}`}>
          {(provider.execution_mode || 'unknown').replace('-', ' ')} mode
        </span>
        {provider.will_use_real_provider && <span className="provider-mode-pill is-real">Real upstream</span>}
        {provider.will_use_mock && <span className="provider-mode-pill is-mock">Mock fallback</span>}
      </div>
      {provider.message && <p className="provider-diagnostic-message">{provider.message}</p>}

      <div className="provider-section">
        <p className="provider-section-title">
          <Activity className="h-3.5 w-3.5" />
          Model information
        </p>
        <div className="provider-capabilities">
          {(provider.capabilities || []).map((capability) => <span key={capability}>{capability}</span>)}
        </div>
        <div className="provider-models">
          {provider.models.map((model) => <span key={model}>{model}</span>)}
        </div>
      </div>

      <div className="provider-section">
        <p className="provider-section-title">
          <Settings className="h-3.5 w-3.5" />
          Setup guide
        </p>
        <ol className="provider-setup-list">
          {provider.setup_steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>

      {result && (
        <div className={`provider-test-result ${result.success ? 'is-success' : 'is-failed'}`}>
          <strong>{result.success ? 'Test passed' : 'Test failed'}</strong>
          <span>{result.latency} ms</span>
          <p>{result.message}</p>
        </div>
      )}

      <div className="provider-card-actions">
        <GlassButton onClick={onTest} disabled={testing}>
          {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          {testing ? 'Testing' : 'Test connection'}
        </GlassButton>
        <GlassButton as="a" href={provider.docs_url} target="_blank" rel="noreferrer" variant="secondary">
          <ExternalLink className="h-4 w-4" />
          Docs
        </GlassButton>
      </div>
    </GlassCard>
  )
}
