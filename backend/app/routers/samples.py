import uuid
import asyncio
import logging
import aiofiles
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.writing_sample import WritingSample
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/samples", tags=["samples"])

ALLOWED_EXTENSIONS = {"txt", "pdf", "docx"}


async def _extract_text(file_path: Path, extension: str) -> str:
    """Extract plain text from uploaded file. Full for .txt, pdf, docx."""
    if extension == "txt":
        try:
            async with aiofiles.open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return await f.read()
        except Exception:
            return ""
    if extension == "pdf":
        try:
            import PyPDF2
            def _extract_pdf():
                text = []
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text.append(page_text)
                return "\n".join(text)
            return await asyncio.to_thread(_extract_pdf)
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return ""
    if extension == "docx":
        try:
            import docx
            def _extract_docx():
                doc = docx.Document(file_path)
                return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            return await asyncio.to_thread(_extract_docx)
        except Exception as e:
            logger.error(f"DOCX extraction failed: {e}")
            return ""
    return ""


@router.post("/upload", status_code=201)
async def upload_sample(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # ── Max-5 guard BEFORE any file I/O ──────────────────────────────────────
    count = await db.scalar(
        select(func.count()).where(WritingSample.user_id == user.id)
    )
    if count >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 writing samples allowed. Delete one before uploading."
        )

    # ── Extension check ────────────────────────────────────────────────────────
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Only .txt, .pdf, .docx files are supported."
        )

    # ── Save file to disk ──────────────────────────────────────────────────────
    safe_filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    samples_dir = settings.STORAGE_DIR / "samples"
    samples_dir.mkdir(parents=True, exist_ok=True)
    file_path = samples_dir / safe_filename

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as out:
        await out.write(content)

    # ── Extract text ───────────────────────────────────────────────────────────
    extracted_text = await _extract_text(file_path, ext)

    # ── Save DB record ─────────────────────────────────────────────────────────
    relative_path = str(file_path.relative_to(settings.STORAGE_DIR))
    sample = WritingSample(
        id=str(uuid.uuid4()),
        user_id=user.id,
        filename=file.filename or safe_filename,
        file_path=relative_path,
        extracted_text=extracted_text,
    )
    db.add(sample)
    await db.commit()
    await db.refresh(sample)

    # ── Fire stylometry in background ──────────────────────────────────────────
    background_tasks.add_task(_run_stylometry, user.id)

    return {
        "id": sample.id,
        "filename": sample.filename,
        "created_at": sample.created_at,
    }


@router.get("")
async def list_samples(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WritingSample)
        .where(WritingSample.user_id == user.id)
        .order_by(WritingSample.created_at.desc())
    )
    samples = result.scalars().all()
    return [
        {"id": s.id, "filename": s.filename, "created_at": s.created_at}
        for s in samples
    ]


# NOTE: /voice-profile MUST be declared before /{sample_id} to avoid route shadowing
@router.get("/voice-profile")
async def get_voice_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns exact JSON shape for frontend polling:
    {"status": "not_analyzed"}
    {"status": "ready", "voice_profile": {...12 keys}}
    """
    fresh_user = await db.get(User, user.id)
    if not fresh_user or not fresh_user.voice_profile:
        return {"status": "not_analyzed"}
    return {"status": "ready", "voice_profile": fresh_user.voice_profile}


@router.delete("/{sample_id}", status_code=204)
async def delete_sample(
    sample_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WritingSample).where(
            WritingSample.id == sample_id,
            WritingSample.user_id == user.id,
        )
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    # ── Delete file from disk ─────────────────────────────────────────────────
    file_path = settings.STORAGE_DIR / sample.file_path
    if file_path.exists():
        file_path.unlink()

    # ── Delete DB record ──────────────────────────────────────────────────────
    await db.delete(sample)
    await db.commit()

    # ── Re-trigger stylometry with remaining samples ──────────────────────────
    background_tasks.add_task(_run_stylometry, user.id)


async def _run_stylometry(user_id: str) -> None:
    """
    Background task: re-analyzes all writing samples for a user and writes
    the 12-feature voice profile to user.voice_profile.
    Safe to call after any upload or delete.
    Never raises — all exceptions are logged silently.
    """
    from app.database import AsyncSessionLocal
    from app.services.stylometry_service import StylometryService

    try:
        texts = []
        # First DB session: fetch texts
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(WritingSample.extracted_text)
                .where(WritingSample.user_id == user_id)
            )
            texts = [row[0] for row in result.fetchall() if row[0] and row[0].strip()]

            if not texts:
                logger.info("No usable texts for user %s — clearing voice_profile", user_id)
                user = await db.get(User, user_id)
                if user:
                    user.voice_profile = None
                    await db.commit()
                return

        # CPU-heavy spaCy call — run in thread pool OUTSIDE of any DB session context
        service = StylometryService()
        profile = await asyncio.to_thread(service.analyze, texts)

        # Second DB session: save profile
        async with AsyncSessionLocal() as db:
            user = await db.get(User, user_id)
            if user:
                user.voice_profile = profile
                await db.commit()
                logger.info(
                    "Voice profile updated for user %s: %s keys",
                    user_id,
                    len(profile),
                )

    except Exception as exc:
        logger.exception(
            "Stylometry background task failed for user %s: %s", user_id, exc
        )
        # NEVER re-raise — background task failures must be silent to API caller
