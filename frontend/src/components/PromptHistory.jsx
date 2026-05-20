import { Clock3, Heart, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

const MAX_PROMPTS = 8

function readPrompts(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]')
  } catch {
    return []
  }
}

export function saveRecentPrompt(storageKey, prompt) {
  const cleanPrompt = prompt.trim()
  if (!cleanPrompt) return []
  const next = [
    { id: crypto.randomUUID(), prompt: cleanPrompt, favorite: false, createdAt: Date.now() },
    ...readPrompts(storageKey).filter((item) => item.prompt !== cleanPrompt)
  ].slice(0, MAX_PROMPTS)
  localStorage.setItem(storageKey, JSON.stringify(next))
  return next
}

export default function PromptHistory({ storageKey, examples = [], onReuse }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(readPrompts(storageKey))
  }, [storageKey])

  function toggleFavorite(id) {
    const next = items.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item)
    setItems(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const sortedItems = [...items].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.createdAt - a.createdAt)

  return (
    <div className="prompt-history">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Clock3 className="h-4 w-4 text-[#00E5FF]" />
          Prompt history
        </div>
        <span className="text-xs text-[#A1A1AA]">{items.length}/{MAX_PROMPTS}</span>
      </div>

      {sortedItems.length > 0 ? (
        <div className="space-y-2">
          {sortedItems.map((item) => (
            <div key={item.id} className="prompt-history-item">
              <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onReuse(item.prompt)}>
                <span className="line-clamp-2 text-sm text-white">{item.prompt}</span>
              </button>
              <button
                className={item.favorite ? 'prompt-favorite is-active' : 'prompt-favorite'}
                type="button"
                onClick={() => toggleFavorite(item.id)}
                aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="prompt-history-empty">
          <Sparkles className="h-4 w-4 text-[#00E5FF]" />
          <p>No prompts yet. Try an example below.</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((prompt) => (
          <button key={prompt} className="example-chip" type="button" onClick={() => onReuse(prompt)}>
            <RotateCcw className="h-3.5 w-3.5" />
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
