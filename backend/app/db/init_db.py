from __future__ import annotations

from sqlalchemy import inspect, text

from app.db.session import Base, engine
from app import models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_user_billing_columns()


def _ensure_user_billing_columns() -> None:
    existing = {column["name"] for column in inspect(engine).get_columns("users")}
    additions = {
        "subscription_status": "VARCHAR(50) DEFAULT 'free'",
        "stripe_subscription_id": "VARCHAR(255)",
        "subscription_current_period_end": "DATETIME",
    }
    with engine.begin() as connection:
        for column, definition in additions.items():
            if column not in existing:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column} {definition}"))
