from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProviderResult:
    provider: str
    model: str
    text: str | None = None
    output_url: str | None = None
    output_urls: list[str] | None = None
    usage: dict | None = None
    status: str = "completed"
