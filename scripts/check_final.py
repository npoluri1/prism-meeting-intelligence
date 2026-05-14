import urllib.request, re
import time

# Wait for build to complete
for attempt in range(6):
    time.sleep(10)
    try:
        r = urllib.request.urlopen('https://prism-meeting-intelligence.vercel.app/', timeout=15)
        html = r.read().decode()
        scripts = re.findall(r'src="([^"]+\.js)"', html)
        print(f'Attempt {attempt+1}: Scripts: {scripts}')
        
        if scripts:
            for s in scripts:
                if not s.startswith('/'):
                    continue
                js_url = 'https://prism-meeting-intelligence.vercel.app' + s
                js_r = urllib.request.urlopen(js_url, timeout=15)
                js = js_r.read().decode()
                
                # Find all const definitions and look for railway URL
                for m in re.finditer(r'(?:const|var|let)\s+(\w{1,3})\s*=\s*["\']([^"\']+)["\']', js):
                    val = m.group(2)
                    if 'railway' in val or 'localhost:8000' in val:
                        context_start = max(0, m.start() - 50)
                        context_end = min(len(js), m.end() + 200)
                        context = js[context_start:context_end]
                        if 'ApiError' in context or 'apiFetch' in context or 'ne(' in context:
                            print(f'  *** API_BASE = {val} ***')
                            break
                
                # Check if au is still void 0
                for m in re.finditer(r'const\s+(\w{1,3})\s*=\s*void\s+0', js):
                    name = m.group(1)
                    context = js[m.start():m.start()+300]
                    if 'ApiError' in context:
                        print(f'  *** {name} is still void 0 (undefined) ***')
                        print(f'  Context: {context[:150]}')
            
            # If we got here and found railway URL, we're done
            print('Done checking')
            break
    except Exception as e:
        print(f'Attempt {attempt+1}: Error: {e}')
