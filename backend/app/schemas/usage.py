from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class UsageEventResponse(BaseModel):
    id: int
    modality: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    credits_used: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UsageSummary(BaseModel):
    credits_remaining: int
    total_events: int
    total_tokens: int
    total_credits_used: int
    by_modality: dict[str, int]

