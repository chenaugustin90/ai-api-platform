import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthFrame } from './Login'
import { GlassButton, GlassInput } from '../components/ui'

export default function Register() {
  const { register } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form.email.trim(), form.password, form.full_name.trim())
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Register" aside="Launch a credit-metered AI platform with provider routing built in.">
      <form className="space-y-4" onSubmit={submit}>
        <GlassInput placeholder="Full name" autoComplete="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <GlassInput placeholder="Email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <GlassInput placeholder="Password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
        <GlassButton type="submit" className="w-full" disabled={submitting}>{submitting ? t('dom.Creating account...') : t('dom.Create account')}</GlassButton>
        <p className="text-sm text-[#A1A1AA]">
          Already registered? <Link className="font-semibold text-[#00E5FF] transition hover:text-white" to="/login">Login</Link>
        </p>
      </form>
    </AuthFrame>
  )
}
