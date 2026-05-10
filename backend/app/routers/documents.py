import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/api/documents", tags=["documents"])


# ── Schemas (inline; move to schemas/document.py if preferred) ────────────────

class DocumentCreate(BaseModel):
    title: str = "Untitled"
    content: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_archived: Optional[bool] = None


class DocumentOut(BaseModel):
    id: str
    user_id: str
    title: str
    content: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Ownership helper ──────────────────────────────────────────────────────────

async def _get_owned_doc(doc_id: str, user_id: str, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == user_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        # 404 — never leak whether the document exists for another user
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[DocumentOut])
async def list_documents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user.id, Document.is_archived == False)  # noqa: E712
        .order_by(Document.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = Document(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=payload.title,
        content=payload.content,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_doc(doc_id, user.id, db)


@router.patch("/{doc_id}", response_model=DocumentOut)
async def update_document(
    doc_id: str,
    payload: DocumentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_owned_doc(doc_id, user.id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doc, field, value)
    doc.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_owned_doc(doc_id, user.id, db)
    await db.delete(doc)
    await db.commit()
