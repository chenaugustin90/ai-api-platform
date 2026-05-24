from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_api_key_user, get_current_user
from app.db.session import get_db
from app.models import Generation, User
from app.providers.image import generate_image
from app.providers.text import generate_text
from app.providers.utils import provider_execution_mode
from app.providers.video import generate_video
from app.schemas.generation import (
    GenerationResponse,
    ImageGenerationRequest,
    MediaGenerationResponse,
    TextGenerationRequest,
    TextGenerationResponse,
    VideoGenerationRequest,
)
from app.services.credits import image_credit_cost, text_credit_cost, video_credit_cost
from app.services.usage import estimate_text_tokens, record_usage

router = APIRouter(prefix="/generate", tags=["generation"])
logger = logging.getLogger("app.providers")


@router.post("/text", response_model=TextGenerationResponse)
async def text(payload: TextGenerationRequest, auth=Depends(get_api_key_user), db: Session = Depends(get_db)):
    user, api_key = auth
    estimated_cost = text_credit_cost(_estimated_text_model(payload.provider, payload.model))
    _ensure_credits(user, estimated_cost)
    logger.info(
        "Generation request modality=text provider=%s execution_mode=%s auth=%s",
        payload.provider,
        provider_execution_mode(payload.provider),
        "api_key" if api_key else "jwt",
    )
    result = await generate_text(payload.provider, payload.prompt, payload.model, payload.max_tokens)
    credit_cost = text_credit_cost(result.model)
    _ensure_credits(user, credit_cost)
    usage = result.usage or {}
    prompt_tokens = usage.get("prompt_tokens")
    completion_tokens = usage.get("completion_tokens")
    if prompt_tokens is None or completion_tokens is None:
        prompt_tokens, completion_tokens = estimate_text_tokens(payload.prompt, result.text or "")
    generation = Generation(
        user_id=user.id,
        modality="text",
        provider=result.provider,
        model=result.model,
        prompt=payload.prompt,
        output_url=None,
        status=result.status,
    )
    db.add(generation)
    record_usage(db, user, api_key, "text", result.provider, result.model, prompt_tokens, completion_tokens, credit_cost)
    return TextGenerationResponse(provider=result.provider, model=result.model, text=result.text or "", usage=usage, credits_used=credit_cost)


@router.post("/image", response_model=MediaGenerationResponse)
async def image(payload: ImageGenerationRequest, auth=Depends(get_api_key_user), db: Session = Depends(get_db)):
    user, api_key = auth
    estimated_cost = image_credit_cost(_estimated_image_model(payload.provider, payload.model), payload.count, payload.quality)
    _ensure_credits(user, estimated_cost)
    result = await generate_image(payload.provider, payload.prompt, payload.model, payload.size, payload.quality, payload.count)
    image_urls = result.output_urls or ([result.output_url] if result.output_url else [])
    credit_cost = image_credit_cost(result.model, len(image_urls) or payload.count, payload.quality)
    _ensure_credits(user, credit_cost)
    generations = []
    for output_url in image_urls or [None]:
        generation = Generation(
            user_id=user.id,
            modality="image",
            provider=result.provider,
            model=result.model,
            prompt=payload.prompt,
            output_url=output_url,
            status=result.status,
        )
        db.add(generation)
        generations.append(generation)
    db.commit()
    generation = generations[0]
    db.refresh(generation)
    record_usage(db, user, api_key, "image", result.provider, result.model, credits_used=credit_cost)
    return MediaGenerationResponse(
        id=generation.id,
        provider=result.provider,
        model=result.model,
        status=result.status,
        output_url=result.output_url,
        image_urls=image_urls,
        credits_used=credit_cost,
    )


@router.post("/video", response_model=MediaGenerationResponse)
async def video(payload: VideoGenerationRequest, auth=Depends(get_api_key_user), db: Session = Depends(get_db)):
    user, api_key = auth
    estimated_cost = video_credit_cost(_estimated_video_model(payload.provider, payload.model), payload.duration_seconds)
    _ensure_credits(user, estimated_cost)
    result = await generate_video(payload.provider, payload.prompt, payload.model, payload.duration_seconds)
    credit_cost = video_credit_cost(result.model, payload.duration_seconds)
    _ensure_credits(user, credit_cost)
    generation = Generation(
        user_id=user.id,
        modality="video",
        provider=result.provider,
        model=result.model,
        prompt=payload.prompt,
        output_url=result.output_url,
        status=result.status,
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)
    record_usage(db, user, api_key, "video", result.provider, result.model, credits_used=credit_cost)
    return MediaGenerationResponse(
        id=generation.id,
        provider=result.provider,
        model=result.model,
        status=result.status,
        output_url=result.output_url,
        credits_used=credit_cost,
    )


@router.get("/history", response_model=list[GenerationResponse])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Generation).filter(Generation.user_id == user.id).order_by(Generation.created_at.desc()).limit(100).all()


def _ensure_credits(user: User, credits: int) -> None:
    if user.credits_remaining < credits:
        raise HTTPException(status_code=402, detail="Insufficient credits")


def _estimated_text_model(provider: str, model: str | None) -> str | None:
    if model:
        return model
    return {
        "openai": "gpt-4o-mini",
        "deepseek": "deepseek-v4-pro",
        "claude": "claude-3-5-haiku-20241022",
        "qwen": "qwen-plus",
    }.get(provider)


def _estimated_video_model(provider: str, model: str | None) -> str | None:
    if model:
        return model
    return {
        "runway": "gen-3-alpha",
        "kling": "kling-v1",
        "veo": "veo-placeholder",
    }.get(provider)


def _estimated_image_model(provider: str, model: str | None) -> str | None:
    if model:
        return model
    return {
        "openai": "gpt-image-2",
        "flux": "flux-2-pro-preview",
    }.get(provider)
