from __future__ import annotations

from functools import lru_cache

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI API Platform"
    app_env: str = "development"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./ai_platform.db"
    frontend_url: AnyHttpUrl | str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://ai-api-platform.vercel.app"

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
    allow_mock_providers: bool = True
    stability_api_key: str | None = None
    kling_api_key: str | None = None
    runway_api_key: str | None = None
    veo_api_key: str | None = None

    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_starter: str | None = None
    stripe_price_pro: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
