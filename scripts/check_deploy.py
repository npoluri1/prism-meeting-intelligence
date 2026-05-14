import urllib.request, json

# Check backend health
try:
    resp = urllib.request.urlopen("https://prism-api.up.railway.app/", timeout=15)
    data = json.load(resp.read())
    print(f"Backend response: {data}")
except Exception as e:
    print(f"Backend error: {e}")

# Check OpenAPI for version
try:
    resp = urllib.request.urlopen("https://prism-api.up.railway.app/openapi.json", timeout=15)
    data = json.load(resp.read())
    print(f"Backend title: {data.get('info', {}).get('title')}")
    print(f"Backend version: {data.get('info', {}).get('version')}")
    paths = list(data.get('paths', {}).keys())
    print(f"Routes: {paths[:10]}")
except Exception as e:
    print(f"OpenAPI error: {e}")
