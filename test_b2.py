import requests

BASE_URL = "http://localhost:8000/api"

# Replace with the email and password you used to register
USER_CREDENTIALS = {"email": "test@test.com", "password": "testpass123"}

print("1. Logging in...")
# FastAPI OAuth2 expects form data, not JSON
login_res = requests.post("http://localhost:8000/api/auth/login", json=USER_CREDENTIALS)

if login_res.status_code != 200:
    print(f"Login Failed: {login_res.text}")
    exit()

token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("2. Creating a test document...")
doc_res = requests.post(f"{BASE_URL}/documents", headers=headers, json={"title": "Terminal Test Doc"})
doc_id = doc_res.json()["id"]
print(f"   Created Document ID: {doc_id}")

print("3. Sending 10 PATCH requests (simulating auto-saves)...")
for i in range(1, 11):
    patch_res = requests.patch(
        f"{BASE_URL}/documents/{doc_id}",
        headers=headers,
        json={"content_text": f"Save number {i}"}
    )
    current_version = patch_res.json().get("current_version")
    print(f"   Save {i}: current_version is now {current_version}")

print("4. Fetching versions...")
versions_res = requests.get(f"{BASE_URL}/documents/{doc_id}/versions", headers=headers)
versions = versions_res.json()

print(f"\nSUCCESS! Snapshots found: {len(versions)}")
for v in versions:
    print(f" - Version {v['version_number']} created at {v['created_at']}")
