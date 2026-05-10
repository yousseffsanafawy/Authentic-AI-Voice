"""
Sprint 2 — Backend Auth Flow Acceptance Test
Run: python test_auth_flow.py
Requires: backend running on port 8000  (uvicorn app.main:app --reload)
"""
import sys
import requests

BASE = "http://localhost:8000"
EMAIL = "test@example.com"
PASSWORD = "testpass123"


def check(label: str, response: requests.Response, expected: int):
    if response.status_code != expected:
        print(f"✗ {label} — expected {expected}, got {response.status_code}: {response.text}")
        sys.exit(1)
    print(f"✓ {label}")


# ── 1. Register ───────────────────────────────────────────────────────────────
r = requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD})
check("Register", r, 201)
token = r.json()["access_token"]
print(f"  token: {token[:20]}...")

headers = {"Authorization": f"Bearer {token}"}

# ── 2. Login ──────────────────────────────────────────────────────────────────
r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
check("Login", r, 200)

# ── 3. /me ────────────────────────────────────────────────────────────────────
r = requests.get(f"{BASE}/api/auth/me", headers=headers)
check("/me with valid token", r, 200)
print(f"  email: {r.json()['email']}")

# ── 4. Create document ────────────────────────────────────────────────────────
r = requests.post(f"{BASE}/api/documents", json={"title": "Test Doc"}, headers=headers)
check("Create document", r, 201)
doc_id = r.json()["id"]
print(f"  doc_id: {doc_id}")

# ── 5. List documents ─────────────────────────────────────────────────────────
r = requests.get(f"{BASE}/api/documents", headers=headers)
check("List documents (authenticated)", r, 200)
assert any(d["id"] == doc_id for d in r.json()), "Created doc not in list!"

# ── 6. Unauthenticated → 401 ──────────────────────────────────────────────────
r = requests.get(f"{BASE}/api/documents")
check("Unauthenticated list → 401", r, 401)

# ── 7. Wrong password → 401 ───────────────────────────────────────────────────
r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": "wrongpass"})
check("Wrong password → 401", r, 401)

# ── 8. Duplicate email → 409 ─────────────────────────────────────────────────
r = requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD})
check("Duplicate email → 409", r, 409)

# ── 9. Export without token → 401 ────────────────────────────────────────────
r = requests.post(f"{BASE}/api/export/pdf", json={"doc_id": doc_id})
check("Export without token → 401", r, 401)

# ── 10. Health check (public) ────────────────────────────────────────────────
r = requests.get(f"{BASE}/health")
check("GET /health (public)", r, 200)

print("\n🎉 All backend auth tests passed!")
