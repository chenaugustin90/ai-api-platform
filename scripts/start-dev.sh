#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

find_port() {
  local port="$1"
  while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

BACKEND_PORT="${BACKEND_PORT:-$(find_port 8000)}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if [ ! -d "$BACKEND_DIR/.venv" ]; then
  python3 -m venv "$BACKEND_DIR/.venv"
fi

"$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt" >/tmp/ai-api-platform-pip.log 2>&1
ALLOW_MOCK_PROVIDERS="$(grep '^ALLOW_MOCK_PROVIDERS=' "$BACKEND_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '\"' | tr '[:upper:]' '[:lower:]')"
ALLOW_MOCK_PROVIDERS="${ALLOW_MOCK_PROVIDERS:-true}"
{
  printf 'VITE_API_URL=http://localhost:%s\n' "$BACKEND_PORT"
  printf 'VITE_ALLOW_MOCK_PROVIDERS=%s\n' "$ALLOW_MOCK_PROVIDERS"
} > "$FRONTEND_DIR/.env"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  (cd "$FRONTEND_DIR" && npm install)
fi

echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"

(cd "$BACKEND_DIR" && "$BACKEND_DIR/.venv/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --loop asyncio --http h11) &
BACKEND_PID=$!

(cd "$FRONTEND_DIR" && npm run dev -- --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' INT TERM EXIT
wait
