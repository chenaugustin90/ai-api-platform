from __future__ import annotations

import os
from functools import lru_cache

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


def is_hosted_runtime() -> bool:
    return any(os.getenv(name) for name in ("RENDER", "RENDER_SERVICE_ID", "VERCEL"))


def has_real_provider_env() -> bool:
    return any(os.getenv(name) for name in ("OPENAI_API_KEY", "DEEPSEEK_API_KEY", "ANTHROPIC_API_KEY"))


def default_app_env() -> str:
    if os.getenv("APP_ENV"):
        return str(os.getenv("APP_ENV"))
    return "production" if is_hosted_runtime() else "development"


def default_allow_mock_providers() -> bool:
    if os.getenv("ALLOW_MOCK_PROVIDERS") is not None:
        return str(os.getenv("ALLOW_MOCK_PROVIDERS")).lower() in {"1", "true", "yes", "on"}
    return not (is_hosted_runtime() or has_real_provider_env())


class Settings(BaseSettings):
    app_name: str = "AI API Platform"
    app_env: str = default_app_env()
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./ai_platform.db"
    frontend_url: AnyHttpUrl | str = ""
    backend_url: AnyHttpUrl | str = ""
    cors_origins: str = ""

    openai_api_key: str | None = None
    deepseek_api_key: str | None = None
    anthropic_api_key: str | None = None
    qwen_api_key: str | None = None
    flux_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    deepseek_base_url: str = "https://api.deepseek.com"
    anthropic_base_url: str = "https://api.anthropic.com/v1"
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    flux_base_url: str = "https://api.bfl.ai/v1"
    openai_image_model: str = "gpt-image-2"
    allow_mock_providers: bool = default_allow_mock_providers()
    stability_api_key: str | None = None
    kling_api_key: str | None = None
    runway_api_key: str | None = None
    veo_api_key: str | None = None

    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_starter: str | None = None
    stripe_price_pro: str | None = None
    stripe_price_enterprise: str | None = None
    allow_mock_subscriptions: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
