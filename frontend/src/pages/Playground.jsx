import { Check, Clock3, Code2, Copy, Play, Sparkles, TerminalSquare, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { API_URL, MOCK_PROVIDERS_ENABLED, apiKeyRequest, getOrCreateDevelopmentApiKey } from '../api/client'
import { GlassButton, GlassCard, GlassInput, GlassSelect, GlassTextarea } from '../components/ui'

const ENDPOINTS = {
  text: {
    label: 'Text generation',
    path: '/api/generate/text',
    providers: ['openai', 'deepseek', 'claude', 'qwen'],
    credits: 1,
    defaults: { prompt: 'Write a concise launch note for a premium AI API platform.', max_tokens: 512 }
  },
  image: {
    label: 'Image generation',
    path: '/api/generate/image',
    providers: ['openai', 'flux'],
    credits: 10,
    defaults: { prompt: 'A cinematic VisionOS glass console for an AI API platform', size: '1024x1024' }
  },
  video: {
    label: 'Video generation',
    path: '/api/generate/video',
    providers: ['runway', 'kling', 'veo'],
    credits: 50,
    defaults: { prompt: 'A slow dolly through a glowing glass AI command center', duration_seconds: 5 }
  }
}

export default function Playground() {
  const [endpoint, setEndpoint] = useState('text')
  const config = ENDPOINTS[endpoint]
  const [provider, setProvider] = useState(config.providers[0])
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [requestText, setRequestText] = useState(formatJson(buildPayload(endpoint, config.providers[0], '', config.defaults)))
  const [response, setResponse] = useState(null)
  const [error, setError] = useState('')
  const [responseTime, setResponseTime] = useState(null)
  const [creditsUsed, setCreditsUsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const nextConfig = ENDPOINTS[endpoint]
    const nextProvider = nextConfig.providers[0]
    setProvider(nextProvider)
    setModel('')
    setResponse(null)
    setError('')
    setResponseTime(null)
    setCreditsUsed(null)
    setRequestText(formatJson(buildPayload(endpoint, nextProvider, '', nextConfig.defaults)))
  }, [endpoint])

  useEffect(() => {
    setRequestText((current) => {
      try {
        const parsed = JSON.parse(current)
        return formatJson({ ...parsed, provider, model: model.trim() || null })
      } catch {
        return current
      }
    })
  }, [provider, model])

  const parsedRequest = useMemo(() => {
    try {
      return JSON.parse(requestText)
    } catch {
      return null
    }
  }, [requestText])

  const snippets = useMemo(() => {
    const payload = parsedRequest || buildPayload(endpoint, provider, model, config.defaults)
    return {
      curl: makeCurl(config.path, payload),
      python: makePython(config.path, payload),
      javascript: makeJavaScript(config.path, payload)
    }
  }, [config.path, config.defaults, endpoint, model, parsedRequest, provider])

  async function sendRequest(event) {
    event.preventDefault()
    setError('')
    setResponse(null)
    setResponseTime(null)
    setCreditsUsed(null)

    let payload
    try {
      payload = JSON.parse(requestText)
    } catch {
      setError('Request body must be valid JSON.')
      return
    }

    setLoading(true)
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'generating' } }))
    const started = performance.now()
    try {
      const key = apiKey.trim() || (MOCK_PROVIDERS_ENABLED ? await getOrCreateDevelopmentApiKey() : '')
      if (!key) throw new Error('API key is required when mock provider mode is disabled.')
      const result = await apiKeyRequest(config.path, key, payload)
      setResponse(result)
      setResponseTime(Math.round(performance.now() - started))
      setCreditsUsed(config.credits)
    } catch (err) {
      setError(err.message)
      setResponseTime(Math.round(performance.now() - started))
    } finally {
      setLoading(false)
      window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
    }
  }

  async function copy(label, value) {
    await navigator.clipboard?.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1400)
  }

  return (
    <div className="playground-page space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-2">API Lab</p>
          <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">Playground</h1>
          <p className="muted mt-3 max-w-2xl text-sm">Compose real platform requests, inspect JSON responses, and lift production-ready snippets.</p>
        </div>
        <div className="playground-signal">
          <Sparkles className="h-4 w-4" />
          Live metered route
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
        <GlassCard as="form" className="playground-console" onSubmit={sendRequest}>
          <div className="playground-toolbar">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="composer-spark"><TerminalSquare className="h-4 w-4" /></span>
              Request console
            </div>
            <span className="lg-pill text-xs">{config.path}</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
            <GlassSelect value={endpoint} options={endpointOptions()} onChange={(event) => setEndpoint(event.target.value)} />
            <GlassSelect value={provider} options={config.providers} onChange={(event) => setProvider(event.target.value)} />
            <GlassInput placeholder="Model override" value={model} onChange={(event) => setModel(event.target.value)} />
          </div>

          <GlassInput
            placeholder={MOCK_PROVIDERS_ENABLED ? 'API key optional in mock mode' : 'API key'}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />

          <label className="playground-editor-label" htmlFor="playground-request">Prompt / request body</label>
          <GlassTextarea
            id="playground-request"
            className="playground-editor"
            spellCheck="false"
            wrap="soft"
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
          />

          <div className="sticky-action-row flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <MetricPill icon={Zap} label={`${config.credits} credits`} />
              {responseTime !== null && <MetricPill icon={Clock3} label={`${responseTime} ms`} />}
            </div>
            <GlassButton type="submit" disabled={loading || !parsedRequest}>
              <Play className="h-4 w-4" />
              {loading ? 'Sending' : 'Send request'}
            </GlassButton>
          </div>
          {!parsedRequest && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">Invalid JSON in request editor.</p>}
          {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
        </GlassCard>

        <div className="space-y-5">
          <GlassCard className="playground-response p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">Response</p>
                <h2 className="text-xl font-semibold text-white">JSON output</h2>
              </div>
              <GlassButton variant="ghost" size="icon" onClick={() => copy('response', formatJson(response || { status: 'waiting' }))} aria-label="Copy response">
                {copied === 'response' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </GlassButton>
            </div>
            <div className="playground-metrics">
              <MetricPill icon={Clock3} label={responseTime === null ? 'No response yet' : `${responseTime} ms`} />
              <MetricPill icon={Zap} label={creditsUsed === null ? '0 credits' : `${creditsUsed} credits used`} />
            </div>
            <pre className="playground-json">{formatJson(response || { status: 'Send a request to inspect the response.' })}</pre>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <span className="composer-spark"><Code2 className="h-4 w-4" /></span>
              Copy snippets
            </div>
            <div className="grid gap-3">
              <SnippetButton label="Copy curl" copied={copied === 'curl'} onClick={() => copy('curl', snippets.curl)} />
              <SnippetButton label="Copy Python" copied={copied === 'python'} onClick={() => copy('python', snippets.python)} />
              <SnippetButton label="Copy JavaScript" copied={copied === 'javascript'} onClick={() => copy('javascript', snippets.javascript)} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

function buildPayload(endpoint, provider, model, defaults) {
  return {
    provider,
    model: model.trim() || null,
    ...defaults
  }
}

function endpointOptions() {
  return Object.entries(ENDPOINTS).map(([value, endpoint]) => ({ value, label: endpoint.label }))
}

function formatJson(value) {
  return JSON.stringify(value, null, 2)
}

function makeCurl(path, payload) {
  return `curl -X POST ${API_URL}${path} \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: $AI_API_KEY" \\\n  -d '${shellSingleQuote(JSON.stringify(payload))}'`
}

function makePython(path, payload) {
  return `import json\nimport requests\n\npayload = json.loads('''${formatJson(payload)}''')\n\nresponse = requests.post(\n    "${API_URL}${path}",\n    headers={"Content-Type": "application/json", "X-API-Key": AI_API_KEY},\n    json=payload\n)\nprint(response.json())`
}

function makeJavaScript(path, payload) {
  return `const response = await fetch("${API_URL}${path}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "X-API-Key": AI_API_KEY\n  },\n  body: JSON.stringify(${formatJson(payload).replaceAll('\n', '\n  ')})\n});\n\nconsole.log(await response.json());`
}

function shellSingleQuote(value) {
  return value.replaceAll("'", "'\"'\"'")
}

function MetricPill({ icon: Icon, label }) {
  return (
    <span className="playground-metric">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function SnippetButton({ label, copied, onClick }) {
  return (
    <button className="snippet-copy" type="button" onClick={onClick}>
      <span>{label}</span>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
