from __future__ import annotations


TEXT_MODEL_COSTS = {
    "gpt-4o-mini": 1,
    "gpt-4.1-mini": 2,
    "deepseek-chat": 1,
    "deepseek-reasoner": 3,
    "deepseek-v4-pro": 4,
    "claude-3-5-haiku-20241022": 2,
    "claude-sonnet-4-20250514": 5,
    "claude-3-7-sonnet-20250219": 5,
    "qwen-plus": 1,
}

IMAGE_MODEL_COSTS = {
    "gpt-image-2": 10,
    "gpt-image-1.5": 8,
    "gpt-image-1": 8,
    "flux-2-pro-preview": 12,
}

IMAGE_QUALITY_MULTIPLIERS = {
    "low": 0.75,
    "medium": 1,
    "auto": 1,
    "high": 2,
}

VIDEO_MODEL_COSTS = {
    "gen-3-alpha": 50,
    "kling-v1": 45,
    "veo-placeholder": 60,
}


def text_credit_cost(model: str | None) -> int:
    model_id = model or ""
    if model_id in TEXT_MODEL_COSTS:
        return TEXT_MODEL_COSTS[model_id]
    if "opus" in model_id:
        return 8
    if "sonnet" in model_id:
        return 5
    if "haiku" in model_id:
        return 2
    if "reasoner" in model_id:
        return 3
    if model_id.startswith("deepseek-v4"):
        return 4
    if model_id.startswith("gpt-4.1"):
        return 2
    return 1


def image_credit_cost(model: str | None, count: int = 1, quality: str = "auto") -> int:
    model_id = model or ""
    base = IMAGE_MODEL_COSTS.get(model_id, 12 if model_id.startswith("flux") else 10)
    multiplier = IMAGE_QUALITY_MULTIPLIERS.get(quality or "auto", 1)
    return max(1, round(base * multiplier) * _clamp_count(count))


def video_credit_cost(model: str | None, duration_seconds: int = 5) -> int:
    model_id = model or ""
    base = VIDEO_MODEL_COSTS.get(model_id, 60 if model_id.startswith("veo") else 50)
    duration_multiplier = max(1, round((duration_seconds or 5) / 5))
    return base * duration_multiplier


def cost_catalog() -> dict:
    return {
        "text": TEXT_MODEL_COSTS,
        "image": {
            "models": IMAGE_MODEL_COSTS,
            "quality_multipliers": IMAGE_QUALITY_MULTIPLIERS,
        },
        "video": VIDEO_MODEL_COSTS,
    }


def _clamp_count(count: int) -> int:
    try:
        value = int(count)
    except (TypeError, ValueError):
        value = 1
    return max(1, min(value, 4))
