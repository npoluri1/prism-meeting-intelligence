import urllib.request, re

r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
html = r.read().decode()
scripts = re.findall('src="([^"]+\.js)"', html)
print('Script:', scripts[0])

s = scripts[0]
js = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app' + s, timeout=15).read().decode()

# Find ALL const/let/var assignments with URLs
print('\n=== All URL constants ===')
for m in re.finditer(r'(?:const|var|let)\s+(\w{1,3})\s*=\s*["\']([^"\']+)["\']', js):
    val = m.group(2)
    if 'http' in val:
        print(f'{m.group(1)} = {val[:100]}')

print('\n=== All void 0 assignments ===')
for m in re.finditer(r'(?:const|var|let)\s+(\w{1,3})\s*=\s*void\s+0', js):
    name = m.group(1)
    ctx = js[m.start():min(len(js), m.start()+500)]
    # Check context for api-related functions
    keywords = ['ApiError', 'apiFetch', 'fetch', 'Authorization', 'api']
    for kw in keywords:
        if kw in ctx:
            print(f'{name} = void 0 (context has {kw})')
            print(f'  Context: {ctx[:200]}')
            break

print('\n=== Searching for railway URL ===')
for m in re.finditer(r'railway', js):
    start = max(0, m.start()-50)
    end = min(len(js), m.end()+50)
    print(f'  Found at {m.start()}: ...{js[start:end]}...')
