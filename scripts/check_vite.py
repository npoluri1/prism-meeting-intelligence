import urllib.request, re
import time

time.sleep(5)
r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
html = r.read().decode()
scripts = re.findall('src="([^"]+\.js)"', html)
print('Scripts:', scripts)

for s in scripts:
    if not s.startswith('/'):
        continue
    js = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app' + s, timeout=15).read().decode()
    if 'railway' in js:
        print('OK: Railway URL found - deploy updated!')
    elif 'void 0' in js and 'ApiError' in js:
        for m in re.finditer('const\s+(\w{1,3})\s*=\s*void\s+0', js):
            if 'ApiError' in js[m.start():m.start()+300]:
                print('Still void 0 - old bundle')
                break
