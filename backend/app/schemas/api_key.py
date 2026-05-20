from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ApiKeyCreate(BaseModel):
    name: str


class ApiKeyCreated(BaseModel):
    id: int
    name: str
    key: str
    key_prefix: str


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}

