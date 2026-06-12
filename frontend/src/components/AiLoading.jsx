import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AiLoading({ label = 'AI is thinking', detail = 'Routing prompt through the generation pipeline...' }) {
  return (
    <div className="ai-loading" aria-live="polite">
      <motion.div className="ai-orbit" aria-hidden="true" animate={{ scale: [1, 1.08, 1], opacity: [.65, 1, .65] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}><Sparkles /></motion.div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs">Live</p>
        </div>
        <div className="ai-progress mt-3" aria-hidden="true">
          <span />
        </div>
        <p className="mt-2 text-xs text-[#A1A1AA]">{detail}</p>
      </div>
      <div className="ai-loading-particles" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, index) => <i key={index} style={{ '--i': index }} />)}
      </div>
    </div>
  )
}
