from __future__ import annotations

import logging

import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.providers.base import ProviderResult
from app.providers.utils import provider_execution_mode, provider_not_configured, provider_request_failed, provider_timeout, provider_unavailable

settings = get_settings()
logger = logging.getLogger("app.providers")

TEXT_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "deepseek": "deepseek-v4-pro",
    "claude": "claude-haiku-4-5",
    "qwen": "qwen-plus",
}

ANTHROPIC_MODEL_FALLBACK_ORDER = [
    "claude-haiku-4-5",
    "claude-3-5-haiku-latest",
    "claude-3-5-haiku-20241022",
    "claude-sonnet-4-6",
    "claude-sonnet-4-5",
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-haiku-20240307",
]


async def generate_text(provider: str, prompt: str, model: str | None, max_tokens: int) -> ProviderResult:
    if provider not in TEXT_DEFAULT_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported text provider")

    selected_model = model or TEXT_DEFAULT_MODELS[provider]
    execution_mode = provider_execution_mode(provider)
    logger.info(
        "Text generation provider=%s model=%s execution_mode=%s",
        provider,
        selected_model,
        execution_mode,
    )

    if execution_mode == "mock":
        logger.info("Text generation using mock path provider=%s model=%s", provider, selected_model)
        return _mock_text(provider, selected_model, prompt)

    if execution_mode != "real":
        logger.info("Text generation unavailable provider=%s model=%s", provider, selected_model)
        return provider_not_configured(provider, selected_model, prompt, _mock_text)

    logger.info("Text generation using real provider path provider=%s model=%s", provider, selected_model)
    if provider == "openai":
        result = await _openai(prompt, selected_model, max_tokens)
    elif provider == "deepseek":
        result = await _openai_compatible(
            "deepseek",
            f"{settings.deepseek_base_url.rstrip('/')}/chat/completions",
            settings.deepseek_api_key,
            prompt,
            selected_model,
            max_tokens,
        )
    elif provider == "claude":
        result = await _claude(prompt, selected_model, max_tokens)
    elif provider == "qwen":
        result = await _openai_compatible(
            "qwen",
            f"{settings.qwen_base_url.rstrip('/')}/chat/completions",
            settings.qwen_api_key,
            prompt,
            selected_model,
            max_tokens,
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported text provider")

    if (result.text or "").startswith("[Mock "):
        logger.error("Real provider path returned mock text provider=%s model=%s", provider, selected_model)
        raise HTTPException(
            status_code=500,
            detail={
                "provider": provider,
                "code": "mock_response_blocked",
                "message": "Provider is configured for real execution, but a legacy mock response was produced. Check backend deployment and provider routing.",
                "retryable": False,
            },
        )
    logger.info("Text generation completed provider=%s execution_mode=real", provider)
    return result


async def _openai(prompt: str, model: str, max_tokens: int) -> ProviderResult:
    if not settings.openai_api_key:
        return provider_not_configured("openai", model, prompt, _mock_text)
    return await _openai_compatible(
        "openai",
        f"{settings.openai_base_url.rstrip('/')}/chat/completions",
        settings.openai_api_key,
        prompt,
        model,
        max_tokens,
    )


async def _claude(prompt: str, model: str, max_tokens: int) -> ProviderResult:
    if not settings.anthropic_api_key:
        return provider_not_configured("claude", model, prompt, _mock_text)

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await _post_anthropic_message(client, payload)
            if _should_retry_anthropic_model(response):
                fallback_model = await _resolve_anthropic_model(client, model)
                if fallback_model and fallback_model != model:
                    logger.warning(
                        "Claude model %s was rejected; retrying with available model %s.",
                        model,
                        fallback_model,
                    )
                    model = fallback_model
                    payload["model"] = fallback_model
                    response = await _post_anthropic_message(client, payload)
    except httpx.TimeoutException:
        raise provider_timeout("claude")
    except httpx.RequestError as exc:
        raise provider_unavailable("claude", exc)
    if response.status_code >= 400:
        raise provider_request_failed("claude", response.text, response.status_code)

    data = response.json()
    content = data.get("content") or []
    text = "".join(block.get("text", "") for block in content if block.get("type") == "text")
    anthropic_usage = data.get("usage") or {}
    usage = {
        "prompt_tokens": anthropic_usage.get("input_tokens", 0),
        "completion_tokens": anthropic_usage.get("output_tokens", 0),
        "total_tokens": anthropic_usage.get("input_tokens", 0) + anthropic_usage.get("output_tokens", 0),
    }
    return ProviderResult(provider="claude", model=model, text=text, usage=usage)


async def _post_anthropic_message(client: httpx.AsyncClient, payload: dict) -> httpx.Response:
    return await client.post(
        f"{settings.anthropic_base_url.rstrip('/')}/messages",
        headers=_anthropic_headers(),
        json=payload,
    )


async def _resolve_anthropic_model(client: httpx.AsyncClient, rejected_model: str) -> str | None:
    response = await client.get(
        f"{settings.anthropic_base_url.rstrip('/')}/models",
        headers=_anthropic_headers(),
    )
    if response.status_code >= 400:
        logger.warning("Unable to list Claude models after model rejection: %s", response.text[:800])
        return None

    data = response.json()
    available = [item.get("id") for item in data.get("data", []) if item.get("id")]
    if not available:
        logger.warning("Anthropic models list was empty after model rejection.")
        return None
    for candidate in ANTHROPIC_MODEL_FALLBACK_ORDER:
        if candidate in available and candidate != rejected_model:
            return candidate
    for family in ("haiku", "sonnet", "opus"):
        candidate = next((model for model in available if family in model.lower() and model != rejected_model), None)
        if candidate:
            return candidate
    return next((model for model in available if model != rejected_model), None)


def _anthropic_headers() -> dict[str, str]:
    return {
        "x-api-key": settings.anthropic_api_key or "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }


def _should_retry_anthropic_model(response: httpx.Response) -> bool:
    if response.status_code not in {400, 404}:
        return False
    error_text = response.text.lower()
    return "model" in error_text or "not_found_error" in error_text


async def _openai_compatible(
    provider: str,
    url: str,
    api_key: str | None,
    prompt: str,
    model: str,
    max_tokens: int,
) -> ProviderResult:
    if not api_key:
        return provider_not_configured(provider, model, prompt, _mock_text)
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
    }
    if provider == "deepseek" and model.startswith("deepseek-v4-"):
        payload["thinking"] = {"type": "disabled"}
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
    except httpx.TimeoutException:
        raise provider_timeout(provider)
    except httpx.RequestError as exc:
        raise provider_unavailable(provider, exc)
    if response.status_code >= 400:
        raise provider_request_failed(provider, response.text, response.status_code)
    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise provider_request_failed(provider, "Missing choices in provider response")
    message = choices[0].get("message") or {}
    text = message.get("content") or message.get("reasoning_content") or ""
    return ProviderResult(
        provider=provider,
        model=model,
        text=text,
        usage=data.get("usage", {}),
    )


def _mock_text(provider: str, model: str, prompt: str) -> ProviderResult:
    return ProviderResult(
        provider=provider,
        model=model,
        text=f"[Mock {provider}] Configure the provider API key in backend/.env to answer: {prompt[:160]}",
        usage={"prompt_tokens": max(1, len(prompt) // 4), "completion_tokens": 20, "total_tokens": 20 + max(1, len(prompt) // 4)},
    )
