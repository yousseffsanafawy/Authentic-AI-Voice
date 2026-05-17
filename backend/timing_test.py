import requests, time

BASE = "http://localhost:8000"
r = requests.post(BASE+"/api/auth/login", json={"email":"testuser_sprint4@example.com","password":"testpass123"})
AUTH = {"Authorization": "Bearer "+r.json()["access_token"]}

# Clean up first
samples_r = requests.get(BASE+"/api/samples", headers=AUTH)
for s in samples_r.json():
    requests.delete(BASE+"/api/samples/"+s["id"], headers=AUTH)
print("Cleaned up")

# Upload a sample
SAMPLE_TEXT = ("I believe writing clearly matters. My sentences are short. I focus on structure. "
               "However, I also value variety. Furthermore, I use transition words often. "
               "My paragraphs are concise. I avoid passive voice whenever possible.") * 10
r = requests.post(BASE+"/api/samples/upload",
    files={"file": ("test.txt", SAMPLE_TEXT.encode(), "text/plain")},
    headers=AUTH)
print("Upload:", r.status_code, r.json())

# Poll for 40s
for i in range(40):
    r = requests.get(BASE+"/api/samples/voice-profile", headers=AUTH)
    d = r.json()
    status = d.get("status")
    print(str(i+1)+"s: status="+str(status))
    if status == "ready":
        keys = list(d["voice_profile"].keys())
        print("READY! Keys:", keys)
        print("Count:", len(keys))
        break
    time.sleep(1)
else:
    print("TIMED OUT after 40s")
