import urllib.request, json

# Check health
try:
    resp = urllib.request.urlopen("https://prism-api.up.railway.app/", timeout=15)
    text = resp.read().decode()
    print(f"Backend /: {text}")
except Exception as e:
    print(f"Backend / error: {e}")

# Check docs
try:
    resp = urllib.request.urlopen("https://prism-api.up.railway.app/docs", timeout=15)
    html = resp.read().decode()
    import re
    title = re.findall(r'<title>(.*?)</title>', html)
    print(f"Backend docs title: {title[0] if title else 'unknown'}")
except Exception as e:
    print(f"Backend docs error: {e}")
