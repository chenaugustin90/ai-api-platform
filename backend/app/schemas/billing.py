from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    tier: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    mock: bool = False
    tier: str | None = None


class PortalResponse(BaseModel):
    portal_url: str


class BillingStatus(BaseModel):
    subscription_tier: str
    subscription_status: str
    credits_remaining: int
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    subscription_current_period_end: datetime | None = None
    customer_portal_available: bool = False
