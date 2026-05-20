from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.init_db import init_db
from app.routes import api_keys, auth, billing, dashboard, generate, usage

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

allowed_origins = {
    str(settings.frontend_url).rstrip("/"),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}
allowed_origins.update(origin.strip().rstrip("/") for origin in settings.cors_origins.split(",") if origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health():
    return {"ok": True, "service": settings.app_name}


app.include_router(auth.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(usage.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
