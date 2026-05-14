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
    
    # Find where the API base URL is used
    # Look for the apiFetch function definition
    idx = js.find('apiFetch')
    if idx >= 0:
        print('apiFetch found at', idx)
        print(js[idx:idx+300])
    
    # Look for 'VITE_API' or 'API_BASE' or 'import.meta'
    for kw in ['import.meta.env', 'VITE_API_URL', 'API_BASE', '/api/meetings']:
        for m in re.finditer(re.escape(kw), js):
            start = max(0, m.start()-50)
            end = min(len(js), m.end()+100)
            print(f'\n--- {kw} at {m.start()} ---')
            print(js[start:end])
    
    # Search for http in the context of api calls
    for m in re.finditer(r'https?://[^"\'\\,\s)+&<>]+railway[^"\'\\,\s)+&<>]*', js):
        print(f'\n--- Railway URL ---')
        print(js[max(0,m.start()-50):m.end()+50])
    
    for m in re.finditer(r'https?://[^"\'\\,\s)+&<>]*localhost[^"\'\\,\s)+&<>]*', js):
        if '9999' in m.group():
            print(f'\n--- localhost:9999 in auth lib (expected) ---')
