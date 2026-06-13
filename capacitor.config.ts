import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.apisforge.app',
  appName: 'APIsForge',
  webDir: 'frontend/dist',
  backgroundColor: '#050505',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    allowsLinkPreview: false
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK'
    },
    Keyboard: {
      resize: 'native',
      style: 'DARK',
      resizeOnFullScreen: true
    }
  }
}

export default config
