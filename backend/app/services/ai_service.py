from typing import AsyncGenerator
import logging
import google.generativeai as genai
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are a writing assistant that enhances text to match the user's authentic voice profile.
Rules:
- Preserve ALL factual content exactly.
- Adjust style to match the provided voice profile metrics.
- Do NOT add new information or commentary.
- Return ONLY the enhanced text, no explanation."""

DEFAULT_PROFILE = {
    "avg_sentence_length": 15.0,
    "avg_word_length": 4.8,
    "type_token_ratio": 0.6,
    "passive_voice_ratio": 0.1,
    "flesch_reading_ease": 60.0,
    "first_person_ratio": 0.05,
}


class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-pro",
            system_instruction=SYSTEM_PROMPT,
        )

    async def enhance_text_stream(
        self,
        user_id: str,
        selected_text: str,
        instruction: str,
    ) -> AsyncGenerator[str, None]:
        profile = await self._get_voice_profile(user_id)

        user_message = (
            f"VOICE PROFILE:\n{self._format_profile(profile)}\n\n"
            f"ORIGINAL TEXT:\n{selected_text}\n\n"
            f"INSTRUCTION:\n{instruction}"
        )

        try:
            response = await self.model.generate_content_async(
                user_message, stream=True
            )
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower():
                raise HTTPException(
                    status_code=429,
                    detail="Gemini rate limit exceeded. Please wait 60 seconds and try again.",
                )
            raise HTTPException(status_code=500, detail=f"AI service error: {error_str}")

    async def _get_voice_profile(self, user_id: str) -> dict:
        logger = logging.getLogger(__name__)
        user = await self.db.get(User, user_id)
        if user and user.voice_profile:
            logger.info("Using real voice profile for user %s", user_id)
            return user.voice_profile
        logger.info("Using DEFAULT voice profile for user %s", user_id)
        return DEFAULT_PROFILE

    def _format_profile(self, profile: dict) -> str:
        return "\n".join(
            f"- {k.replace('_', ' ').title()}: {v}" for k, v in profile.items()
        )
