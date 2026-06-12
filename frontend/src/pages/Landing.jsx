import { ArrowRight, KeyRound, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'
import { GlassButton, GlassCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'

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
          <Link to="/docs">Docs</Link>
          <Link to="/login">Sign in</Link>
        </div>
        <div className="landing-nav-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <GlassButton as={Link} to="/register" className="landing-nav-cta">
            Start Building
          </GlassButton>
        </div>
      </nav>

      <section className="landing-hero authkit-landing-hero minimal-landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="authkit-cross authkit-cross-left" aria-hidden="true" />
        <div className="authkit-cross authkit-cross-right" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="eyebrow mb-4">OpenAI • Claude • DeepSeek • Images</p>
          <h1>AI API Platform</h1>
          <h2>One API.<br />Multiple Models.</h2>
          <div className="landing-hero-actions">
            <GlassButton as={Link} to="/register">
              Start Building <ArrowRight className="h-4 w-4" />
            </GlassButton>
            <GlassButton as={Link} to="/docs" variant="secondary">
              View Docs
            </GlassButton>
          </div>
        </div>

        <div className="landing-authkit-stack minimal-api-card-wrap">
          <GlassCard className="landing-hero-console landing-authkit-main minimal-api-card">
            <span className="authkit-card-corner authkit-card-corner-a" />
            <span className="authkit-card-corner authkit-card-corner-b" />
            <span className="authkit-card-corner authkit-card-corner-c" />
            <span className="authkit-card-corner authkit-card-corner-d" />
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
  "model": "gpt-4.1-mini",
  "prompt": "Draft launch copy for our AI API",
  "max_tokens": 512
}`}</pre>
            <div className="landing-console-result">
              <Sparkles className="h-4 w-4" />
              200 OK · 1 credit · 642 ms
            </div>
          </GlassCard>
        </div>
      </section>
    </main>
  )
}
