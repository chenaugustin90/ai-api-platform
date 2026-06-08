from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models import User


def expire_manual_subscription(user: User, db: Session) -> bool:
    if (
        user.subscription_status == "active_manual"
        and user.subscription_current_period_end
        and user.subscription_current_period_end <= datetime.utcnow()
    ):
        user.subscription_tier = "free"
        user.subscription_status = "expired"
        db.commit()
        db.refresh(user)
        return True
    return False
