from __future__ import annotations

from urllib.parse import urlparse

from app.core.config import Settings
from app.providers.utils import provider_diagnostics

REQUIRED_PAYMENT_CONFIG = (
    "FRONTEND_URL",
    "BACKEND_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO",
)


def production_diagnostics(settings: Settings) -> dict:
    frontend_url = _clean_url(str(settings.frontend_url or ""))
    backend_url = _clean_url(str(settings.backend_url or ""))
    allowed_origins = _allowed_origins(settings, frontend_url)
    providers = provider_diagnostics()
    database = _database_status(settings.database_url, settings.app_env)
    urls = _url_status(settings.app_env, frontend_url, backend_url, allowed_origins)
    payments = _payment_status(settings, frontend_url, backend_url)

    runtime = _runtime_status(settings)

    checks = [
        {
            "id": "runtime",
            "label": "Runtime mode",
            "status": "ready" if runtime["ready"] else "needs_setup",
            "message": runtime["message"],
            "missing": runtime["missing"],
            "action": "Set APP_ENV=production and disable mock fallbacks for the Render production service.",
        },
        {
            "id": "urls",
            "label": "Production URLs and CORS",
            "status": "ready" if urls["ready"] else "needs_setup",
            "message": urls["message"],
            "missing": urls["missing"],
            "action": "Set FRONTEND_URL, BACKEND_URL, and CORS_ORIGINS to the final production domains.",
        },
        {
            "id": "database",
            "label": "Database persistence",
            "status": database["status"],
            "message": database["message"],
            "missing": database["missing"],
            "action": database["action"],
        },
        {
            "id": "payments",
            "label": "Stripe payments",
            "status": "ready" if payments["configured"] else "needs_setup",
            "message": payments["message"],
            "missing": payments["missing"],
            "action": "Add Stripe production keys, webhook secret, and price IDs before accepting payments.",
        },
        {
            "id": "providers",
            "label": "AI providers",
            "status": "ready" if all(provider["will_use_real_provider"] for provider in providers) else "needs_setup",
            "message": _provider_message(providers),
            "missing": [provider["env_var"] for provider in providers if not provider["configured"]],
            "action": "Add missing provider keys in Render, then redeploy and run provider connection tests.",
        },
    ]

    return {
        "app_env": settings.app_env,
        "ready": all(check["status"] == "ready" for check in checks),
        "checks": checks,
        "runtime": runtime,
        "urls": urls,
        "database": database,
        "payments": payments,
        "providers": providers,
    }


def _runtime_status(settings: Settings) -> dict:
    missing = []
    if settings.app_env.lower() != "production":
        missing.append("APP_ENV")
    if settings.allow_mock_providers:
        missing.append("ALLOW_MOCK_PROVIDERS")
    if settings.allow_mock_subscriptions:
        missing.append("ALLOW_MOCK_SUBSCRIPTIONS")

    return {
        "ready": not missing,
        "app_env": settings.app_env,
        "allow_mock_providers": settings.allow_mock_providers,
        "allow_mock_subscriptions": settings.allow_mock_subscriptions,
        "missing": missing,
        "message": "Runtime is locked for production." if not missing else "Runtime is still using development or mock-safe settings.",
    }


def _clean_url(value: str) -> str:
    return value.strip().rstrip("/")


def _allowed_origins(settings: Settings, frontend_url: str) -> list[str]:
    origins = set()
    if frontend_url:
        origins.add(frontend_url)
    for origin in str(settings.cors_origins or "").split(","):
        cleaned = _clean_url(origin)
        if cleaned:
            origins.add(cleaned)
    return sorted(origins)


def _url_status(app_env: str, frontend_url: str, backend_url: str, allowed_origins: list[str]) -> dict:
    missing = []
    if not frontend_url or _is_bad_production_url(frontend_url, app_env):
        missing.append("FRONTEND_URL")
    if not backend_url or _is_bad_production_url(backend_url, app_env):
        missing.append("BACKEND_URL")
    if frontend_url and frontend_url not in allowed_origins:
        missing.append("CORS_ORIGINS")

    if missing:
        message = "Production links are not fully configured."
    else:
        message = "Frontend, backend, and CORS origins are aligned."

    return {
        "ready": not missing,
        "frontend_url": frontend_url,
        "backend_url": backend_url,
        "allowed_origins": allowed_origins,
        "missing": missing,
        "message": message,
    }


def _database_status(database_url: str, app_env: str) -> dict:
    value = database_url or ""
    parsed = urlparse(value)
    scheme = parsed.scheme

    if scheme.startswith("postgres"):
        return {
            "status": "ready",
            "engine": "postgres",
            "persistent": True,
            "missing": [],
            "message": "PostgreSQL is configured for persistent production data.",
            "action": "No database action needed.",
        }

    if scheme.startswith("sqlite"):
        is_render_disk = value.startswith("sqlite:////var/data/")
        if app_env.lower() == "production" and not is_render_disk:
            return {
                "status": "warning",
                "engine": "sqlite",
                "persistent": False,
                "missing": ["DATABASE_URL"],
                "message": "SQLite is running without a Render persistent disk. User, credit, history, and billing data can reset after deploys.",
                "action": "Use Render PostgreSQL, or attach a persistent disk and set DATABASE_URL=sqlite:////var/data/ai_platform.db.",
            }
        return {
            "status": "ready" if is_render_disk else "warning",
            "engine": "sqlite",
            "persistent": is_render_disk,
            "missing": [] if is_render_disk else ["DATABASE_URL"],
            "message": "SQLite is configured on the Render persistent disk." if is_render_disk else "SQLite is fine for local development, but production should use durable storage.",
            "action": "No database action needed." if is_render_disk else "Use PostgreSQL or Render persistent disk before serious production usage.",
        }

    return {
        "status": "warning",
        "engine": scheme or "unknown",
        "persistent": False,
        "missing": ["DATABASE_URL"],
        "message": "Database configuration could not be classified.",
        "action": "Set DATABASE_URL to PostgreSQL or a known persistent SQLite path.",
    }


def _payment_status(settings: Settings, frontend_url: str, backend_url: str) -> dict:
    missing = []
    if not settings.stripe_secret_key:
        missing.append("STRIPE_SECRET_KEY")
    if not settings.stripe_webhook_secret:
        missing.append("STRIPE_WEBHOOK_SECRET")
    if not settings.stripe_price_pro:
        missing.append("STRIPE_PRICE_PRO")
    if not frontend_url:
        missing.append("FRONTEND_URL")
    if not backend_url:
        missing.append("BACKEND_URL")

    return {
        "configured": not missing,
        "missing": missing,
        "required": list(REQUIRED_PAYMENT_CONFIG),
        "message": "Stripe Checkout and webhooks are ready." if not missing else "Payments are paused until required Stripe production variables are configured.",
    }


def _provider_message(providers: list[dict]) -> str:
    connected = sum(1 for provider in providers if provider["will_use_real_provider"])
    total = len(providers)
    if connected == total:
        return "All configured providers will use real upstream execution."
    if connected:
        return f"{connected}/{total} providers are ready; missing providers will show setup guidance."
    return "No real providers are configured yet."


def _is_bad_production_url(url: str, app_env: str) -> bool:
    if app_env.lower() != "production":
        return False
    host = urlparse(url).hostname or ""
    return host in {"localhost", "127.0.0.1", "0.0.0.0"} or host.endswith(".local")
