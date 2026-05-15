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

app.include_router(auth.router, prefix="", tags=["auth"])
app.include_router(samples.router,   prefix="/api/samples",   tags=["samples"])
app.include_router(export.router,    prefix="/api/export",    tags=["export"])

# The ones we updated for Sprint 3:
app.include_router(documents.router, prefix="")      
app.include_router(versions.router,  prefix="/api")  
app.include_router(ai.router,        prefix="/api")

# Versions needs /api/documents prefix (routes are /{doc_id}/versions/*)
app.include_router(versions.router, prefix="/api/documents", tags=["versions"])

# Samples already has /samples prefix → mount under /api
app.include_router(samples.router, prefix="/api")

# AI already has no prefix on the route itself → mount under /api
app.include_router(ai.router, prefix="/api", tags=["ai"])

app.mount("/static", StaticFiles(directory=str(settings.STORAGE_DIR)), name="static")


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
