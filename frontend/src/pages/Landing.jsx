import { ArrowRight, Code2, Cpu, GitBranch, Image, KeyRound, Layers3, Play, ShieldCheck, Sparkles, TerminalSquare, Video, Zap } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { GlassButton, GlassCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const valueProps = [
  { icon: KeyRound, title: 'Ship with access control', text: 'JWT sessions, hashed API keys, and revoke flows are already built into the platform surface.' },
  { icon: Zap, title: 'Meter every request', text: 'Credit usage maps cleanly to text, image, and video generation so the business model stays visible.' },
  { icon: ShieldCheck, title: 'Start production-shaped', text: 'Stripe scaffolding, usage history, and provider adapters are organized around deployable boundaries.' }
]

const routingFeatures = [
  { icon: Cpu, title: 'Text routing', text: 'OpenAI, DeepSeek, and Qwen routes behind one request shape.' },
  { icon: Image, title: 'Image routing', text: 'OpenAI Images and FLUX support with mock-safe local behavior.' },
  { icon: Video, title: 'Video routing', text: 'Runway, Kling, and Veo placeholders ready for provider expansion.' },
  { icon: GitBranch, title: 'Adapter layer', text: 'Provider-specific logic stays isolated from auth, usage, and billing.' }
]

const examples = [
  { type: 'Text', icon: Sparkles, prompt: 'Launch copy for a premium AI API platform', cost: '1 credit', output: 'A concise launch note with a confident product voice.' },
  { type: 'Image', icon: Image, prompt: 'VisionOS glass console for an AI command center', cost: '10 credits', output: 'A luminous glass interface render with cinematic depth.' },
  { type: 'Video', icon: Video, prompt: 'Slow dolly through a glowing neural operations room', cost: '50 credits', output: 'A queued motion job prepared for provider handoff.' }
]

const plans = [
  ['Free', '$0', '1,000 credits', 'Explore the platform locally'],
  ['Starter', '$29', '10,000 credits', 'Launch an internal prototype'],
  ['Pro', '$199', '100,000 credits', 'Scale production workloads']
]

const faqs = [
  ['What happens before I log in?', 'The public page explains the product, pricing model, routing layer, and API surface without requiring an account.'],
  ['Can I use mock providers?', 'Yes. Mock-safe mode is supported for local development and demos when provider keys are missing.'],
  ['How does billing work?', 'Stripe Checkout and webhook scaffolding are included, with mock checkout fallback for local testing.'],
  ['Can I add more providers?', 'Yes. Provider adapters are isolated so new APIs can be added without changing the route contracts.'],
  ['Do logged-in users still see this page?', 'No. Authenticated users are sent directly to the dashboard so the product opens where work happens.']
]

export default function Landing() {
  const { user, loading } = useAuth()

  if (loading) return <div className="landing-loading">Loading...</div>
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-brand">
          <span><KeyRound className="h-5 w-5" /></span>
          AI API Platform
        </Link>
        <div className="landing-nav-actions">
          <Link to="/login">Sign in</Link>
          <GlassButton as={Link} to="/register" className="landing-nav-cta">
            Start building
          </GlassButton>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="eyebrow mb-4">Unified AI infrastructure</p>
          <h1>One glass-clear API for text, images, and video.</h1>
          <p>
            A production-shaped AI API platform with auth, usage tracking, credits, billing scaffolding, and provider routing wrapped in a cinematic developer console.
          </p>
          <div className="landing-hero-actions">
            <GlassButton as={Link} to="/register">
              Start building <ArrowRight className="h-4 w-4" />
            </GlassButton>
            <GlassButton as="a" href="#pricing-preview" variant="secondary">
              View pricing
            </GlassButton>
            <GlassButton as="a" href="#developer-api" variant="secondary">
              Read docs
            </GlassButton>
          </div>
        </div>
        <GlassCard className="landing-hero-console">
          <div className="landing-console-top">
            <span />
            <span />
            <span />
          </div>
          <pre>{`POST /api/generate/image
X-API-Key: ai_live_...

{
  "provider": "openai",
  "prompt": "VisionOS glass AI console",
  "size": "1024x1024"
}`}</pre>
          <div className="landing-console-result">
            <Sparkles className="h-4 w-4" />
            completed · 10 credits
          </div>
        </GlassCard>
      </section>

      <section id="value-proposition" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">Product value proposition</p>
          <h2>The operational layer between AI models and real customers.</h2>
          <p>Move past demo calls into account-aware, metered, billable API usage with a frontend your team can actually operate.</p>
        </div>
        <div className="landing-feature-grid">
          {valueProps.map(({ icon: Icon, title, text }) => (
            <GlassCard key={title} className="landing-feature-card">
              <span><Icon className="h-5 w-5" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="model-routing" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">Model routing features</p>
          <h2>One platform surface, multiple provider paths.</h2>
          <p>Keep provider logic modular while the rest of the app keeps one stable contract for auth, credits, and usage records.</p>
        </div>
        <div className="landing-routing-grid">
          {routingFeatures.map(({ icon: Icon, title, text }) => (
            <GlassCard key={title} className="landing-routing-card">
              <Icon className="h-5 w-5" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="generation-preview" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">Text / image / video generation preview</p>
          <h2>Three modalities, one credit system.</h2>
          <p>The same developer pattern spans quick text responses, visual generation, and long-running video jobs.</p>
        </div>
        <div className="landing-example-grid">
          {examples.map(({ type, icon: Icon, prompt, cost, output }) => (
            <GlassCard key={type} variant="media" className="landing-example-card">
              <div className="landing-example-visual">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p>{type}</p>
                <h3>{prompt}</h3>
                <small>{output}</small>
                <span>{cost}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="landing-split landing-reveal">
        <GlassCard id="pricing-preview" className="landing-pricing-preview">
          <p className="eyebrow">Pricing preview</p>
          <h2>Plans that make AI spend legible.</h2>
          <div className="landing-price-grid">
            {plans.map(([name, price, credits, detail]) => (
              <div key={name} className="landing-price-card">
                <strong>{name}</strong>
                <b>{price}</b>
                <span>{credits}</span>
                <p>{detail}</p>
              </div>
            ))}
          </div>
          <GlassButton as={Link} to="/register">Start with credits</GlassButton>
        </GlassCard>
        <GlassCard id="developer-api" className="landing-developer-preview">
          <p className="eyebrow">Developer API section</p>
          <h2>Docs, playground, and copy-ready snippets.</h2>
          <div className="landing-code-row"><Code2 className="h-4 w-4" /> curl, Python, and JavaScript snippets</div>
          <div className="landing-code-row"><Layers3 className="h-4 w-4" /> Text, image, and video endpoints</div>
          <div className="landing-code-row"><Play className="h-4 w-4" /> Interactive playground testing</div>
          <GlassButton as={Link} to="/register" variant="secondary">Create an account</GlassButton>
        </GlassCard>
      </section>

      <section id="example-code" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">Example code block</p>
          <h2>A small request surface for serious workloads.</h2>
        </div>
        <GlassCard className="landing-wide-code">
          <div className="landing-code-title"><TerminalSquare className="h-4 w-4" /> Generate text with an API key</div>
          <pre>{`curl -X POST "$AI_API_URL/api/generate/text" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $AI_API_KEY" \\
  -d '{
    "provider": "openai",
    "model": null,
    "prompt": "Write a concise launch note for our API.",
    "max_tokens": 512
  }'`}</pre>
        </GlassCard>
      </section>

      <section id="faq" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Practical answers before launch.</h2>
        </div>
        <div className="landing-faq-list">
          {faqs.map(([question, answer]) => (
            <GlassCard key={question} className="landing-faq-item">
              <h3>{question}</h3>
              <p>{answer}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>AI API Platform</span>
        <div>
          <a href="#developer-api">Docs</a>
          <a href="#pricing-preview">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  )
}
