import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GlassCard } from './ui'

export default function EmptyState({ title, description, examples = [], onExample, actionLabel, actionHref }) {
  const Action = actionHref ? Link : 'button'
  const actionProps = actionHref ? { to: actionHref } : { type: 'button', onClick: () => examples[0] && onExample?.(examples[0]) }

  return (
    <GlassCard className="empty-state">
      <div className="empty-particles" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <span key={index} style={{ '--i': index }} />)}
      </div>
      <div className="empty-illustration" aria-hidden="true">
        <span />
        <Sparkles className="h-8 w-8 text-[#00E5FF]" />
      </div>
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
            <Sparkles className="h-4 w-4" />
            {actionLabel}
          </Action>
        )}
      </div>
    </GlassCard>
  )
}
