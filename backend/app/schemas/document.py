from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str = "Untitled"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[Any] = None
    content_text: Optional[str] = None
    word_count: Optional[int] = None
    has_footnotes: Optional[bool] = None
    has_tables: Optional[bool] = None


class DocumentOut(BaseModel):
    id: str
    title: str
    word_count: int
    current_version: int
    has_footnotes: bool
    has_tables: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetail(DocumentOut):
    content: Any
    content_text: str
