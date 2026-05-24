import { ArrowLeft, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GlassButton, GlassCard } from '../components/ui'

export default function PaymentCancel() {
  return (
    <div className="payment-result-page">
      <GlassCard className="payment-result-card p-8">
        <div className="billing-status-icon mx-auto mb-5">
          <CreditCard className="h-6 w-6" />
        </div>
        <p className="eyebrow mb-3 text-center">Checkout canceled</p>
        <h1 className="title-gradient text-center text-4xl font-bold sm:text-5xl">No payment was made</h1>
        <p className="muted mx-auto mt-4 max-w-xl text-center text-sm">Your plan and credits were not changed. You can return to pricing whenever you are ready.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <GlassButton as={Link} to="/pricing">
            <ArrowLeft className="h-4 w-4" />
            Back to pricing
          </GlassButton>
          <GlassButton as={Link} to="/dashboard" variant="secondary">Open dashboard</GlassButton>
        </div>
      </GlassCard>
    </div>
  )
}
