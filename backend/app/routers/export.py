import uuid
import aiofiles
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from io import BytesIO

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.voice_profile import ExportPDFRequest, ExportLaTeXRequest
from app.services.pdf_service import PDFService
from app.services.latex_service import LaTeXService
from app.config import settings

router = APIRouter()


@router.post("/pdf")
async def export_pdf(
    body: ExportPDFRequest,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    pdf_bytes = await PDFService(db).generate_pdf(body.document_id, user.id)

    filename = f"{body.document_id}_{uuid.uuid4().hex[:6]}.pdf"
    file_path = settings.STORAGE_DIR / "exports" / filename

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(pdf_bytes)

    return {
        "filename": filename,
        "download_url": f"http://localhost:8000/static/exports/{filename}",
    }


@router.post("/latex")
async def export_latex(
    body: ExportLaTeXRequest,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    latex_str = await LaTeXService(db).generate_latex(
        body.document_id, user.id, body.options
    )

    filename = f"{body.document_id}_{uuid.uuid4().hex[:6]}.tex"
    file_path = settings.STORAGE_DIR / "exports" / filename

    async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
        await f.write(latex_str)

    return {
        "latex_content": latex_str,
        "filename": filename,
        "download_url": f"http://localhost:8000/static/exports/{filename}",
    }
