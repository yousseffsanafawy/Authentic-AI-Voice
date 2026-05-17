from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    OPENAI_MODEL_NAME: str = ""
    STORAGE_DIR: Path = Path(__file__).parent.parent / "uploads"

    class Config:
        env_file = Path(__file__).parent.parent / ".env"
        extra = "ignore"

settings = Settings()

(settings.STORAGE_DIR / "samples").mkdir(parents=True, exist_ok=True)
(settings.STORAGE_DIR / "exports").mkdir(parents=True, exist_ok=True)
