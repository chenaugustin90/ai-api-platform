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
printf 'VITE_API_URL=http://localhost:%s\n' "$BACKEND_PORT" > "$FRONTEND_DIR/.env"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  (cd "$FRONTEND_DIR" && npm install)
fi

BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" python3 "$ROOT_DIR/scripts/start_background.py"
