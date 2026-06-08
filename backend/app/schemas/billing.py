from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    tier: str | None = None
    purchase_type: Literal["subscription", "credits"] = "subscription"
    pack_id: str | None = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    mock: bool = False
    tier: str | None = None
    purchase_type: str | None = None


class PortalResponse(BaseModel):
    portal_url: str


class BillingStatus(BaseModel):
    subscription_tier: str
    subscription_status: str
    credits_remaining: int
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    subscription_current_period_end: datetime | None = None
    next_billing_date: datetime | None = None
    customer_portal_available: bool = False
    payment_configured: bool = False
    missing_payment_config: list[str] = []


class BillingRecordResponse(BaseModel):
    id: int
    purchase_type: str
    mode: str
    tier: str | None = None
    credits: int
    amount_cents: int
    currency: str
    status: str
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BillingConfigStatus(BaseModel):
    configured: bool
    ready_for_checkout: bool
    missing: list[str]
    required: list[str]
    payment_methods: list[str]
    plans: dict
    credit_packs: dict


class ManualPaymentCreate(BaseModel):
    payment_method: Literal["zelle", "wechat"]
    proof_reference: str
    tier: Literal["pro"] = "pro"


class ManualPaymentReview(BaseModel):
    action: Literal["approve", "reject"]
    note: str | None = None


class ManualPaymentOrderResponse(BaseModel):
    id: int
    user_id: int
    user_email: str | None = None
    payment_method: str
    tier: str
    amount_cents: int
    currency: str
    credits: int
    proof_reference: str
    status: str
    review_note: str | None = None
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


class ManualPaymentConfig(BaseModel):
    enabled: bool = True
    is_admin: bool = False
    zelle_contact: str | None = None
    wechat_instructions: str | None = None
    plan: dict
