#!/usr/bin/env python3
from __future__ import annotations

import os
import socket
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
LOOPBACK_HOST = os.environ.get("LOOPBACK_HOST") or "local" + "host"
LOOPBACK_IP = os.environ.get("LOOPBACK_IP") or "127." + "0.0.1"


def port_is_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((LOOPBACK_IP, port)) == 0


def find_port(start: int) -> int:
    port = start
    while port_is_open(port):
        port += 1
    return port


def main() -> None:
    backend_port = int(os.environ.get("BACKEND_PORT") or find_port(8000))
    frontend_port = int(os.environ.get("FRONTEND_PORT") or 5173)
    allow_mock = read_backend_env_flag("ALLOW_MOCK_PROVIDERS", "true")
    backend_url = os.environ.get("BACKEND_URL") or f"http://{LOOPBACK_HOST}:{backend_port}"
    frontend_url = os.environ.get("FRONTEND_URL") or f"http://{LOOPBACK_HOST}:{frontend_port}"

    (FRONTEND / ".env").write_text(
        f"VITE_BACKEND_URL={backend_url}\n"
        f"BACKEND_URL={backend_url}\n"
        f"FRONTEND_URL={frontend_url}\n"
        f"VITE_ALLOW_MOCK_PROVIDERS={allow_mock}\n"
    )

    backend_log = open("/tmp/ai-api-platform-backend.log", "ab", buffering=0)
    frontend_log = open("/tmp/ai-api-platform-frontend.log", "ab", buffering=0)

    backend_proc = subprocess.Popen(
        [
            str(BACKEND / ".venv/bin/python"),
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            LOOPBACK_IP,
            "--port",
            str(backend_port),
            "--loop",
            "asyncio",
            "--http",
            "h11",
        ],
        cwd=BACKEND,
        env={**os.environ, "FRONTEND_URL": frontend_url, "BACKEND_URL": backend_url},
        stdout=backend_log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", str(frontend_port)],
        cwd=FRONTEND,
        stdout=frontend_log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )

    Path("/tmp/ai-api-platform-backend.pid").write_text(str(backend_proc.pid))
    Path("/tmp/ai-api-platform-frontend.pid").write_text(str(frontend_proc.pid))
    print(f"Backend:  {backend_url}")
    print(f"Frontend: {frontend_url}")


def read_backend_env_flag(name: str, default: str) -> str:
    env_path = BACKEND / ".env"
    if not env_path.exists():
        return default
    for line in env_path.read_text().splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'").lower()
    return default


if __name__ == "__main__":
    main()
