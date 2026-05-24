import { Copy, ExternalLink, Image, Type } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_URL } from '../api/client'
import { GlassButton, GlassCard } from '../components/ui'

export default function SharedPreview() {
  const { id } = useParams()
  const [share, setShare] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!API_URL) {
      setError('Missing BACKEND_URL. Configure the production backend URL before loading public shares.')
      return () => {
        mounted = false
      }
    }
    fetch(`${API_URL}/api/shares/${id}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.detail || 'Share not found')
        return data
      })
      .then((data) => {
        if (mounted) setShare(data)
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
    return () => {
      mounted = false
    }
  }, [id])

  const Icon = share?.modality === 'image' ? Image : Type

  return (
    <div className="shared-preview-page min-h-screen overflow-hidden px-5 py-8 text-white sm:px-8">
      <header className="shared-preview-header mx-auto mb-8 flex w-full max-w-5xl items-center justify-between gap-4">
        <Link to="/" className="brand-mark">
          <span className="brand-icon">AI</span>
          <span>AI API Platform</span>
        </Link>
        {share && (
          <GlassButton variant="secondary" type="button" onClick={() => navigator.clipboard?.writeText(share.url)}>
            <Copy className="h-4 w-4" />
            Copy share URL
          </GlassButton>
        )}
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6">
        {error ? (
          <GlassCard className="shared-preview-card p-8">
            <p className="eyebrow mb-2">Share unavailable</p>
            <h1 className="text-4xl font-bold">This preview could not be loaded.</h1>
            <p className="muted mt-3">{error}</p>
          </GlassCard>
        ) : !share ? (
          <GlassCard className="shared-preview-card p-8">
            <p className="eyebrow mb-2">Loading share</p>
            <div className="shared-preview-loader" />
          </GlassCard>
        ) : (
          <>
            <GlassCard className="shared-preview-card p-6 sm:p-8">
              <div className="shared-preview-kicker mb-5">
                <span className="composer-spark"><Icon className="h-4 w-4" /></span>
                <span>{share.modality} generation</span>
              </div>
              <p className="eyebrow mb-3">Public Preview</p>
              <h1 className="title-gradient text-4xl font-bold sm:text-6xl">{share.title || 'Shared generation'}</h1>
              <p className="muted mt-4 max-w-3xl">{share.prompt}</p>
              <div className="shared-preview-meta mt-5">
                <span>{share.provider || 'AI provider'}</span>
                <span>{share.model || 'model'}</span>
                <span>{formatDate(share.created_at)}</span>
              </div>
            </GlassCard>

            <GlassCard className="shared-preview-output overflow-hidden p-3">
              {share.modality === 'image' ? (
                <img src={share.output_url} alt={share.prompt} />
              ) : (
                <pre>{share.text}</pre>
              )}
            </GlassCard>

            <GlassCard className="shared-preview-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="muted text-sm">OpenGraph previews use the public share URL, so links look polished in Slack, iMessage, X, and Discord.</p>
              <GlassButton as="a" href={`${API_URL}/share/${share.id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open OG page
              </GlassButton>
            </GlassCard>
          </>
        )}
      </main>
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'shared'
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
