import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { applyTheme, getStoredTheme } from '../components/ThemeToggle'
import { GlassButton, GlassCard, GlassInput } from '../components/ui'
import LanguageSwitcher from '../components/LanguageSwitcher'

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
        <GlassInput placeholder={t('dom.Email')} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <GlassInput placeholder={t('dom.Password')} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
        <GlassButton type="submit" className="w-full" disabled={submitting}>{submitting ? t('dom.Signing in...') : t('dom.Login')}</GlassButton>
        <div className="authkit-form-links">
          <span>{t('dom.Need an account?')}</span>
          <Link to="/register">{t('dom.Register')}</Link>
        </div>
      </form>
    </AuthFrame>
  )
}

export function AuthFrame({ title, aside, children }) {
  const { t } = useTranslation()
  const domText = t('dom', { returnObjects: true })
  const tr = (key) => domText?.[key] || key
  const [theme, setTheme] = useState(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="native-auth-page">
      <header className="native-auth-toolbar">
        <Link to="/welcome" className="native-auth-mark"><KeyRound /></Link>
        <div><LanguageSwitcher /><button type="button" className="native-auth-theme" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>{theme === 'light' ? t('theme.dark') : t('theme.light')}</button></div>
      </header>
      <section className="native-auth-stage">
        <div className="native-auth-symbol"><Sparkles /></div>
        <p>{tr(aside)}</p>
        <GlassCard className="native-auth-card">
          <div className="native-auth-card-title">
            <span><KeyRound /></span>
            <div><p>{tr('Secure Access')}</p><h1>{tr(title)}</h1></div>
          </div>
          {children}
        </GlassCard>
      </section>
    </div>
  )
}
