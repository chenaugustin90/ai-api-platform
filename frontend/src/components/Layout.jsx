import { BookOpen, History as HistoryIcon, Image, KeyRound, LogOut, Menu, MessageSquareText, Settings, UserCircle, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import AiStatusIndicator from './AiStatusIndicator'
import CommandPalette from './CommandPalette'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import { GlassButton, GlassCard } from './ui'

const links = [
  ['nav.chat', '/dashboard', MessageSquareText],
  ['nav.images', '/images', Image],
  ['nav.history', '/history', HistoryIcon],
  ['nav.apiKeys', '/api-keys', KeyRound],
  ['nav.apiDocs', '/docs', BookOpen],
  ['nav.settings', '/settings', Settings],
  ['nav.account', '/account', UserCircle]
]

const dockLinks = links.filter(([, href]) => ['/dashboard', '/images', '/history', '/settings', '/account'].includes(href))

export default function Layout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [creditsRemaining, setCreditsRemaining] = useState(user?.credits_remaining ?? null)

  useEffect(() => {
    setMenuOpen(false)
    api('/api/usage/summary')
      .then((summary) => setCreditsRemaining(summary.credits_remaining))
      .catch(() => {})
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('mobile-nav-open', menuOpen)
    return () => document.body.classList.remove('mobile-nav-open')
  }, [menuOpen])

  return (
    <div className="page-shell">
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
            <ThemeToggle className="hidden sm:inline-flex" />
            {creditsRemaining !== null && (
              <span className="header-credit-pill hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-cyan-50 sm:inline-flex">
                <Zap className="h-3.5 w-3.5 text-[#00E5FF]" />
                {Number(creditsRemaining).toLocaleString()} {t('nav.credits')}
              </span>
            )}
            <span className="hidden max-w-[260px] truncate rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[#A1A1AA] sm:inline">{user?.email}</span>
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <GlassButton
              variant="secondary"
              className="header-logout hidden sm:inline-flex"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut className="h-4 w-4" /> {t('nav.logout')}
            </GlassButton>
            <button
              type="button"
              className="mobile-menu-button"
              aria-label={menuOpen ? t('dom.Close navigation') : t('dom.Open navigation')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-nav-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <div className="app-layout spatial-app-layout">
        <GlassCard as="nav" className={`vision-sidebar spatial-rail ${menuOpen ? 'is-open' : ''}`}>
          {links.map(([labelKey, href, Icon]) => (
            <NavLink
              key={href}
              to={href}
              className={({ isActive }) =>
                `vision-nav-item ${isActive ? 'is-active' : ''}`
              }
              data-magnetic
            >
              <span className="vision-nav-icon">
                <Icon className="h-4 w-4" />
              </span>
              <span className="vision-nav-label">{t(labelKey)}</span>
            </NavLink>
          ))}
          <LanguageSwitcher className="mt-2 w-full justify-center sm:hidden" />
          <ThemeToggle className="mt-2 w-full justify-center sm:hidden" />
          <button
            type="button"
            className="vision-nav-item sm:hidden"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <span className="vision-nav-icon">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="vision-nav-label">{t('nav.logout')}</span>
          </button>
        </GlassCard>
        <main key={location.pathname} className="page-transition spatial-main">
          <Outlet />
        </main>
      </div>
      <nav className="mobile-dock" aria-label={t('dom.Navigation')}>
        {dockLinks.map(([labelKey, href, Icon]) => (
          <NavLink key={href} to={href} className={({ isActive }) => `mobile-dock-item ${isActive ? 'is-active' : ''}`}>
            <span><Icon className="h-5 w-5" /></span>
            <small>{t(labelKey)}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
