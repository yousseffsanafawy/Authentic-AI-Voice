from typing import Optional, Any
from pydantic import BaseModel, Field


class VoiceProfileOut(BaseModel):
    status: str  # "ready" | "not_analyzed"
    voice_profile: Optional[dict] = None


class EnhanceRequest(BaseModel):
    selected_text: str = Field(
        min_length=1,
        max_length=5000,
        description="Text to enhance (1–5000 chars)",
    )
    instruction: str = Field(
        default="Make this sound more like me",
        max_length=500,
        description="Enhancement instruction",
    )


class ExportPDFRequest(BaseModel):
    document_id: str
    template: str = "default"


class ExportLaTeXRequest(BaseModel):
    document_id: str
    options: dict = {}
