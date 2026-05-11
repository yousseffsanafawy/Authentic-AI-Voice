"""
Authentic AI Voice — Full Backend Test Suite
Run from: backend/ directory with venv active
Usage: python test_all_endpoints.py

Tests every endpoint, verifies status codes and response shapes.
Prints a summary at the end.
"""

import sys
import requests
import json

BASE = "http://localhost:8000"
PASS = []
FAIL = []

def ok(name):
    PASS.append(name)
    print(f"  PASS  {name}")

def fail(name, reason):
    FAIL.append(name)
    print(f"  FAIL  {name} — {reason}")

def check(name, condition, reason="assertion failed"):
    if condition:
        ok(name)
    else:
        fail(name, reason)

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ── 1. Health ──────────────────────────────────────────────────
section("1. Health check")
try:
    r = requests.get(f"{BASE}/health", timeout=5)
    check("GET /health → 200", r.status_code == 200)
    check("GET /health → {status: ok}", r.json().get("status") == "ok")
except Exception as e:
    fail("GET /health", f"Cannot reach server: {e}")
    print("\nServer not reachable. Make sure uvicorn is running.\n")
    sys.exit(1)

# ── 2. Auth — Register ─────────────────────────────────────────
section("2. Auth — Register")

EMAIL = "testuser_auto@example.com"
PASSWORD = "testpass123"
TOKEN = None
USER_ID = None

# Clean start: try login first to get token for cleanup
try:
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code == 200:
        TOKEN = r.json()["access_token"]
        USER_ID = r.json()["user"]["id"]
except Exception:
    pass

# Register new user
r = requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD})
if r.status_code == 201:
    check("POST /api/auth/register → 201", True)
    check("register returns access_token", "access_token" in r.json())
    check("register returns user.email", r.json().get("user", {}).get("email") == EMAIL)
    check("register does not return password", "password" not in r.json().get("user", {}))
    check("register does not return hashed_password", "hashed_password" not in r.json().get("user", {}))
    TOKEN = r.json()["access_token"]
    USER_ID = r.json()["user"]["id"]
elif r.status_code == 409:
    # User already exists — get token via login
    r2 = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r2.status_code == 200:
        TOKEN = r2.json()["access_token"]
        USER_ID = r2.json()["user"]["id"]
        ok("POST /api/auth/register → 201 (user existed, using login token)")
    else:
        fail("POST /api/auth/register", f"Got 409 and login also failed: {r2.text}")
else:
    fail("POST /api/auth/register → 201", f"Got {r.status_code}: {r.text}")

# Duplicate email → 409
r = requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD})
check("POST /api/auth/register duplicate → 409", r.status_code == 409,
      f"Got {r.status_code}")

# Short password → 422
r = requests.post(f"{BASE}/api/auth/register", json={"email": "new2@example.com", "password": "short"})
check("POST /api/auth/register short password → 422", r.status_code == 422,
      f"Got {r.status_code}")

# ── 3. Auth — Login ────────────────────────────────────────────
section("3. Auth — Login")

r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
check("POST /api/auth/login → 200", r.status_code == 200, f"Got {r.status_code}: {r.text}")
if r.status_code == 200:
    check("login returns access_token", "access_token" in r.json())
    TOKEN = r.json()["access_token"]  # refresh token

r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": "wrongpass"})
check("POST /api/auth/login wrong password → 401", r.status_code == 401,
      f"Got {r.status_code}")

r = requests.post(f"{BASE}/api/auth/login", json={"email": "nobody@example.com", "password": "testpass123"})
check("POST /api/auth/login unknown email → 401", r.status_code == 401,
      f"Got {r.status_code}")

# ── 4. Auth — Me ───────────────────────────────────────────────
section("4. Auth — /me")

AUTH = {"Authorization": f"Bearer {TOKEN}"}

r = requests.get(f"{BASE}/api/auth/me", headers=AUTH)
check("GET /api/auth/me → 200", r.status_code == 200, f"Got {r.status_code}: {r.text}")
if r.status_code == 200:
    check("/me returns correct email", r.json().get("email") == EMAIL)
    check("/me does not return hashed_password", "hashed_password" not in r.json())

r = requests.get(f"{BASE}/api/auth/me")
check("GET /api/auth/me no token → 401", r.status_code == 401, f"Got {r.status_code}")

r = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": "Bearer fake.token.here"})
check("GET /api/auth/me bad token → 401", r.status_code == 401, f"Got {r.status_code}")

# ── 5. Documents — CRUD ────────────────────────────────────────
section("5. Documents — CRUD")

DOC_ID = None

# No token → 401
r = requests.get(f"{BASE}/api/documents")
check("GET /api/documents no token → 401", r.status_code == 401, f"Got {r.status_code}")

# List (authenticated, empty or existing)
r = requests.get(f"{BASE}/api/documents", headers=AUTH)
check("GET /api/documents → 200", r.status_code == 200, f"Got {r.status_code}: {r.text}")
check("GET /api/documents returns list", isinstance(r.json(), list))

# Create
r = requests.post(f"{BASE}/api/documents",
    json={"title": "Test Document"},
    headers=AUTH)
check("POST /api/documents → 201", r.status_code == 201, f"Got {r.status_code}: {r.text}")
if r.status_code == 201:
    DOC_ID = r.json().get("id")
    check("create doc returns id", bool(DOC_ID))
    check("create doc returns title", r.json().get("title") == "Test Document")
    check("create doc scoped to user", r.json().get("user_id") == USER_ID)

# Create without token → 401
r = requests.post(f"{BASE}/api/documents", json={"title": "Hacked"})
check("POST /api/documents no token → 401", r.status_code == 401, f"Got {r.status_code}")

if DOC_ID:
    # Get single doc
    r = requests.get(f"{BASE}/api/documents/{DOC_ID}", headers=AUTH)
    check("GET /api/documents/{id} → 200", r.status_code == 200, f"Got {r.status_code}")

    # Get non-existent
    r = requests.get(f"{BASE}/api/documents/nonexistent-id-xyz", headers=AUTH)
    check("GET /api/documents/bad-id → 404", r.status_code == 404, f"Got {r.status_code}")

    # Patch title
    r = requests.patch(f"{BASE}/api/documents/{DOC_ID}",
        json={"title": "Updated Title"},
        headers=AUTH)
    check("PATCH /api/documents/{id} → 200", r.status_code == 200, f"Got {r.status_code}: {r.text}")
    if r.status_code == 200:
        check("patch updates title", r.json().get("title") == "Updated Title")

    # Patch content (Tiptap JSON)
    tiptap_json = {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello world"}]}]}
    r = requests.patch(f"{BASE}/api/documents/{DOC_ID}",
        json={"content": tiptap_json, "content_text": "Hello world", "word_count": 2},
        headers=AUTH)
    check("PATCH /api/documents/{id} content → 200", r.status_code == 200, f"Got {r.status_code}: {r.text}")

    # Patch no token → 401
    r = requests.patch(f"{BASE}/api/documents/{DOC_ID}", json={"title": "X"})
    check("PATCH /api/documents/{id} no token → 401", r.status_code == 401, f"Got {r.status_code}")

# ── 6. Document ownership isolation ────────────────────────────
section("6. Document ownership isolation")

EMAIL2 = "testuser2_auto@example.com"
r2 = requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL2, "password": "testpass456"})
if r2.status_code in (201, 409):
    if r2.status_code == 409:
        r2 = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL2, "password": "testpass456"})
    TOKEN2 = r2.json()["access_token"]
    AUTH2 = {"Authorization": f"Bearer {TOKEN2}"}

    if DOC_ID:
        # User 2 tries to get User 1's document → 404
        r = requests.get(f"{BASE}/api/documents/{DOC_ID}", headers=AUTH2)
        check("User B cannot GET User A's document → 404", r.status_code == 404,
              f"Got {r.status_code} (security issue!)")

        # User 2 tries to patch User 1's document → 404
        r = requests.patch(f"{BASE}/api/documents/{DOC_ID}", json={"title": "Hacked"}, headers=AUTH2)
        check("User B cannot PATCH User A's document → 404", r.status_code == 404,
              f"Got {r.status_code} (security issue!)")

        # User 2's list should NOT contain User 1's doc
        r = requests.get(f"{BASE}/api/documents", headers=AUTH2)
        ids = [d["id"] for d in r.json()]
        check("User B's list does not contain User A's doc", DOC_ID not in ids,
              f"User isolation broken! doc_id {DOC_ID} appeared in User B's list")
else:
    fail("ownership isolation", f"Could not create/login second user: {r2.text}")

# ── 7. Export PDF ──────────────────────────────────────────────
section("7. Export — PDF")

if DOC_ID:
    # No token → 401
    r = requests.post(f"{BASE}/api/export/pdf", json={"doc_id": DOC_ID})
    check("POST /api/export/pdf no token → 401", r.status_code == 401, f"Got {r.status_code}")

    # With token
    r = requests.post(f"{BASE}/api/export/pdf", json={"doc_id": DOC_ID}, headers=AUTH)
    check("POST /api/export/pdf → 200", r.status_code == 200, f"Got {r.status_code}: {r.text[:200]}")
    if r.status_code == 200:
        check("PDF response has content-type application/pdf",
              "application/pdf" in r.headers.get("content-type", ""),
              f"Got: {r.headers.get('content-type')}")
        check("PDF response has content-disposition attachment",
              "attachment" in r.headers.get("content-disposition", ""),
              f"Got: {r.headers.get('content-disposition')}")
        check("PDF response body is non-empty", len(r.content) > 0)

    # Wrong doc_id → 404
    r = requests.post(f"{BASE}/api/export/pdf", json={"doc_id": "bad-id-xyz"}, headers=AUTH)
    check("POST /api/export/pdf bad id → 404", r.status_code == 404, f"Got {r.status_code}")

    # User B cannot export User A's doc
    if TOKEN2:
        r = requests.post(f"{BASE}/api/export/pdf", json={"doc_id": DOC_ID}, headers=AUTH2)
        check("User B cannot export User A's PDF → 404", r.status_code == 404, f"Got {r.status_code}")

# ── 8. Samples ─────────────────────────────────────────────────
section("8. Writing Samples")

# List (empty)
r = requests.get(f"{BASE}/api/samples", headers=AUTH)
check("GET /api/samples → 200", r.status_code == 200, f"Got {r.status_code}: {r.text}")
check("GET /api/samples returns list", isinstance(r.json(), list))

# Upload txt
sample_text = b"This is a sample writing text. It has multiple sentences. I enjoy writing."
r = requests.post(
    f"{BASE}/api/samples/upload",
    files={"file": ("sample.txt", sample_text, "text/plain")},
    headers=AUTH
)
check("POST /api/samples/upload txt → 201", r.status_code == 201, f"Got {r.status_code}: {r.text}")
SAMPLE_ID = None
if r.status_code == 201:
    SAMPLE_ID = r.json().get("id")
    check("upload returns id", bool(SAMPLE_ID))

# Wrong extension
r = requests.post(
    f"{BASE}/api/samples/upload",
    files={"file": ("bad.exe", b"data", "application/octet-stream")},
    headers=AUTH
)
check("POST /api/samples/upload bad ext → 400", r.status_code == 400, f"Got {r.status_code}")

# No token
r = requests.post(
    f"{BASE}/api/samples/upload",
    files={"file": ("sample.txt", b"text", "text/plain")},
)
check("POST /api/samples/upload no token → 401", r.status_code == 401, f"Got {r.status_code}")

# Voice profile
r = requests.get(f"{BASE}/api/samples/voice-profile", headers=AUTH)
check("GET /api/samples/voice-profile → 200", r.status_code == 200, f"Got {r.status_code}: {r.text}")

# Delete sample
if SAMPLE_ID:
    r = requests.delete(f"{BASE}/api/samples/{SAMPLE_ID}", headers=AUTH)
    check("DELETE /api/samples/{id} → 204", r.status_code == 204, f"Got {r.status_code}: {r.text}")

# ── 9. AI Enhance ──────────────────────────────────────────────
section("9. AI Enhance")

# No token → 401
r = requests.post(f"{BASE}/api/enhance",
    json={"selected_text": "Hello", "instruction": "improve"},
    stream=True)
check("POST /api/enhance no token → 401", r.status_code == 401, f"Got {r.status_code}")

# With token — verify SSE stream starts (don't consume all)
r = requests.post(
    f"{BASE}/api/enhance",
    json={"selected_text": "The cat sat on the mat.", "instruction": "Make this more vivid."},
    headers=AUTH,
    stream=True,
    timeout=15
)
check("POST /api/enhance with token → 200", r.status_code == 200, f"Got {r.status_code}: {r.text[:200] if r.status_code != 200 else ''}")
if r.status_code == 200:
    check("POST /api/enhance content-type SSE",
          "text/event-stream" in r.headers.get("content-type", ""),
          f"Got: {r.headers.get('content-type')}")

# ── 10. Delete document ────────────────────────────────────────
section("10. Document delete")

if DOC_ID:
    r = requests.delete(f"{BASE}/api/documents/{DOC_ID}", headers=AUTH)
    check("DELETE /api/documents/{id} → 204", r.status_code == 204, f"Got {r.status_code}")

    # Confirm gone
    r = requests.get(f"{BASE}/api/documents/{DOC_ID}", headers=AUTH)
    check("GET deleted document → 404", r.status_code == 404, f"Got {r.status_code}")

# ── Summary ────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"  RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
print(f"{'='*60}")
if FAIL:
    print("\nFailed tests:")
    for f in FAIL:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("\nAll tests passed!")
    sys.exit(0)
