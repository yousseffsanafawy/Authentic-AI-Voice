import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.document_version import DocumentVersion

router = APIRouter()


@router.get("/{doc_id}/versions")
async def list_versions(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns(doc_id, user.id, db)
    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == doc_id)
        .order_by(DocumentVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": v.id,
            "version_number": v.version_number,
            "created_at": v.created_at,
        }
        for v in versions
    ]


@router.post("/{doc_id}/versions", status_code=201)
async def save_version(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _assert_owns(doc_id, user.id, db)
    version = DocumentVersion(
        id=str(uuid.uuid4()),
        document_id=doc_id,
        version_number=doc.current_version,
        content=doc.content,
        content_text=doc.content_text,
    )
    db.add(version)
    await db.commit()
    return {"id": version.id, "version_number": version.version_number}


@router.get("/{doc_id}/versions/{version_number}")
async def get_version(
    doc_id: str,
    version_number: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns(doc_id, user.id, db)
    result = await db.execute(
        select(DocumentVersion).where(
            DocumentVersion.document_id == doc_id,
            DocumentVersion.version_number == version_number,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"version_number": version.version_number, "content": version.content}


async def _assert_owns(doc_id: str, user_id: str, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
