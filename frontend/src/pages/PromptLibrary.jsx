import { BookOpen, Copy, Heart, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/ToastProvider'
import EmptyState from '../components/EmptyState'
import { GlassButton, GlassCard, GlassInput, GlassSelect, GlassTextarea } from '../components/ui'
import {
  PROMPT_CATEGORIES,
  readPromptLibrary,
  readRecentPrompts,
  removePromptFromLibrary,
  savePromptToLibrary,
  togglePromptFavorite,
} from '../utils/promptLibrary'

const LIBRARY_EXAMPLES = [
  'Write a crisp product launch announcement for an AI API platform.',
  'Generate a VisionOS style product render prompt for a premium SaaS dashboard.',
  'Create a provider comparison checklist for OpenAI, DeepSeek, and Claude.'
]

export default function PromptLibrary() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [recent, setRecent] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [draft, setDraft] = useState({ prompt: '', category: 'Product' })

  function reload() {
    setItems(readPromptLibrary())
    setRecent(readRecentPrompts())
  }

  useEffect(() => {
    reload()
    window.addEventListener('prompt-library-updated', reload)
    return () => window.removeEventListener('prompt-library-updated', reload)
  }, [])

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items
      .filter((item) => category === 'All' || item.category === category)
      .filter((item) => !needle || `${item.title} ${item.prompt} ${item.category}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt)
  }, [category, items, query])

  function saveDraft(event) {
    event.preventDefault()
    if (!draft.prompt.trim()) {
      toast.error('Add a prompt before saving.')
      return
    }
    savePromptToLibrary(draft.prompt, { category: draft.category })
    setDraft({ prompt: '', category: draft.category })
    toast.success('Prompt saved to library.')
    reload()
  }

  async function copyPrompt(prompt) {
    await navigator.clipboard?.writeText(prompt)
    toast.success('Prompt copied.')
  }

  function favoritePrompt(id) {
    togglePromptFavorite(id)
    toast.success('Favorite updated.')
    reload()
  }

  function removePrompt(id) {
    removePromptFromLibrary(id)
    toast.success('Prompt removed.')
    reload()
  }

  function saveExample(prompt) {
    savePromptToLibrary(prompt, { favorite: true })
    toast.success('Example saved.')
    reload()
  }

  return (
    <div className="prompt-library-page space-y-6">
      <div className="prompt-library-hero">
        <div>
          <p className="eyebrow mb-2">Prompt System</p>
          <h1 className="title-gradient text-3xl font-bold sm:text-4xl md:text-5xl">Prompt Library</h1>
          <p className="muted mt-3 max-w-2xl text-sm">Save reusable prompts, organize by category, and keep your best instructions close to generation workflows.</p>
        </div>
        <div className="prompt-library-count">
          <BookOpen className="h-4 w-4" />
          {items.length} saved
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.76fr)_minmax(0,1fr)]">
        <GlassCard as="form" className="prompt-save-card p-5" onSubmit={saveDraft}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <span className="composer-spark"><Plus className="h-4 w-4" /></span>
            Save prompt
          </div>
          <GlassTextarea
            className="prompt-library-editor"
            placeholder="Paste or write a reusable prompt..."
            value={draft.prompt}
            onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <GlassSelect
              value={draft.category}
              options={PROMPT_CATEGORIES}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            />
            <GlassButton type="submit">
              <Sparkles className="h-4 w-4" />
              Save prompt
            </GlassButton>
          </div>
          {recent.length > 0 && (
            <div className="recent-prompt-strip">
              <p className="provider-section-title">Recent prompts</p>
              {recent.slice(0, 4).map((item) => (
                <button key={item.id} type="button" onClick={() => setDraft((current) => ({ ...current, prompt: item.prompt }))}>
                  {item.prompt}
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="prompt-library-filters">
            <div className="prompt-search">
              <Search className="h-4 w-4 text-[#00E5FF]" />
              <GlassInput placeholder="Search prompts..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <GlassSelect
              value={category}
              options={['All', ...PROMPT_CATEGORIES]}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState
              title="Build your prompt collection"
              description="Save examples, favorite your best instructions, and reuse them across text, image, and video workflows."
              examples={LIBRARY_EXAMPLES}
              onExample={saveExample}
              actionLabel="Save an example"
            />
          ) : (
            <div className="prompt-library-grid">
              {filteredItems.map((item) => (
                <PromptCard
                  key={item.id}
                  item={item}
                  onCopy={() => copyPrompt(item.prompt)}
                  onFavorite={() => favoritePrompt(item.id)}
                  onRemove={() => removePrompt(item.id)}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

function PromptCard({ item, onCopy, onFavorite, onRemove }) {
  return (
    <article className="prompt-library-card" data-magnetic>
      <div className="prompt-library-card-head">
        <span>{item.category}</span>
        <button type="button" className={item.favorite ? 'prompt-favorite is-active' : 'prompt-favorite'} onClick={onFavorite} aria-label="Favorite prompt">
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <h2>{item.title}</h2>
      <p>{item.prompt}</p>
      <div className="prompt-library-card-actions">
        <GlassButton variant="secondary" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          Copy
        </GlassButton>
        <GlassButton variant="ghost" size="icon" onClick={onRemove} aria-label="Delete prompt">
          <Trash2 className="h-4 w-4" />
        </GlassButton>
      </div>
    </article>
  )
}
