# app/helpers/github_helper.py
# Extracted from main.py — full GitHub GraphQL and REST logic, unchanged.

import requests
from datetime import datetime, timedelta
from statistics import mean


def get_github_repo_counts(username: str, token: str):
    """
    Use GitHub GraphQL API to get repository counts and contribution calendar.
    Returns dict or {'error_graphql': ...}
    """
    if not token:
        return {"error_graphql": "GitHub token is required for GraphQL API (pass via query or set GITHUB_TOKEN env)"}

    url = "https://api.github.com/graphql"
    headers = {"Authorization": f"Bearer {token}"}
    query = """
    query ($login: String!) {
      user(login: $login) {
        originalRepos: repositories(ownerAffiliations: OWNER, isFork: false) { totalCount }
        forkedRepos: repositories(ownerAffiliations: OWNER, isFork: true) { totalCount }
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
    """
    try:
        response = requests.post(url, json={'query': query, 'variables': {'login': username}}, headers=headers, timeout=15)
        data = response.json()
        if 'errors' in data:
            return {"error_graphql": data['errors']}
        if 'data' not in data or not data['data'].get('user'):
            return {"error_graphql": "User Not Found or Unexpected Response"}

        user_data = data['data']['user']
        calendar = user_data['contributionsCollection']['contributionCalendar']
        total_original_repos = user_data['originalRepos']['totalCount']
        total_forked_repos = user_data['forkedRepos']['totalCount']
        total_contrib = calendar['totalContributions']
        weeks = calendar.get('weeks', [])
        days = [day for week in weeks for day in week.get('contributionDays', [])]

        # Build activity list
        activity = [{"date": d.get('date'), "count": d.get('contributionCount', 0)} for d in days]
        active_days = sum(1 for d in activity if d["count"] > 0)

        return {
            "username": username,
            "total_original_repos": total_original_repos,
            "total_forked_repos": total_forked_repos,
            "total_contributions_1yr": total_contrib,
            "active_days_1yr": active_days,
            "activity_graph": activity
        }
    except Exception as e:
        return {"error_graphql": str(e)}


def get_pr_metrics(username: str, token: str):
    """
    Use GitHub REST API to calculate pull-request metrics for the past year.
    """
    if not token:
        return {"error_pr_api": "GitHub token is required for PR metrics (pass via query or set GITHUB_TOKEN env)"}

    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
    one_year_ago = (datetime.now() - timedelta(days=365)).date().isoformat()
    search_query = f"author:{username} type:pr updated:>{one_year_ago}"
    search_url = f"https://api.github.com/search/issues?q={search_query}&per_page=100"

    try:
        response = requests.get(search_url, headers=headers, timeout=15)
        response.raise_for_status()
        search_data = response.json()
        all_prs = search_data.get('items', [])
    except Exception as e:
        return {"error_pr_api": str(e)}

    if not all_prs:
        return {
            "total_prs_submitted": 0,
            "pr_acceptance_rate": 0.0,
            "avg_pr_size_lines": 0,
            "avg_time_to_merge_days": 0.0,
        }

    merged_pr_count = 0
    total_lines_changed = []
    time_to_merge_seconds = []

    for pr_issue in all_prs:
        if 'pull_request' not in pr_issue:
            continue
        pr_url = pr_issue['pull_request']['url']
        try:
            pr_response = requests.get(pr_url, headers=headers, timeout=10)
            pr_response.raise_for_status()
            pr_data = pr_response.json()
            if pr_data.get('merged') is True:
                merged_pr_count += 1
                lines_changed = pr_data.get('additions', 0) + pr_data.get('deletions', 0)
                total_lines_changed.append(lines_changed)
                created_at = datetime.fromisoformat(pr_data['created_at'].rstrip('Z'))
                merged_at = datetime.fromisoformat(pr_data['merged_at'].rstrip('Z'))
                time_to_merge_seconds.append((merged_at - created_at).total_seconds())
            # rate-limit safety
            if int(pr_response.headers.get('X-RateLimit-Remaining', 1)) < 5:
                break
        except Exception:
            continue

    total_submitted = len(all_prs)
    pr_metrics = {
        "total_prs_submitted": total_submitted,
        "prs_merged": merged_pr_count,
        "pr_acceptance_rate": (merged_pr_count / total_submitted) * 100 if total_submitted > 0 else 0.0,
    }
    if merged_pr_count > 0:
        pr_metrics["avg_pr_size_lines"] = round(mean(total_lines_changed))
        avg_time_seconds = mean(time_to_merge_seconds)
        pr_metrics["avg_time_to_merge_days"] = round(avg_time_seconds / (60 * 60 * 24), 2)
    else:
        pr_metrics["avg_pr_size_lines"] = 0
        pr_metrics["avg_time_to_merge_days"] = 0.0

    return pr_metrics
