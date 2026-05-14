import urllib.request, json

# Get the latest Deploy workflow run
url = "https://api.github.com/repos/npoluri1/prism-meeting-intelligence/actions/runs?branch=main&status=completed&per_page=5"
resp = urllib.request.urlopen(url)
data = json.load(resp)
runs = data.get('workflow_runs', [])

# Find the most recent Deploy workflow
for r in runs:
    if r['name'] == 'Deploy':
        run_id = r['id']
        print(f"Deploy run ID: {run_id}")
        print(f"Conclusion: {r['conclusion']}")
        
        # Get job details
        jobs_url = f"https://api.github.com/repos/npoluri1/prism-meeting-intelligence/actions/runs/{run_id}/jobs"
        jobs_resp = urllib.request.urlopen(jobs_url)
        jobs_data = json.load(jobs_resp)
        
        for job in jobs_data.get('jobs', []):
            print(f"\nJob: {job['name']}")
            print(f"  Status: {job['status']}")
            print(f"  Conclusion: {job['conclusion']}")
            for step in job.get('steps', []):
                conclusion = step.get('conclusion', '')
                status = step['status']
                print(f"  - {step['name']}: {status} {conclusion if conclusion else ''}")
                if step['name'] == 'Deploy to Railway' and conclusion == 'failure':
                    # Get the log
                    log_url = f"https://api.github.com/repos/npoluri1/prism-meeting-intelligence/actions/jobs/{job['id']}/logs"
                    print(f"    Log URL: {log_url}")
        break
