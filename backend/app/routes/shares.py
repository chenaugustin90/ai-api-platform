from __future__ import annotations

import base64
import html
import re
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models import Share, User
from app.schemas.share import ShareCreate, ShareResponse

settings = get_settings()
api_router = APIRouter(prefix="/shares", tags=["shares"])
public_router = APIRouter(tags=["shares"])


@api_router.post("", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
def create_share(
    payload: ShareCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_share_payload(payload)
    share = Share(
        public_id=_new_public_id(db),
        user_id=user.id,
        modality=payload.modality,
        provider=_clean(payload.provider),
        model=_clean(payload.model),
        prompt=payload.prompt.strip(),
        text=payload.text.strip() if payload.text else None,
        output_url=payload.output_url.strip() if payload.output_url else None,
        title=_share_title(payload),
    )
    db.add(share)
    db.commit()
    db.refresh(share)
    return _share_response(share, request)


@api_router.get("/{public_id}", response_model=ShareResponse)
def get_share(public_id: str, request: Request, db: Session = Depends(get_db)):
    share = _get_share_or_404(db, public_id)
    return _share_response(share, request)


@api_router.get("/{public_id}/image")
def share_image(public_id: str, db: Session = Depends(get_db)):
    share = _get_share_or_404(db, public_id)
    if share.modality != "image" or not share.output_url:
        raise HTTPException(status_code=404, detail="Shared image not found")
    if share.output_url.startswith("data:image/"):
        match = re.match(r"data:(image/[a-zA-Z0-9.+-]+);base64,(.*)", share.output_url, re.DOTALL)
        if not match:
            raise HTTPException(status_code=422, detail="Shared image data is invalid")
        media_type, encoded = match.groups()
        try:
            image_bytes = base64.b64decode(encoded)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Shared image data is invalid") from exc
        return Response(content=image_bytes, media_type=media_type)
    if share.output_url.startswith(("http://", "https://")):
        return RedirectResponse(share.output_url, status_code=307)
    raise HTTPException(status_code=422, detail="Shared image URL is invalid")


@public_router.get("/share/{public_id}", response_class=HTMLResponse)
def public_share_preview(public_id: str, request: Request, db: Session = Depends(get_db)):
    share = _get_share_or_404(db, public_id)
    share_url = _backend_share_url(request, share.public_id)
    app_url = _frontend_share_url(share.public_id)
    title = share.title or "AI API Platform Share"
    description = _description(share)
    image_url = f"{_backend_root()}/api/shares/{share.public_id}/image" if share.modality == "image" and share.output_url else None
    meta_image = f'<meta property="og:image" content="{html.escape(image_url)}" />' if image_url else ""
    twitter_card = "summary_large_image" if image_url else "summary"
    body_media = (
        f'<img class="share-media" src="{html.escape(image_url)}" alt="{html.escape(share.prompt)}" />'
        if image_url
        else f'<pre class="share-text">{html.escape(share.text or "")}</pre>'
    )
    created = share.created_at.strftime("%b %d, %Y") if isinstance(share.created_at, datetime) else ""

    return HTMLResponse(
        f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(description)}" />
  <meta property="og:title" content="{html.escape(title)}" />
  <meta property="og:description" content="{html.escape(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{html.escape(share_url)}" />
  {meta_image}
  <meta name="twitter:card" content="{twitter_card}" />
  <meta name="twitter:title" content="{html.escape(title)}" />
  <meta name="twitter:description" content="{html.escape(description)}" />
  <style>
    :root {{
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
      background: #08111f;
      color: #fff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 32px;
      background:
        radial-gradient(circle at 12% 8%, rgba(0, 229, 255, .32), transparent 34rem),
        radial-gradient(circle at 88% 10%, rgba(139, 92, 246, .34), transparent 30rem),
        linear-gradient(135deg, #07121f, #111936 54%, #08111f);
    }}
    body::before {{
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(circle at center, black, transparent 78%);
    }}
    .shell {{
      width: min(980px, 100%);
      border: 1px solid rgba(255,255,255,.24);
      border-radius: 34px;
      padding: clamp(22px, 4vw, 42px);
      background:
        radial-gradient(circle at 18% 0%, rgba(255,255,255,.32), transparent 30rem),
        linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.06));
      box-shadow: 0 32px 120px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.32);
      backdrop-filter: blur(28px) saturate(170%);
      -webkit-backdrop-filter: blur(28px) saturate(170%);
    }}
    .eyebrow {{
      color: #00e5ff;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .34em;
      text-transform: uppercase;
    }}
    h1 {{
      margin: 10px 0 12px;
      font-size: clamp(34px, 7vw, 72px);
      line-height: .95;
      letter-spacing: 0;
    }}
    .meta, .prompt {{
      color: rgba(223,251,255,.72);
      line-height: 1.65;
    }}
    .card {{
      margin-top: 26px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 26px;
      background: rgba(255,255,255,.08);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
    }}
    .share-media {{
      display: block;
      width: 100%;
      max-height: 680px;
      object-fit: contain;
      background: rgba(255,255,255,.08);
    }}
    .share-text {{
      min-height: 260px;
      margin: 0;
      padding: 24px;
      white-space: pre-wrap;
      color: #eafcff;
      font: 500 16px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
    }}
    .cta {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 26px;
      padding: 13px 18px;
      border-radius: 999px;
      color: white;
      text-decoration: none;
      font-weight: 800;
      background: linear-gradient(135deg, #4da3ff, #8b5cf6);
      box-shadow: 0 14px 34px rgba(91,168,255,.28);
    }}
  </style>
</head>
<body>
  <main class="shell">
    <p class="eyebrow">AI API Platform Share</p>
    <h1>{html.escape(title)}</h1>
    <p class="meta">{html.escape((share.provider or "AI").title())} / {html.escape(share.model or "model")} / {html.escape(created)}</p>
    <p class="prompt">{html.escape(share.prompt)}</p>
    <section class="card">{body_media}</section>
    <a class="cta" href="{html.escape(app_url)}">Open public preview</a>
  </main>
</body>
</html>"""
    )


def _validate_share_payload(payload: ShareCreate) -> None:
    if payload.modality == "text" and not (payload.text and payload.text.strip()):
        raise HTTPException(status_code=422, detail="Text shares require generated text")
    if payload.modality == "image" and not (payload.output_url and payload.output_url.strip()):
        raise HTTPException(status_code=422, detail="Image shares require an image URL")


def _new_public_id(db: Session) -> str:
    for _ in range(8):
        public_id = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]
        if not db.query(Share).filter(Share.public_id == public_id).first():
            return public_id
    raise HTTPException(status_code=500, detail="Could not create share link")


def _get_share_or_404(db: Session, public_id: str) -> Share:
    share = db.query(Share).filter(Share.public_id == public_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    return share


def _share_response(share: Share, request: Request) -> ShareResponse:
    return ShareResponse(
        id=share.public_id,
        url=_backend_share_url(request, share.public_id),
        preview_url=_frontend_share_url(share.public_id),
        modality=share.modality,
        provider=share.provider,
        model=share.model,
        prompt=share.prompt,
        text=share.text,
        output_url=share.output_url,
        title=share.title,
        created_at=share.created_at,
    )


def _backend_share_url(request: Request, public_id: str) -> str:
    return f"{_backend_root()}/share/{public_id}"


def _frontend_share_url(public_id: str) -> str:
    return f"{_frontend_root()}/share/{public_id}"


def _backend_root() -> str:
    url = str(settings.backend_url or "").rstrip("/")
    if not url:
        raise HTTPException(status_code=503, detail="BACKEND_URL is required to create production share links")
    return url


def _frontend_root() -> str:
    url = str(settings.frontend_url or "").rstrip("/")
    if not url:
        raise HTTPException(status_code=503, detail="FRONTEND_URL is required to create production share links")
    return url


def _share_title(payload: ShareCreate) -> str:
    if payload.title and payload.title.strip():
        return _truncate(payload.title.strip(), 120)
    prefix = "Shared image" if payload.modality == "image" else "Shared text"
    return _truncate(f"{prefix}: {payload.prompt.strip()}", 120)


def _description(share: Share) -> str:
    source = share.text if share.modality == "text" else share.prompt
    return _truncate(source or "A shared AI generation from AI API Platform.", 180)


def _truncate(value: str, limit: int) -> str:
    collapsed = " ".join(value.split())
    return collapsed if len(collapsed) <= limit else f"{collapsed[: limit - 1].rstrip()}..."


def _clean(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    return cleaned or None
