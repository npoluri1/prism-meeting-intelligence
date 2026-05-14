import urllib.request, re

r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
html = r.read().decode()
scripts = re.findall(r'src="([^"]+\.js)"', html)
print('All scripts:', scripts)

for s in scripts:
    if not s.startswith('/'):
        continue
    js_url = 'https://prism-meeting-intelligence.vercel.app' + s
    js_r = urllib.request.urlopen(js_url, timeout=15)
    js = js_r.read().decode()
    print(f'\n=== Checking {s} ({len(js)} bytes) ===')
    for kw in ['VITE_API', 'localhost:8000', 'prism-meeting', 'apiFetch', 'API_BASE']:
        if kw in js:
            idx = js.index(kw)
            start = max(0, idx - 30)
            end = min(len(js), idx + 100)
            print(f'{kw}: ...{js[start:end]}...')
            break
