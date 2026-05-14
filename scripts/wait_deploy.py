import urllib.request, re, time

for i in range(10):
    time.sleep(10)
    try:
        r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
        html = r.read().decode()
        scripts = re.findall('src="([^"]+\.js)"', html)
        
        for s in scripts:
            if not s.startswith('/'): continue
            js = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app' + s, timeout=15).read().decode()
            for m in re.finditer(r'const\s+(\w{1,3})\s*=\s*["\']([^"\']+)["\']', js):
                val = m.group(2)
                ctx = js[m.start():m.start()+300]
                if 'ApiError' in ctx or 'apiFetch' in ctx:
                    print(f'Attempt {i+1}: NEW BUILD - API_BASE = {val}')
                    exit(0)
        
        # Check if still old
        for m in re.finditer(r'const\s+(\w{1,3})\s*=\s*void\s+0', js):
            if 'ApiError' in js[m.start():m.start()+300]:
                print(f'Attempt {i+1}: Still old bundle ({m.group(1)} = undefined)')
                break
    except Exception as e:
        print(f'Attempt {i+1}: Error: {e}')

print('Timed out waiting for Vercel deploy')
