"""
Quick smoke test: verify Gemini API key works and streaming is functional.
Run from backend/ with venv active:
    python test_gemini.py
"""
import asyncio
import sys

import google.generativeai as genai

# Import via app config so we're using the exact same key path as the server
from app.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


async def test() -> None:
    model = genai.GenerativeModel("gemini-2.5-pro")
    print("Testing Gemini streaming...")

    response = await model.generate_content_async(
        "Rewrite this in a formal tone: 'Hey, the code works now'",
        stream=True,
    )

    full = ""
    async for chunk in response:
        if chunk.text:
            print(chunk.text, end="", flush=True)
            full += chunk.text

    print()  # newline after streamed output

    assert len(full) > 0, "No content received from Gemini!"
    print(f"\nGemini OK — {len(full)} chars received")


if __name__ == "__main__":
    try:
        asyncio.run(test())
        sys.exit(0)
    except AssertionError as e:
        print(f"\nFAIL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)


