import urllib.request, re
import time

time.sleep(15)

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
    
    # Find API_BASE variable - should be followed by ApiError class
    for m in re.finditer(r'(?:const|var|let)\s+(\w{1,3})\s*=\s*["\']([^"\']+)["\']', js):
        val = m.group(2)
        context = js[m.start():m.start()+300]
        if 'ApiError' in context or 'apiFetch' in context or 'ne(' in context:
            print('API_BASE definition:')
            print(f'  Variable: {m.group(1)}')
            print(f'  Value: {val}')
            break
    
    # Also find ne function (apiFetch wrapper)
    for m in re.finditer(r'async function (\w{1,3})\(e', js):
        name = m.group(1)
        start = m.start()
        chunk = js[start:start+200]
        if 'Authorization' in chunk and 'fetch' in chunk:
            print(f'ne (apiFetch) function: {name}')
            print(f'  {chunk[:200]}')
            break
