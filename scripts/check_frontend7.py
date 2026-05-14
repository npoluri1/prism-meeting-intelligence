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
    
    # Find the definition of 'au' variable
    for kw in ['au', 'ne']:
        # Look for variable assignments like `const au = ...` or `var au = ...`
        pattern = rf'(?:const|var|let)\s+({kw})\s*=\s*'
        for m in re.finditer(pattern, js):
            val = m.group()
            start = m.start()
            end = min(len(js), start + 200)
            chunk = js[start:end]
            print(f'\n--- Definition of {kw} ---')
            print(chunk[:300])
