# AI API Platform

Full-stack AI API platform with FastAPI, SQLite, JWT login, API-key management, usage tracking, Stripe subscription checkout, React, and Tailwind.

## Features

- JWT login and registration
- User dashboard with credits, usage statistics, generated images, and generated videos
- API key creation and revocation
- Usage events with token and credit accounting
- Stripe Checkout and webhook subscription upgrade flow
- Text routing for OpenAI, DeepSeek, and Qwen
- Image routing for OpenAI Image API and FLUX/BFL
- Video routing placeholders for Kling, Runway, and Veo
- Mock-safe provider behavior when API keys are not configured

## Backend

```bash
cd backend
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
FRONTEND_URL=<frontend URL> BACKEND_URL=<backend URL> uvicorn app.main:app --reload
```

The API runs at the `BACKEND_URL` you configure.

Interactive OpenAPI docs are available at `<BACKEND_URL>/docs`.

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app runs at the frontend URL printed by the dev server.

## Provider Routing

Text generation uses OpenAI-compatible chat completion APIs for:

- `openai`
- `deepseek`
- `qwen`

Image generation uses:

- OpenAI Image API at `/images/generations`
- Black Forest Labs FLUX async generation endpoints with returned `polling_url`

Provider adapters are isolated in `backend/app/providers/` so provider-specific payloads can be expanded without changing route contracts.

## Provider Environment

```bash
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
QWEN_API_KEY=
FLUX_API_KEY=

OPENAI_BASE_URL=https://api.openai.com/v1
DEEPSEEK_BASE_URL=https://api.deepseek.com
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
FLUX_BASE_URL=https://api.bfl.ai/v1
ALLOW_MOCK_PROVIDERS=true
```

Set `ALLOW_MOCK_PROVIDERS=false` in production so missing provider keys fail loudly.

## API Key Usage

Create an API key from the Usage page, then call generation endpoints:

```bash
curl -X POST <BACKEND_URL>/api/generate/text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ai_your_key" \
  -d '{"provider":"openai","prompt":"Write a concise API launch announcement"}'
```

## Stripe

Set these in `backend/.env`:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `FRONTEND_URL`
- `BACKEND_URL`
- `ALLOW_MOCK_SUBSCRIPTIONS=false` in production

Local webhook testing example:

```bash
stripe listen --forward-to <BACKEND_URL>/api/billing/webhook
```
