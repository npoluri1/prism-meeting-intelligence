import urllib.request, json

# Check Vercel deployments API
try:
    req = urllib.request.Request(
        'https://api.vercel.com/v1/deployments?app=prism-meeting-intelligence&limit=3',
        headers={'User-Agent': 'python'}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    print(resp.read().decode()[:500])
except Exception as e:
    print(f'Direct API: {e}')

# Check the Vercel dashboard-style URL
try:
    req = urllib.request.Request(
        'https://vercel.com/npoluri1/prism-meeting-intelligence/deployments',
        headers={'User-Agent': 'python'}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    html = resp.read().decode()
    # Look for deployment status
    if 'Building' in html:
        print('Found: Building...')
    elif 'Ready' in html:
        print('Found: Ready')
    else:
        print('Page loaded, checking for state...')
        for kw in ['Building', 'Ready', 'Error', 'Failed']:
            if kw in html:
                print(f'  Found: {kw}')
                break
except Exception as e:
    print(f'Dashboard: {e}')
