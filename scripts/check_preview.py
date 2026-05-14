import urllib.request, re

# Try the preview URL from the screenshot
urls = [
    'https://prism-meeting-intelligence-hp5zfhyui-npoluri1s-projects.vercel.app/',
    'https://prism-meeting-intelligence-git-main-npoluri1s-projects.vercel.app/',
    'https://prism-meeting-intelligence.vercel.app/',
]

for url in urls:
    try:
        r = urllib.request.urlopen(url, timeout=15)
        html = r.read().decode()
        scripts = re.findall('src="([^"]+\.js)"', html)
        print(f'\n{url}')
        print(f'  Scripts: {scripts}')
        
        for s in scripts:
            if not s.startswith('/'):
                continue
            js = urllib.request.urlopen(url.rstrip('/') + s, timeout=15).read().decode()
            if 'railway' in js:
                print('  ** Has Railway URL - NEW BUILD **')
            elif 'void 0' in js and 'ApiError' in js:
                for m in re.finditer(r'const\s+(\w{1,3})\s*=\s*void\s+0', js):
                    if 'ApiError' in js[m.start():m.start()+300]:
                        print('  Old bundle (void 0)')
                        break
    except Exception as e:
        print(f'\n{url}')
        print(f'  Error: {e}')
