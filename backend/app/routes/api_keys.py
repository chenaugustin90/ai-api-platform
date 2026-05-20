from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_api_key
from app.db.session import get_db
from app.models import ApiKey, User
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyResponse

router = APIRouter(prefix="/api-keys", tags=["api keys"])


@router.get("", response_model=list[ApiKeyResponse])
def list_api_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ApiKey).filter(ApiKey.user_id == user.id).order_by(ApiKey.created_at.desc()).all()


@router.post("", response_model=ApiKeyCreated)
def create_key(payload: ApiKeyCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    raw, prefix, hashed = create_api_key()
    key = ApiKey(user_id=user.id, name=payload.name, key_prefix=prefix, hashed_key=hashed)
    db.add(key)
    db.commit()
    db.refresh(key)
    return ApiKeyCreated(id=key.id, name=key.name, key=raw, key_prefix=key.key_prefix)


@router.delete("/{key_id}")
def revoke_key(key_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.user_id == user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    db.commit()
    return {"ok": True}

