import { BarChart3, CreditCard, FileCode2, Image, KeyRound, LayoutDashboard, LogOut, Menu, Settings, SquareTerminal, Video, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AiStatusIndicator from './AiStatusIndicator'
import CommandPalette from './CommandPalette'
import { GlassButton, GlassCard } from './ui'

const links = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Playground', '/playground', SquareTerminal],
  ['API Keys', '/api-keys', KeyRound],
  ['Pricing', '/pricing', CreditCard],
  ['API Docs', '/docs', FileCode2],
  ['Images', '/images', Image],
  ['Videos', '/videos', Video],
  ['Usage', '/usage', BarChart3],
  ['AI Providers', '/settings/providers', Settings]
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('mobile-nav-open', menuOpen)
    return () => document.body.classList.remove('mobile-nav-open')
  }, [menuOpen])

  return (
    <div className="page-shell">
      <CommandPalette />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B1020]/55 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <Link to="/dashboard" className="group flex items-center gap-3 text-lg font-bold text-white transition duration-300 hover:scale-[1.02]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_0_32px_rgba(0,229,255,0.16)] backdrop-blur-xl" data-magnetic>
              <KeyRound className="h-5 w-5 text-[#00E5FF]" />
            </span>
            <span className="title-gradient brand-full">AI API Platform</span>
            <span className="title-gradient brand-short">AI API</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
            <AiStatusIndicator />
            <span className="hidden max-w-[260px] truncate rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[#A1A1AA] sm:inline">{user?.email}</span>
            <GlassButton
              variant="secondary"
              className="header-logout hidden sm:inline-flex"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut className="h-4 w-4" /> Logout
            </GlassButton>
            <button
              type="button"
              className="mobile-menu-button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-nav-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <div className="app-layout mx-auto grid max-w-7xl gap-5 px-4 py-5 md:grid-cols-[184px_1fr] lg:grid-cols-[248px_1fr] lg:gap-6 lg:py-6">
        <GlassCard as="nav" className={`vision-sidebar h-fit p-3 md:sticky md:top-24 ${menuOpen ? 'is-open' : ''}`}>
          {links.map(([label, href, Icon]) => (
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
              <span className="vision-nav-label">{label}</span>
            </NavLink>
          ))}
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
            <span className="vision-nav-label">Logout</span>
          </button>
        </GlassCard>
        <main key={location.pathname} className="page-transition">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
