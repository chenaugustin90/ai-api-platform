import { Check, Copy, FileCode2, KeyRound, Rocket, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GlassCard } from '../components/ui'
import { API_URL } from '../api/client'

const sections = [
  ['Quick start', 'quick-start'],
  ['Auth', 'auth'],
  ['API Keys', 'api-keys'],
  ['Text generation', 'text'],
  ['Image generation', 'image'],
  ['Video generation', 'video'],
  ['Usage', 'usage']
]

const endpointDocs = [
  {
    id: 'api-keys',
    title: 'API Keys',
    method: 'POST',
    path: '/api/api-keys',
    description: 'Create, list, and revoke project API keys from an authenticated user session. Generated keys are shown once.',
    auth: 'Bearer JWT',
    request: { name: 'Production key' },
    response: { id: 12, name: 'Production key', key: 'ai_live_xxxxxxxxxxxxx', key_prefix: 'ai_live_xxxx' }
  },
  {
    id: 'text',
    title: 'Text generation',
    method: 'POST',
    path: '/api/generate/text',
    description: 'Route a prompt to OpenAI, DeepSeek, Claude, or Qwen and receive metered text output.',
    auth: 'X-API-Key',
    request: { provider: 'openai', model: null, prompt: 'Write a concise launch note for our API.', max_tokens: 512 },
    response: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      text: 'Launch faster with one metered API for text, image, and video generation.',
      usage: { prompt_tokens: 11, completion_tokens: 18, total_tokens: 29 }
    }
  },
  {
    id: 'image',
    title: 'Image generation',
    method: 'POST',
    path: '/api/generate/image',
    description: 'Generate an image with OpenAI or FLUX. Image requests currently debit 10 credits. The configured OpenAI image model can be overridden with OPENAI_IMAGE_MODEL.',
    auth: 'X-API-Key',
    request: { provider: 'openai', model: 'gpt-image-2', prompt: 'A VisionOS glass console for an AI API platform', size: '1024x1024' },
    response: { id: 42, provider: 'openai', model: 'gpt-image-2', status: 'completed', output_url: 'https://cdn.example.com/image.png' }
  },
  {
    id: 'video',
    title: 'Video generation',
    method: 'POST',
    path: '/api/generate/video',
    description: 'Create a video job through Runway, Kling, or Veo. Video requests currently debit 50 credits.',
    auth: 'X-API-Key',
    request: { provider: 'runway', model: null, prompt: 'A slow dolly through a glowing AI operations room', duration_seconds: 5 },
    response: { id: 77, provider: 'runway', model: 'gen-3-alpha', status: 'queued', output_url: null }
  },
  {
    id: 'usage',
    title: 'Usage',
    method: 'GET',
    path: '/api/usage/summary',
    description: 'Read credits, total events, total tokens, and modality/provider breakdowns for the current user.',
    auth: 'Bearer JWT',
    request: null,
    response: {
      credits_remaining: 990,
      total_events: 3,
      total_tokens: 1280,
      by_modality: { text: 1, image: 10, video: 50 },
      by_provider: { openai: 11, runway: 50 }
    }
  }
]

export default function Docs() {
  return (
    <div className="docs-page space-y-6">
      <section className="docs-hero">
        <div>
          <p className="eyebrow mb-2">Developer Surface</p>
          <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">API Docs</h1>
          <p className="muted mt-3 max-w-2xl text-sm">Interactive, copy-ready examples for shipping against the AI API platform.</p>
        </div>
        <div className="docs-hero-badge">
          <ShieldCheck className="h-4 w-4" />
          X-API-Key secured
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <GlassCard as="nav" className="docs-nav p-3">
          {sections.map(([label, href]) => (
            <a key={href} href={`#${href}`} className="docs-nav-link">
              {label}
            </a>
          ))}
        </GlassCard>

        <div className="space-y-5">
          <QuickStart />
          <AuthSection />
          {endpointDocs.map((endpoint) => <EndpointSection key={endpoint.id} endpoint={endpoint} />)}
        </div>
      </div>
    </div>
  )
}

function QuickStart() {
  const request = { provider: 'openai', prompt: 'Write a launch note', max_tokens: 256 }
  return (
    <GlassCard id="quick-start" as="section" className="docs-section p-5">
      <div className="docs-section-heading">
        <span className="docs-section-icon"><Rocket className="h-4 w-4" /></span>
        <div>
          <p className="eyebrow mb-1">Quick start</p>
          <h2 className="text-2xl font-bold text-white">Make your first request</h2>
        </div>
      </div>
      <div className="docs-steps">
        <Step number="01" title="Create an API key" text="Open Usage, create a key, and keep the full value somewhere secure." />
        <Step number="02" title="Send X-API-Key" text="Developer generation endpoints authenticate with the X-API-Key request header." />
        <Step number="03" title="Track credits" text="Every successful generation records usage and deducts credits from the account." />
      </div>
      <CodeTabs path="/api/generate/text" payload={request} />
    </GlassCard>
  )
}

function AuthSection() {
  return (
    <GlassCard id="auth" as="section" className="docs-section p-5">
      <div className="docs-section-heading">
        <span className="docs-section-icon"><KeyRound className="h-4 w-4" /></span>
        <div>
          <p className="eyebrow mb-1">Auth</p>
          <h2 className="text-2xl font-bold text-white">Use X-API-Key for developer requests</h2>
        </div>
      </div>
      <p className="muted text-sm">
        Generation endpoints are designed for server-to-server calls. Pass your API key in the <code className="docs-inline-code">X-API-Key</code> header.
        Account pages such as API key management and usage summaries use the signed-in user's bearer token.
      </p>
      <div className="docs-auth-grid">
        <GlassCard className="docs-auth-card p-4">
          <p className="text-sm font-semibold text-white">Generation auth</p>
          <p className="muted mt-1 text-xs">Use for text, image, and video routes.</p>
          <CodeBlock language="http" code={'X-API-Key: ai_your_key'} compact />
        </GlassCard>
        <GlassCard className="docs-auth-card p-4">
          <p className="text-sm font-semibold text-white">Dashboard auth</p>
          <p className="muted mt-1 text-xs">Used by the authenticated web app.</p>
          <CodeBlock language="http" code={'Authorization: Bearer eyJ...'} compact />
        </GlassCard>
      </div>
    </GlassCard>
  )
}

function EndpointSection({ endpoint }) {
  const payload = endpoint.request || {}
  return (
    <GlassCard id={endpoint.id} as="section" className="docs-section p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="lg-pill text-xs font-bold text-[#00E5FF]">{endpoint.method}</span>
            <code className="docs-path">{endpoint.path}</code>
            <span className="docs-auth-pill">{endpoint.auth}</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{endpoint.title}</h2>
          <p className="muted mt-2 max-w-2xl text-sm">{endpoint.description}</p>
        </div>
        <FileCode2 className="hidden h-6 w-6 text-[#00E5FF] md:block" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="docs-label">Request example</p>
          {endpoint.request ? (
            <CodeBlock language="json" code={formatJson(endpoint.request)} />
          ) : (
            <CodeBlock language="http" code="No request body" />
          )}
        </div>
        <div>
          <p className="docs-label">Response example</p>
          <CodeBlock language="json" code={formatJson(endpoint.response)} />
        </div>
      </div>

      <div className="mt-5">
        <p className="docs-label">Code examples</p>
        <CodeTabs path={endpoint.path} method={endpoint.method} payload={payload} auth={endpoint.auth} />
      </div>
    </GlassCard>
  )
}

function Step({ number, title, text }) {
  return (
    <div className="docs-step">
      <span>{number}</span>
      <p className="font-semibold text-white">{title}</p>
      <p className="muted text-xs">{text}</p>
    </div>
  )
}

function CodeTabs({ path, method = 'POST', payload = {}, auth = 'X-API-Key' }) {
  const [active, setActive] = useState('curl')
  const snippets = useMemo(() => ({
    curl: makeCurl(path, method, payload, auth),
    python: makePython(path, method, payload, auth),
    javascript: makeJavaScript(path, method, payload, auth)
  }), [auth, method, path, payload])

  return (
    <div className="docs-code-tabs">
      <div className="docs-tabs-header">
        <div className="docs-tab-list" role="tablist" aria-label="Code examples">
          {Object.keys(snippets).map((tab) => (
            <button key={tab} type="button" className={`docs-tab ${active === tab ? 'is-active' : ''}`} onClick={() => setActive(tab)}>
              {tab === 'curl' ? 'curl' : tab === 'python' ? 'Python' : 'JavaScript'}
            </button>
          ))}
        </div>
      </div>
      <CodeBlock language={active} code={snippets[active]} />
    </div>
  )
}

function CodeBlock({ code, language, compact = false }) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard?.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className={`docs-code-block ${compact ? 'is-compact' : ''}`}>
      <div className="docs-code-toolbar">
        <span>{language}</span>
        <button type="button" onClick={copyCode} aria-label="Copy code">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre>
        <code>{highlightCode(code, language)}</code>
      </pre>
    </div>
  )
}

function highlightCode(code, language) {
  const pattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*|#.*|\b(?:const|await|fetch|headers|body|JSON|stringify|import|requests|response|print|curl|POST|GET|null|true|false)\b|\b\d+\b|-[A-Z]\b|https?:\/\/[^\s"'`]+)/g
  return code.split(pattern).filter(Boolean).map((part, index) => {
    let className = ''
    if (/^["']/.test(part)) className = 'token-string'
    else if (/^(\/\/|#)/.test(part)) className = 'token-comment'
    else if (/^\d+$/.test(part)) className = 'token-number'
    else if (/^https?:\/\//.test(part)) className = 'token-url'
    else if (/^(curl|POST|GET|const|await|fetch|headers|body|JSON|stringify|import|requests|response|print|null|true|false)$/.test(part)) className = 'token-keyword'
    else if (/^-[A-Z]$/.test(part)) className = 'token-flag'
    return className ? <span key={index} className={className}>{part}</span> : part
  })
}

function formatJson(value) {
  return JSON.stringify(value, null, 2)
}

function makeCurl(path, method, payload, auth) {
  const headers = auth === 'X-API-Key'
    ? '  -H "X-API-Key: $AI_API_KEY"'
    : '  -H "Authorization: Bearer $JWT_TOKEN"'
  const body = method === 'GET' ? '' : ` \\\n  -d '${shellSingleQuote(JSON.stringify(payload))}'`
  return `curl -X ${method} ${API_URL}${path} \\\n  -H "Content-Type: application/json" \\\n${headers}${body}`
}

function makePython(path, method, payload, auth) {
  const header = auth === 'X-API-Key' ? '"X-API-Key": AI_API_KEY' : '"Authorization": f"Bearer {JWT_TOKEN}"'
  const body = method === 'GET'
    ? ''
    : `,\n    json=json.loads('''${formatJson(payload)}''')`
  return `import json\nimport requests\n\nresponse = requests.${method.toLowerCase()}(\n    "${API_URL}${path}",\n    headers={"Content-Type": "application/json", ${header}}${body}\n)\nprint(response.json())`
}

function makeJavaScript(path, method, payload, auth) {
  const header = auth === 'X-API-Key' ? '"X-API-Key": AI_API_KEY' : '"Authorization": `Bearer ${JWT_TOKEN}`'
  const body = method === 'GET' ? '' : `,\n  body: JSON.stringify(${formatJson(payload).replaceAll('\n', '\n  ')})`
  return `const response = await fetch("${API_URL}${path}", {\n  method: "${method}",\n  headers: {\n    "Content-Type": "application/json",\n    ${header}\n  }${body}\n});\n\nconsole.log(await response.json());`
}

function shellSingleQuote(value) {
  return value.replaceAll("'", "'\"'\"'")
}
