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
    
    # Find the definition of 'ne' function (the apiFetch wrapper)
    # Look for patterns like `async function ne` or `var ne=` 
    for m in re.finditer(r'(?:function|=>|var|let|const)\s*(\w{1,3})\s*[=(]', js):
        name = m.group(1)
        # See what this function does
        start = m.start()
        end = min(len(js), start + 300)
        chunk = js[start:end]
        if 'api' in chunk.lower() or 'fetch' in chunk.lower() or 'import.meta' in chunk:
            print(f'Found candidate function {name}:')
            print(chunk[:400])
            print('---')
