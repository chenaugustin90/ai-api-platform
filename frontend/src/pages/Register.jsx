import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthFrame } from './Login'
import { GlassButton, GlassInput } from '../components/ui'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await register(form.email, form.password, form.full_name)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthFrame title="Register" aside="Launch a credit-metered AI platform with provider routing built in.">
      <form className="space-y-4" onSubmit={submit}>
        <GlassInput placeholder="Full name" autoComplete="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <GlassInput placeholder="Email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <GlassInput placeholder="Password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
        <GlassButton type="submit" className="w-full">Create account</GlassButton>
        <p className="text-sm text-[#A1A1AA]">
          Already registered? <Link className="font-semibold text-[#00E5FF] transition hover:text-white" to="/login">Login</Link>
        </p>
      </form>
    </AuthFrame>
  )
}
