import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const THEME_KEY = 'ai_platform_theme'

export function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark'
  document.body.classList.toggle('theme-light', nextTheme === 'light')
  document.documentElement.style.colorScheme = nextTheme
  localStorage.setItem(THEME_KEY, nextTheme)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: nextTheme } }))
}

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
}

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(() => getStoredTheme())
  const isLight = theme === 'light'

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    function syncTheme(event) {
      if (event.detail?.theme) setTheme(event.detail.theme)
    }

    window.addEventListener('theme-change', syncTheme)
    return () => window.removeEventListener('theme-change', syncTheme)
  }, [])

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      aria-label={isLight ? t('theme.toDark') : t('theme.toLight')}
      data-magnetic
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{isLight ? t('theme.dark') : t('theme.light')}</span>
    </button>
  )
}
