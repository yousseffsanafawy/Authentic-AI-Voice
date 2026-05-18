# app/routers/ai.py
import json
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.voice_profile import EnhanceRequest
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])

# ---------------------------------------------------------------------------
# In-memory rate limiter — resets on server restart, per-process only.
# Good enough for single-Uvicorn-worker MVP; upgrade to Redis if you add
# multiple workers later.
# ---------------------------------------------------------------------------
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 10      # max requests per user
RATE_WINDOW = 60.0   # sliding window in seconds


def _check_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    window_start = now - RATE_WINDOW
    # Prune timestamps outside the window
    _rate_store[user_id] = [t for t in _rate_store[user_id] if t > window_start]
    if len(_rate_store[user_id]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: max {RATE_LIMIT} AI requests per minute.",
        )
    _rate_store[user_id].append(now)


@router.post("/enhance")
async def enhance_text(
    body: EnhanceRequest,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
) -> StreamingResponse:
    """Stream AI-enhanced text back to the client via SSE."""
    _check_rate_limit(user.id)   # raises 429 before touching Gemini

    service = AIService(db)
    profile = await service.get_voice_profile(user.id)

    async def event_stream():
        try:
            async for chunk in service.enhance_text_stream(
                profile=profile,
                selected_text=body.selected_text,
                instruction=body.instruction,
            ):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except HTTPException as exc:
            # Propagate FastAPI errors (e.g. Gemini 429) as an SSE error event
            yield f"data: {json.dumps({'error': exc.detail, 'status': exc.status_code})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # noqa: BLE001
            # Catch-all for unexpected Gemini SDK exceptions mid-stream
            yield f"data: {json.dumps({'error': str(exc), 'status': 500})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")