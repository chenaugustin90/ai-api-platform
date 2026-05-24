from __future__ import annotations

from datetime import datetime

from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BillingEvent(Base):
    __tablename__ = "billing_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stripe_event_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BillingRecord(Base):
    __tablename__ = "billing_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    stripe_event_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    stripe_checkout_session_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    stripe_invoice_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    purchase_type: Mapped[str] = mapped_column(String(50), index=True)
    mode: Mapped[str] = mapped_column(String(50), index=True)
    tier: Mapped[Optional[str]] = mapped_column(String(50))
    credits: Mapped[int] = mapped_column(Integer, default=0)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(12), default="usd")
    status: Mapped[str] = mapped_column(String(50), default="succeeded", index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="billing_records")
