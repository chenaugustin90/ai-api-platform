from __future__ import annotations

from app.core.config import get_settings
from app.providers.base import ProviderResult

settings = get_settings()

VIDEO_DEFAULT_MODELS = {
    "kling": "kling-v1",
    "runway": "gen-3-alpha",
    "veo": "veo-placeholder",
}


async def generate_video(provider: str, prompt: str, model: str | None, duration_seconds: int) -> ProviderResult:
    selected_model = model or VIDEO_DEFAULT_MODELS[provider]
    # These APIs differ by account and version. This endpoint preserves a stable routing
    # contract while provider-specific production adapters can be dropped in here.
    status = "queued" if provider in {"kling", "runway"} else "placeholder"
    return ProviderResult(
        provider=provider,
        model=selected_model,
        output_url=None,
        status=status,
        usage={"duration_seconds": duration_seconds, "prompt": prompt},
    )

