from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TextProvider = Literal["openai", "deepseek", "claude", "qwen"]
ImageProvider = Literal["openai", "flux"]
VideoProvider = Literal["kling", "runway", "veo"]


class TextGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1)
    provider: TextProvider = "openai"
    model: str | None = None
    max_tokens: int = 512


class TextGenerationResponse(BaseModel):
    provider: str
    model: str
    text: str
    usage: dict


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1)
    provider: ImageProvider = "openai"
    model: str | None = None
    size: str = "1024x1024"


class VideoGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1)
    provider: VideoProvider = "runway"
    model: str | None = None
    duration_seconds: int = 5


class MediaGenerationResponse(BaseModel):
    id: int
    provider: str
    model: str
    status: str
    output_url: str | None


class GenerationResponse(BaseModel):
    id: int
    modality: str
    provider: str
    model: str
    prompt: str
    output_url: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
