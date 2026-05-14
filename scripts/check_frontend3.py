import urllib.request, re

r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
html = r.read().decode()
scripts = re.findall(r'src="([^"]+\.js)"', html)
print('Scripts:', scripts)

for s in scripts:
    if not s.startswith('/'):
        continue
    js_url = 'https://prism-meeting-intelligence.vercel.app' + s
    js_r = urllib.request.urlopen(js_url, timeout=15)
    js = js_r.read().decode()
    # Search for http URLs
    urls = re.findall(r'https?://[^"\'\\,\s)+&<>]+', js)
    for u in urls:
        if 'supabase' in u or 'railway' in u or 'localhost' in u or 'api' in u.lower():
            print(f'URL in JS: {u}')
    # Search for VITE pattern
    for m in re.finditer(r'import\.meta\.env[^,;]+', js):
        print(f'Import meta: {m.group()[:150]}')
