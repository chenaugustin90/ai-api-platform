import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useEffect } from 'react'
import { getStoredTheme } from './ThemeToggle'

export default function NativeRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined

    document.body.classList.add('is-native-app')

    async function syncNativeTheme(event) {
      const theme = event?.detail?.theme || getStoredTheme()
      await StatusBar.setOverlaysWebView({ overlay: true })
      await StatusBar.setStyle({ style: theme === 'light' ? Style.Dark : Style.Light })
    }

    Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {})
    syncNativeTheme().catch(() => {})
    window.addEventListener('theme-change', syncNativeTheme)

    return () => window.removeEventListener('theme-change', syncNativeTheme)
  }, [])

  return null
}
