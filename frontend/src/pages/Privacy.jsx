import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <main className="legal-page">
      <Link to="/" className="legal-back">APIsForge</Link>
      <article>
        <p>Last updated: June 12, 2026</p>
        <h1>Privacy Policy</h1>
        <p>APIsForge provides AI text and image generation, history, API access, and account management.</p>
        <h2>Information we process</h2>
        <p>We process account details, prompts, generated content, usage records, and billing status to provide and secure the service. Camera, photo library, files, and microphone data are accessed only after you choose those features.</p>
        <h2>AI providers</h2>
        <p>Requests may be sent to the AI provider you select, including OpenAI, Anthropic, or DeepSeek. Their handling of request content is governed by their policies.</p>
        <h2>Storage and deletion</h2>
        <p>Generation history and account records are stored to operate the product. You may delete available history items or contact support to request account deletion.</p>
        <h2>Payments</h2>
        <p>Payment providers process payment information. APIsForge does not store complete card details.</p>
        <h2>Contact</h2>
        <p>For privacy requests, email <a href="mailto:chenaugustin90@gmail.com">chenaugustin90@gmail.com</a>.</p>
      </article>
    </main>
  )
}
