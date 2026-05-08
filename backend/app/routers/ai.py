import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.voice_profile import EnhanceRequest
from app.services.ai_service import AIService

router = APIRouter()


@router.post("/enhance")
async def enhance_text(
    body: EnhanceRequest,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    service = AIService(db)

    async def event_stream():
        async for chunk in service.enhance_text_stream(
            user_id=user.id,
            selected_text=body.selected_text,
            instruction=body.instruction,
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
