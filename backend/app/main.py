from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.requests import Request
from fastapi.responses import JSONResponse
<<<<<<< SprintOne/Youssef
from fastapi.exceptions import RequestValidationError
from passlib.context import CryptContext
=======
>>>>>>> main

from app.config import settings
from app.routers import auth, documents, versions, samples, ai, export

app = FastAPI(
    title="Authentic Voice API",
    version="1.0.0",
    description="AI-powered writing assistant that preserves your authentic voice.",
)

<<<<<<< SprintOne/Youssef
# ── CORS — allow Next.js dev server ──────────────────────────────────────────
=======
# CORS — allow Next.js dev server
>>>>>>> main
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< SprintOne/Youssef
# ── Serve uploads/ at /static (replaces S3) ──────────────────────────────────
=======
# Serve uploads/ at /static (replaces S3)
>>>>>>> main
app.mount(
    "/static",
    StaticFiles(directory=str(settings.STORAGE_DIR)),
    name="static",
)

<<<<<<< SprintOne/Youssef
# ── Routers ───────────────────────────────────────────────────────────────────
=======
# Routers
>>>>>>> main
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(versions.router,  prefix="/api/documents", tags=["Versions"])
app.include_router(samples.router,   prefix="/api/samples",   tags=["Samples"])
app.include_router(ai.router,        prefix="/api/ai",        tags=["AI"])
app.include_router(export.router,    prefix="/api/export",    tags=["Export"])


<<<<<<< SprintOne/Youssef
# ── Startup: seed a dev user so Sprint 1 works without auth ──────────────────
@app.on_event("startup")
async def seed_dev_user():
    from app.database import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        existing = await db.get(User, "dev-user")
        if not existing:
            dev = User(
                id="dev-user",
                email="dev@localhost",
                hashed_password=CryptContext(schemes=["bcrypt"]).hash("devpass"),
            )
            db.add(dev)
            await db.commit()


# ── Global error handlers ─────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc.errors()), "code": "VALIDATION_ERROR"},
    )


=======
# Global error handlers
>>>>>>> main
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
