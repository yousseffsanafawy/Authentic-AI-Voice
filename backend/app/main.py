from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.routers import auth, documents, export, versions, samples, ai

app = FastAPI(title="Authentic AI Voice", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(export.router)
app.include_router(versions.router, prefix="/api")
app.include_router(samples.router, prefix="/api")
app.include_router(ai.router, prefix="/api")

app.mount("/static", StaticFiles(directory=str(settings.STORAGE_DIR)), name="static")

@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
