"""
Live end-to-end PDF export test — verifies WeasyPrint produces a real PDF.
Run from backend/ with venv active.
"""
import sys
import requests

BASE = "http://localhost:8000"
EMAIL = "pdftest_auto@example.com"
PASSWORD = "testpass123"

print("1. Register / Login...")
r = requests.post(f"{BASE}/api/auth/register", json={"email": EMAIL, "password": PASSWORD})
if r.status_code == 409:
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
assert r.status_code in (200, 201), f"Auth failed: {r.text}"
token = r.json()["access_token"]
AUTH = {"Authorization": f"Bearer {token}"}
print("   OK")

print("2. Create document with rich content...")
rich_content = {
    "type": "doc",
    "content": [
        {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "My Research Paper"}]},
        {"type": "paragraph", "content": [{"type": "text", "text": "This is the introduction paragraph with "}, {"type": "text", "text": "bold text", "marks": [{"type": "bold"}]}, {"type": "text", "text": " and "}, {"type": "text", "text": "italic text", "marks": [{"type": "italic"}]}, {"type": "text", "text": "."}]},
        {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Section 1: Background"}]},
        {"type": "paragraph", "content": [{"type": "text", "text": "WeasyPrint converts HTML to PDF using GTK3 on Windows. This paragraph tests that the rendering pipeline works end-to-end."}]},
        {"type": "bulletList", "content": [
            {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "First bullet point"}]}]},
            {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Second bullet point"}]}]},
        ]},
        {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "This is a blockquote with important information."}]}]},
    ]
}
r = requests.post(f"{BASE}/api/documents", json={"title": "WeasyPrint Test Doc"}, headers=AUTH)
assert r.status_code == 201, f"Create failed: {r.text}"
doc_id = r.json()["id"]
print(f"   Created doc: {doc_id}")

# Save rich content
r = requests.patch(f"{BASE}/api/documents/{doc_id}", json={
    "content": rich_content,
    "content_text": "My Research Paper This is the introduction...",
    "word_count": 45
}, headers=AUTH)
assert r.status_code == 200, f"Save failed: {r.text}"
print("   Content saved")

print("3. Export PDF...")
r = requests.post(f"{BASE}/api/export/pdf", json={"document_id": doc_id}, headers=AUTH)
assert r.status_code == 200, f"Export failed: {r.status_code} {r.text[:300]}"

ct = r.headers.get("content-type", "")
cd = r.headers.get("content-disposition", "")
pdf_bytes = r.content

print(f"   Content-Type: {ct}")
print(f"   Content-Disposition: {cd}")
print(f"   PDF size: {len(pdf_bytes):,} bytes")

# Validate it is a real PDF
assert pdf_bytes[:4] == b"%PDF", f"Not a PDF! Starts with: {pdf_bytes[:20]}"

# WeasyPrint PDFs are significantly larger than the stub (>5KB for real content)
assert len(pdf_bytes) > 5000, f"PDF too small ({len(pdf_bytes)} bytes) — might be the stub, not WeasyPrint"

# PDF version should be 1.7 (WeasyPrint) not 1.4 (our stub)
version = pdf_bytes[:8].decode("latin-1")
print(f"   PDF version: {version}")
is_weasyprint = b"1.7" in pdf_bytes[:10] or b"weasyprint" in pdf_bytes[:200].lower()

print(f"   Is WeasyPrint output: {is_weasyprint or len(pdf_bytes) > 10000}")

# Save to disk for manual inspection
with open("test_output.pdf", "wb") as f:
    f.write(pdf_bytes)
print(f"   Saved to: backend/test_output.pdf — open it to verify formatting!")

# Cleanup
requests.delete(f"{BASE}/api/documents/{doc_id}", headers=AUTH)
print("   Cleaned up test document")

print("\nPDF export test PASSED!")
sys.exit(0)
