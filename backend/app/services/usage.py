from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ApiKey, UsageEvent, User


def estimate_text_tokens(prompt: str, completion: str = "") -> tuple[int, int]:
    return max(1, len(prompt) // 4), max(1, len(completion) // 4) if completion else 0


def record_usage(
    db: Session,
    user: User,
    api_key: ApiKey | None,
    modality: str,
    provider: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    credits_used: int = 1,
) -> UsageEvent:
    event = UsageEvent(
        user_id=user.id,
        api_key_id=api_key.id if api_key else None,
        modality=modality,
        provider=provider,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        credits_used=credits_used,
    )
    user.credits_remaining = max(0, user.credits_remaining - credits_used)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def usage_summary(db: Session, user: User) -> dict:
    rows = db.query(UsageEvent).filter(UsageEvent.user_id == user.id).all()
    by_modality: dict[str, int] = {}
    for row in rows:
        by_modality[row.modality] = by_modality.get(row.modality, 0) + row.credits_used
    return {
        "credits_remaining": user.credits_remaining,
        "total_events": len(rows),
        "total_tokens": sum(row.total_tokens for row in rows),
        "total_credits_used": sum(row.credits_used for row in rows),
        "by_modality": by_modality,
    }

