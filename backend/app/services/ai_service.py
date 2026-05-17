from typing import AsyncGenerator
import logging
import google.generativeai as genai
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

genai.configure(api_key=settings.GEMINI_API_KEY)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a precision writing assistant. Your ONLY job is to rewrite \
the provided text so it sounds like it was written by the same person who produced \
the Voice Profile below.

Rules:
1. Preserve ALL facts, names, and data exactly.
2. Return ONLY the rewritten text — no preamble, no explanation.
3. Match the style to the Voice Profile as closely as possible.
4. Apply the INSTRUCTION given by the user.

Voice Profile Interpretation Guide:
- avg_sentence_length: target sentences of approximately this many words
- avg_word_length: prefer shorter/longer words accordingly
- type_token_ratio: high ratio = varied vocabulary; low = repetitive/simple vocabulary
- passive_voice_ratio: high = use more passive constructions; low = prefer active voice
- flesch_reading_ease: 0-30 = very academic; 30-60 = moderate; 60-100 = conversational
- flesch_kincaid_grade: target text at approximately this US grade reading level
- top_punctuation: mirror this punctuation usage pattern
- conjunction_frequency: use coordinating conjunctions at approximately this frequency
- adverb_frequency: use adverbs at approximately this frequency
- first_person_ratio: use first-person pronouns (I/me/my) at approximately this ratio
- paragraph_length_avg: write paragraphs of approximately this many words
- transition_word_ratio: use transition words (however, therefore, etc.) at this frequency"""

DEFAULT_PROFILE = {
    "avg_sentence_length": 15.0,
    "avg_word_length": 4.8,
    "type_token_ratio": 0.6,
    "passive_voice_ratio": 0.1,
    "flesch_reading_ease": 60.0,
    "flesch_kincaid_grade": 8.0,
    "top_punctuation": {".": 0.6, ",": 0.3},
    "conjunction_frequency": 0.04,
    "adverb_frequency": 0.03,
    "first_person_ratio": 0.05,
    "paragraph_length_avg": 80.0,
    "transition_word_ratio": 0.01,
}

READABLE_LABELS = {
    "avg_sentence_length":   "Avg sentence length (words)",
    "avg_word_length":       "Avg word length (chars)",
    "type_token_ratio":      "Vocabulary variety (0-1, higher=more varied)",
    "passive_voice_ratio":   "Passive voice ratio (0-1)",
    "flesch_reading_ease":   "Reading ease (0=hard, 100=easy)",
    "flesch_kincaid_grade":  "Reading grade level",
    "top_punctuation":       "Punctuation profile",
    "conjunction_frequency": "Conjunction frequency (0-1)",
    "adverb_frequency":      "Adverb frequency (0-1)",
    "first_person_ratio":    "First-person pronoun ratio (0-1)",
    "paragraph_length_avg":  "Avg paragraph length (words)",
    "transition_word_ratio": "Transition word ratio (0-1)",
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
        user = await self.db.get(User, user_id)
        if user and user.voice_profile:
            logger.info("Using real voice profile for user %s", user_id)
            return user.voice_profile
        logger.info("Using DEFAULT voice profile for user %s", user_id)
        return DEFAULT_PROFILE

    def _format_profile(self, profile: dict) -> str:
        lines = []
        for key, label in READABLE_LABELS.items():
            val = profile.get(key, "N/A")
            lines.append(f"- {label}: {val}")
        return "\n".join(lines)
