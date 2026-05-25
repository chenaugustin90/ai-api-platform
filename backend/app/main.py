from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import get_settings
from app.core.production import production_diagnostics
from app.db.init_db import init_db
from app.providers.utils import effective_allow_mock_providers, log_provider_configuration, provider_diagnostics, provider_key_status
from app.routes import api_keys, auth, billing, dashboard, generate, providers, shares, usage

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

allowed_origins = set()
if str(settings.frontend_url).strip():
    allowed_origins.add(str(settings.frontend_url).rstrip("/"))
allowed_origins.update(origin.strip().rstrip("/") for origin in settings.cors_origins.split(",") if origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
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
    providers = provider_diagnostics()
    connected = sum(1 for provider in providers if provider["configured"])
    return {
        "ok": True,
        "allow_mock_providers": settings.allow_mock_providers,
        "fallback_mode": effective_allow_mock_providers(),
        "openai_image_model": settings.openai_image_model,
        "summary": {
            "connected": connected,
            "total": len(providers),
            "fallback_mode": effective_allow_mock_providers(),
        },
        "providers": providers,
        "legacy_status": provider_key_status(),
    }


@app.get("/health/production")
def production_health():
    return production_diagnostics(settings)


@app.get("/.well-known")
def well_known_index():
    return {"apple_pay_domain_association": "/.well-known/apple-developer-merchantid-domain-association"}


@app.get("/.well-known/apple-developer-merchantid-domain-association", include_in_schema=False)
def apple_pay_domain_association():
    path = Path(__file__).resolve().parent / "static" / ".well-known" / "apple-developer-merchantid-domain-association"
    if path.exists():
        return FileResponse(path, media_type="text/plain")
    return JSONResponse(
        status_code=404,
        content={"detail": "Upload Stripe's apple-developer-merchantid-domain-association file here before Apple Pay domain verification."},
    )


app.include_router(auth.router, prefix="/api")
app.include_router(auth.router)
app.include_router(api_keys.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(providers.router, prefix="/api")
app.include_router(shares.api_router, prefix="/api")
app.include_router(shares.public_router)
app.include_router(usage.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
