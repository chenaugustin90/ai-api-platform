from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

ProviderId = Literal["openai", "deepseek", "claude"]


class ProviderStatus(BaseModel):
    id: ProviderId
    name: str
    configured: bool
    status: str
    env_var: str
    models: list[str]
    docs_url: str
    setup_steps: list[str]


class ProviderStatusResponse(BaseModel):
    allow_mock_providers: bool
    openai_image_model: str
    providers: list[ProviderStatus]


class ProviderTestRequest(BaseModel):
    provider: ProviderId


class ProviderTestResponse(BaseModel):
    provider: ProviderId
    success: bool
    latency: int
    message: str
