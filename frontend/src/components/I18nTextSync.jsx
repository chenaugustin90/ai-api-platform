import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import en from '../locales/en.json'
import zhCN from '../locales/zh-CN.json'

const ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt']
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION'])
const INLINE_REPLACEMENTS = {
  'zh-CN': [
    [/\bcredits\/month\b/g, '积分/月'],
    [/\bcredits\b/g, '积分'],
    [/\brecords\b/g, '条记录'],
    [/\bevents\b/g, '个事件'],
    [/\bkeys\b/g, '个密钥'],
    [/\btracked\b/g, '已追踪'],
    [/\brequests\b/g, '个请求'],
    [/\brequest\b/g, '请求'],
    [/\bs ago\b/g, ' 秒前'],
    [/\bmin ago\b/g, ' 分钟前'],
    [/\bhr ago\b/g, ' 小时前'],
    [/\bdays ago\b/g, ' 天前'],
    [/\bday ago\b/g, ' 天前']
  ],
  en: [
    [/积分\/月/g, 'credits/month'],
    [/积分/g, 'credits'],
    [/条记录/g, 'records'],
    [/个事件/g, 'events'],
    [/个密钥/g, 'keys'],
    [/已追踪/g, 'tracked'],
    [/个请求/g, 'requests'],
    [/请求/g, 'request'],
    [/ 秒前/g, 's ago'],
    [/ 分钟前/g, ' min ago'],
    [/ 小时前/g, ' hr ago'],
    [/ 天前/g, ' days ago']
  ]
}

function buildReverseMap(source, target) {
  const reverse = {}
  Object.entries(source).forEach(([key, value]) => {
    reverse[key] = key
    reverse[value] = key
  })
  Object.entries(target).forEach(([key, value]) => {
    reverse[key] = key
    reverse[value] = key
  })
  return reverse
}

function preserveWhitespace(original, translated) {
  const leading = original.match(/^\s*/)?.[0] || ''
  const trailing = original.match(/\s*$/)?.[0] || ''
  return `${leading}${translated}${trailing}`
}

export default function I18nTextSync() {
  const { i18n } = useTranslation()
  const dictionaries = useMemo(() => ({
    en: en.dom || {},
    'zh-CN': zhCN.dom || {}
  }), [])
  const reverseMap = useMemo(() => buildReverseMap(dictionaries.en, dictionaries['zh-CN']), [dictionaries])

  useEffect(() => {
    const translateValue = (value) => {
      const trimmed = String(value || '').trim()
      if (!trimmed) return value
      const englishKey = reverseMap[trimmed] || trimmed
      const translated = dictionaries[i18n.language]?.[englishKey]
      if (translated) return preserveWhitespace(value, translated)
      const replacements = INLINE_REPLACEMENTS[i18n.language] || []
      const replaced = replacements.reduce((current, [pattern, next]) => current.replace(pattern, next), value)
      return replaced
    }

    const translateNode = (root) => {
      if (!root || root.nodeType !== Node.ELEMENT_NODE) return

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement
          if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT
          if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        }
      })

      const textNodes = []
      while (walker.nextNode()) textNodes.push(walker.currentNode)
      textNodes.forEach((node) => {
        const next = translateValue(node.nodeValue)
        if (next !== node.nodeValue) node.nodeValue = next
      })

      root.querySelectorAll?.('*').forEach((element) => {
        ATTRIBUTES.forEach((attribute) => {
          if (!element.hasAttribute(attribute)) return
          const current = element.getAttribute(attribute)
          const next = translateValue(current)
          if (next !== current) element.setAttribute(attribute, next)
        })
      })
    }

    translateNode(document.body)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) translateNode(node)
          })
        }
        if (mutation.type === 'characterData') {
          const node = mutation.target
          const next = translateValue(node.nodeValue)
          if (next !== node.nodeValue) node.nodeValue = next
        }
        if (mutation.type === 'attributes') {
          const element = mutation.target
          const current = element.getAttribute(mutation.attributeName)
          const next = translateValue(current)
          if (next !== current) element.setAttribute(mutation.attributeName, next)
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES
    })

    return () => observer.disconnect()
  }, [dictionaries, i18n.language, reverseMap])

  return null
}
