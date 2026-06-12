import { History as HistoryIcon, Image, KeyRound, MessageSquareText, Sparkles, UserCircle, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import AiStatusIndicator from './AiStatusIndicator'
import CommandPalette from './CommandPalette'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'

const dockLinks = [
  ['nav.chat', '/dashboard', MessageSquareText],
  ['nav.playground', '/playground', Sparkles],
  ['nav.images', '/images', Image],
  ['nav.history', '/history', HistoryIcon],
  ['nav.account', '/account', UserCircle]
]

export default function Layout() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const isChatRoute = location.pathname === '/playground'
  const isHistoryRoute = location.pathname === '/history'
  const [creditsRemaining, setCreditsRemaining] = useState(user?.credits_remaining ?? null)

  useEffect(() => {
    api('/api/usage/summary')
      .then((summary) => setCreditsRemaining(summary.credits_remaining))
      .catch(() => {})
  }, [location.pathname])

  return (
    <div className={`page-shell ${isChatRoute ? 'is-chat-route' : ''} ${isHistoryRoute ? 'is-history-route' : ''}`}>
      <CommandPalette />
      <header className="spatial-header">
        <div className="spatial-header-inner">
          <Link to="/dashboard" className="group flex items-center gap-3 text-lg font-bold text-white transition duration-300 hover:scale-[1.02]">
            <span className="spatial-brand-mark" data-magnetic>
              <KeyRound className="h-5 w-5 text-[#00E5FF]" />
            </span>
            <span className="title-gradient brand-full">AI API Platform</span>
            <span className="title-gradient brand-short">AI API</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
            <AiStatusIndicator />
            <ThemeToggle className="spatial-header-theme" />
            {creditsRemaining !== null && (
              <span className="header-credit-pill hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-cyan-50 sm:inline-flex">
                <Zap className="h-3.5 w-3.5 text-[#00E5FF]" />
                {Number(creditsRemaining).toLocaleString()} {t('nav.credits')}
              </span>
            )}
            <LanguageSwitcher className="spatial-header-language" />
            <Link to="/account" className="spatial-profile-link" aria-label={user?.email || t('nav.account')} data-magnetic>
              <UserCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
      <div className="app-layout spatial-app-layout">
        <motion.main
          key={location.pathname}
          className="page-transition spatial-main"
          initial={{ opacity: 0, y: 12, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 24, mass: 0.8 }}
        >
          <Outlet />
        </motion.main>
      </div>
      <motion.nav
        className="mobile-dock app-floating-dock"
        aria-label={t('dom.Navigation')}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 22, delay: 0.12 }}
      >
        {dockLinks.map(([labelKey, href, Icon]) => (
          <NavLink key={href} to={href} className={({ isActive }) => `mobile-dock-item ${isActive ? 'is-active' : ''}`}>
            <span><Icon className="h-5 w-5" /></span>
            <small>{t(labelKey)}</small>
          </NavLink>
        ))}
      </motion.nav>
    </div>
  )
}
