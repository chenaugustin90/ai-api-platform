import { BrainCircuit, Camera, Check, ChevronDown, Code2, Copy, FileText, Globe2, Image as ImageIcon, Languages, Mic, Paperclip, Plus, Search, Send, Sparkles, TerminalSquare, Video, WandSparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { API_URL, api, apiKeyRequest, getToken } from '../api/client'
import { saveTextGenerationHistory } from '../utils/generationHistory'

const MODEL_CHOICES = [
  { id: 'gpt-4o-mini', label: 'GPT-4o', provider: 'openai', model: 'gpt-4o-mini', available: true },
  { id: 'claude', label: 'Claude', provider: 'claude', model: 'claude-haiku-4-5', available: true },
  { id: 'deepseek', label: 'DeepSeek', provider: 'deepseek', model: 'deepseek-chat', available: true },
  { id: 'gemini', label: 'Gemini', available: false },
  { id: 'grok', label: 'Grok', available: false },
  { id: 'flux', label: 'Flux', provider: 'flux', model: '', endpoint: 'image', available: true },
  { id: 'sdxl', label: 'SDXL', available: false }
]

const ENDPOINTS = {
  text: { path: '/api/generate/text', credits: 1, defaults: { prompt: '', max_tokens: 512 } },
  image: { path: '/api/generate/image', credits: 10, defaults: { prompt: '', size: '1024x1024' } },
  video: { path: '/api/generate/video', credits: 50, defaults: { prompt: '', duration_seconds: 5 } }
}

export default function Playground() {
  const { t } = useTranslation()
  const [endpoint, setEndpoint] = useState('text')
  const [authMode, setAuthMode] = useState('chat')
  const [selectedModel, setSelectedModel] = useState(MODEL_CHOICES[0].id)
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState(MODEL_CHOICES[0].model)
  const [prompt, setPrompt] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)
  const [streamedResponse, setStreamedResponse] = useState('')
  const [attachments, setAttachments] = useState([])
  const cameraRef = useRef(null)
  const photosRef = useRef(null)
  const filesRef = useRef(null)
  const recognitionRef = useRef(null)

  const config = ENDPOINTS[endpoint]
  const payload = useMemo(() => buildPayload(endpoint, provider, model, prompt), [endpoint, provider, model, prompt])

  useEffect(() => {
    const text = response?.text || ''
    setStreamedResponse('')
    if (!text) return undefined
    let index = 0
    const timer = window.setInterval(() => {
      index += Math.max(1, Math.ceil(text.length / 56))
      setStreamedResponse(text.slice(0, index))
      if (index >= text.length) window.clearInterval(timer)
    }, 28)
    return () => window.clearInterval(timer)
  }, [response])

  function chooseModel(choice) {
    if (!choice.available) return
    const nextEndpoint = choice.endpoint || 'text'
    setSelectedModel(choice.id)
    setEndpoint(nextEndpoint)
    setProvider(choice.provider)
    setModel(choice.model || (nextEndpoint === 'image' ? 'gpt-image-2' : ''))
    setPlusOpen(false)
  }

  function chooseTool(tool) {
    if (tool.endpoint) setEndpoint(tool.endpoint)
    if (tool.prefix) setPrompt((current) => `${tool.prefix}${current}`)
    if (tool.id === 'voice') toggleVoice()
    setPlusOpen(false)
  }

  function attach(kind) {
    const refs = { camera: cameraRef, photos: photosRef, files: filesRef }
    refs[kind]?.current?.click()
  }

  async function receiveFiles(event) {
    const selected = Array.from(event.target.files || [])
    if (!selected.length) return
    const next = await Promise.all(selected.map(async (file) => {
      const isText = file.type.startsWith('text/') || /\.(md|txt|json|js|jsx|ts|tsx|py|css|html)$/i.test(file.name)
      const content = isText ? await file.text().catch(() => '') : ''
      return { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, content: content.slice(0, 12000) }
    }))
    setAttachments((current) => [...current, ...next].slice(0, 8))
    const readable = next.filter((item) => item.content)
    if (readable.length) {
      setPrompt((current) => `${current}${current ? '\n\n' : ''}${readable.map((item) => `[${item.name}]\n${item.content}`).join('\n\n')}`)
    }
    event.target.value = ''
  }

  function toggleVoice() {
    if (voiceActive) {
      recognitionRef.current?.stop?.()
      setVoiceActive(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError(t('dom.Voice input is not supported in this browser.'))
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join('')
      setPrompt(transcript)
    }
    recognition.onend = () => setVoiceActive(false)
    recognition.onerror = (event) => {
      setVoiceActive(false)
      setError(event.error === 'not-allowed' ? t('dom.Microphone permission was denied.') : t('dom.Voice input could not start.'))
    }
    recognitionRef.current = recognition
    setVoiceActive(true)
    recognition.start()
  }

  async function sendRequest(event) {
    event.preventDefault()
    if (!prompt.trim()) return
    setError('')
    setResponse(null)
    setLoading(true)
    window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'generating' } }))
    try {
      const result = authMode === 'developer'
        ? await sendDeveloperRequest(config.path, apiKey, payload)
        : await sendChatModeRequest(config.path, payload)
      setResponse(result)
      if (endpoint === 'text') saveTextGenerationHistory({ prompt, response: result.text || '', text: result.text || '', provider: result.provider || provider, model: result.model || model, created_at: new Date().toISOString() })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
      window.dispatchEvent(new CustomEvent('ai-status', { detail: { status: 'idle' } }))
    }
  }

  async function copyResult() {
    await navigator.clipboard?.writeText(response?.text || response?.output_url || JSON.stringify(response, null, 2))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="native-chat-page">
      <header className="native-chat-topbar">
        <Link to="/history" className="native-round-button" aria-label={t('dom.Close')}><X /></Link>
        <button type="button" className="native-model-capsule" onClick={() => setPlusOpen(true)}>
          <Sparkles />
          <span>{MODEL_CHOICES.find((choice) => choice.id === selectedModel)?.label || provider}</span>
          <ChevronDown />
        </button>
        <button type="button" className="native-round-button" onClick={() => setAdvancedOpen((value) => !value)} aria-label={t('dom.Advanced')}><TerminalSquare /></button>
      </header>

      <main className="native-chat-canvas">
        {!response && !loading && !error && (
          <motion.div className="native-chat-idle" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8 }}>
            <div className="native-orb"><Sparkles /></div>
            <h1>{t('dom.Ask anything')}</h1>
            <p>{t('dom.Create text, images, video, code, and more.')}</p>
          </motion.div>
        )}
        {loading && <Thinking />}
        {error && <motion.div className="native-chat-error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.div>}
        {response && (
          <motion.article className="native-ai-response" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="native-response-head"><span><Sparkles /> AI</span><button type="button" onClick={copyResult}>{copied ? <Check /> : <Copy />}</button></div>
            {response.output_url && <img src={response.output_url} alt={prompt} />}
            {response.image_urls?.map((url) => <img key={url} src={url} alt={prompt} />)}
            <p>{streamedResponse || response.text || response.message || JSON.stringify(response, null, 2)}</p>
          </motion.article>
        )}
      </main>

      <form className="native-chat-composer" onSubmit={sendRequest}>
        <input ref={cameraRef} className="native-file-input" type="file" accept="image/*" capture="environment" onChange={receiveFiles} />
        <input ref={photosRef} className="native-file-input" type="file" accept="image/*" multiple onChange={receiveFiles} />
        <input ref={filesRef} className="native-file-input" type="file" multiple onChange={receiveFiles} />
        {attachments.length > 0 && (
          <div className="native-attachment-strip">
            {attachments.map((item) => (
              <button type="button" key={item.id} onClick={() => setAttachments((current) => current.filter((attachment) => attachment.id !== item.id))}>
                <Paperclip /><span>{item.name}</span><X />
              </button>
            ))}
          </div>
        )}
        <button type="button" className="native-round-button" onClick={() => setPlusOpen((value) => !value)} aria-label={t('dom.Add')}><Plus /></button>
        <div className="native-chat-input-wrap">
          <textarea rows="1" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={t('dom.Ask anything')} />
          <span>{endpoint}</span>
        </div>
        {prompt.trim() ? (
          <button type="submit" disabled={loading} className="native-round-button native-send-button" aria-label={t('dom.Send')}><Send /></button>
        ) : (
          <button type="button" className={`native-round-button native-voice-button ${voiceActive ? 'is-active' : ''}`} onClick={toggleVoice} aria-label={t('dom.Voice')}><Mic /></button>
        )}
      </form>

      <AnimatePresence>
        {plusOpen && <PlusPanel selectedModel={selectedModel} onModel={chooseModel} onTool={chooseTool} onAttach={attach} onClose={() => setPlusOpen(false)} t={t} />}
        {advancedOpen && <AdvancedSheet authMode={authMode} setAuthMode={setAuthMode} apiKey={apiKey} setApiKey={setApiKey} payload={payload} response={response} onClose={() => setAdvancedOpen(false)} t={t} />}
      </AnimatePresence>
    </div>
  )
}

function PlusPanel({ selectedModel, onModel, onTool, onAttach, onClose, t }) {
  const tools = [
    { id: 'image', label: t('dom.Image Generation'), icon: ImageIcon, endpoint: 'image' },
    { id: 'video', label: t('dom.Video Generation'), icon: Video, endpoint: 'video' },
    { id: 'voice', label: t('dom.Voice'), icon: Mic },
    { id: 'code', label: t('dom.Code'), icon: Code2, prefix: 'Write production-ready code for: ' },
    { id: 'translate', label: t('dom.Translate'), icon: Languages, prefix: 'Translate this naturally: ' },
    { id: 'analyze', label: t('dom.Analyze'), icon: BrainCircuit, prefix: 'Analyze this carefully: ' },
    { id: 'search', label: t('dom.Search Web'), icon: Globe2, prefix: 'Research and summarize: ' }
  ]
  return (
    <div className="native-modal-scrim native-plus-scrim" onClick={onClose}>
      <motion.section className="native-plus-panel" onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 50, scale: .92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: .94 }} transition={{ type: 'spring', stiffness: 230, damping: 24 }}>
        <div className="native-panel-handle" />
        <div className="native-attach-row">
          <ToolButton icon={Camera} label={t('dom.Camera')} onClick={() => { onAttach('camera'); onClose() }} />
          <ToolButton icon={ImageIcon} label={t('dom.Photos')} onClick={() => { onAttach('photos'); onClose() }} />
          <ToolButton icon={FileText} label={t('dom.Files')} onClick={() => { onAttach('files'); onClose() }} />
        </div>
        <h2>{t('dom.AI Models')}</h2>
        <div className="native-model-grid">
          {MODEL_CHOICES.map((choice) => <button key={choice.id} type="button" disabled={!choice.available} className={selectedModel === choice.id ? 'is-active' : ''} onClick={() => onModel(choice)}><WandSparkles /><span>{choice.label}</span>{!choice.available && <small>{t('dom.Coming soon')}</small>}</button>)}
        </div>
        <h2>{t('dom.AI Tools')}</h2>
        <div className="native-tool-grid">
          {tools.map((tool) => <button key={tool.id} type="button" onClick={() => onTool(tool)}><tool.icon /><span>{tool.label}</span></button>)}
        </div>
      </motion.section>
    </div>
  )
}

function ToolButton({ icon: Icon, label, onClick }) {
  return <button type="button" onClick={onClick}><Icon /><span>{label}</span></button>
}

function AdvancedSheet({ authMode, setAuthMode, apiKey, setApiKey, payload, response, onClose, t }) {
  return (
    <div className="native-modal-scrim" onClick={onClose}>
      <motion.section className="native-advanced-sheet" onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
        <div className="native-response-head"><strong>{t('dom.Advanced')}</strong><button type="button" onClick={onClose}><X /></button></div>
        <div className="native-segmented">
          <button type="button" className={authMode === 'chat' ? 'is-active' : ''} onClick={() => setAuthMode('chat')}>{t('dom.Chat Mode')}</button>
          <button type="button" className={authMode === 'developer' ? 'is-active' : ''} onClick={() => setAuthMode('developer')}>{t('dom.Developer API Mode')}</button>
        </div>
        {authMode === 'developer' && <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ai_..." />}
        <h3>{t('dom.Request')}</h3><pre>{JSON.stringify(payload, null, 2)}</pre>
        <h3>{t('dom.Response')}</h3><pre>{JSON.stringify(response || { status: 'waiting' }, null, 2)}</pre>
        <p>{API_URL}</p>
      </motion.section>
    </div>
  )
}

function Thinking() {
  return <div className="native-thinking"><Sparkles /><span /><span /><span /></div>
}

function buildPayload(endpoint, provider, model, prompt) {
  if (endpoint === 'image') return { provider: provider === 'flux' ? 'flux' : 'openai', model: model || 'gpt-image-2', prompt, size: '1024x1024', quality: 'auto', count: 1 }
  if (endpoint === 'video') return { provider: 'runway', prompt, duration_seconds: 5 }
  return { provider, model: model || null, prompt, max_tokens: 512 }
}

async function sendChatModeRequest(path, payload) {
  if (!getToken()) throw new Error('Please log in again to use Chat Mode. Developer API Mode is only for manual X-API-Key testing.')
  return api(path, { method: 'POST', body: JSON.stringify(payload) })
}

async function sendDeveloperRequest(path, key, payload) {
  if (!key.trim()) throw new Error('API key is required in Developer API Mode.')
  return apiKeyRequest(path, key.trim(), payload)
}
