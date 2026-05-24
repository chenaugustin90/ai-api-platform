import { ArrowRight, BarChart3, Check, Code2, Cpu, Image, KeyRound, Layers3, LockKeyhole, MessageSquareText, ShieldCheck, Sparkles, TerminalSquare, Video, Zap } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { GlassButton, GlassCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: LockKeyhole, title: 'Auth and API keys', text: 'JWT sessions, hashed API keys, key revoke flows, and account-aware requests are ready on day one.' },
  { icon: BarChart3, title: 'Metered usage', text: 'Track tokens, credits, providers, and generation records across text, image, and video workloads.' },
  { icon: Layers3, title: 'Unified routing', text: 'OpenAI, DeepSeek, Claude, and image/video adapters sit behind one stable developer contract.' },
  { icon: ShieldCheck, title: 'Production posture', text: 'Provider fallback, onboarding warnings, billing status, and mock-safe development keep teams moving.' }
]

const providers = [
  { name: 'OpenAI', model: 'GPT + Images', status: 'Text and image generation', tone: 'cyan' },
  { name: 'DeepSeek', model: 'DeepSeek Chat', status: 'Efficient reasoning workflows', tone: 'blue' },
  { name: 'Claude', model: 'Anthropic Messages', status: 'Long-form text generation', tone: 'violet' },
  { name: 'Video Layer', model: 'Provider-ready', status: 'Runway, Kling, and Veo expansion', tone: 'slate' }
]

const plans = [
  { name: 'Free', price: '$0', credits: '100 credits', limit: 'Development API limits', features: ['Personal workspace', 'Provider onboarding', 'Usage dashboard'] },
  { name: 'Pro', price: '$9.99', credits: '5,000 credits/month', limit: 'Production API limits', features: ['Real provider routing', 'Priority generation', 'Billing portal ready'] },
  { name: 'Enterprise', price: '$29.99', credits: '25,000 credits/month', limit: 'Dedicated API limits', features: ['Provider governance', 'Team rollout support', 'Higher credit pool'] }
]

const testimonials = [
  ['Maya Chen', 'Founder, Northstar Labs', 'The platform feels like the missing control plane between experiments and real customers.'],
  ['Julian Park', 'Product Lead, Atlas AI', 'We moved from scattered provider scripts into one clean API surface with billing visibility.'],
  ['Ari Morgan', 'Engineering Manager, VantaWorks', 'The onboarding warnings and usage history made provider setup much less mysterious for the team.']
]

const faqs = [
  ['Can I use this without provider keys?', 'Yes. Missing provider keys do not crash the app. The dashboard explains what is missing and keeps mock-safe flows usable.'],
  ['How do developers authenticate?', 'Generation endpoints accept an X-API-Key header, while dashboard pages use the logged-in account session.'],
  ['Does production billing require Stripe?', 'Yes. Checkout stays paused until the required Stripe and production URL environment variables are configured.'],
  ['Can I add more AI providers?', 'Yes. Provider-specific code is isolated behind adapters so the route contracts stay stable.']
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
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#providers">Providers</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <Link to="/login">Sign in</Link>
          <GlassButton as={Link} to="/register" className="landing-nav-cta">
            Start building
          </GlassButton>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="eyebrow mb-4">Production AI SaaS infrastructure</p>
          <h1>Launch a premium AI API business without stitching the basics together.</h1>
          <p>
            A glass-clear control plane for provider routing, API keys, credits, usage history, billing, and developer docs. Built for teams turning AI generation into a real product.
          </p>
          <div className="landing-hero-actions">
            <GlassButton as={Link} to="/register">
              Start free <ArrowRight className="h-4 w-4" />
            </GlassButton>
            <GlassButton as="a" href="#pricing" variant="secondary">
              View plans
            </GlassButton>
            <GlassButton as="a" href="#providers" variant="secondary">
              Explore providers
            </GlassButton>
          </div>
        </div>

        <GlassCard className="landing-hero-console">
          <div className="landing-console-top">
            <span />
            <span />
            <span />
          </div>
          <div className="landing-console-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <pre>{`POST /api/generate/text
X-API-Key: ai_live_...

{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "prompt": "Draft launch copy for our AI API",
  "max_tokens": 512
}`}</pre>
          <div className="landing-console-result">
            <Sparkles className="h-4 w-4" />
            200 OK · 1 credit · 642 ms
          </div>
        </GlassCard>
      </section>

      <section id="features" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">Features</p>
          <h2>The SaaS layer your API needs before customers arrive.</h2>
          <p>Every surface is designed to make generation, metering, account management, and provider setup feel calm and obvious.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <GlassCard key={title} className="landing-feature-card">
              <span><Icon className="h-5 w-5" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="providers" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">AI Providers</p>
          <h2>Route requests across the models your product needs.</h2>
          <p>Provider status, setup guidance, and test actions help operators understand what is connected before users hit errors.</p>
        </div>
        <div className="landing-provider-grid">
          {providers.map((provider) => (
            <GlassCard key={provider.name} className={`landing-provider-card tone-${provider.tone}`}>
              <div>
                <span className="landing-provider-pulse" />
                <strong>{provider.name}</strong>
              </div>
              <p>{provider.model}</p>
              <small>{provider.status}</small>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="pricing" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">Pricing</p>
          <h2>Simple credit plans from prototype to production.</h2>
        </div>
        <div className="landing-pricing-grid">
          {plans.map((plan) => (
            <GlassCard key={plan.name} className={`landing-plan-card ${plan.name === 'Pro' ? 'is-featured' : ''}`}>
              <div className="landing-plan-head">
                <strong>{plan.name}</strong>
                {plan.name === 'Pro' && <span>Popular</span>}
              </div>
              <b>{plan.price}</b>
              <p>{plan.credits}</p>
              <small>{plan.limit}</small>
              <div className="landing-plan-features">
                {plan.features.map((feature) => (
                  <span key={feature}><Check className="h-4 w-4" /> {feature}</span>
                ))}
              </div>
              <GlassButton as={Link} to={plan.name === 'Enterprise' ? '/register' : '/register'} variant={plan.name === 'Pro' ? 'primary' : 'secondary'}>
                {plan.name === 'Enterprise' ? 'Contact sales' : 'Start building'}
              </GlassButton>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="landing-split landing-reveal">
        <GlassCard className="landing-developer-preview">
          <p className="eyebrow">Developer Experience</p>
          <h2>Interactive docs, playground, and copy-ready snippets.</h2>
          <div className="landing-code-row"><Code2 className="h-4 w-4" /> curl, Python, and JavaScript examples</div>
          <div className="landing-code-row"><TerminalSquare className="h-4 w-4" /> X-API-Key authentication</div>
          <div className="landing-code-row"><Zap className="h-4 w-4" /> Response time and credit telemetry</div>
        </GlassCard>
        <GlassCard className="landing-modality-preview">
          <p className="eyebrow">Generation Studio</p>
          <h2>Text, image, and video workflows in one console.</h2>
          <div className="landing-modality-list">
            <span><MessageSquareText className="h-4 w-4" /> Streaming text output</span>
            <span><Image className="h-4 w-4" /> Image media cards</span>
            <span><Video className="h-4 w-4" /> Video job history</span>
            <span><Cpu className="h-4 w-4" /> Provider model selectors</span>
          </div>
        </GlassCard>
      </section>

      <section className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">Testimonials</p>
          <h2>Built for teams who want the product to feel finished.</h2>
        </div>
        <div className="landing-testimonial-grid">
          {testimonials.map(([name, role, quote]) => (
            <GlassCard key={name} className="landing-testimonial-card">
              <p>"{quote}"</p>
              <div>
                <strong>{name}</strong>
                <span>{role}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="faq" className="landing-section landing-reveal">
        <div className="landing-section-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Clear answers for launch day.</h2>
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

      <GlassCard as="section" className="landing-cta landing-reveal">
        <p className="eyebrow">Ready to ship</p>
        <h2>Turn generation into a polished AI SaaS today.</h2>
        <p>Start free, connect provider keys when ready, and give developers a premium API experience from the first request.</p>
        <GlassButton as={Link} to="/register">
          Create workspace <ArrowRight className="h-4 w-4" />
        </GlassButton>
      </GlassCard>

      <footer className="landing-footer">
        <span>AI API Platform</span>
        <div>
          <a href="#providers">Providers</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  )
}
