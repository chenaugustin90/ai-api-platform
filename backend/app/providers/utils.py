from __future__ import annotations

import logging

from fastapi import HTTPException

from app.core.config import get_settings
from app.providers.base import ProviderResult

settings = get_settings()
logger = logging.getLogger("app.providers")


PROVIDER_ENV_VARS = {
    "openai": "OPENAI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "claude": "ANTHROPIC_API_KEY",
    "qwen": "QWEN_API_KEY",
    "flux": "FLUX_API_KEY",
}

PROVIDER_LABELS = {
    "openai": "OpenAI",
    "deepseek": "DeepSeek",
    "claude": "Claude",
    "qwen": "Qwen",
    "flux": "FLUX",
}


def provider_key_status() -> dict[str, bool]:
    return {
        "openai": bool(settings.openai_api_key),
        "deepseek": bool(settings.deepseek_api_key),
        "claude": bool(settings.anthropic_api_key),
        "qwen": bool(settings.qwen_api_key),
        "flux": bool(settings.flux_api_key),
    }


def log_provider_configuration() -> None:
    for provider, configured in provider_key_status().items():
        if configured:
            continue
        env_var = PROVIDER_ENV_VARS[provider]
        logger.warning("%s is not configured; %s requests will use fallback behavior.", env_var, provider)


def provider_not_configured(provider: str, model: str, prompt: str, mock_factory) -> ProviderResult:
    env_var = PROVIDER_ENV_VARS.get(provider, f"{provider.upper()}_API_KEY")
    logger.warning("%s is missing; %s provider request cannot use the real upstream API.", env_var, provider)
    if settings.allow_mock_providers:
        return mock_factory(provider, model, prompt)
    label = PROVIDER_LABELS.get(provider, provider.title())
    raise HTTPException(
        status_code=503,
        detail=f"{label} is not configured yet. Add {env_var} in Render environment variables, then redeploy.",
    )


def provider_request_failed(provider: str, error_text: str, status_code: int = 502) -> HTTPException:
    label = PROVIDER_LABELS.get(provider, provider.title())
    logger.warning("%s provider request failed: %s", provider, error_text[:800])
    return HTTPException(
        status_code=status_code,
        detail=f"{label} request failed. Check the provider key, model access, quota, and request settings.",
    )
