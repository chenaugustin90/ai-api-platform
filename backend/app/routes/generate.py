from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_api_key_user, get_current_user
from app.db.session import get_db
from app.models import Generation, User
from app.providers.image import generate_image
from app.providers.text import generate_text
from app.providers.video import generate_video
from app.schemas.generation import (
    GenerationResponse,
    ImageGenerationRequest,
    MediaGenerationResponse,
    TextGenerationRequest,
    TextGenerationResponse,
    VideoGenerationRequest,
)
from app.services.usage import estimate_text_tokens, record_usage

router = APIRouter(prefix="/generate", tags=["generation"])


@router.post("/text", response_model=TextGenerationResponse)
async def text(payload: TextGenerationRequest, auth=Depends(get_api_key_user), db: Session = Depends(get_db)):
    user, api_key = auth
    _ensure_credits(user, 1)
    result = await generate_text(payload.provider, payload.prompt, payload.model, payload.max_tokens)
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
    record_usage(db, user, api_key, "text", result.provider, result.model, prompt_tokens, completion_tokens, 1)
    return TextGenerationResponse(provider=result.provider, model=result.model, text=result.text or "", usage=usage)


@router.post("/image", response_model=MediaGenerationResponse)
async def image(payload: ImageGenerationRequest, auth=Depends(get_api_key_user), db: Session = Depends(get_db)):
    user, api_key = auth
    _ensure_credits(user, 10)
    result = await generate_image(payload.provider, payload.prompt, payload.model, payload.size)
    generation = Generation(
        user_id=user.id,
        modality="image",
        provider=result.provider,
        model=result.model,
        prompt=payload.prompt,
        output_url=result.output_url,
        status=result.status,
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)
    record_usage(db, user, api_key, "image", result.provider, result.model, credits_used=10)
    return MediaGenerationResponse(
        id=generation.id,
        provider=result.provider,
        model=result.model,
        status=result.status,
        output_url=result.output_url,
    )


@router.post("/video", response_model=MediaGenerationResponse)
async def video(payload: VideoGenerationRequest, auth=Depends(get_api_key_user), db: Session = Depends(get_db)):
    user, api_key = auth
    _ensure_credits(user, 50)
    result = await generate_video(payload.provider, payload.prompt, payload.model, payload.duration_seconds)
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
    record_usage(db, user, api_key, "video", result.provider, result.model, credits_used=50)
    return MediaGenerationResponse(
        id=generation.id,
        provider=result.provider,
        model=result.model,
        status=result.status,
        output_url=result.output_url,
    )


@router.get("/history", response_model=list[GenerationResponse])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Generation).filter(Generation.user_id == user.id).order_by(Generation.created_at.desc()).limit(100).all()


def _ensure_credits(user: User, credits: int) -> None:
    if user.credits_remaining < credits:
        raise HTTPException(status_code=402, detail="Insufficient credits")
