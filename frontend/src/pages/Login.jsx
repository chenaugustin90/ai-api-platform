import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, LockKeyhole, MessageSquareText, ShieldCheck, Sparkles, TerminalSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { applyTheme, getStoredTheme } from '../components/ThemeToggle'
import { GlassButton, GlassCard, GlassInput } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.email.trim(), form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Login" aside="Route text, image, and video models through one metered API.">
      <form className="space-y-4" onSubmit={submit}>
        <GlassInput placeholder="Email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <GlassInput placeholder="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
        <GlassButton type="submit" className="w-full" disabled={submitting}>{submitting ? t('dom.Signing in...') : t('dom.Login')}</GlassButton>
        <p className="text-sm text-[#A1A1AA]">
          Need an account? <Link className="font-semibold text-[#00E5FF] transition hover:text-white" to="/register">Register</Link>
        </p>
      </form>
    </AuthFrame>
  )
}

export function AuthFrame({ title, aside, children }) {
  const { t } = useTranslation()
  const domText = t('dom', { returnObjects: true })
  const tr = (key) => domText?.[key] || key
  const railItems = [LockKeyhole, TerminalSquare, MessageSquareText, ShieldCheck, KeyRound]
  const [theme, setTheme] = useState(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="auth-shell authkit-shell page-shell min-h-screen overflow-hidden">
      <div className="authkit-topbar">
        <span className="authkit-wordmark">AI API Platform</span>
        <span className="authkit-mark"><KeyRound className="h-5 w-5" /></span>
        <Link to="/register" className="authkit-get-started">{tr('Get started')}</Link>
      </div>

      <section className="authkit-stage px-4 py-24 sm:px-6">
        <div className="authkit-cross authkit-cross-left" aria-hidden="true" />
        <div className="authkit-cross authkit-cross-right" aria-hidden="true" />

        <div className="authkit-copy">
          <p className="eyebrow mb-4">{tr('Introducing')}</p>
          <h1 className="title-gradient">AI API</h1>
          <p>{tr(aside)}</p>
        </div>

        <div className="authkit-card-stack">
          <GlassCard className="authkit-ghost-card authkit-ghost-left" aria-hidden="true">
            <Sparkles className="h-8 w-8" />
            <h3>{tr('Provider routing')}</h3>
            <p>{tr('OpenAI, Claude, DeepSeek')}</p>
            <span />
            <span />
          </GlassCard>

          <GlassCard className="authkit-auth-card">
            <span className="authkit-card-corner authkit-card-corner-a" />
            <span className="authkit-card-corner authkit-card-corner-b" />
            <span className="authkit-card-corner authkit-card-corner-c" />
            <span className="authkit-card-corner authkit-card-corner-d" />
            <div className="authkit-card-logo"><KeyRound className="h-6 w-6" /></div>
            <p className="eyebrow mb-3">{tr('Secure Access')}</p>
            <h2 className="mb-6 text-2xl font-bold text-white sm:text-3xl">{tr(title)}</h2>
            {children}
          </GlassCard>

          <GlassCard className="authkit-ghost-card authkit-ghost-right" aria-hidden="true">
            <ShieldCheck className="h-8 w-8" />
            <h3>{tr('Metered API')}</h3>
            <p>{tr('Credits, keys, usage history')}</p>
            <span />
            <span />
          </GlassCard>
        </div>

        <div className="authkit-mode-toggle" role="group" aria-label={t('language.label')}>
          <button
            type="button"
            className={theme === 'dark' ? 'is-active' : ''}
            onClick={() => setTheme('dark')}
          >
            {t('theme.dark')}
          </button>
          <button
            type="button"
            className={theme === 'light' ? 'is-active' : ''}
            onClick={() => setTheme('light')}
          >
            {t('theme.light')}
          </button>
        </div>
        <p className="authkit-mode-copy">{tr('Light and dark modes supported.')}</p>

        <div className="authkit-rail" aria-hidden="true">
          {railItems.map((Icon, index) => (
            <div className="authkit-rail-node" key={index}>
              <Icon className="h-5 w-5" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
