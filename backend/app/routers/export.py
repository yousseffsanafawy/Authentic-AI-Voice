from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportRequest(BaseModel):
    doc_id: str


async def _get_owned_doc(doc_id: str, user_id: str, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == user_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


@router.post("/pdf")
async def export_pdf(
    payload: ExportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a document as PDF. Only the owning user may export."""
    doc = await _get_owned_doc(payload.doc_id, user.id, db)

    # ── PDF generation placeholder ─────────────────────────────────────────────
    # Replace the block below with your actual PDF library call (e.g. WeasyPrint,
    # ReportLab, or a Gemini-powered generation step).
    content = doc.content or ""
    pdf_bytes = _generate_pdf(doc.title, content)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{doc.title}.pdf"'
        },
    )


def _generate_pdf(title: str, content: str) -> bytes:
    """Minimal PDF stub — replace with real generation logic."""
    # This produces a valid (though bare) PDF so the endpoint is exercisable.
    body = f"%PDF-1.4\n% title: {title}\n% content length: {len(content)}\n"
    return body.encode()
