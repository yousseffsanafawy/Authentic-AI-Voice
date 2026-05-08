import uuid
import asyncio
import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.writing_sample import WritingSample
from app.config import settings

router = APIRouter()

ALLOWED_EXTENSIONS = {"txt", "pdf", "docx"}


@router.post("/upload", status_code=201)
async def upload_sample(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Enforce max 5 samples
    count = await db.scalar(
        select(func.count()).where(WritingSample.user_id == user.id)
    )
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 writing samples allowed")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail="Only .txt, .pdf, .docx files are supported"
        )

    filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = settings.STORAGE_DIR / "samples" / filename

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    extracted_text = ""
    if ext == "txt":
        try:
            extracted_text = content.decode("utf-8", errors="ignore")
        except Exception:
            extracted_text = ""

    sample = WritingSample(
        id=str(uuid.uuid4()),
        user_id=user.id,
        filename=file.filename or filename,
        file_path=str(file_path.relative_to(settings.STORAGE_DIR)),
        extracted_text=extracted_text,
    )
    db.add(sample)
    await db.commit()
    await db.refresh(sample)

    background_tasks.add_task(_run_stylometry, user.id)

    return {"id": sample.id, "filename": sample.filename, "status": "uploaded"}


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
    return [{"id": s.id, "filename": s.filename, "created_at": s.created_at} for s in samples]


@router.delete("/{sample_id}", status_code=204)
async def delete_sample(
    sample_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WritingSample).where(
            WritingSample.id == sample_id, WritingSample.user_id == user.id
        )
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    file_path = settings.STORAGE_DIR / sample.file_path
    if file_path.exists():
        file_path.unlink()

    await db.delete(sample)
    await db.commit()

    background_tasks.add_task(_run_stylometry, user.id)


@router.get("/voice-profile")
async def get_voice_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    fresh_user = await db.get(User, user.id)
    if not fresh_user or not fresh_user.voice_profile:
        return {"status": "not_analyzed", "voice_profile": None}
    return {"status": "ready", "voice_profile": fresh_user.voice_profile}


async def _run_stylometry(user_id: str):
    """Background task: re-compute voice profile after upload/delete."""
    from app.database import AsyncSessionLocal
    from app.services.stylometry_service import StylometryService

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WritingSample).where(WritingSample.user_id == user_id)
        )
        samples = result.scalars().all()
        texts = [s.extracted_text for s in samples if s.extracted_text.strip()]

        if not texts:
            return

        service = StylometryService()
        profile = await asyncio.to_thread(service.analyze, texts)

        user = await db.get(User, user_id)
        if user:
            user.voice_profile = profile
            await db.commit()
