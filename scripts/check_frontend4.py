import urllib.request, re

r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
html = r.read().decode()
scripts = re.findall(r'src="([^"]+\.js)"', html)

for s in scripts:
    if not s.startswith('/'):
        continue
    js_url = 'https://prism-meeting-intelligence.vercel.app' + s
    js_r = urllib.request.urlopen(js_url, timeout=15)
    js = js_r.read().decode()
    
    # Find ALL URLs
    urls = re.findall(r'https?://[^\'"\\,\s)+&<>]+', js)
    print('=== All URLs in JS ===')
    for u in urls:
        print(f'  {u}')
    
    # Find all string literals with 'api' or 'fetch'
    print('\n=== Searching for /api/ patterns ===')
    for m in re.finditer(r'["\']/[a-z]+/[a-z]+["\']', js):
        val = m.group()
        if 'api' in val.lower() or 'meeting' in val.lower() or 'auth' in val.lower() or 'org' in val.lower():
            context = js[max(0, m.start()-60):m.end()+10]
            print(f'  ...{context}...')
