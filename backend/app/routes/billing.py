from __future__ import annotations

from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models import BillingEvent, User
from app.schemas.billing import BillingStatus, CheckoutRequest, CheckoutResponse, PortalResponse

router = APIRouter(prefix="/billing", tags=["billing"])
settings = get_settings()

PLAN_CREDITS = {
    "free": 1_000,
    "starter": 10_000,
    "pro": 100_000,
}

PAID_PRICE_IDS = {
    "starter": lambda: settings.stripe_price_starter,
    "pro": lambda: settings.stripe_price_pro,
}


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(payload: CheckoutRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tier = payload.tier.lower()
    price_id = PAID_PRICE_IDS.get(tier, lambda: None)()
    missing = []
    if not settings.stripe_secret_key:
        missing.append("STRIPE_SECRET_KEY")
    if not price_id:
        missing.append(f"STRIPE_PRICE_{tier.upper()}")
    if missing:
        if tier not in {"starter", "pro"}:
            raise HTTPException(status_code=400, detail=f"Stripe is not configured. Missing: {', '.join(missing)}")
        _apply_mock_subscription(user, tier, db)
        return CheckoutResponse(
            checkout_url=f"{settings.frontend_url}/dashboard?checkout=success&mode=mock&tier={tier}",
            mock=True,
            tier=tier,
        )
    stripe.api_key = settings.stripe_secret_key
    session_params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{settings.frontend_url}/dashboard?checkout=success",
        "cancel_url": f"{settings.frontend_url}/pricing?checkout=cancel",
        "client_reference_id": str(user.id),
        "metadata": {"user_id": str(user.id), "tier": tier},
        "subscription_data": {"metadata": {"user_id": str(user.id), "tier": tier}},
    }
    if user.stripe_customer_id:
        session_params["customer"] = user.stripe_customer_id
    else:
        session_params["customer_email"] = user.email
    session = stripe.checkout.Session.create(**session_params)
    return CheckoutResponse(checkout_url=session.url, tier=tier)


@router.post("/portal", response_model=PortalResponse)
def create_customer_portal(user: User = Depends(get_current_user)):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=400, detail="Stripe is not configured")
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer exists for this account")
    stripe.api_key = settings.stripe_secret_key
    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{settings.frontend_url}/dashboard",
    )
    return PortalResponse(portal_url=session.url)


@router.get("/status", response_model=BillingStatus)
def billing_status(user: User = Depends(get_current_user)):
    return _billing_status_for_user(user)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=400, detail="Stripe webhook secret missing")
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if db.query(BillingEvent).filter(BillingEvent.stripe_event_id == event["id"]).first():
        return {"received": True, "duplicate": True}

    event_type = event["type"]
    if event_type == "checkout.session.completed":
        _handle_checkout_completed(event["data"]["object"], db)
    elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
        _handle_subscription_updated(event["data"]["object"], db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(event["data"]["object"], db)
    elif event_type in {"invoice.payment_succeeded", "invoice.paid"}:
        _handle_invoice_paid(event["data"]["object"], db)

    db.add(BillingEvent(stripe_event_id=event["id"], event_type=event_type))
    db.commit()
    return {"received": True}


def _handle_checkout_completed(session, db: Session) -> None:
    user_id = _metadata_int(session, "user_id")
    tier = _metadata_value(session, "tier")
    if not user_id or tier not in PLAN_CREDITS:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    user.subscription_tier = tier
    user.subscription_status = "active"
    user.stripe_customer_id = session.get("customer") or user.stripe_customer_id
    user.stripe_subscription_id = session.get("subscription") or user.stripe_subscription_id

    subscription = _retrieve_subscription(user.stripe_subscription_id)
    if subscription:
        _apply_subscription(user, subscription, tier)

    user.credits_remaining += PLAN_CREDITS[tier]


def _handle_subscription_updated(subscription, db: Session) -> None:
    user = _find_user_for_subscription(subscription, db)
    if not user:
        return
    tier = _metadata_value(subscription, "tier") or user.subscription_tier
    if tier not in PLAN_CREDITS:
        tier = _tier_from_subscription_price(subscription) or user.subscription_tier
    _apply_subscription(user, subscription, tier)


def _handle_subscription_deleted(subscription, db: Session) -> None:
    user = _find_user_for_subscription(subscription, db)
    if not user:
        return
    user.subscription_status = "canceled"
    user.subscription_tier = "free"
    user.stripe_subscription_id = subscription.get("id") or user.stripe_subscription_id
    user.subscription_current_period_end = _timestamp_to_datetime(subscription.get("current_period_end"))


def _handle_invoice_paid(invoice, db: Session) -> None:
    if invoice.get("billing_reason") == "subscription_create":
        return
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    user = db.query(User).filter(User.stripe_subscription_id == subscription_id).first()
    subscription = _retrieve_subscription(subscription_id)
    if not user and subscription:
        user = _find_user_for_subscription(subscription, db)
    if not user:
        return
    tier = (_metadata_value(subscription, "tier") if subscription else None) or user.subscription_tier
    if tier not in PLAN_CREDITS or tier == "free":
        return
    if subscription:
        _apply_subscription(user, subscription, tier)
    user.credits_remaining += PLAN_CREDITS[tier]


def _apply_subscription(user: User, subscription, tier: str) -> None:
    user.subscription_tier = tier
    user.subscription_status = subscription.get("status") or user.subscription_status or "active"
    user.stripe_subscription_id = subscription.get("id") or user.stripe_subscription_id
    user.stripe_customer_id = subscription.get("customer") or user.stripe_customer_id
    user.subscription_current_period_end = _timestamp_to_datetime(subscription.get("current_period_end"))


def _find_user_for_subscription(subscription, db: Session) -> User | None:
    subscription_id = subscription.get("id")
    customer_id = subscription.get("customer")
    user_id = _metadata_int(subscription, "user_id")
    if user_id:
        return db.query(User).filter(User.id == user_id).first()
    if subscription_id:
        user = db.query(User).filter(User.stripe_subscription_id == subscription_id).first()
        if user:
            return user
    if customer_id:
        return db.query(User).filter(User.stripe_customer_id == customer_id).first()
    return None


def _retrieve_subscription(subscription_id: str | None):
    if not subscription_id:
        return None
    try:
        return stripe.Subscription.retrieve(subscription_id)
    except Exception:
        return None


def _metadata_value(obj, key: str) -> str | None:
    metadata = obj.get("metadata") or {}
    value = metadata.get(key)
    return str(value).lower() if value else None


def _metadata_int(obj, key: str) -> int | None:
    value = _metadata_value(obj, key)
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _tier_from_subscription_price(subscription) -> str | None:
    try:
        price_id = subscription["items"]["data"][0]["price"]["id"]
    except (KeyError, IndexError, TypeError):
        return None
    for tier, getter in PAID_PRICE_IDS.items():
        if price_id == getter():
            return tier
    return None


def _timestamp_to_datetime(value) -> datetime | None:
    if not value:
        return None
    return datetime.utcfromtimestamp(int(value))


def _billing_status_for_user(user: User) -> BillingStatus:
    return BillingStatus(
        subscription_tier=user.subscription_tier or "free",
        subscription_status=user.subscription_status or "free",
        credits_remaining=user.credits_remaining,
        stripe_customer_id=user.stripe_customer_id,
        stripe_subscription_id=user.stripe_subscription_id,
        subscription_current_period_end=user.subscription_current_period_end,
        customer_portal_available=bool(settings.stripe_secret_key and user.stripe_customer_id),
    )


def _apply_mock_subscription(user: User, tier: str, db: Session) -> None:
    user.subscription_tier = tier
    user.subscription_status = "active_mock"
    user.credits_remaining += PLAN_CREDITS[tier]
    db.commit()
