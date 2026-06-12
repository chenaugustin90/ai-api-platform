import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import GlassButton from './GlassButton'
import GlassCard from './GlassCard'

export default function GlassModal({ open, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="lg-modal-backdrop" role="presentation" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <GlassCard
            as={motion.section}
            className="lg-modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 36, scale: .9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: .94 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26, mass: .9 }}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
              <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
                <X className="h-4 w-4" />
              </GlassButton>
            </div>
            {children}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
