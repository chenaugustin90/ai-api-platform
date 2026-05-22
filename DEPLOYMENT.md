# Deployment

This project deploys as two services:

- Frontend: Vercel, project root `frontend`
- Backend: Render Web Service, project root `backend`

Do not commit real provider keys, Stripe secrets, JWT secrets, or production database credentials. The example files use placeholders only.

## Frontend: Vercel

Use these Vercel settings when the project root is the repository root:

```bash
Root directory: .
Install command: npm install
Build command: npm run build
Output directory: frontend/dist
```

The root `vercel.json` is configured for Vite SPA routing and builds the app in `frontend`:

```json
{
  "framework": "vite",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The repository also includes `vite.config.js` at the root, so a Vercel project that is still configured with `vite build` will build the `frontend` app instead of failing at the repository root.

Alternative Vercel setup: set the project root directory to `frontend`, install with `npm install`, build with `npm run build`, and use output directory `dist`.

Set these Vercel environment variables for Production:

```bash
VITE_API_URL=https://ai-api-platform-pnut.onrender.com
VITE_ALLOW_MOCK_PROVIDERS=false
```

`VITE_API_URL` must be the public Render backend URL, without a trailing slash. A template is available at `frontend/.env.production.example`.

## Backend: Render

Preferred setup: create the Render service from `render.yaml`.

Manual Render settings:

```bash
Root directory: backend
Runtime: Python
Python version: 3.11.9
Build command: python -m pip install -r requirements.txt
Start command: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The same start command is also available in `backend/Procfile`:

```bash
web: python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Python is pinned to `3.11.9` in three places so Render does not fall back to its latest default runtime:

- `PYTHON_VERSION=3.11.9` in `render.yaml`
- `.python-version` at the repository root
- `backend/.python-version` for services whose Render root directory is `backend`

## Backend Environment

Set these Render environment variables. Use Render secret env vars for any value marked as a secret.

```bash
APP_NAME="AI API Platform"
APP_ENV=production
PYTHON_VERSION=3.11.9
SECRET_KEY=<secret: generate a long random value>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./ai_platform.db
FRONTEND_URL=https://ai-api-platform.vercel.app
CORS_ORIGINS=https://ai-api-platform.vercel.app
ALLOW_MOCK_PROVIDERS=false

OPENAI_API_KEY=<secret>
DEEPSEEK_API_KEY=<secret>
ANTHROPIC_API_KEY=<secret>
QWEN_API_KEY=<secret>
FLUX_API_KEY=<secret>
KLING_API_KEY=<secret>
RUNWAY_API_KEY=<secret>
VEO_API_KEY=<secret>

OPENAI_BASE_URL=https://api.openai.com/v1
DEEPSEEK_BASE_URL=https://api.deepseek.com
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
FLUX_BASE_URL=https://api.bfl.ai/v1
OPENAI_IMAGE_MODEL=gpt-image-1.5

STRIPE_SECRET_KEY=<secret>
STRIPE_WEBHOOK_SECRET=<secret>
STRIPE_PRICE_STARTER=<price id>
STRIPE_PRICE_PRO=<price id>
```

`FRONTEND_URL` and `CORS_ORIGINS` must include the final Vercel production domain. The backend also allows `https://*.vercel.app` preview deployments by regex. For custom domains, set `CORS_ORIGINS` to a comma-separated list:

```bash
CORS_ORIGINS=https://ai-api-platform.vercel.app,https://www.yourdomain.com
```

A template is available at `backend/.env.production.example`.

## Stripe Webhook

After the backend deploys, configure Stripe to send webhooks to:

```bash
https://YOUR_RENDER_SERVICE.onrender.com/api/billing/webhook
```

Then copy the Stripe webhook signing secret into `STRIPE_WEBHOOK_SECRET` on Render.

## Production Checklist

- Confirm no real secrets are committed to the repository.
- Set Vercel `VITE_API_URL` to `https://ai-api-platform-pnut.onrender.com`.
- Set Vercel `VITE_ALLOW_MOCK_PROVIDERS=false`.
- Set Render `FRONTEND_URL` to the Vercel frontend URL.
- Set Render `CORS_ORIGINS` to every allowed frontend origin.
- Set Render `SECRET_KEY` to a long random secret.
- Set provider API keys, including `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, and `ANTHROPIC_API_KEY`, plus Stripe variables in Render.
- Keep `ALLOW_MOCK_PROVIDERS=false` for production provider calls.
- Run `npm run build` in `frontend`.
- Run `python3 -m compileall app` in `backend`.
- Verify Render starts with `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Verify `GET /health` returns `{ "ok": true }`.
- Register, log in, create an API key, and run one text generation request.
- Confirm browser requests from the Vercel production and preview domains are accepted by CORS.

## Notes

SQLite is fine for the current scaffold and demos. For high-traffic production, move `DATABASE_URL` to a managed persistent database and attach persistent storage or migrations before launch.
