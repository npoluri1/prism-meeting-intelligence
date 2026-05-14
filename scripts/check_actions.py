import urllib.request, re, json

# Try to check GitHub Actions via API
url = 'https://api.github.com/repos/npoluri1/prism-meeting-intelligence/actions/runs?per_page=5'
try:
    req = urllib.request.Request(url, headers={'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'python'})
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read().decode())
    for run in data['workflow_runs']:
        print(f'{run["name"]}: {run["status"]} - {run["conclusion"]}')
except Exception as e:
    print(f'Error: {e}')
