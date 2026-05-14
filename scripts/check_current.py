import urllib.request, re

r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
html = r.read().decode()
scripts = re.findall('src="([^"]+\.js)"', html)
print('Scripts:', scripts)

for s in scripts:
    if not s.startswith('/'):
        continue
    js = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app' + s, timeout=15).read().decode()
    for m in re.finditer(r'const\s+(\w{1,3})\s*=\s*["\']([^"\']+)["\']', js):
        val = m.group(2)
        ctx = js[m.start():m.start()+300]
        if 'ApiError' in ctx or 'apiFetch' in ctx or 'ne(' in ctx:
            print('API_BASE:', val)
            break
    else:
        for m in re.finditer(r'const\s+(\w{1,3})\s*=\s*void\s+0', js):
            if 'ApiError' in js[m.start():m.start()+300]:
                print('API_BASE: undefined (old bundle)')
                break
