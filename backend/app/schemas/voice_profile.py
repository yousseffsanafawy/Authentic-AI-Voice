from typing import Optional, Any
from pydantic import BaseModel


class VoiceProfileOut(BaseModel):
    status: str  # "ready" | "not_analyzed"
    voice_profile: Optional[dict] = None


class EnhanceRequest(BaseModel):
    selected_text: str
    instruction: str = "Make this sound more like me"


class ExportPDFRequest(BaseModel):
    document_id: str
    template: str = "default"


class ExportLaTeXRequest(BaseModel):
    document_id: str
    options: dict = {}
