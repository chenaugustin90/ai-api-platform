import { X } from 'lucide-react'
import GlassButton from './GlassButton'
import GlassCard from './GlassCard'

export default function GlassModal({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div className="lg-modal-backdrop" role="presentation" onClick={onClose}>
      <GlassCard className="lg-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
          <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </GlassButton>
        </div>
        {children}
      </GlassCard>
    </div>
  )
}
