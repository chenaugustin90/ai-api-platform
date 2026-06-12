import { Plus, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GlassCard } from './ui'

export default function EmptyState({ title, description, examples = [], onExample, actionLabel, actionHref }) {
  const Action = actionHref ? Link : 'button'
  const actionProps = actionHref ? { to: actionHref } : { type: 'button', onClick: () => examples[0] && onExample?.(examples[0]) }

  return (
    <GlassCard as={motion.section} className="empty-state" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 130, damping: 24 }}>
      <motion.div className="empty-illustration" aria-hidden="true" animate={{ y: [0, -8, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
        <Sparkles className="h-8 w-8" />
      </motion.div>
      <div className="max-w-xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-[#A1A1AA]">{description}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {examples.map((prompt) => (
            <button key={prompt} className="example-chip" type="button" onClick={() => onExample(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
        {actionLabel && (
          <Action className="empty-cta" {...actionProps}>
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Action>
        )}
      </div>
    </GlassCard>
  )
}
