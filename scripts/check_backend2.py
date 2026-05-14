import urllib.request, json

for url, label in [
    ("https://prism-api.up.railway.app/", "Health"),
    ("https://prism-api.up.railway.app/openapi.json", "OpenAPI"),
]:
    try:
        resp = urllib.request.urlopen(url, timeout=15)
        data = resp.read()
        if url.endswith("openapi.json"):
            info = json.loads(data).get('info', {})
            print(f"{label}: title={info.get('title')}, version={info.get('version')}")
        else:
            parsed = json.loads(data)
            print(f"{label}: {parsed}")
    except Exception as e:
        print(f"{label}: {e}")
