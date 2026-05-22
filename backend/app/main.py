from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.init_db import init_db
from app.providers.utils import log_provider_configuration, provider_key_status
from app.routes import api_keys, auth, billing, dashboard, generate, providers, usage

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

allowed_origins = {
    str(settings.frontend_url).rstrip("/"),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}
allowed_origins.update(origin.strip().rstrip("/") for origin in settings.cors_origins.split(",") if origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_origin_regex=r"^(https://[a-zA-Z0-9-]+\.vercel\.app|http://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):5173)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    log_provider_configuration()


@app.get("/health")
def health():
    return {"ok": True, "service": settings.app_name}


@app.get("/health/providers")
def provider_health():
    return {
        "ok": True,
        "allow_mock_providers": settings.allow_mock_providers,
        "openai_image_model": settings.openai_image_model,
        "providers": provider_key_status(),
    }


app.include_router(auth.router, prefix="/api")
app.include_router(auth.router)
app.include_router(api_keys.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(providers.router, prefix="/api")
app.include_router(usage.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
