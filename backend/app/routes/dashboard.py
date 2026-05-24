from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Generation, User
from app.providers.utils import provider_key_status
from app.routes.billing import _missing_stripe_config
from app.services.usage import usage_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    missing_payment_config = _missing_stripe_config()
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
    text_generations = (
        db.query(Generation)
        .filter(Generation.user_id == user.id, Generation.modality == "text")
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
        "next_billing_date": user.subscription_current_period_end,
        "customer_portal_available": bool(not missing_payment_config and user.stripe_customer_id),
        "payment_configured": not missing_payment_config,
        "missing_payment_config": missing_payment_config,
    }
    return {
        "usage": usage_summary(db, user),
        "billing": billing,
        "provider_status": provider_key_status(),
        "generated_text": text_generations,
        "generated_images": images,
        "generated_videos": videos,
    }
