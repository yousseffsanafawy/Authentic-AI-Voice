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

# ── Routers ────────────────────────────────────────────────────────────────────
# auth      prefix inside router: /api/auth/*
app.include_router(auth.router)

# documents prefix inside router: /api/documents/*
app.include_router(documents.router)

# export    no prefix inside router → mount at /api/export
app.include_router(export.router, prefix="/api/export")

# versions  prefix inside router: /documents/* → mount at /api → /api/documents/*
app.include_router(versions.router, prefix="/api")

# samples   prefix inside router: /samples/* → mount at /api → /api/samples/*
app.include_router(samples.router, prefix="/api")

# ai        prefix inside router: /ai/* → mount at /api → /api/ai/*
app.include_router(ai.router, prefix="/api")

# Static file serving (PDF/LaTeX exports)
app.mount("/static", StaticFiles(directory=str(settings.STORAGE_DIR)), name="static")


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


