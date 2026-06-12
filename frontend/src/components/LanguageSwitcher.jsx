import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()
  const current = SUPPORTED_LANGUAGES.includes(i18n.language) ? i18n.language : 'en'

  function changeLanguage(value) {
    i18n.changeLanguage(value)
  }

  return (
    <div className={`language-switcher language-switcher-compact ${className}`} aria-label={t('language.label')}>
      <button type="button" className="language-switcher-trigger" onClick={() => changeLanguage(current === 'zh-CN' ? 'en' : 'zh-CN')} aria-label={t('language.label')}>
        <Languages className="h-4 w-4" />
        <span>{current === 'zh-CN' ? '中文' : 'English'}</span>
      </button>
    </div>
  )
}
