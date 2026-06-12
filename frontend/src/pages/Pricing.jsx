import { Check, CheckCircle2, Clock3, Copy, Loader2, MessageCircle, ShieldCheck, WalletCards, XCircle, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { GlassButton, GlassCard, GlassModal, GlassTextarea } from '../components/ui'

export default function Pricing() {
  const [config, setConfig] = useState(null)
  const [orders, setOrders] = useState([])
  const [adminOrders, setAdminOrders] = useState([])
  const [method, setMethod] = useState('')
  const [proof, setProof] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setError('')
    try {
      const [paymentConfig, userOrders] = await Promise.all([
        api('/api/billing/manual/config'),
        api('/api/billing/manual/orders')
      ])
      setConfig(paymentConfig)
      setOrders(userOrders)
      if (paymentConfig.is_admin) {
        setAdminOrders(await api('/api/billing/manual/admin/orders'))
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function submitOrder() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await api('/api/billing/manual/orders', {
        method: 'POST',
        body: JSON.stringify({ payment_method: method, proof_reference: proof, tier: 'pro' })
      })
      setMethod('')
      setProof('')
      setMessage('Payment submitted. Your Pro access will start after review.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function review(orderId, action) {
    setLoading(true)
    setError('')
    try {
      await api(`/api/billing/manual/admin/orders/${orderId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action })
      })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const plan = config?.plan || { amount_cents: 999, credits: 5000, duration_days: 30 }

  async function copyZelle() {
    await navigator.clipboard.writeText(config?.zelle_contact || '')
    setMessage('Zelle payment address copied.')
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow mb-2">Simple access</p>
        <h1 className="title-gradient text-3xl font-bold sm:text-4xl">30-day Pro access</h1>
        <p className="muted mt-2 max-w-2xl text-sm">Pay once, use Pro for 30 days, then renew only when you want to. No automatic charges.</p>
      </header>

      {error && <p className="lg-alert lg-alert-error px-4 py-3 text-sm">{error}</p>}
      {message && <p className="lg-alert px-4 py-3 text-sm">{message}</p>}

      <section className="manual-payment-grid">
        <GlassCard className="manual-plan-card p-6">
          <span className="pricing-plan-icon"><Zap className="h-5 w-5" /></span>
          <p className="eyebrow mt-5">Pro access</p>
          <h2 className="mt-2 text-3xl font-bold text-white">${(plan.amount_cents / 100).toFixed(2)}</h2>
          <p className="muted mt-2">One payment · {plan.duration_days} days · {Number(plan.credits).toLocaleString()} credits</p>
          <div className="my-6 space-y-3">
            {['Real AI providers', 'Text and image generation', 'API key access', 'No automatic renewal'].map((item) => (
              <p key={item} className="flex items-center gap-2 text-sm text-white"><Check className="h-4 w-4 text-white" /> {item}</p>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <GlassButton onClick={() => setMethod('wechat')}><MessageCircle className="h-4 w-4" /> Pay with WeChat</GlassButton>
            <GlassButton variant="secondary" onClick={() => setMethod('zelle')}><WalletCards className="h-4 w-4" /> Pay with Zelle</GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="manual-payment-guide p-6">
          <p className="eyebrow mb-2">How it works</p>
          <h2 className="text-xl font-bold text-white">Access starts after payment review</h2>
          <div className="manual-steps mt-6">
            <Step number="01" title="Send payment" text="Pay $9.99 using WeChat or Zelle." />
            <Step number="02" title="Submit reference" text="Enter the transaction ID or payment note." />
            <Step number="03" title="Get Pro access" text="After approval, 30 days and 5,000 credits are added automatically." />
          </div>
          <p className="muted mt-5 text-sm">Your access expires automatically after 30 days. Purchase again whenever you want to renew.</p>
        </GlassCard>
      </section>

      <OrderHistory orders={orders} />
      {config?.is_admin && <AdminReview orders={adminOrders} loading={loading} onReview={review} />}

      <GlassModal open={Boolean(method)} title={`Pay with ${method === 'wechat' ? 'WeChat' : 'Zelle'}`} onClose={() => setMethod('')}>
        <div className="space-y-5">
          <div className="manual-payment-destination">
            <ShieldCheck className="h-5 w-5 text-white" />
            <div>
              <p className="eyebrow mb-1">Send exactly ${(plan.amount_cents / 100).toFixed(2)}</p>
              <p className="text-sm text-white">
                {method === 'zelle'
                  ? config?.zelle_contact || 'Contact support for the current Zelle payment address.'
                  : config?.wechat_instructions || 'Contact support for the current WeChat payment QR code.'}
              </p>
            </div>
          </div>
          {method === 'wechat' && config?.wechat_qr_url && (
            <div className="manual-wechat-qr">
              <img src={config.wechat_qr_url} alt="WeChat payment QR code" />
              <p>Scan this QR code in WeChat and send exactly ${(plan.amount_cents / 100).toFixed(2)} USD equivalent.</p>
            </div>
          )}
          {method === 'zelle' && config?.zelle_contact && (
            <GlassButton variant="secondary" className="w-full" onClick={copyZelle}>
              <Copy className="h-4 w-4" /> Copy {config.zelle_contact}
            </GlassButton>
          )}
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white">Transaction ID or payment reference</span>
            <GlassTextarea value={proof} onChange={(event) => setProof(event.target.value)} placeholder="Example: Zelle confirmation number, WeChat transaction ID, or payer name and time" rows={4} />
          </label>
          <GlassButton className="w-full" onClick={submitOrder} disabled={loading || proof.trim().length < 4}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Submit for review
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  )
}

function Step({ number, title, text }) {
  return <div><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>
}

function OrderHistory({ orders }) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4">
        <p className="eyebrow mb-1">Your payments</p>
        <h2 className="text-xl font-bold text-white">Review status</h2>
      </div>
      <div className="manual-order-list">
        {orders.map((order) => <OrderRow key={order.id} order={order} />)}
        {!orders.length && <p className="muted text-sm">No manual payments submitted yet.</p>}
      </div>
    </GlassCard>
  )
}

function AdminReview({ orders, loading, onReview }) {
  return (
    <GlassCard className="p-5">
      <p className="eyebrow mb-1">Administrator</p>
      <h2 className="text-xl font-bold text-white">Pending payment reviews</h2>
      <div className="manual-order-list mt-4">
        {orders.map((order) => (
          <article key={order.id} className="manual-order-row">
            <div>
              <strong>{order.user_email}</strong>
              <p>{order.payment_method.toUpperCase()} · {order.proof_reference}</p>
            </div>
            <div className="flex gap-2">
              <GlassButton size="sm" onClick={() => onReview(order.id, 'approve')} disabled={loading}><CheckCircle2 className="h-4 w-4" /> Approve</GlassButton>
              <GlassButton size="sm" variant="secondary" onClick={() => onReview(order.id, 'reject')} disabled={loading}><XCircle className="h-4 w-4" /> Reject</GlassButton>
            </div>
          </article>
        ))}
        {!orders.length && <p className="muted text-sm">No payments are waiting for review.</p>}
      </div>
    </GlassCard>
  )
}

function OrderRow({ order }) {
  const Icon = order.status === 'approved' ? CheckCircle2 : order.status === 'rejected' ? XCircle : Clock3
  return (
    <article className="manual-order-row">
      <div>
        <strong>{order.payment_method.toUpperCase()} · ${(order.amount_cents / 100).toFixed(2)}</strong>
        <p>{new Date(order.created_at).toLocaleString()} · {order.proof_reference}</p>
      </div>
      <span className={`manual-order-status is-${order.status}`}><Icon className="h-4 w-4" /> {order.status}</span>
    </article>
  )
}
