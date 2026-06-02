import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()
  const current = SUPPORTED_LANGUAGES.includes(i18n.language) ? i18n.language : 'en'

  function changeLanguage(event) {
    i18n.changeLanguage(event.target.value)
  }

  return (
    <label className={`language-switcher ${className}`} aria-label={t('language.label')}>
      <Languages className="h-4 w-4" />
      <select value={current} onChange={changeLanguage}>
        <option value="en">{t('language.english')}</option>
        <option value="zh-CN">{t('language.chinese')}</option>
      </select>
    </label>
  )
}
