import urllib.request, json, re

# Check frontend HTML
r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
html = r.read().decode()
print("Page title:", re.search(r'<title>(.*?)</title>', html).group(1) if '<title>' in html else 'none')
print("Body classes:", ' '.join(re.findall(r'class="([^"]*)"', html))[:200])

# Find script tags
scripts = re.findall(r'src="([^"]+\.js)"', html)
print("\nScripts found:", scripts)

# Check the main JS for API URL
for s in scripts:
    if s.startswith('/') and 'index' in s:
        js_url = f'https://prism-meeting-intelligence.vercel.app{s}'
        js_r = urllib.request.urlopen(js_url, timeout=15)
        js = js_r.read().decode()
        # Look for API URL references
        for keyword in ['VITE_API', 'localhost:8000', 'prism-meeting-intelligence', 'API_BASE', 'apiFetch']:
            if keyword in js:
                idx = js.index(keyword)
                print(f"\nFound '{keyword}' at position {idx}:")
                print(js[max(0,idx-50):idx+150])
