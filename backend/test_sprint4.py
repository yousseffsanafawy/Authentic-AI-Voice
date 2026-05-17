"""
Sprint 4 integration tests: writing samples + stylometry + personalized AI.
Run: python test_sprint4.py
Server must be running on port 8000.
"""
import sys
import time
import json
import os
import requests

# Force UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://localhost:8000"
PASS_LIST, FAIL_LIST = [], []

TEST_EMAIL = "testuser_sprint4@example.com"
TEST_PASSWORD = "testpass123"

SAMPLE_TEXT = (
    "I believe that writing clearly is one of the most important skills a person can develop. "
    "When I sit down to write, I focus first on the structure of my argument. "
    "My sentences tend to be short and direct. I avoid passive constructions whenever possible. "
    "Furthermore, I use transition words to guide the reader through my reasoning. "
    "However, I also appreciate variety and try not to repeat the same patterns too often. "
    "My goal is always to communicate ideas in the simplest way possible. "
    "I think that clear writing reflects clear thinking, and I work hard to achieve both."
) * 5  # repeat for meaningful stylometry signal


def check(name: str, cond: bool, reason: str = "") -> None:
    if cond:
        PASS_LIST.append(name)
        print(f"  PASS  {name}")
    else:
        FAIL_LIST.append(name)
        print(f"  FAIL  {name}" + (f" — {reason}" if reason else ""))


def login_or_register(email: str, password: str) -> dict:
    requests.post(f"{BASE}/api/auth/register", json={"email": email, "password": password})
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ── Setup ─────────────────────────────────────────────────────────────────────
print("=== Setup ===")
try:
    AUTH = login_or_register(TEST_EMAIL, TEST_PASSWORD)
    print(f"  Logged in as {TEST_EMAIL}")
except Exception as e:
    print(f"  FATAL: Cannot login — {e}")
    sys.exit(1)

# Clean any leftover samples from previous runs
r = requests.get(f"{BASE}/api/samples", headers=AUTH)
for s in (r.json() if r.status_code == 200 else []):
    requests.delete(f"{BASE}/api/samples/{s['id']}", headers=AUTH)
print("  Cleaned up previous samples")

# ── Validation ────────────────────────────────────────────────────────────────
print("\n=== Sample Validation ===")

# Bad extension
r = requests.post(
    f"{BASE}/api/samples/upload",
    files={"file": ("bad.exe", b"data", "application/octet-stream")},
    headers=AUTH,
)
check("Upload .exe -> 400", r.status_code == 400, f"Got {r.status_code}")
check(".exe error mentions type", "type" in r.text.lower() or "allowed" in r.text.lower(), r.text[:80])

# No token
r = requests.post(
    f"{BASE}/api/samples/upload",
    files={"file": ("test.txt", b"some text", "text/plain")},
)
check("Upload no token -> 401", r.status_code == 401, f"Got {r.status_code}")

# ── Sample lifecycle ──────────────────────────────────────────────────────────
print("\n=== Sample Lifecycle ===")
sample_ids = []
for i in range(3):
    r = requests.post(
        f"{BASE}/api/samples/upload",
        files={"file": (f"sample{i}.txt", SAMPLE_TEXT.encode(), "text/plain")},
        headers=AUTH,
    )
    check(f"Upload sample {i} → 201", r.status_code == 201, f"Got {r.status_code}: {r.text[:100]}")
    if r.status_code == 201:
        sample_ids.append(r.json().get("id"))

# List samples
r = requests.get(f"{BASE}/api/samples", headers=AUTH)
check("GET /samples → 200", r.status_code == 200, f"Got {r.status_code}")
check("Sample list has 3 items", len(r.json()) >= 3, f"Got {len(r.json())} samples")

# Upload 2 more to reach 5
for i in range(3, 5):
    requests.post(
        f"{BASE}/api/samples/upload",
        files={"file": (f"extra{i}.txt", SAMPLE_TEXT.encode(), "text/plain")},
        headers=AUTH,
    )

# 6th upload must fail
r = requests.post(
    f"{BASE}/api/samples/upload",
    files={"file": ("sixth.txt", b"text", "text/plain")},
    headers=AUTH,
)
check("6th upload → 400", r.status_code == 400, f"Got {r.status_code}")
check("6th error mentions Maximum/5", "5" in r.text or "Maximum" in r.text, r.text[:80])

# ── Voice profile polling ─────────────────────────────────────────────────────
print("\n=== Voice Profile ===")
profile = None
for attempt in range(20):
    r = requests.get(f"{BASE}/api/samples/voice-profile", headers=AUTH)
    check("GET /voice-profile → 200", r.status_code == 200, f"Got {r.status_code}")
    data = r.json()
    if data.get("status") == "ready":
        profile = data.get("voice_profile")
        print(f"  Profile ready after {attempt + 1}s")
        break
    time.sleep(1)

check("Voice profile becomes ready within 20s", profile is not None,
      "Timed out — check uvicorn logs for stylometry errors")

if profile:
    check("Voice profile has 12 features", len(profile) == 12,
          f"Got {len(profile)} keys: {list(profile.keys())}")
    expected_keys = [
        "avg_sentence_length", "avg_word_length", "type_token_ratio",
        "passive_voice_ratio", "flesch_reading_ease", "flesch_kincaid_grade",
        "top_punctuation", "conjunction_frequency", "adverb_frequency",
        "first_person_ratio", "paragraph_length_avg", "transition_word_ratio",
    ]
    missing = [k for k in expected_keys if k not in profile]
    check("All 12 expected keys present", len(missing) == 0, f"Missing: {missing}")

# ── Personalized AI enhance ───────────────────────────────────────────────────
print("\n=== Personalized AI Enhance ===")
r = requests.post(
    f"{BASE}/api/ai/enhance",
    json={"selected_text": "The cat sat on the mat.", "instruction": "Rewrite in my style."},
    headers=AUTH,
    stream=True,
    timeout=30,
)
check("POST /api/ai/enhance → 200", r.status_code == 200, f"Got {r.status_code}")
if r.status_code == 200:
    chunks = []
    sse_error = None
    for line in r.iter_lines():
        if not line:
            continue
        decoded = line.decode() if isinstance(line, bytes) else line
        if not decoded.startswith("data: "):
            continue
        data_str = decoded[6:].strip()
        if data_str == "[DONE]":
            break
        try:
            parsed = json.loads(data_str)
            if "text" in parsed:
                chunks.append(parsed["text"])
            elif "error" in parsed:
                sse_error = parsed
        except Exception:
            pass
    if sse_error and sse_error.get("status") == 429:
        PASS_LIST.append("Personalized AI enhance [SKIPPED — Gemini quota]")
        print("  SKIP  Personalized AI enhance — Gemini 429 quota")
    else:
        check("Personalized enhance returns text chunks", len(chunks) > 0,
              str(sse_error) if sse_error else "No chunks received")

# ── Delete sample ─────────────────────────────────────────────────────────────
print("\n=== Delete & Re-analyze ===")
if sample_ids:
    r = requests.delete(f"{BASE}/api/samples/{sample_ids[0]}", headers=AUTH)
    check("DELETE sample → 204", r.status_code == 204, f"Got {r.status_code}")
    r = requests.get(f"{BASE}/api/samples", headers=AUTH)
    remaining = r.json() if r.status_code == 200 else []
    check("Sample count decreased after delete", len(remaining) < 5,
          f"Still {len(remaining)} samples")

# ── Cleanup ───────────────────────────────────────────────────────────────────
r = requests.get(f"{BASE}/api/samples", headers=AUTH)
for s in (r.json() if r.status_code == 200 else []):
    requests.delete(f"{BASE}/api/samples/{s['id']}", headers=AUTH)
print("\n  Cleanup done")

# ── Results ───────────────────────────────────────────────────────────────────
print(f"\n{'=' * 50}")
print(f"RESULTS: {len(PASS_LIST)} passed, {len(FAIL_LIST)} failed")
if FAIL_LIST:
    print("\nFailed tests:")
    for f in FAIL_LIST:
        print(f"  FAILED: {f}")
    sys.exit(1)
else:
    print("All Sprint 4 backend tests passed! ✓")
    sys.exit(0)
