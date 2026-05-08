from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, documents, versions, samples, ai, export

app = FastAPI(
    title="Authentic Voice API",
    version="1.0.0",
    description="AI-powered writing assistant that preserves your authentic voice.",
)

# CORS — allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploads/ at /static (replaces S3)
app.mount(
    "/static",
    StaticFiles(directory=str(settings.STORAGE_DIR)),
    name="static",
)

# Routers
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(versions.router,  prefix="/api/documents", tags=["Versions"])
app.include_router(samples.router,   prefix="/api/samples",   tags=["Samples"])
app.include_router(ai.router,        prefix="/api/ai",        tags=["AI"])
app.include_router(export.router,    prefix="/api/export",    tags=["Export"])


# Global error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
