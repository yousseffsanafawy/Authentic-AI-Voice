import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentOut, DocumentDetail
from app.services.document_service import detect_flags

router = APIRouter()


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user.id, Document.is_archived == False)
        .order_by(Document.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=DocumentDetail, status_code=201)
async def create_document(
    body: DocumentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = Document(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=body.title,
        content={"type": "doc", "content": [{"type": "paragraph"}]},
        content_text="",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=DocumentDetail)
async def get_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_owned_doc(doc_id, user.id, db)
    return doc


@router.patch("/{doc_id}", response_model=DocumentOut)
async def update_document(
    doc_id: str,
    body: DocumentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_owned_doc(doc_id, user.id, db)
    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(doc, field, value)
    # Auto-detect table/footnote flags from Tiptap JSON
    if "content" in update_data:
        flags = detect_flags(update_data["content"])
        doc.has_tables = flags["has_tables"]
        doc.has_footnotes = flags["has_footnotes"]
    doc.current_version += 1
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
async def archive_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_owned_doc(doc_id, user.id, db)
    doc.is_archived = True
    await db.commit()


async def _get_owned_doc(doc_id: str, user_id: str, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
