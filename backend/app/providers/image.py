from __future__ import annotations

import re
import time
import logging

import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.providers.base import ProviderResult
from app.providers.utils import provider_not_configured, provider_request_failed, provider_timeout, provider_unavailable

settings = get_settings()
logger = logging.getLogger("app.providers")
OPENAI_IMAGE_FALLBACK_MODEL = "gpt-image-1.5"

IMAGE_DEFAULT_MODELS = {
    "openai": settings.openai_image_model,
    "flux": "flux-2-pro-preview",
}


async def generate_image(provider: str, prompt: str, model: str | None, size: str, quality: str = "auto", count: int = 1) -> ProviderResult:
    selected_model = model or IMAGE_DEFAULT_MODELS[provider]
    if provider == "openai":
        return await _openai_image(prompt, selected_model, size, quality, count)
    if provider == "flux":
        return await _flux_image(prompt, selected_model, size)
    raise HTTPException(status_code=400, detail="Unsupported image provider")


async def _openai_image(prompt: str, model: str, size: str, quality: str, count: int) -> ProviderResult:
    if not settings.openai_api_key:
        return provider_not_configured("openai", model, prompt, _mock_image)
    payload = {
        "model": model,
        "prompt": prompt,
        "size": _normalize_openai_image_size(size),
        "quality": _normalize_openai_image_quality(quality),
        "n": _normalize_openai_image_count(count),
    }
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{settings.openai_base_url.rstrip('/')}/images/generations",
                headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            if _should_fallback_openai_image_model(response, model):
                logger.warning(
                    "OpenAI image model %s is unavailable; falling back to %s.",
                    model,
                    OPENAI_IMAGE_FALLBACK_MODEL,
                )
                payload["model"] = OPENAI_IMAGE_FALLBACK_MODEL
                response = await client.post(
                    f"{settings.openai_base_url.rstrip('/')}/images/generations",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
                    json=payload,
                )
                model = OPENAI_IMAGE_FALLBACK_MODEL
    except httpx.TimeoutException:
        raise provider_timeout("openai")
    except httpx.RequestError as exc:
        raise provider_unavailable("openai", exc)
    if response.status_code >= 400:
        raise provider_request_failed("openai", response.text, response.status_code)
    data = response.json()
    images = data.get("data") or []
    if not images:
        raise provider_request_failed("openai", "Missing image data in provider response")
    outputs = [_image_output_url(image) for image in images]
    outputs = [output for output in outputs if output]
    if not outputs:
        raise provider_request_failed("openai", "Missing image URL data in provider response")
    usage = data.get("usage") or {}
    return ProviderResult(provider="openai", model=model, output_url=outputs[0], output_urls=outputs, usage=usage)


async def _flux_image(prompt: str, model: str, size: str) -> ProviderResult:
    if not settings.flux_api_key:
        return provider_not_configured("flux", model, prompt, _mock_image)

    width, height = _parse_size(size)
    endpoint = _flux_endpoint(model)
    payload = {"prompt": prompt, "width": width, "height": height}
    headers = {"accept": "application/json", "x-key": settings.flux_api_key, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            submit = await client.post(endpoint, headers=headers, json=payload)
            if submit.status_code >= 400:
                raise provider_request_failed("flux", submit.text, submit.status_code)
            submitted = submit.json()
            polling_url = submitted.get("polling_url")
            request_id = submitted.get("id")
            if not polling_url:
                raise HTTPException(status_code=502, detail={"provider": "FLUX", "code": "provider_error", "message": "FLUX response did not include a polling URL."})

            deadline = time.monotonic() + 90
            while time.monotonic() < deadline:
                poll = await client.get(polling_url, headers={"accept": "application/json", "x-key": settings.flux_api_key})
                if poll.status_code >= 400:
                    raise provider_request_failed("flux", poll.text, poll.status_code)
                data = poll.json()
                status = data.get("status")
                if status == "Ready":
                    output = (data.get("result") or {}).get("sample")
                    return ProviderResult(provider="flux", model=model, output_url=output, usage={"request_id": request_id}, status="completed")
                if status in {"Error", "Failed"}:
                    raise provider_request_failed("flux", str(data))
                await _sleep(0.75)
    except httpx.TimeoutException:
        raise provider_timeout("flux")
    except httpx.RequestError as exc:
        raise provider_unavailable("flux", exc)

    return ProviderResult(provider="flux", model=model, status="queued", usage={"request_id": request_id}, output_url=None)


def _flux_endpoint(model: str) -> str:
    slug = model.strip().lstrip("/")
    return f"{settings.flux_base_url.rstrip('/')}/{slug}"


def _should_fallback_openai_image_model(response: httpx.Response, model: str) -> bool:
    if response.status_code not in {400, 404}:
        return False
    if model == OPENAI_IMAGE_FALLBACK_MODEL:
        return False
    if not model.startswith("gpt-image-"):
        return False
    error_text = response.text.lower()
    return any(marker in error_text for marker in ("model", "not found", "unsupported", "does not exist", "invalid"))


def _image_output_url(image: dict) -> str | None:
    output = image.get("url")
    if not output and image.get("b64_json"):
        output = f"data:image/png;base64,{image['b64_json']}"
    return output


def _normalize_openai_image_size(size: str) -> str:
    if size in {"1024x1024", "1536x1024", "1024x1536", "auto"}:
        return size
    return "1024x1024"


def _normalize_openai_image_quality(quality: str) -> str:
    if quality in {"auto", "low", "medium", "high"}:
        return quality
    return "auto"


def _normalize_openai_image_count(count: int) -> int:
    try:
        value = int(count)
    except (TypeError, ValueError):
        value = 1
    return max(1, min(value, 4))


def _parse_size(size: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d{3,4})x(\d{3,4})", size.strip())
    if not match:
        return 1024, 1024
    width, height = int(match.group(1)), int(match.group(2))
    return _round_to_multiple(width), _round_to_multiple(height)


def _round_to_multiple(value: int, multiple: int = 32) -> int:
    clamped = min(max(value, 256), 2048)
    return int(round(clamped / multiple) * multiple)


async def _sleep(seconds: float) -> None:
    import asyncio

    await asyncio.sleep(seconds)


def _mock_image(provider: str, model: str, prompt: str) -> ProviderResult:
    encoded = prompt.replace(" ", "+")[:120]
    url = f"https://placehold.co/1024x1024/png?text={provider}:{encoded}"
    return ProviderResult(provider=provider, model=model, output_url=url)
