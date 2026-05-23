from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models import User
from app.providers.text import generate_text
from app.providers.utils import provider_diagnostics, provider_key_status
from app.schemas.providers import ProviderStatusResponse, ProviderTestRequest, ProviderTestResponse

router = APIRouter(prefix="/providers", tags=["providers"])
settings = get_settings()

PROVIDER_DETAILS = {
    "openai": {
        "name": "OpenAI",
        "env_var": "OPENAI_API_KEY",
        "models": ["gpt-4o-mini", "gpt-4.1-mini", "gpt-image-2"],
        "test_model": "gpt-4o-mini",
        "docs_url": "https://platform.openai.com/docs",
        "setup_steps": [
            "Create an OpenAI platform API key.",
            "Add OPENAI_API_KEY to Render environment variables.",
            "Set OPENAI_IMAGE_MODEL to gpt-image-2 or your enabled image model.",
            "Redeploy the Render service.",
        ],
    },
    "deepseek": {
        "name": "DeepSeek",
        "env_var": "DEEPSEEK_API_KEY",
        "models": ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-pro"],
        "test_model": "deepseek-chat",
        "docs_url": "https://api-docs.deepseek.com/",
        "setup_steps": [
            "Create a DeepSeek API key.",
            "Add DEEPSEEK_API_KEY to Render environment variables.",
            "Confirm DEEPSEEK_BASE_URL is https://api.deepseek.com.",
            "Redeploy the Render service.",
        ],
    },
    "claude": {
        "name": "Claude",
        "env_var": "ANTHROPIC_API_KEY",
        "models": ["claude-sonnet-4-20250514", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
        "test_model": "claude-3-5-haiku-latest",
        "docs_url": "https://docs.anthropic.com/",
        "setup_steps": [
            "Create an Anthropic API key.",
            "Add ANTHROPIC_API_KEY to Render environment variables.",
            "Confirm ANTHROPIC_BASE_URL is https://api.anthropic.com/v1.",
            "Redeploy the Render service.",
        ],
    },
}


@router.get("/status", response_model=ProviderStatusResponse)
def status(_: User = Depends(get_current_user)):
    diagnostics = {provider["id"]: provider for provider in provider_diagnostics()}
    providers = []
    for provider_id, details in PROVIDER_DETAILS.items():
        diagnostic = diagnostics[provider_id]
        configured = diagnostic["configured"]
        providers.append(
            {
                "id": provider_id,
                "name": details["name"],
                "configured": configured,
                "status": diagnostic["status"],
                "env_var": details["env_var"],
                "capabilities": diagnostic["capabilities"],
                "message": diagnostic["message"],
                "models": details["models"],
                "docs_url": details["docs_url"],
                "setup_steps": details["setup_steps"],
            }
        )
    return {
        "allow_mock_providers": settings.allow_mock_providers,
        "openai_image_model": settings.openai_image_model,
        "providers": providers,
    }


@router.post("/test", response_model=ProviderTestResponse)
async def test_provider(payload: ProviderTestRequest, _: User = Depends(get_current_user)):
    details = PROVIDER_DETAILS.get(payload.provider)
    if not details:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    if not provider_key_status().get(payload.provider, False):
        return ProviderTestResponse(
            provider=payload.provider,
            success=False,
            latency=0,
            message=f"{details['name']} is not configured. Add {details['env_var']} in Render, then redeploy.",
        )

    started = time.perf_counter()
    try:
        result = await generate_text(payload.provider, "Reply with OK only.", details["test_model"], 8)
    except HTTPException as exc:
        return ProviderTestResponse(
            provider=payload.provider,
            success=False,
            latency=_elapsed_ms(started),
            message=str(exc.detail),
        )
    except Exception:
        return ProviderTestResponse(
            provider=payload.provider,
            success=False,
            latency=_elapsed_ms(started),
            message=f"{details['name']} test failed. Check key validity, quota, and model access.",
        )

    return ProviderTestResponse(
        provider=payload.provider,
        success=bool(result.text),
        latency=_elapsed_ms(started),
        message=f"{details['name']} responded successfully.",
    )


def _elapsed_ms(started: float) -> int:
    return max(1, round((time.perf_counter() - started) * 1000))
