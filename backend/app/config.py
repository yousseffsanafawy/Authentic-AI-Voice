from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GEMINI_API_KEY: str = ""
    STORAGE_DIR: Path = Path(__file__).parent.parent / "uploads"

    # Add the missing Groq/OpenAI variables here
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model_name: Optional[str] = None

    # Modern Pydantic v2 config
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"), 
        extra="ignore" # This stops the app from crashing if you add random .env variables later
    )

settings = Settings()

(settings.STORAGE_DIR / "samples").mkdir(parents=True, exist_ok=True)
(settings.STORAGE_DIR / "exports").mkdir(parents=True, exist_ok=True)