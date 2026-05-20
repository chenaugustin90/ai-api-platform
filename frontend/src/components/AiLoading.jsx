export default function AiLoading({ label = 'AI is thinking', detail = 'Routing prompt through the generation pipeline...' }) {
  return (
    <div className="ai-loading" aria-live="polite">
      <div className="ai-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-[#9eefff]">Live</p>
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
