from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import UsageEvent, User
from app.schemas.usage import UsageEventResponse, UsageSummary
from app.services.usage import usage_summary

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/summary", response_model=UsageSummary)
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return usage_summary(db, user)


@router.get("/events", response_model=list[UsageEventResponse])
def events(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(UsageEvent).filter(UsageEvent.user_id == user.id).order_by(UsageEvent.created_at.desc()).limit(200).all()

