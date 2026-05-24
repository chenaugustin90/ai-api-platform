from __future__ import annotations

from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models import BillingEvent, BillingRecord, User
from app.schemas.billing import BillingRecordResponse, BillingStatus, CheckoutRequest, CheckoutResponse, PortalResponse

router = APIRouter(prefix="/billing", tags=["billing"])
settings = get_settings()

PLAN_CREDITS = {
    "free": 1_000,
    "starter": 10_000,
    "pro": 100_000,
    "enterprise": 250_000,
}

CREDIT_PACKS = {
    "boost": {"name": "Credit Boost", "credits": 5_000, "amount_cents": 1900},
    "scale": {"name": "Scale Credits", "credits": 25_000, "amount_cents": 7900},
    "max": {"name": "Max Credits", "credits": 100_000, "amount_cents": 24900},
}

PAID_PRICE_IDS = {
    "starter": lambda: settings.stripe_price_starter,
    "pro": lambda: settings.stripe_price_pro,
    "enterprise": lambda: settings.stripe_price_enterprise,
}

SUBSCRIPTION_PAYMENT_METHOD_TYPES = ["card"]
ONE_TIME_PAYMENT_METHOD_TYPES = ["card", "alipay", "wechat_pay"]


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.purchase_type == "credits":
        return _create_credit_checkout(payload, request, user, db)
    return _create_subscription_checkout(payload, request, user, db)


@router.post("/portal", response_model=PortalResponse)
def create_customer_portal(request: Request, user: User = Depends(get_current_user)):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=400, detail="Stripe is not configured")
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer exists for this account")
    stripe.api_key = settings.stripe_secret_key
    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{_frontend_url(request)}/dashboard",
    )
    return PortalResponse(portal_url=session.url)


@router.get("/status", response_model=BillingStatus)
def billing_status(user: User = Depends(get_current_user)):
    return _billing_status_for_user(user)


@router.get("/history", response_model=list[BillingRecordResponse])
def billing_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(BillingRecord)
        .filter(BillingRecord.user_id == user.id)
        .order_by(BillingRecord.created_at.desc())
        .limit(50)
        .all()
    )


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
    obj = event["data"]["object"]
    if event_type == "checkout.session.completed":
        _handle_checkout_completed(obj, db, event["id"])
    elif event_type == "checkout.session.async_payment_succeeded":
        _handle_checkout_completed(obj, db, event["id"])
    elif event_type == "checkout.session.async_payment_failed":
        _record_failed_checkout(obj, db, event["id"])
    elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
        _handle_subscription_updated(obj, db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(obj, db)
    elif event_type in {"invoice.payment_succeeded", "invoice.paid"}:
        _handle_invoice_paid(obj, db, event["id"])

    db.add(BillingEvent(stripe_event_id=event["id"], event_type=event_type))
    db.commit()
    return {"received": True}


def _create_subscription_checkout(payload: CheckoutRequest, request: Request, user: User, db: Session) -> CheckoutResponse:
    tier = (payload.tier or "pro").lower()
    price_id = PAID_PRICE_IDS.get(tier, lambda: None)()
    if tier not in PAID_PRICE_IDS:
        raise HTTPException(status_code=400, detail="Unsupported subscription plan")

    missing = []
    if not settings.stripe_secret_key:
        missing.append("STRIPE_SECRET_KEY")
    if not price_id:
        missing.append(f"STRIPE_PRICE_{tier.upper()}")
    if missing:
        _apply_mock_purchase(user, db, "subscription", tier, PLAN_CREDITS[tier], 0, "Mock subscription")
        return CheckoutResponse(
            checkout_url=f"{_frontend_url(request)}/billing/success?checkout=success&mode=mock&tier={tier}",
            mock=True,
            tier=tier,
        )

    stripe.api_key = settings.stripe_secret_key
    metadata = {"user_id": str(user.id), "purchase_type": "subscription", "tier": tier, "credits": str(PLAN_CREDITS[tier])}
    session_params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{_frontend_url(request)}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{_frontend_url(request)}/billing/cancel?type=subscription&tier={tier}",
        "client_reference_id": str(user.id),
        "metadata": metadata,
        "subscription_data": {"metadata": metadata},
        "payment_method_types": SUBSCRIPTION_PAYMENT_METHOD_TYPES,
    }
    if user.stripe_customer_id:
        session_params["customer"] = user.stripe_customer_id
    else:
        session_params["customer_email"] = user.email
    session = stripe.checkout.Session.create(**session_params)
    return CheckoutResponse(checkout_url=session.url, tier=tier)


def _create_credit_checkout(payload: CheckoutRequest, request: Request, user: User, db: Session) -> CheckoutResponse:
    pack_id = (payload.pack_id or "boost").lower()
    pack = CREDIT_PACKS.get(pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Unsupported credits pack")

    if not settings.stripe_secret_key:
        _apply_mock_purchase(user, db, "credits", pack_id, pack["credits"], pack["amount_cents"], f"{pack['name']} mock purchase")
        return CheckoutResponse(
            checkout_url=f"{_frontend_url(request)}/billing/success?checkout=success&mode=mock&type=credits&pack={pack_id}",
            mock=True,
            tier=pack_id,
        )

    stripe.api_key = settings.stripe_secret_key
    metadata = {
        "user_id": str(user.id),
        "purchase_type": "credits",
        "pack_id": pack_id,
        "tier": pack_id,
        "credits": str(pack["credits"]),
    }
    session_params = {
        "mode": "payment",
        "line_items": [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": pack["name"], "description": f"{pack['credits']:,} AI API Platform credits"},
                    "unit_amount": pack["amount_cents"],
                },
                "quantity": 1,
            }
        ],
        "success_url": f"{_frontend_url(request)}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{_frontend_url(request)}/billing/cancel?type=credits&pack={pack_id}",
        "client_reference_id": str(user.id),
        "customer_email": user.email if not user.stripe_customer_id else None,
        "customer": user.stripe_customer_id or None,
        "metadata": metadata,
        "payment_intent_data": {"metadata": metadata},
        "payment_method_types": ONE_TIME_PAYMENT_METHOD_TYPES,
        "payment_method_options": {"wechat_pay": {"client": "web"}},
    }
    session_params = {key: value for key, value in session_params.items() if value is not None}
    session = stripe.checkout.Session.create(**session_params)
    return CheckoutResponse(checkout_url=session.url, tier=pack_id)


def _handle_checkout_completed(session, db: Session, event_id: str) -> None:
    metadata = session.get("metadata") or {}
    purchase_type = metadata.get("purchase_type") or "subscription"
    if purchase_type == "credits":
        _handle_credit_checkout_completed(session, db, event_id)
    else:
        _handle_subscription_checkout_completed(session, db, event_id)


def _handle_subscription_checkout_completed(session, db: Session, event_id: str) -> None:
    user_id = _metadata_int(session, "user_id")
    tier = _metadata_value(session, "tier")
    if not user_id or tier not in PLAN_CREDITS:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    if _record_exists(db, checkout_session_id=session.get("id")):
        return

    user.subscription_tier = tier
    user.subscription_status = "active"
    user.stripe_customer_id = session.get("customer") or user.stripe_customer_id
    user.stripe_subscription_id = session.get("subscription") or user.stripe_subscription_id

    subscription = _retrieve_subscription(user.stripe_subscription_id)
    if subscription:
        _apply_subscription(user, subscription, tier)

    credits = PLAN_CREDITS[tier]
    user.credits_remaining += credits
    db.add(_record_from_checkout(user, session, event_id, "subscription", tier, credits, "succeeded", f"{tier.title()} subscription started"))


def _handle_credit_checkout_completed(session, db: Session, event_id: str) -> None:
    if session.get("payment_status") not in {"paid", "no_payment_required"}:
        _record_pending_checkout(session, db, event_id)
        return
    user_id = _metadata_int(session, "user_id")
    pack_id = _metadata_value(session, "pack_id") or _metadata_value(session, "tier")
    pack = CREDIT_PACKS.get(pack_id or "")
    if not user_id or not pack:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    existing_record = _record_for_checkout(db, session.get("id"))
    if existing_record and existing_record.status == "succeeded":
        return

    user.stripe_customer_id = session.get("customer") or user.stripe_customer_id
    user.credits_remaining += pack["credits"]
    if existing_record:
        existing_record.status = "succeeded"
        existing_record.credits = pack["credits"]
        existing_record.amount_cents = int(session.get("amount_total") or existing_record.amount_cents or 0)
        existing_record.description = f"{pack['name']} purchased"
        existing_record.stripe_event_id = event_id
        existing_record.stripe_payment_intent_id = session.get("payment_intent") or existing_record.stripe_payment_intent_id
    else:
        db.add(_record_from_checkout(user, session, event_id, "credits", pack_id, pack["credits"], "succeeded", f"{pack['name']} purchased"))


def _record_pending_checkout(session, db: Session, event_id: str) -> None:
    if _record_exists(db, checkout_session_id=session.get("id")):
        return
    user_id = _metadata_int(session, "user_id")
    if not user_id:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    credits = _metadata_int(session, "credits") or 0
    db.add(_record_from_checkout(user, session, event_id, _metadata_value(session, "purchase_type") or "payment", _metadata_value(session, "tier"), credits, "pending", "Payment pending"))


def _record_failed_checkout(session, db: Session, event_id: str) -> None:
    if _record_exists(db, checkout_session_id=session.get("id")):
        return
    user_id = _metadata_int(session, "user_id")
    if not user_id:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.add(_record_from_checkout(user, session, event_id, _metadata_value(session, "purchase_type") or "payment", _metadata_value(session, "tier"), 0, "failed", "Payment failed"))


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


def _handle_invoice_paid(invoice, db: Session, event_id: str) -> None:
    if invoice.get("billing_reason") == "subscription_create":
        return
    invoice_id = invoice.get("id")
    if invoice_id and db.query(BillingRecord).filter(BillingRecord.stripe_invoice_id == invoice_id).first():
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
    credits = PLAN_CREDITS[tier]
    user.credits_remaining += credits
    db.add(
        BillingRecord(
            user_id=user.id,
            stripe_event_id=event_id,
            stripe_invoice_id=invoice_id,
            stripe_subscription_id=subscription_id,
            purchase_type="subscription",
            mode="invoice",
            tier=tier,
            credits=credits,
            amount_cents=int(invoice.get("amount_paid") or 0),
            currency=(invoice.get("currency") or "usd").lower(),
            status="succeeded",
            description=f"{tier.title()} subscription renewal",
        )
    )


def _apply_subscription(user: User, subscription, tier: str) -> None:
    user.subscription_tier = tier
    user.subscription_status = subscription.get("status") or user.subscription_status or "active"
    user.stripe_subscription_id = subscription.get("id") or user.stripe_subscription_id
    user.stripe_customer_id = subscription.get("customer") or user.stripe_customer_id
    user.subscription_current_period_end = _timestamp_to_datetime(subscription.get("current_period_end"))


def _apply_mock_purchase(user: User, db: Session, purchase_type: str, tier: str, credits: int, amount_cents: int, description: str) -> None:
    if purchase_type == "subscription":
        user.subscription_tier = tier
        user.subscription_status = "active_mock"
    user.credits_remaining += credits
    db.add(
        BillingRecord(
            user_id=user.id,
            purchase_type=purchase_type,
            mode="mock",
            tier=tier,
            credits=credits,
            amount_cents=amount_cents,
            currency="usd",
            status="succeeded",
            description=description,
        )
    )
    db.commit()


def _record_from_checkout(user: User, session, event_id: str, purchase_type: str, tier: str | None, credits: int, status: str, description: str) -> BillingRecord:
    return BillingRecord(
        user_id=user.id,
        stripe_event_id=event_id,
        stripe_checkout_session_id=session.get("id"),
        stripe_payment_intent_id=session.get("payment_intent"),
        stripe_subscription_id=session.get("subscription"),
        purchase_type=purchase_type,
        mode=session.get("mode") or purchase_type,
        tier=tier,
        credits=credits,
        amount_cents=int(session.get("amount_total") or 0),
        currency=(session.get("currency") or "usd").lower(),
        status=status,
        description=description,
    )


def _record_exists(db: Session, checkout_session_id: str | None) -> bool:
    return _record_for_checkout(db, checkout_session_id) is not None


def _record_for_checkout(db: Session, checkout_session_id: str | None) -> BillingRecord | None:
    if not checkout_session_id:
        return None
    return db.query(BillingRecord).filter(BillingRecord.stripe_checkout_session_id == checkout_session_id).first()


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
    return str(value).lower() if value is not None and str(value) else None


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
        next_billing_date=user.subscription_current_period_end,
        customer_portal_available=bool(settings.stripe_secret_key and user.stripe_customer_id),
    )


def _frontend_url(request: Request) -> str:
    origin = request.headers.get("origin")
    if origin and origin.startswith(("http://", "https://")):
        return origin.rstrip("/")
    return str(settings.frontend_url).rstrip("/")
