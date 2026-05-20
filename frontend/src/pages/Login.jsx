import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GlassButton, GlassCard, GlassInput } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthFrame title="Login" aside="Route text, image, and video models through one metered API.">
      <form className="space-y-4" onSubmit={submit}>
        <GlassInput placeholder="Email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <GlassInput placeholder="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
        <GlassButton type="submit" className="w-full">Login</GlassButton>
        <p className="text-sm text-[#A1A1AA]">
          Need an account? <Link className="font-semibold text-[#00E5FF] transition hover:text-white" to="/register">Register</Link>
        </p>
      </form>
    </AuthFrame>
  )
}

export function AuthFrame({ title, aside, children }) {
  return (
    <div className="auth-shell page-shell grid min-h-screen overflow-hidden md:grid-cols-[1.05fr_0.95fr]">
      <section className="auth-hero relative flex min-h-[42vh] items-center justify-center px-6 py-10 text-white sm:px-8 sm:py-12">
        <div className="orbital-glow left-12 top-20" />
        <div className="orbital-glow bottom-8 right-12 opacity-50" />
        <div className="relative max-w-xl">
          <p className="eyebrow mb-5">AI API Platform</p>
          <h1 className="title-gradient text-3xl font-bold leading-tight sm:text-4xl lg:text-6xl">{aside}</h1>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['OpenAI', 'DeepSeek', 'FLUX'].map((item) => (
              <div key={item} className="auth-provider-chip">{item}</div>
            ))}
          </div>
        </div>
      </section>
      <section className="auth-card-wrap flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <GlassCard className="w-full max-w-md p-5 sm:p-7 md:p-8">
          <p className="eyebrow mb-3">Secure Access</p>
          <h2 className="mb-6 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
          {children}
        </GlassCard>
      </section>
    </div>
  )
}
