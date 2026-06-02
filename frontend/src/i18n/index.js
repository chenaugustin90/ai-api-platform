import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import zhCN from '../locales/zh-CN.json'

export const LANGUAGE_KEY = 'language'
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN']

function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase()
  if (language.includes('zh') || language.includes('zh-cn') || language.includes('zh-hans')) {
    return 'zh-CN'
  }
  return 'en'
}

export function detectInitialLanguage() {
  const stored = localStorage.getItem(LANGUAGE_KEY)
  if (SUPPORTED_LANGUAGES.includes(stored)) return stored
  return normalizeLanguage(navigator.language || navigator.languages?.[0])
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN }
    },
    lng: detectInitialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnObjects: true
  })

i18n.on('languageChanged', (language) => {
  const nextLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en'
  localStorage.setItem(LANGUAGE_KEY, nextLanguage)
  document.documentElement.lang = nextLanguage
})

document.documentElement.lang = i18n.language

export default i18n
