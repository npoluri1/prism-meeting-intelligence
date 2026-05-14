import urllib.request, json

url = "https://api.github.com/repos/npoluri1/prism-meeting-intelligence/actions/runs?branch=main&per_page=5"
resp = urllib.request.urlopen(url)
data = json.load(resp)
runs = data.get('workflow_runs', [])
for r in runs[:5]:
    status = r['conclusion'] if r['conclusion'] else r['status']
    created = r['created_at'][:19]
    print(f"[{created}] {r['name']}: {status} — {r['display_title'][:55]}")
    print(f"  https://github.com/npoluri1/prism-meeting-intelligence/actions/runs/{r['id']}")
    print()
