import { Copy, Grid2X2, Image as ImageIcon, List, MoreHorizontal, Pencil, Pin, PinOff, RefreshCw, Search, Share2, SlidersHorizontal, Sparkles, Trash2, UserCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ThemeToggle from '../components/ThemeToggle'
import { useToast } from '../components/ToastProvider'
import { addImagesToHistory, deleteImageHistory, deleteTextGenerationHistory, loadImageHistory, loadTextGenerationHistory, saveTextGenerationHistory } from '../utils/generationHistory'
import { createShareLink } from '../utils/share'

const META_KEY = 'ai_native_history_meta'
const STYLE_PROMPTS = {
  cinematic: 'Cinematic lighting, premium composition, rich depth, refined color grading.',
  photoreal: 'Photorealistic rendering, natural materials, realistic optics, high detail.',
  product: 'Premium product render, clean studio lighting, precise materials, commercial polish.',
  illustration: 'Editorial illustration style, expressive shapes, sophisticated color, polished finish.',
  minimal: 'Minimal Apple VisionOS liquid glass aesthetic, airy composition, subtle translucency.'
}

export default function History({ home = false }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [textItems, setTextItems] = useState([])
  const [imageItems, setImageItems] = useState([])
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [contextItem, setContextItem] = useState(null)
  const [loadingId, setLoadingId] = useState('')
  const [sharingId, setSharingId] = useState('')
  const [meta, setMeta] = useState(() => readMeta())
  const longPressTimer = useRef(null)

  useEffect(() => { refreshHistory() }, [])
  useEffect(() => { localStorage.setItem(META_KEY, JSON.stringify(meta)) }, [meta])

  async function refreshHistory() {
    const [texts, images] = await Promise.all([Promise.resolve(loadTextGenerationHistory()), loadImageHistory()])
    setTextItems(texts)
    setImageItems(images)
  }

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [
      ...textItems.map((item) => ({ ...item, kind: 'text' })),
      ...imageItems.map((item) => ({ ...item, kind: 'image' }))
    ]
      .filter((item) => !normalized || [item.prompt, item.response, item.text, item.provider, item.model].filter(Boolean).join(' ').toLowerCase().includes(normalized))
      .sort((a, b) => Number(Boolean(meta[b.id]?.pinned)) - Number(Boolean(meta[a.id]?.pinned)) || new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [textItems, imageItems, query, meta])

  async function regenerate(item) {
    setLoadingId(item.id)
    try {
      if (item.kind === 'text') {
        const result = await api('/api/generate/text', { method: 'POST', body: JSON.stringify({ provider: item.provider || 'openai', model: item.model || null, prompt: item.prompt, max_tokens: item.max_tokens || 512 }) })
        setTextItems(saveTextGenerationHistory({ prompt: item.prompt, response: result.text || '', text: result.text || '', provider: result.provider, model: result.model, created_at: new Date().toISOString() }))
      } else {
        const result = await api('/api/generate/image', { method: 'POST', body: JSON.stringify({ provider: item.provider || 'openai', model: item.model || 'gpt-image-2', prompt: buildStyledPrompt(item.prompt, item.style), size: item.size || '1024x1024', quality: item.quality || 'auto', count: 1 }) })
        const urls = result.image_urls?.length ? result.image_urls : [result.output_url].filter(Boolean)
        setImageItems(await addImagesToHistory(urls.map((outputUrl, index) => ({ ...item, id: `${result.id || crypto.randomUUID()}-${index}`, output_url: outputUrl, created_at: new Date().toISOString() }))))
      }
    } catch (error) {
      toast.error(error.message, t('dom.Request failed'))
    } finally {
      setLoadingId('')
    }
  }

  async function remove(item) {
    if (item.kind === 'text') setTextItems(deleteTextGenerationHistory(item.id))
    else setImageItems(await deleteImageHistory(item.id))
    setContextItem(null)
  }

  async function share(item) {
    setSharingId(item.id)
    try {
      await createShareLink({ modality: item.kind, prompt: item.prompt, text: item.response || item.text || '', output_url: item.output_url, provider: item.provider, model: item.model })
      toast.success(t('dom.Share URL copied to clipboard.'), t('dom.Share link ready'))
    } catch (error) {
      toast.error(error.message, t('dom.Could not create share link'))
    } finally {
      setSharingId('')
    }
  }

  function rename(item) {
    const title = window.prompt(t('dom.Rename conversation'), displayTitle(item, meta))
    if (title?.trim()) setMeta((current) => ({ ...current, [item.id]: { ...current[item.id], title: title.trim() } }))
    setContextItem(null)
  }

  function togglePin(item) {
    setMeta((current) => ({ ...current, [item.id]: { ...current[item.id], pinned: !current[item.id]?.pinned } }))
    setContextItem(null)
  }

  function beginLongPress(item) {
    window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => setContextItem(item), 520)
  }

  function endLongPress() {
    window.clearTimeout(longPressTimer.current)
  }

  return (
    <div className="native-history-page">
      <header className="native-history-header">
        <Link to="/account" className="native-round-button native-profile-button" aria-label={t('nav.account')}><UserCircle /></Link>
        <div>
          <p>{home ? t('dom.Your AI space') : t('dom.Your AI memory')}</p>
          <h1>{home ? t('dom.Home') : t('dom.History')}</h1>
        </div>
        <button className="native-round-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={t('dom.Menu')}><MoreHorizontal /></button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div className="native-floating-menu native-view-menu" initial={{ opacity: 0, scale: .88, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .9, y: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
            <MenuButton icon={Grid2X2} label={t('dom.Grid')} active={view === 'grid'} onClick={() => { setView('grid'); setMenuOpen(false) }} />
            <MenuButton icon={List} label={t('dom.List')} active={view === 'list'} onClick={() => { setView('list'); setMenuOpen(false) }} />
            <MenuButton icon={Search} label={t('dom.Search')} onClick={() => { setSearchOpen(true); setMenuOpen(false) }} />
            <MenuButton icon={SlidersHorizontal} label={t('dom.Sort')} onClick={() => setMenuOpen(false)} />
            <div className="native-menu-theme"><ThemeToggle /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <motion.div className="native-spotlight" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}>
            <Search />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('dom.Search conversations')} />
            <button type="button" onClick={() => { setQuery(''); setSearchOpen(false) }}><X /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`native-history-grid ${view === 'list' ? 'is-list' : ''}`}>
        <Link to="/dashboard" className="native-history-card native-new-card">
          <span>{formatDay(new Date().toISOString())}</span>
          <strong>{t('dom.New Conversation')}</strong>
          <Sparkles />
        </Link>
        {items.map((item, index) => (
          <motion.article
            layout
            key={`${item.kind}-${item.id}`}
            className={`native-history-card native-history-card-${index % 4} ${item.kind === 'image' ? 'has-image' : ''}`}
            onContextMenu={(event) => { event.preventDefault(); setContextItem(item) }}
            onPointerDown={() => beginLongPress(item)}
            onPointerUp={endLongPress}
            onPointerLeave={endLongPress}
            initial={{ opacity: 0, y: 28, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 125, damping: 22, delay: Math.min(index * .035, .3) }}
          >
            {item.output_url && <img src={item.output_url} alt="" />}
            <div className="native-history-card-content">
              <span>{meta[item.id]?.pinned ? t('dom.Pinned') : formatDay(item.created_at)}</span>
              <strong>{displayTitle(item, meta)}</strong>
              <p>{item.response || item.text || item.prompt}</p>
            </div>
            <button type="button" className="native-card-more" onClick={() => setContextItem(item)} aria-label={t('dom.Menu')}><MoreHorizontal /></button>
          </motion.article>
        ))}
      </main>

      <div className="native-history-actions">
        <button type="button" className="native-round-button" onClick={() => setSearchOpen(true)}><Search /></button>
        <Link to="/dashboard" className="native-round-button native-compose-button"><Pencil /></Link>
      </div>

      <AnimatePresence>
        {contextItem && (
          <div className="native-modal-scrim" onClick={() => setContextItem(null)}>
            <motion.div className="native-floating-menu native-context-menu" onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: .82, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .88, y: 20 }} transition={{ type: 'spring', stiffness: 280, damping: 25 }}>
              <MenuButton icon={Pencil} label={t('dom.Rename')} onClick={() => rename(contextItem)} />
              <MenuButton icon={meta[contextItem.id]?.pinned ? PinOff : Pin} label={meta[contextItem.id]?.pinned ? t('dom.Unpin') : t('dom.Pin')} onClick={() => togglePin(contextItem)} />
              <MenuButton icon={Copy} label={t('dom.Copy')} onClick={() => navigator.clipboard?.writeText(contextItem.response || contextItem.text || contextItem.output_url || '')} />
              <MenuButton icon={Share2} label={sharingId === contextItem.id ? t('dom.Sharing') : t('dom.Share')} onClick={() => share(contextItem)} />
              <MenuButton icon={RefreshCw} label={loadingId === contextItem.id ? t('dom.Generating') : t('dom.Regenerate')} onClick={() => regenerate(contextItem)} />
              <MenuButton danger icon={Trash2} label={t('dom.Delete')} onClick={() => remove(contextItem)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuButton({ icon: Icon, label, active, danger, onClick }) {
  return <button type="button" className={`${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`} onClick={onClick}><Icon /><span>{label}</span></button>
}

function displayTitle(item, meta) {
  if (meta[item.id]?.title) return meta[item.id].title
  const words = (item.prompt || 'New Conversation').trim().split(/\s+/)
  return words.slice(0, 5).join(' ')
}

function readMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') } catch { return {} }
}

function formatDay(value) {
  if (!value) return 'Saved'
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return date.toLocaleDateString(undefined, { weekday: 'long' })
}

function buildStyledPrompt(prompt, style) {
  const stylePrompt = STYLE_PROMPTS[style]
  return stylePrompt ? `${prompt}\n\nStyle direction: ${stylePrompt}` : prompt
}
