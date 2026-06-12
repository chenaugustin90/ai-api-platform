import { FileCode2, KeyRound, Menu, Settings, Sparkles, UserCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import CommandPalette from './CommandPalette'

export default function Layout() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const isChatRoute = location.pathname === '/playground' || location.pathname === '/dashboard'
  const isHistoryRoute = location.pathname === '/history'
  const [creditsRemaining, setCreditsRemaining] = useState(user?.credits_remaining ?? null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    api('/api/usage/summary')
      .then((summary) => setCreditsRemaining(summary.credits_remaining))
      .catch(() => {})
  }, [location.pathname])

  return (
    <div className={`page-shell ${isChatRoute ? 'is-chat-route' : ''} ${isHistoryRoute ? 'is-history-route' : ''}`}>
      <CommandPalette />
      {!isChatRoute && !isHistoryRoute && (
        <header className="native-app-header">
          <Link to="/account" className="native-app-profile" aria-label={user?.email || t('nav.account')}><UserCircle /></Link>
          <Link to="/dashboard" className="native-app-wordmark"><KeyRound /><span>AI</span></Link>
          <button type="button" className="native-app-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={t('dom.Menu')}><Menu /></button>
        </header>
      )}
      <AnimatePresence>
        {menuOpen && (
          <div className="native-modal-scrim" onClick={() => setMenuOpen(false)}>
            <motion.nav className="native-app-menu" onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: .9, y: -16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .94, y: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
              <Link to="/docs" onClick={() => setMenuOpen(false)}><FileCode2 />{t('nav.apiDocs')}</Link>
              <Link to="/api-keys" onClick={() => setMenuOpen(false)}><KeyRound />{t('nav.apiKeys')}</Link>
              <Link to="/settings" onClick={() => setMenuOpen(false)}><Settings />{t('dom.Settings')}</Link>
              <Link to="/pricing" onClick={() => setMenuOpen(false)}><Sparkles />{t('nav.pricing')}</Link>
              {creditsRemaining !== null && <span>{Number(creditsRemaining).toLocaleString()} {t('nav.credits')}</span>}
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
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
    </div>
  )
}
