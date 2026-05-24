import { BookOpen, Image, KeyRound, LayoutDashboard, Search, Settings, Sparkles, SquareTerminal, UserCircle, Video, WalletCards, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { GlassButton, GlassCard, GlassInput } from './ui'

function fuzzyScore(text, query) {
  if (!query.trim()) return 1
  let score = 0
  let cursor = 0
  const haystack = text.toLowerCase()
  const needle = query.toLowerCase()
  for (const char of needle) {
    const index = haystack.indexOf(char, cursor)
    if (index === -1) return 0
    score += index === cursor ? 3 : 1
    cursor = index + 1
  }
  return score
}

export default function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [message, setMessage] = useState('')

  const actions = useMemo(() => [
    { label: 'Generate image', hint: 'Open AI image studio', icon: Image, run: () => navigate('/images') },
    { label: 'Generate video', hint: 'Open motion generation', icon: Video, run: () => navigate('/videos') },
    { label: 'Open playground', hint: 'Test API requests and snippets', icon: SquareTerminal, run: () => navigate('/playground') },
    { label: 'Open prompt library', hint: 'Save and reuse high-performing prompts', icon: BookOpen, run: () => navigate('/prompt-library') },
    { label: 'Open account', hint: 'Profile, billing, usage, and keys', icon: UserCircle, run: () => navigate('/account') },
    { label: 'Open API keys', hint: 'Manage developer access keys', icon: KeyRound, run: () => navigate('/api-keys') },
    { label: 'Open usage', hint: 'View usage timeline and keys', icon: WalletCards, run: () => navigate('/usage') },
    { label: 'Open upgrade', hint: 'Review credit balance and upgrade placeholder', icon: Sparkles, run: () => navigate('/upgrade') },
    { label: 'Open dashboard', hint: 'Return to command center', icon: LayoutDashboard, run: () => navigate('/dashboard') },
    { label: 'Open AI providers', hint: 'Check provider setup and connection tests', icon: Settings, run: () => navigate('/settings/providers') },
    {
      label: 'Create API key',
      hint: 'Create a key from anywhere',
      icon: KeyRound,
      run: async () => {
        window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'thinking' } }))
        const created = await api('/api/api-keys', { method: 'POST', body: JSON.stringify({ name: `Palette key ${new Date().toLocaleTimeString()}` }) })
        sessionStorage.setItem('new_api_key', JSON.stringify(created))
        setMessage(`Created ${created.key_prefix || 'new key'}`)
        window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
        navigate('/api-keys')
      }
    },
    { label: 'Open pricing', hint: 'Review plans and checkout', icon: Sparkles, run: () => navigate('/pricing') }
  ], [navigate])

  const results = useMemo(() => actions
    .map((action) => ({ ...action, score: fuzzyScore(`${action.label} ${action.hint}`, query) }))
    .filter((action) => action.score > 0)
    .sort((a, b) => b.score - a.score), [actions, query])

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
      if (!open) return
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => results.length ? (current + 1) % results.length : 0)
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => results.length ? (current - 1 + results.length) % results.length : 0)
      }
      if (event.key === 'Enter' && results[activeIndex]) {
        event.preventDefault()
        execute(results[activeIndex])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, open, results])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  async function execute(action) {
    try {
      await action.run()
      if (!action.label.includes('Create')) setMessage('')
      setOpen(false)
      setQuery('')
    } catch (error) {
      setMessage(error.message)
      window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
    }
  }

  if (!open) return message ? <div className="palette-toast">{message}</div> : null

  return (
    <div className="command-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <GlassCard className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <div className="command-search">
          <Search className="h-4 w-4 text-[#00E5FF]" />
          <GlassInput autoFocus placeholder="Search actions..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <GlassButton variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close command palette">
            <X className="h-4 w-4" />
          </GlassButton>
        </div>
        <div className="command-results">
          {results.map((action, index) => {
            const Icon = action.icon
            return (
              <button key={action.label} className={`command-item ${index === activeIndex ? 'is-active' : ''}`} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => execute(action)}>
                <span className="command-icon"><Icon className="h-4 w-4" /></span>
                <span>
                  <span className="block text-sm font-semibold text-white">{action.label}</span>
                  <span className="text-xs text-[#A1A1AA]">{action.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="command-footer">Cmd+K to toggle · ↑↓ navigate · Enter run</div>
      </GlassCard>
    </div>
  )
}
