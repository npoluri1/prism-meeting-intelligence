import json, urllib.request

urls = [
    "https://prism-api.up.railway.app/openapi.json",
    "https://prism-meeting-intelligence.vercel.app/",
]

# Check openapi
try:
    resp = urllib.request.urlopen("https://prism-api.up.railway.app/openapi.json", timeout=15)
    data = json.load(resp)
    info = data.get('info', {})
    print(f"Backend title: {info.get('title')}")
    print(f"Backend version: {info.get('version')}")
    paths = list(data.get('paths', {}).keys())
    print(f"Routes ({len(paths)}): {paths[:5]}...")
except Exception as e:
    print(f"Backend error: {e}")

# Check frontend
try:
    resp = urllib.request.urlopen("https://prism-meeting-intelligence.vercel.app/", timeout=15)
    html = resp.read().decode()
    import re
    titles = re.findall(r'<title>(.*?)</title>', html)
    print(f"Frontend title: {titles[0] if titles else 'unknown'}")
    # Check for VITE_API_URL in source
    if 'VITE_API_URL' in html:
        print("Frontend has VITE_API_URL in source (build-time injected)")
except Exception as e:
    print(f"Frontend error: {e}")
