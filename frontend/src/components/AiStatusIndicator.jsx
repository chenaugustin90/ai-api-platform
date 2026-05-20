import { useEffect, useState } from 'react'

export default function AiStatusIndicator() {
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    function onStatus(event) {
      setStatus(event.detail?.status || 'idle')
    }

    window.addEventListener('ai-status', onStatus)
    return () => window.removeEventListener('ai-status', onStatus)
  }, [])

  return (
    <div className={`ai-status ai-status-${status}`} aria-label={`AI status: ${status}`}>
      <span className="ai-status-sphere" />
      <span>AI Core</span>
      <span className="ai-status-dot">●</span>
    </div>
  )
}
