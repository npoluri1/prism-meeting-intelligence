import json, urllib.request, sys

url = sys.argv[1] if len(sys.argv) > 1 else "https://api.github.com/repos/npoluri1/prism-meeting-intelligence/actions/runs?branch=main&per_page=5"
resp = urllib.request.urlopen(url)
data = json.load(resp)
runs = data.get('workflow_runs', [])
for r in runs[:5]:
    status = r['conclusion'] or r['status']
    title = r['display_title'][:60] if r['display_title'] else 'N/A'
    run_url = f"https://github.com/npoluri1/prism-meeting-intelligence/actions/runs/{r['id']}"
    print(f"{r['name']}: {status} — {title}")
    print(f"  {run_url}")
