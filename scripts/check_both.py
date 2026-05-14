import urllib.request, json

# Check the Railway-generated URL (from project name = meetingmind)
urls = [
    "https://meetingmind.up.railway.app/",
    "https://prism-api.up.railway.app/",
]

for url in urls:
    try:
        resp = urllib.request.urlopen(url, timeout=10)
        text = resp.read().decode()
        print(f"\n=== {url} ===")
        print(f"Status: {resp.status}")
        # Try parse as JSON
        try:
            data = json.loads(text)
            print(f"Response: {json.dumps(data, indent=2)[:200]}")
        except:
            print(f"HTML title tag: {'<title>' in text}")
            print(f"First 200 chars: {text[:200]}")
    except Exception as e:
        print(f"\n=== {url} === ERROR: {e}")
