import { Check, Clock3, Code2, Copy, Play, Sparkles, TerminalSquare, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { API_URL, api, apiKeyRequest, getToken } from '../api/client'
import { GlassButton, GlassCard, GlassInput, GlassSelect, GlassTextarea } from '../components/ui'
import { saveTextGenerationHistory } from '../utils/generationHistory'

const MODEL_CHOICES = [
  { id: 'gpt-4o-mini', label: 'GPT-4o', provider: 'openai', model: 'gpt-4o-mini' },
  { id: 'claude', label: 'Claude', provider: 'claude', model: 'claude-haiku-4-5' },
  { id: 'deepseek', label: 'DeepSeek', provider: 'deepseek', model: 'deepseek-chat' }
]

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
  const [authMode, setAuthMode] = useState('chat')
  const [selectedModel, setSelectedModel] = useState(MODEL_CHOICES[0].id)
  const [provider, setProvider] = useState(config.providers[0])
  const [model, setModel] = useState(MODEL_CHOICES[0].model)
  const [prompt, setPrompt] = useState(config.defaults.prompt)
  const [apiKey, setApiKey] = useState('')
  const [requestText, setRequestText] = useState(formatJson(buildPayload(endpoint, config.providers[0], '', config.defaults)))
  const [response, setResponse] = useState(null)
  const [error, setError] = useState('')
  const [responseTime, setResponseTime] = useState(null)
  const [creditsUsed, setCreditsUsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [streamedResponse, setStreamedResponse] = useState('')

  useEffect(() => {
    const nextConfig = ENDPOINTS[endpoint]
    const nextProvider = nextConfig.providers[0]
    setProvider(nextProvider)
    setModel(endpoint === 'text' ? MODEL_CHOICES[0].model : '')
    setSelectedModel(endpoint === 'text' ? MODEL_CHOICES[0].id : '')
    setPrompt(nextConfig.defaults.prompt)
    setResponse(null)
    setError('')
    setResponseTime(null)
    setCreditsUsed(null)
    setRequestText(formatJson(buildPayload(endpoint, nextProvider, '', nextConfig.defaults)))
  }, [endpoint])

  useEffect(() => {
    const text = response?.text || ''
    setStreamedResponse('')
    if (!text) return undefined
    let index = 0
    const timer = window.setInterval(() => {
      index += Math.max(1, Math.ceil(text.length / 48))
      setStreamedResponse(text.slice(0, index))
      if (index >= text.length) window.clearInterval(timer)
    }, 24)
    return () => window.clearInterval(timer)
  }, [response])

  useEffect(() => {
    setRequestText((current) => {
      try {
        const parsed = JSON.parse(current)
        return formatJson({ ...parsed, provider, model: model.trim() || null, prompt })
      } catch {
        return current
      }
    })
  }, [provider, model, prompt])

  function chooseModel(choiceId) {
    const choice = MODEL_CHOICES.find((item) => item.id === choiceId) || MODEL_CHOICES[0]
    setEndpoint('text')
    setSelectedModel(choice.id)
    setProvider(choice.provider)
    setModel(choice.model)
  }

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
      curl: makeCurl(config.path, payload, authMode),
      python: makePython(config.path, payload, authMode),
      javascript: makeJavaScript(config.path, payload, authMode)
    }
  }, [authMode, config.path, config.defaults, endpoint, model, parsedRequest, provider])

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
      let result
      if (authMode === 'developer') {
        const key = apiKey.trim()
        if (!key) throw new Error('API key is required in Developer API Mode.')
        result = await apiKeyRequest(config.path, key, payload)
      } else {
        result = await sendChatModeRequest(config.path, payload)
      }
      setResponse(result)
      if (endpoint === 'text') {
        saveTextGenerationHistory({
          prompt: payload.prompt || '',
          response: result.text || '',
          text: result.text || '',
          provider: result.provider || payload.provider,
          model: result.model || payload.model,
          created_at: new Date().toISOString()
        })
      }
      setResponseTime(Math.round(performance.now() - started))
      setCreditsUsed(result.credits_used ?? config.credits)
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
    <div className="playground-page minimal-playground space-y-6">
      <div className="flex flex-col gap-4 lg:items-center lg:text-center">
        <div>
          <p className="eyebrow mb-2">Create</p>
          <h1 className="title-gradient text-4xl font-bold sm:text-5xl md:text-6xl">What do you want to make?</h1>
          <p className="muted mx-auto mt-3 max-w-2xl text-sm">Choose a model, describe the result, and let the platform handle the routing.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)]">
        <GlassCard as="form" className="playground-console" onSubmit={sendRequest}>
          <div className="playground-toolbar">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="composer-spark"><TerminalSquare className="h-4 w-4" /></span>
              Prompt
            </div>
            <button className="advanced-toggle" type="button" onClick={() => setAdvancedOpen((current) => !current)}>
              {advancedOpen ? 'Hide Advanced' : 'Advanced'}
            </button>
          </div>

          <GlassTextarea
            className="playground-editor minimal-prompt-editor"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask for launch copy, API docs, image prompt ideas, provider routing logic..."
          />

          <div className="minimal-model-section">
            <p className="eyebrow">Model</p>
            <div className="minimal-model-grid" role="radiogroup" aria-label="Model">
              {MODEL_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={selectedModel === choice.id ? 'is-active' : ''}
                  onClick={() => chooseModel(choice.id)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>

          {advancedOpen && (
            <div className="playground-advanced-panel">
              <div className="playground-mode-toggle" role="tablist" aria-label="Playground authentication mode">
                <button type="button" role="tab" aria-selected={authMode === 'chat'} className={authMode === 'chat' ? 'is-active' : ''} onClick={() => setAuthMode('chat')}>
                  Chat Mode
                </button>
                <button type="button" role="tab" aria-selected={authMode === 'developer'} className={authMode === 'developer' ? 'is-active' : ''} onClick={() => setAuthMode('developer')}>
                  Developer API Mode
                </button>
              </div>
              <p className="playground-auth-note">
                {authMode === 'chat'
                  ? 'Uses your logged-in session automatically. No API key required.'
                  : 'Sends requests exactly like an external developer using X-API-Key.'}
              </p>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
                <GlassSelect value={endpoint} options={endpointOptions()} onChange={(event) => setEndpoint(event.target.value)} />
                <GlassSelect value={provider} options={config.providers} onChange={(event) => setProvider(event.target.value)} />
                <GlassInput placeholder="Model override" value={model} onChange={(event) => setModel(event.target.value)} />
              </div>

              {authMode === 'developer' && (
                <GlassInput
                  placeholder="Developer API key, e.g. ai_..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
              )}

              <label className="playground-editor-label" htmlFor="playground-request">Request JSON</label>
              <GlassTextarea
                id="playground-request"
                className="playground-editor"
                spellCheck="false"
                wrap="soft"
                value={requestText}
                onChange={(event) => setRequestText(event.target.value)}
              />
            </div>
          )}

          <div className="sticky-action-row flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <MetricPill icon={Zap} label={`${config.credits} credits`} />
              {responseTime !== null && <MetricPill icon={Clock3} label={`${responseTime} ms`} />}
            </div>
            <GlassButton type="submit" disabled={loading || !parsedRequest}>
              <Play className="h-4 w-4" />
              {loading ? 'Generating' : 'Generate'}
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
                <h2 className="text-xl font-semibold text-white">{response ? 'Your result' : 'Ready when you are'}</h2>
              </div>
              <GlassButton variant="ghost" size="icon" onClick={() => copy('response', formatJson(response || { status: 'waiting' }))} aria-label="Copy response">
                {copied === 'response' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </GlassButton>
            </div>
            <div className="playground-metrics">
              <MetricPill icon={Clock3} label={responseTime === null ? 'No response yet' : `${responseTime} ms`} />
              <MetricPill icon={Zap} label={creditsUsed === null ? '0 credits' : `${creditsUsed} credits used`} />
            </div>
            <pre className={`playground-json ${response?.text ? 'is-text-response' : ''} ${loading ? 'is-thinking' : ''}`}>
              {loading ? 'Thinking…' : streamedResponse || formatJson(response || { status: 'Your generated result will appear here.' })}
            </pre>
          </GlassCard>

          {advancedOpen && (
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
          )}
        </div>
      </div>
    </div>
  )
}

async function sendChatModeRequest(path, payload) {
  if (!getToken()) {
    throw new Error('Please log in again to use Chat Mode. Developer API Mode is only for manual X-API-Key testing.')
  }
  return api(path, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
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

function authHeader(mode) {
  return mode === 'developer'
    ? { name: 'X-API-Key', value: '$AI_API_KEY', python: '"X-API-Key": AI_API_KEY', javascript: '"X-API-Key": AI_API_KEY' }
    : { name: 'Authorization', value: 'Bearer $JWT_TOKEN', python: '"Authorization": f"Bearer {JWT_TOKEN}"', javascript: '"Authorization": `Bearer ${JWT_TOKEN}`' }
}

function makeCurl(path, payload, mode) {
  const header = authHeader(mode)
  return `curl -X POST ${API_URL}${path} \\\n  -H "Content-Type: application/json" \\\n  -H "${header.name}: ${header.value}" \\\n  -d '${shellSingleQuote(JSON.stringify(payload))}'`
}

function makePython(path, payload, mode) {
  const header = authHeader(mode)
  return `import json\nimport requests\n\npayload = json.loads('''${formatJson(payload)}''')\n\nresponse = requests.post(\n    "${API_URL}${path}",\n    headers={"Content-Type": "application/json", ${header.python}},\n    json=payload\n)\nprint(response.json())`
}

function makeJavaScript(path, payload, mode) {
  const header = authHeader(mode)
  return `const response = await fetch("${API_URL}${path}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    ${header.javascript}\n  },\n  body: JSON.stringify(${formatJson(payload).replaceAll('\n', '\n  ')})\n});\n\nconsole.log(await response.json());`
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
