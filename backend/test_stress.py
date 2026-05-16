"""
Sprint 3 Backend Stress Tests
==============================
Aggressively tests two Sprint 3 features:
  1. Rate limiter on POST /api/ai/enhance  (60-second sliding window, max 10 req/user)
  2. Concurrent PATCH /api/documents/{id}  (15-20 simultaneous saves → auto-snapshot every 10th)

Usage (from backend/, with venv active, server on :8000):
    pip install aiohttp
    python test_stress.py

The server must be running before executing this script:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from collections import Counter
from typing import Any

try:
    import aiohttp
except ImportError:
    sys.exit("ERROR: aiohttp not installed. Run: pip install aiohttp")

# ── Config ────────────────────────────────────────────────────────────────────
BASE = "http://localhost:8000"

# Dedicated stress-test accounts (isolated from other tests)
STRESS_EMAIL    = "stress_test_sprint3@example.com"
STRESS_PASSWORD = "StressTest!99"
OTHER_EMAIL     = "stress_other_sprint3@example.com"
OTHER_PASSWORD  = "OtherStress!99"

CONCURRENT_PATCHES = 18   # number of simultaneous PATCH requests

RATE_LIMIT     = 10       # must match ai.py RATE_LIMIT
RATE_WINDOW    = 60.0     # must match ai.py RATE_WINDOW

# ── Result tracking ───────────────────────────────────────────────────────────
PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, cond: bool, reason: str = "") -> None:
    if cond:
        PASS.append(name)
        print(f"  ✔  PASS  {name}")
    else:
        FAIL.append(name)
        print(f"  ✘  FAIL  {name}" + (f"  ← {reason}" if reason else ""))


def section(title: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


# ── HTTP helpers ──────────────────────────────────────────────────────────────

async def register(session: aiohttp.ClientSession, email: str, password: str) -> None:
    """Register a user; ignore 400 (already exists)."""
    await session.post(
        f"{BASE}/api/auth/register",
        json={"email": email, "password": password},
    )


async def login(session: aiohttp.ClientSession, email: str, password: str) -> str:
    """Log in and return the Bearer token. Raises on failure."""
    async with session.post(
        f"{BASE}/api/auth/login",
        json={"email": email, "password": password},
    ) as r:
        assert r.status == 200, f"Login failed for {email}: {r.status} {await r.text()}"
        data = await r.json()
        return data["access_token"]


async def create_doc(session: aiohttp.ClientSession, auth: dict, title: str) -> str:
    """Create a document and return its ID."""
    async with session.post(
        f"{BASE}/api/documents",
        json={"title": title},
        headers=auth,
    ) as r:
        assert r.status == 201, f"Doc create failed: {r.status} {await r.text()}"
        return (await r.json())["id"]


async def delete_doc(session: aiohttp.ClientSession, auth: dict, doc_id: str) -> None:
    """Best-effort document cleanup."""
    await session.delete(f"{BASE}/api/documents/{doc_id}", headers=auth)


# ── Stress test 1: Rate Limiter ───────────────────────────────────────────────

async def stress_rate_limiter(session: aiohttp.ClientSession, auth: dict) -> None:
    section("STRESS TEST 1 · Rate Limiter (POST /api/ai/enhance)")

    enhance_url = f"{BASE}/api/ai/enhance"
    payload = {"selected_text": "Hello world.", "instruction": "Improve this."}

    # ── Phase A: fire exactly RATE_LIMIT requests; all should be accepted (2xx or SSE) ──
    print(f"  Phase A: sending {RATE_LIMIT} simultaneous requests (all should pass)...")
    tasks_a = [
        session.post(enhance_url, json=payload, headers=auth)
        for _ in range(RATE_LIMIT)
    ]
    responses_a: list[aiohttp.ClientResponse] = await asyncio.gather(*tasks_a)
    statuses_a = [r.status for r in responses_a]
    for r in responses_a:
        r.release()

    non_429_count = sum(1 for s in statuses_a if s != 429)
    check(
        f"All {RATE_LIMIT} concurrent requests within window are NOT rate-limited",
        non_429_count == RATE_LIMIT,
        f"Got statuses: {Counter(statuses_a)}",
    )

    # ── Phase B: immediately fire RATE_LIMIT more requests; they must all be 429 ──
    print(f"\n  Phase B: sending {RATE_LIMIT} more requests immediately (all must be 429)...")
    tasks_b = [
        session.post(enhance_url, json=payload, headers=auth)
        for _ in range(RATE_LIMIT)
    ]
    responses_b: list[aiohttp.ClientResponse] = await asyncio.gather(*tasks_b)
    statuses_b = []
    for r in responses_b:
        statuses_b.append(r.status)
        r.release()

    all_429 = all(s == 429 for s in statuses_b)
    check(
        f"All {RATE_LIMIT} requests after limit are rejected with 429",
        all_429,
        f"Got statuses: {Counter(statuses_b)}",
    )

    # ── Phase C: single extra request must also be 429 ──
    print("\n  Phase C: one more individual request (must be 429)...")
    async with session.post(enhance_url, json=payload, headers=auth) as r:
        check(
            "Individual request over rate limit → 429",
            r.status == 429,
            f"Got {r.status}",
        )
        body_text = await r.text()
        check(
            "429 response body mentions rate limit",
            "Rate limit exceeded" in body_text or "rate limit" in body_text.lower(),
            f"Body: {body_text[:150]}",
        )

    # ── Phase D: a DIFFERENT user is NOT blocked by first user's quota ──
    print("\n  Phase D: verifying other user is unaffected...")
    async with aiohttp.ClientSession() as other_session:
        await register(other_session, OTHER_EMAIL, OTHER_PASSWORD)
        other_token = await login(other_session, OTHER_EMAIL, OTHER_PASSWORD)
        other_auth = {"Authorization": f"Bearer {other_token}"}

        async with other_session.post(
            enhance_url, json=payload, headers=other_auth
        ) as r2:
            check(
                "Different user is NOT rate-limited by first user's quota",
                r2.status != 429,
                f"Got {r2.status}",
            )

    # ── Phase E: unauthenticated request → 401 (never reaches rate limiter) ──
    print("\n  Phase E: unauthenticated request → 401...")
    async with session.post(enhance_url, json=payload) as r:
        check(
            "No-token request → 401 (not 429, rate limiter not reached)",
            r.status == 401,
            f"Got {r.status}",
        )

    # ── Phase F: validation errors → 422 (hits schema layer before rate limiter) ──
    print("\n  Phase F: empty selected_text → 422...")
    async with session.post(
        enhance_url,
        json={"selected_text": "", "instruction": "improve"},
        headers=auth,
    ) as r:
        check(
            "Empty selected_text → 422 (validation, before rate limiter)",
            r.status == 422,
            f"Got {r.status}",
        )


# ── Stress test 2: Concurrent PATCH / auto-snapshot ──────────────────────────

async def _patch_once(
    session: aiohttp.ClientSession,
    auth: dict,
    doc_id: str,
    i: int,
) -> tuple[int, Any]:
    """Send one PATCH and return (status_code, response_json)."""
    payload = {
        "content":      {"type": "doc", "content": [{"type": "paragraph"}]},
        "content_text": f"concurrent stress iteration {i}",
        "word_count":   i,
    }
    try:
        async with session.patch(
            f"{BASE}/api/documents/{doc_id}",
            json=payload,
            headers=auth,
        ) as r:
            try:
                body = await r.json()
            except Exception:
                body = await r.text()
            return r.status, body
    except Exception as exc:
        return -1, str(exc)


async def stress_concurrent_patch(session: aiohttp.ClientSession, auth: dict) -> None:
    section(f"STRESS TEST 2 · Concurrent PATCH × {CONCURRENT_PATCHES} (auto-snapshot)")

    doc_id = await create_doc(session, auth, "Stress PATCH Doc")
    print(f"  Document ID: {doc_id}")

    # ── Phase A: fire CONCURRENT_PATCHES requests simultaneously ──
    print(f"\n  Phase A: firing {CONCURRENT_PATCHES} PATCH requests concurrently...")
    t0 = time.perf_counter()
    results = await asyncio.gather(
        *[_patch_once(session, auth, doc_id, i) for i in range(CONCURRENT_PATCHES)]
    )
    elapsed = time.perf_counter() - t0

    statuses = [s for s, _ in results]
    bodies   = [b for _, b in results]

    ok_count    = sum(1 for s in statuses if s == 200)
    error_count = sum(1 for s in statuses if s not in (200, 200))
    crash_count = sum(1 for s in statuses if s == -1)

    print(f"  Completed in {elapsed:.2f}s — statuses: {Counter(statuses)}")

    check(
        f"All {CONCURRENT_PATCHES} concurrent PATCHes return 200 (no DB crash)",
        all(s == 200 for s in statuses),
        f"Non-200 statuses: {[s for s in statuses if s != 200]}",
    )
    check(
        "No connection errors / exceptions during concurrent PATCHes",
        crash_count == 0,
        f"{crash_count} requests raised an exception",
    )
    check(
        "Each 200 response contains 'current_version' field",
        all(
            isinstance(b, dict) and "current_version" in b
            for s, b in results if s == 200
        ),
        "Some 200 responses missing 'current_version'",
    )

    # ── Phase B: verify auto-snapshot was created (10th PATCH triggers it) ──
    print("\n  Phase B: checking that auto-snapshot was created...")
    async with session.get(
        f"{BASE}/api/documents/{doc_id}/versions", headers=auth
    ) as r:
        check(
            "GET /versions → 200 after concurrent PATCHes",
            r.status == 200,
            f"Got {r.status}",
        )
        if r.status == 200:
            versions = await r.json()
            check(
                f"At least 1 auto-snapshot exists after {CONCURRENT_PATCHES} PATCHes",
                len(versions) >= 1,
                f"Got {len(versions)} versions",
            )
            if versions:
                v = versions[0]
                check(
                    "Auto-snapshot has required fields (id, version_number, created_at)",
                    all(k in v for k in ("id", "version_number", "created_at")),
                    f"Keys present: {list(v.keys())}",
                )

    # ── Phase C: manual snapshot on top ──
    print("\n  Phase C: saving manual snapshot...")
    async with session.post(
        f"{BASE}/api/documents/{doc_id}/versions", headers=auth
    ) as r:
        check(
            "POST manual snapshot after concurrent PATCHes → 201",
            r.status == 201,
            f"Got {r.status}: {(await r.text())[:80]}",
        )
        if r.status == 201:
            snap = await r.json()
            vnum = snap.get("version_number")
            check(
                "Manual snapshot response has version_number",
                vnum is not None,
                f"Got: {snap}",
            )

            # Fetch it back and verify content
            async with session.get(
                f"{BASE}/api/documents/{doc_id}/versions/{vnum}",
                headers=auth,
            ) as r2:
                check(
                    f"GET /versions/{vnum} → 200",
                    r2.status == 200,
                    f"Got {r2.status}",
                )
                if r2.status == 200:
                    data2 = await r2.json()
                    check(
                        "Fetched snapshot contains 'content' field",
                        "content" in data2,
                        f"Keys: {list(data2.keys())}",
                    )

    # ── Phase D: concurrent save does not expose another user's data ──
    print("\n  Phase D: ownership isolation under concurrent load...")
    async with aiohttp.ClientSession() as other_session:
        await register(other_session, OTHER_EMAIL, OTHER_PASSWORD)
        other_token = await login(other_session, OTHER_EMAIL, OTHER_PASSWORD)
        other_auth = {"Authorization": f"Bearer {other_token}"}

        async with other_session.get(
            f"{BASE}/api/documents/{doc_id}/versions", headers=other_auth
        ) as r:
            check(
                "Different user cannot access versions of stress doc (→ 404)",
                r.status == 404,
                f"Got {r.status}",
            )

    # ── Cleanup ──
    await delete_doc(session, auth, doc_id)
    print("  Cleanup: document deleted.")


# ── Phase E: rapid sequential PATCHes to confirm snapshot triggers exactly ────

async def stress_snapshot_trigger(session: aiohttp.ClientSession, auth: dict) -> None:
    section("STRESS TEST 3 · Snapshot Trigger Precision (sequential PATCHes × 20)")

    doc_id = await create_doc(session, auth, "Snapshot Trigger Doc")
    print(f"  Document ID: {doc_id}")

    # Send exactly 20 sequential PATCHes
    for i in range(20):
        async with session.patch(
            f"{BASE}/api/documents/{doc_id}",
            json={
                "content":      {"type": "doc", "content": []},
                "content_text": f"edit {i}",
                "word_count":   i,
            },
            headers=auth,
        ) as r:
            assert r.status == 200, f"PATCH {i} failed: {r.status}"

    # Expect exactly 2 auto-snapshots (at save 10 and save 20)
    async with session.get(
        f"{BASE}/api/documents/{doc_id}/versions", headers=auth
    ) as r:
        check("GET /versions → 200 after 20 sequential PATCHes", r.status == 200)
        if r.status == 200:
            versions = await r.json()
            check(
                "Exactly 2 auto-snapshots after 20 PATCHes (every 10th)",
                len(versions) == 2,
                f"Got {len(versions)} versions: {[v.get('version_number') for v in versions]}",
            )
            version_numbers = sorted(v["version_number"] for v in versions)
            check(
                "Auto-snapshots are at version_number 10 and 20",
                version_numbers == [10, 20],
                f"Got version_numbers: {version_numbers}",
            )

    await delete_doc(session, auth, doc_id)
    print("  Cleanup: document deleted.")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("=" * 60)
    print("  AUTHENTIC AI VOICE — Sprint 3 Backend STRESS TESTS")
    print("=" * 60)
    print(f"  Target: {BASE}")
    print(f"  Concurrent PATCHes: {CONCURRENT_PATCHES}")
    print(f"  Rate limit: {RATE_LIMIT} req / {int(RATE_WINDOW)}s window")

    async with aiohttp.ClientSession() as session:
        # ── Setup: ensure test user exists and log in ──
        section("SETUP")
        await register(session, STRESS_EMAIL, STRESS_PASSWORD)
        token = await login(session, STRESS_EMAIL, STRESS_PASSWORD)
        auth  = {"Authorization": f"Bearer {token}"}
        print(f"  Authenticated as {STRESS_EMAIL}")

        # ── Run all stress tests ──
        await stress_rate_limiter(session, auth)
        await stress_concurrent_patch(session, auth)
        await stress_snapshot_trigger(session, auth)

    # ── Summary ──
    print(f"\n{'=' * 60}")
    print(f"  RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        print("\n  Failed tests:")
        for name in FAIL:
            print(f"    ✘  {name}")
        sys.exit(1)
    else:
        print("\n  All Sprint 3 stress tests passed! 🎉")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
