import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './utils'

function normalizeOption(option) {
  if (typeof option === 'string') return { value: option, label: option }
  return option
}

export default function GlassSelect({ value, onChange, options = [], className = '', placeholder = 'Select', disabled = false }) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const id = useId()
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const normalized = options.map(normalizeOption)
  const selected = normalized.find((option) => option.value === value)

  useEffect(() => {
    function onPointerDown(event) {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setOpen(false)
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    function updateMenuPosition() {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuStyle({
        left: `${rect.left}px`,
        top: `${rect.bottom + 8}px`,
        width: `${rect.width}px`
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open])

  function selectOption(option) {
    onChange?.({ target: { value: option.value } })
    setOpen(false)
  }

  const menu = (
    <div
      ref={menuRef}
      className={cn('lg-select-menu', open && 'is-open')}
      role="listbox"
      id={`${id}-listbox`}
      aria-labelledby={`${id}-button`}
      style={menuStyle || undefined}
    >
      {normalized.map((option) => (
        <button
          type="button"
          key={option.value}
          className={cn('lg-select-option', option.value === value && 'is-selected')}
          role="option"
          aria-selected={option.value === value}
          onClick={() => selectOption(option)}
        >
          <span>{option.label}</span>
          {option.value === value && <Check className="h-4 w-4" aria-hidden="true" />}
        </button>
      ))}
    </div>
  )

  return (
    <div ref={rootRef} className={cn('lg-select', open && 'is-open', disabled && 'is-disabled', className)}>
      <button
        type="button"
        id={`${id}-button`}
        className="lg-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown className="lg-select-arrow" aria-hidden="true" />
      </button>
      {open && menuStyle && createPortal(menu, document.body)}
    </div>
  )
}
