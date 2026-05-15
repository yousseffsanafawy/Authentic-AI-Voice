"""
Sprint 3 integration tests: AI enhance + version history.
Run from backend/ with venv active and server running on port 8000:
    python test_sprint3.py
"""
import json
import sys
import time

import requests

BASE = "http://localhost:8000"
PASS: list[str] = []
FAIL: list[str] = []

TEST_EMAIL    = "testuser_sprint3@example.com"
TEST_PASSWORD = "testpass123"


def check(name: str, cond: bool, reason: str = "") -> None:
    if cond:
        PASS.append(name)
        print(f"  PASS  {name}")
    else:
        FAIL.append(name)
        print(f"  FAIL  {name}" + (f" — {reason}" if reason else ""))


# ── Setup: ensure test user exists, then login ────────────────────────────────

print("=== Setup ===")
requests.post(f"{BASE}/api/auth/register",
    json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
# 400 = already registered — both outcomes are fine here

r = requests.post(f"{BASE}/api/auth/login",
    json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
AUTH = {"Authorization": f"Bearer {r.json()['access_token']}"}
print("  Login OK")

# Create a fresh document for this run
r = requests.post(f"{BASE}/api/documents",
    json={"title": "Sprint3 AI Test Doc"}, headers=AUTH)
assert r.status_code == 201, f"Doc create failed: {r.status_code} {r.text}"
doc_id = r.json()["id"]
print(f"  Document created: {doc_id}")


# ── AI Enhance ────────────────────────────────────────────────────────────────

print("\n=== AI Enhance ===")

# No token → 401
r = requests.post(f"{BASE}/api/ai/enhance",
    json={"selected_text": "Hello", "instruction": "improve"}, stream=True)
check("POST /api/ai/enhance no token → 401",
    r.status_code == 401, f"Got {r.status_code}")

# Empty text → 422
r = requests.post(f"{BASE}/api/ai/enhance",
    json={"selected_text": "", "instruction": "improve"}, headers=AUTH)
check("POST /api/ai/enhance empty text → 422",
    r.status_code == 422, f"Got {r.status_code}")

# Text over 5000 chars → 422
r = requests.post(f"{BASE}/api/ai/enhance",
    json={"selected_text": "x" * 5001, "instruction": "improve"}, headers=AUTH)
check("POST /api/ai/enhance >5000 chars → 422",
    r.status_code == 422, f"Got {r.status_code}")

# Valid request — SSE stream
r = requests.post(f"{BASE}/api/ai/enhance",
    json={"selected_text": "The quick fox jumped.", "instruction": "Make this more formal."},
    headers=AUTH, stream=True, timeout=30)
check("POST /api/ai/enhance valid → 200",
    r.status_code == 200, f"Got {r.status_code}")

if r.status_code == 200:
    check("SSE Content-Type is text/event-stream",
        "text/event-stream" in r.headers.get("content-type", ""))

    chunks: list[str] = []
    for line in r.iter_lines():
        if not line:
            continue
        decoded = line.decode() if isinstance(line, bytes) else line
        if not decoded.startswith("data: "):
            continue
        data = decoded[6:].strip()
        if data == "[DONE]":
            break
        try:
            parsed = json.loads(data)
            if "text" in parsed:
                chunks.append(parsed["text"])
            elif "error" in parsed:
                # Surface Gemini errors clearly in test output
                print(f"    [SSE error event] {parsed}")
        except json.JSONDecodeError:
            pass

    check("SSE delivers at least one text chunk",
        len(chunks) > 0, f"Got {len(chunks)} chunks")
    check("Combined SSE response is non-empty",
        len("".join(chunks)) > 0)


# ── Rate Limiting ─────────────────────────────────────────────────────────────

print("\n=== Rate Limiting ===")

# Burn through 10 allowed requests (stream=True so they complete fast)
print("  Sending 10 baseline requests...")
for i in range(10):
    requests.post(f"{BASE}/api/ai/enhance",
        json={"selected_text": f"rate limit test {i}", "instruction": "improve"},
        headers=AUTH, stream=True, timeout=30)

# 11th must be rejected before hitting Gemini
r = requests.post(f"{BASE}/api/ai/enhance",
    json={"selected_text": "over the limit", "instruction": "improve"},
    headers=AUTH, timeout=10)
check("11th request within 60s → 429",
    r.status_code == 429, f"Got {r.status_code}: {r.text[:120]}")
check("429 detail mentions rate limit",
    "Rate limit exceeded" in r.text, f"Body: {r.text[:120]}")


# ── Version History ───────────────────────────────────────────────────────────

print("\n=== Version History ===")

# PATCH the document 10 times to trigger the auto-snapshot
print("  PATCHing document 10 times...")
for i in range(10):
    rp = requests.patch(f"{BASE}/api/documents/{doc_id}",
        json={
            "content": {"type": "doc", "content": []},
            "content_text": f"save iteration {i}",
            "word_count": i,
        },
        headers=AUTH)
    assert rp.status_code == 200, f"PATCH {i} failed: {rp.status_code} {rp.text}"

r = requests.get(f"{BASE}/api/documents/{doc_id}/versions", headers=AUTH)
check("GET /versions → 200", r.status_code == 200, f"Got {r.status_code}: {r.text[:80]}")
if r.status_code == 200:
    versions = r.json()
    check("Auto-snapshot exists after 10 PATCHes",
        len(versions) >= 1, f"Got {len(versions)} versions")

# Manual snapshot
r = requests.post(f"{BASE}/api/documents/{doc_id}/versions", headers=AUTH)
check("POST manual snapshot → 201",
    r.status_code == 201, f"Got {r.status_code}: {r.text[:80]}")
if r.status_code == 201:
    vnum = r.json().get("version_number")
    check("Manual snapshot has version_number",
        vnum is not None, f"Got: {r.json()}")

    # Fetch that specific version back
    r2 = requests.get(f"{BASE}/api/documents/{doc_id}/versions/{vnum}", headers=AUTH)
    check(f"GET /versions/{vnum} → 200",
        r2.status_code == 200, f"Got {r2.status_code}: {r2.text[:80]}")
    if r2.status_code == 200:
        check(f"GET /versions/{vnum} returns content field",
            "content" in r2.json(), f"Keys: {list(r2.json().keys())}")

# Ownership isolation: a second token must not see doc_id's versions
r_reg = requests.post(f"{BASE}/api/auth/register",
    json={"email": "other_sprint3@example.com", "password": "otherpass123"})
r_log = requests.post(f"{BASE}/api/auth/login",
    json={"email": "other_sprint3@example.com", "password": "otherpass123"})
if r_log.status_code == 200:
    other_auth = {"Authorization": f"Bearer {r_log.json()['access_token']}"}
    r_other = requests.get(f"{BASE}/api/documents/{doc_id}/versions", headers=other_auth)
    check("Other user GET versions → 404",
        r_other.status_code == 404, f"Got {r_other.status_code}")


# ── Cleanup ───────────────────────────────────────────────────────────────────

requests.delete(f"{BASE}/api/documents/{doc_id}", headers=AUTH)
print("  Cleanup done")


# ── Results ───────────────────────────────────────────────────────────────────

print(f"\n{'=' * 50}")
print(f"RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    for f in FAIL:
        print(f"  FAILED: {f}")
    sys.exit(1)
else:
    print("All Sprint 3 backend tests passed!")
    sys.exit(0)
