from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models import Generation, User
from app.services.usage import usage_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
settings = get_settings()


@router.get("")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    images = (
        db.query(Generation)
        .filter(Generation.user_id == user.id, Generation.modality == "image")
        .order_by(Generation.created_at.desc())
        .limit(12)
        .all()
    )
    videos = (
        db.query(Generation)
        .filter(Generation.user_id == user.id, Generation.modality == "video")
        .order_by(Generation.created_at.desc())
        .limit(12)
        .all()
    )
    billing = {
        "subscription_tier": user.subscription_tier or "free",
        "subscription_status": user.subscription_status or "free",
        "credits_remaining": user.credits_remaining,
        "stripe_customer_id": user.stripe_customer_id,
        "stripe_subscription_id": user.stripe_subscription_id,
        "subscription_current_period_end": user.subscription_current_period_end,
        "customer_portal_available": bool(settings.stripe_secret_key and user.stripe_customer_id),
    }
    return {"usage": usage_summary(db, user), "billing": billing, "generated_images": images, "generated_videos": videos}
