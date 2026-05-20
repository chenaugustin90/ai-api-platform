import { useEffect, useRef } from 'react'

export default function LiquidGlassEffects() {
  const glowRef = useRef(null)

  useEffect(() => {
    let frame = 0
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let currentX = targetX
    let currentY = targetY
    let lastMagneticItem = null

    function writeMousePosition() {
      currentX += (targetX - currentX) * 0.12
      currentY += (targetY - currentY) * 0.12
      document.documentElement.style.setProperty('--mouse-x', `${currentX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${currentY}px`)
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate3d(-50%, -50%, 0)`
      }
      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        frame = window.requestAnimationFrame(writeMousePosition)
      } else {
        frame = 0
      }
    }

    function onPointerMove(event) {
      targetX = event.clientX
      targetY = event.clientY
      if (!frame) frame = window.requestAnimationFrame(writeMousePosition)
    }

    function onDocumentPointerMove(event) {
      const item = event.target.closest?.('[data-magnetic]')
      if (lastMagneticItem && lastMagneticItem !== item) {
        lastMagneticItem.style.setProperty('--magnet-x', '0px')
        lastMagneticItem.style.setProperty('--magnet-y', '0px')
      }
      lastMagneticItem = item
      if (!item) return
      const rect = item.getBoundingClientRect()
      const strength = Number(item.dataset.magneticStrength || 10)
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * strength
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * strength
      item.style.setProperty('--magnet-x', `${x}px`)
      item.style.setProperty('--magnet-y', `${y}px`)
    }

    function onDocumentPointerLeave() {
      lastMagneticItem = null
      document.querySelectorAll('[data-magnetic]').forEach((item) => {
        item.style.setProperty('--magnet-x', '0px')
        item.style.setProperty('--magnet-y', '0px')
      })
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointermove', onDocumentPointerMove, { passive: true })
    document.addEventListener('pointerleave', onDocumentPointerLeave, true)
    writeMousePosition()

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointermove', onDocumentPointerMove)
      document.removeEventListener('pointerleave', onDocumentPointerLeave, true)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="global-orb-field" aria-hidden="true">
        <span className="global-orb orb-a" />
        <span className="global-orb orb-b" />
        <span className="global-orb orb-c" />
      </div>
      <div ref={glowRef} className="liquid-cursor-glow" aria-hidden="true" />
      <svg className="liquid-glass-filter" aria-hidden="true" focusable="false">
        <filter id="liquid-glass-distortion">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="8">
            <animate attributeName="baseFrequency" dur="12s" values="0.012 0.018;0.018 0.012;0.012 0.018" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </>
  )
}
