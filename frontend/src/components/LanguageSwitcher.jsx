import { Check, ChevronDown, Languages } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()
  const current = SUPPORTED_LANGUAGES.includes(i18n.language) ? i18n.language : 'en'
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  function changeLanguage(value) {
    i18n.changeLanguage(value)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`language-switcher ${open ? 'is-open' : ''} ${className}`} aria-label={t('language.label')}>
      <button type="button" className="language-switcher-trigger" onClick={() => setOpen((value) => !value)}>
        <Languages className="h-4 w-4" />
        <span>{current === 'zh-CN' ? '中文' : 'EN'}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="language-switcher-menu" initial={{ opacity: 0, y: -8, scale: .92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .95 }} transition={{ type: 'spring', stiffness: 280, damping: 25 }}>
            {SUPPORTED_LANGUAGES.map((value) => (
              <button type="button" key={value} onClick={() => changeLanguage(value)}>
                <span>{value === 'zh-CN' ? t('language.chinese') : t('language.english')}</span>
                {current === value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
