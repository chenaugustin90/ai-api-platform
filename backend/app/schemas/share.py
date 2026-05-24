from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ShareCreate(BaseModel):
    modality: Literal["text", "image"]
    prompt: str = Field(min_length=1)
    provider: str | None = None
    model: str | None = None
    text: str | None = None
    output_url: str | None = None
    title: str | None = None


class ShareResponse(BaseModel):
    id: str
    url: str
    preview_url: str | None = None
    modality: str
    provider: str | None
    model: str | None
    prompt: str
    text: str | None
    output_url: str | None
    title: str | None
    created_at: datetime
