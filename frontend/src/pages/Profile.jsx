import { BarChart3, ChevronRight, CircleUserRound, CreditCard, FileCode2, KeyRound, LogOut, Settings, Sparkles, WalletCards, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { isNativeApp } from '../utils/nativeApp'

const profileLinks = [
  { href: '/pricing', label: 'Membership', detail: 'Plans and payment', icon: CreditCard },
  { href: '/usage', label: 'Credits & usage', detail: 'Activity and balance', icon: Zap },
  { href: '/api-keys', label: 'API Keys', detail: 'Developer access', icon: KeyRound },
  { href: '/docs', label: 'API Docs', detail: 'Build with the platform', icon: FileCode2 },
  { href: '/settings', label: 'Settings', detail: 'Providers and workspace', icon: Settings },
  { href: '/settings/account', label: 'Account details', detail: 'Profile, billing, and security', icon: WalletCards }
]

export default function Profile() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    api('/api/dashboard').then(setSummary).catch(() => {})
  }, [])

  function signOut() {
    logout()
    navigate('/login')
  }

  const billing = summary?.billing || user || {}
  const usage = summary?.usage || {}
  const links = isNativeApp() ? profileLinks.filter((item) => item.href !== '/pricing') : profileLinks

  return (
    <div className="native-profile-page">
      <motion.header className="native-profile-identity" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="native-profile-avatar"><CircleUserRound /></div>
        <div>
          <p>{t('dom.Account')}</p>
          <h1>{user?.full_name || user?.email?.split('@')[0] || 'AI User'}</h1>
          <span>{user?.email}</span>
        </div>
      </motion.header>

      <section className="native-profile-membership">
        <div>
          <p>{t('dom.Subscription')}</p>
          <strong>{String(billing.subscription_tier || 'free').replace(/\b\w/g, (letter) => letter.toUpperCase())}</strong>
          <span>{billing.subscription_status || 'active'}</span>
        </div>
        <div>
          <p>{t('nav.credits')}</p>
          <strong>{Number(usage.credits_remaining ?? billing.credits_remaining ?? 0).toLocaleString()}</strong>
          <span>{Number(usage.total_events || 0).toLocaleString()} {t('dom.Requests').toLocaleLowerCase()}</span>
        </div>
        {!isNativeApp() && <Link to="/pricing"><Sparkles /> {t('dom.Upgrade')}</Link>}
      </section>

      <section className="native-settings-list">
        {links.map(({ href, label, detail, icon: Icon }, index) => (
          <motion.div key={href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .045 }}>
            <Link to={href}>
              <span className="native-settings-icon"><Icon /></span>
              <span className="native-settings-copy"><strong>{t(`dom.${label}`)}</strong><small>{t(`dom.${detail}`)}</small></span>
              <ChevronRight />
            </Link>
          </motion.div>
        ))}
      </section>

      <section className="native-profile-preferences">
        <div><span><Sparkles /> {t('dom.Theme')}</span><ThemeToggle /></div>
        <div><span><BarChart3 /> {t('language.label')}</span><LanguageSwitcher /></div>
      </section>

      <button type="button" className="native-signout" onClick={signOut}><LogOut /> {t('nav.logout')}</button>
    </div>
  )
}
