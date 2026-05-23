from __future__ import annotations

import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.providers.base import ProviderResult
from app.providers.utils import provider_not_configured, provider_request_failed, provider_timeout, provider_unavailable

settings = get_settings()

TEXT_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "deepseek": "deepseek-v4-pro",
    "claude": "claude-sonnet-4-20250514",
    "qwen": "qwen-plus",
}


async def generate_text(provider: str, prompt: str, model: str | None, max_tokens: int) -> ProviderResult:
    selected_model = model or TEXT_DEFAULT_MODELS[provider]
    if provider == "openai":
        return await _openai(prompt, selected_model, max_tokens)
    if provider == "deepseek":
        return await _openai_compatible(
            "deepseek",
            f"{settings.deepseek_base_url.rstrip('/')}/chat/completions",
            settings.deepseek_api_key,
            prompt,
            selected_model,
            max_tokens,
        )
    if provider == "claude":
        return await _claude(prompt, selected_model, max_tokens)
    if provider == "qwen":
        return await _openai_compatible(
            "qwen",
            f"{settings.qwen_base_url.rstrip('/')}/chat/completions",
            settings.qwen_api_key,
            prompt,
            selected_model,
            max_tokens,
        )
    raise HTTPException(status_code=400, detail="Unsupported text provider")


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
            response = await client.post(
                f"{settings.anthropic_base_url.rstrip('/')}/messages",
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
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
