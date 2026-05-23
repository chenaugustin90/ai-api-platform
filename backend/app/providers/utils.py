from __future__ import annotations

import logging

import httpx
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

PRODUCTION_PROVIDER_IDS = {"openai", "deepseek", "claude"}


def provider_key_status() -> dict[str, bool]:
    return {
        "openai": bool(settings.openai_api_key),
        "deepseek": bool(settings.deepseek_api_key),
        "claude": bool(settings.anthropic_api_key),
        "qwen": bool(settings.qwen_api_key),
        "flux": bool(settings.flux_api_key),
    }


def has_configured_production_provider() -> bool:
    key_status = provider_key_status()
    return any(key_status[provider] for provider in PRODUCTION_PROVIDER_IDS)


def effective_allow_mock_providers() -> bool:
    return bool(settings.allow_mock_providers and not has_configured_production_provider())


def provider_execution_mode(provider: str) -> str:
    key_status = provider_key_status()
    if key_status.get(provider, False):
        return "real"
    if effective_allow_mock_providers():
        return "mock"
    return "unavailable"


def provider_diagnostics() -> list[dict]:
    key_status = provider_key_status()
    return [
        {
            "id": "openai",
            "name": "OpenAI",
            "configured": key_status["openai"],
            "status": "connected" if key_status["openai"] else "disconnected",
            "env_var": "OPENAI_API_KEY",
            "capabilities": ["text", "image"],
            "execution_mode": provider_execution_mode("openai"),
            "will_use_real_provider": provider_execution_mode("openai") == "real",
            "will_use_mock": provider_execution_mode("openai") == "mock",
            "message": _provider_message("openai", key_status["openai"]),
        },
        {
            "id": "deepseek",
            "name": "DeepSeek",
            "configured": key_status["deepseek"],
            "status": "connected" if key_status["deepseek"] else "disconnected",
            "env_var": "DEEPSEEK_API_KEY",
            "capabilities": ["text"],
            "execution_mode": provider_execution_mode("deepseek"),
            "will_use_real_provider": provider_execution_mode("deepseek") == "real",
            "will_use_mock": provider_execution_mode("deepseek") == "mock",
            "message": _provider_message("deepseek", key_status["deepseek"]),
        },
        {
            "id": "claude",
            "name": "Claude",
            "configured": key_status["claude"],
            "status": "connected" if key_status["claude"] else "disconnected",
            "env_var": "ANTHROPIC_API_KEY",
            "capabilities": ["text"],
            "execution_mode": provider_execution_mode("claude"),
            "will_use_real_provider": provider_execution_mode("claude") == "real",
            "will_use_mock": provider_execution_mode("claude") == "mock",
            "message": _provider_message("claude", key_status["claude"]),
        },
    ]


def log_provider_configuration() -> None:
    if has_configured_production_provider() and settings.allow_mock_providers:
        logger.warning("Provider keys are configured; mock fallback is disabled for production providers.")
    for provider, configured in provider_key_status().items():
        if configured:
            continue
        env_var = PROVIDER_ENV_VARS[provider]
        logger.warning("%s is not configured; %s requests will use fallback behavior.", env_var, provider)


def provider_not_configured(provider: str, model: str, prompt: str, mock_factory) -> ProviderResult:
    env_var = PROVIDER_ENV_VARS.get(provider, f"{provider.upper()}_API_KEY")
    logger.warning("%s is missing; %s provider request cannot use the real upstream API.", env_var, provider)
    if effective_allow_mock_providers():
        return mock_factory(provider, model, prompt)
    label = PROVIDER_LABELS.get(provider, provider.title())
    raise HTTPException(
        status_code=503,
        detail=f"{label} is not configured yet. Add {env_var} in Render environment variables, then redeploy.",
    )


def provider_request_failed(provider: str, error_text: str, upstream_status: int | None = None) -> HTTPException:
    label = PROVIDER_LABELS.get(provider, provider.title())
    logger.warning("%s provider request failed: %s", provider, error_text[:800])
    code, status_code, message, retryable = _classify_provider_failure(label, upstream_status)
    return HTTPException(
        status_code=status_code,
        detail={
            "provider": label,
            "code": code,
            "message": message,
            "retryable": retryable,
        },
    )


def provider_timeout(provider: str) -> HTTPException:
    label = PROVIDER_LABELS.get(provider, provider.title())
    logger.warning("%s provider request timed out.", provider)
    return HTTPException(
        status_code=504,
        detail={
            "provider": label,
            "code": "timeout",
            "message": f"{label} timed out. Please retry in a moment or choose another provider.",
            "retryable": True,
        },
    )


def provider_unavailable(provider: str, exc: httpx.RequestError) -> HTTPException:
    label = PROVIDER_LABELS.get(provider, provider.title())
    logger.warning("%s provider is unavailable: %s", provider, str(exc)[:800])
    return HTTPException(
        status_code=503,
        detail={
            "provider": label,
            "code": "unavailable_provider",
            "message": f"{label} is currently unavailable. Check provider status, networking, and base URL settings.",
            "retryable": True,
        },
    )


def _provider_message(provider: str, configured: bool) -> str:
    env_var = PROVIDER_ENV_VARS.get(provider, f"{provider.upper()}_API_KEY")
    label = PROVIDER_LABELS.get(provider, provider.title())
    if configured:
        return f"{label} key is present. Requests will use the real provider."
    if effective_allow_mock_providers():
        return f"{label} is disconnected. Mock fallback is active because no production provider keys are configured."
    return f"{label} is disconnected. Add {env_var} in Render environment variables, then redeploy."


def _classify_provider_failure(label: str, upstream_status: int | None) -> tuple[str, int, str, bool]:
    if upstream_status in {401, 403}:
        return (
            "invalid_key",
            401,
            f"{label} rejected the API key or account permissions. Check the environment variable and provider account access.",
            False,
        )
    if upstream_status == 429:
        return (
            "rate_limit",
            429,
            f"{label} rate limit or quota was reached. Wait briefly, reduce traffic, or update provider billing limits.",
            True,
        )
    if upstream_status in {408, 504}:
        return (
            "timeout",
            504,
            f"{label} timed out. Please retry in a moment or choose another provider.",
            True,
        )
    if upstream_status and upstream_status >= 500:
        return (
            "unavailable_provider",
            503,
            f"{label} is currently unavailable. Retry later or route traffic to another provider.",
            True,
        )
    return (
        "provider_error",
        502,
        f"{label} request failed. Check model access, request settings, provider quota, and account configuration.",
        False,
    )
