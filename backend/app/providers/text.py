from __future__ import annotations

import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.providers.base import ProviderResult

settings = get_settings()

TEXT_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "deepseek": "deepseek-v4-pro",
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
        return _mock_text("openai", model, prompt)
    return await _openai_compatible(
        "openai",
        f"{settings.openai_base_url.rstrip('/')}/chat/completions",
        settings.openai_api_key,
        prompt,
        model,
        max_tokens,
    )


async def _openai_compatible(
    provider: str,
    url: str,
    api_key: str | None,
    prompt: str,
    model: str,
    max_tokens: int,
) -> ProviderResult:
    if not api_key:
        if not settings.allow_mock_providers:
            raise HTTPException(status_code=500, detail=f"{provider.upper()} API key is not configured")
        return _mock_text(provider, model, prompt)
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail={"provider": provider, "error": response.text})
    data = response.json()
    return ProviderResult(
        provider=provider,
        model=model,
        text=data["choices"][0]["message"]["content"],
        usage=data.get("usage", {}),
    )


def _mock_text(provider: str, model: str, prompt: str) -> ProviderResult:
    return ProviderResult(
        provider=provider,
        model=model,
        text=f"[Mock {provider}] Configure the provider API key in backend/.env to answer: {prompt[:160]}",
        usage={"prompt_tokens": max(1, len(prompt) // 4), "completion_tokens": 20, "total_tokens": 20 + max(1, len(prompt) // 4)},
    )
