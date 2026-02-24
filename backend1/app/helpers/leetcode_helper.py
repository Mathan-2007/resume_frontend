# app/helpers/leetcode_helper.py
# Extracted from main.py — full LeetCode scraping, analysis, and activity graph logic.

import requests
import json
from datetime import datetime

def analyze_performance(stats: dict):
    """Analyze user's LeetCode performance and provide sentiment analysis."""
    try:
        total = int(stats.get('Total_Solved', 0))
    except Exception:
        total = 0

    if total == 0:
        return {'sentiment': 'neutral', 'reason': 'No problems solved yet', 'metrics': {}, 'scores': {}}

    easy = int(stats.get('Easy', 0))
    medium = int(stats.get('Medium', 0))
    hard = int(stats.get('Hard', 0))

    easy_percent = (easy / total) * 100 if total else 0
    medium_percent = (medium / total) * 100 if total else 0
    hard_percent = (hard / total) * 100 if total else 0

    distribution_score = 0
    if 20 <= easy_percent <= 50:
        distribution_score += 1
    if 30 <= medium_percent <= 50:
        distribution_score += 1
    if 10 <= hard_percent <= 30:
        distribution_score += 1

    volume_score = 0
    if total >= 50:
        volume_score = 3
    elif total >= 30:
        volume_score = 2
    elif total >= 10:
        volume_score = 1

    difficulty_score = (easy * 1 + medium * 2 + hard * 3) / total if total else 0
    lang_count = len(stats.get('Languages', []))
    lang_score = min(lang_count, 3)

    analysis = {
        'scores': {
            'distribution': distribution_score,
            'volume': volume_score,
            'difficulty': difficulty_score,
            'languages': lang_score
        },
        'metrics': {
            'problem_distribution': f"Easy: {easy_percent:.1f}%, Medium: {medium_percent:.1f}%, Hard: {hard_percent:.1f}%",
            'total_problems': total,
            'languages_used': lang_count,
            'difficulty_rating': round(difficulty_score, 2)
        }
    }

    if total >= 2000:
        analysis['sentiment'] = 'positive'
        analysis['reason'] = f'Outstanding achievement with {total} problems solved! Well beyond 2000.'
    elif total >= 500:
        analysis['sentiment'] = 'neutral'
        analysis['reason'] = f'Good progress with {total} problems solved. Keep going to reach 2000+ problems!'
    else:
        analysis['sentiment'] = 'negative'
        analysis['reason'] = f'Currently at {total} problems. Focus on reaching 500 problems.'

    if analysis['sentiment'] != 'positive':
        suggestions = []
        if hard_percent < 10:
            suggestions.append("tackle more hard problems")
        if medium_percent < 30:
            suggestions.append("increase medium difficulty problems")
        if lang_count < 3:
            suggestions.append("try solving problems in more programming languages")
        if suggestions:
            analysis['reason'] += " Consider: " + ", ".join(suggestions) + "."

    return analysis


def extract_leetcode_data(username: str):
    """Query LeetCode GraphQL endpoint to gather profile stats."""
    api_url = "https://leetcode.com/graphql"
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': f'https://leetcode.com/{username}/',
    }

    query = """
    query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
            username
            submitStats {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
            profile {
                ranking
                reputation
                starRating
            }
            languageProblemCount {
                languageName
                problemsSolved
            }
        }
    }
    """

    try:
        response = requests.post(api_url, headers=headers, json={'query': query, 'variables': {'username': username}}, timeout=12)
        if response.status_code != 200:
            return {"error": f"Failed to access LeetCode for user {username} (Status: {response.status_code})"}
        data = response.json()
        if not data.get('data', {}).get('matchedUser'):
            return {"error": f"User {username} not found"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {str(e)}"}

    try:
        user_data = data['data']['matchedUser']
        result = {}
        result['Username'] = user_data.get('username')
        submission_stats = user_data.get('submitStats', {}).get('acSubmissionNum', [])
        total_solved = 0
        for stat in submission_stats:
            diff = stat.get('difficulty')
            cnt = stat.get('count', 0)
            if diff:
                result[diff] = str(cnt)
            if diff == 'All':
                total_solved = cnt
        if 'Total_Solved' not in result:
            total = int(result.get('Easy', 0)) + int(result.get('Medium', 0)) + int(result.get('Hard', 0))
            result['Total_Solved'] = str(total or total_solved)
        else:
            result['Total_Solved'] = result.get('All') or str(total_solved)
        # languages
        languages = user_data.get('languageProblemCount', [])
        result['Languages'] = [l.get('languageName') for l in languages if l.get('problemsSolved', 0) > 0]
        profile = user_data.get('profile') or {}
        if profile:
            result['Ranking'] = profile.get('ranking')
            result['Reputation'] = profile.get('reputation')
            result['Rating'] = profile.get('starRating')

        # Fetch daily submission calendar
        try:
            year = datetime.now().year
            calendar_query = """
            query userProfileCalendar($username: String!, $year: Int!) {
              matchedUser(username: $username) {
                userCalendar(year: $year) {
                  submissionCalendar
                }
              }
            }
            """
            cal_resp = requests.post(api_url, headers=headers, json={"query": calendar_query, "variables": {"username": username, "year": year}}, timeout=10)
            if cal_resp.status_code == 200:
                cal_json = cal_resp.json()
                cal_str = (
                    cal_json.get("data", {})
                    .get("matchedUser", {})
                    .get("userCalendar", {})
                    .get("submissionCalendar")
                )
                if cal_str:
                    cal_data = json.loads(cal_str)
                    activity_graph = []
                    for ts, count in cal_data.items():
                        date = datetime.utcfromtimestamp(int(ts)).strftime("%Y-%m-%d")
                        activity_graph.append({"date": date, "count": count})
                    activity_graph.sort(key=lambda x: x["date"])
                    result["activity_graph"] = activity_graph
        except Exception as e:
            print("⚠️ LeetCode calendar fetch failed:", e)
            result["activity_graph"] = []

        return result
    except Exception as e:
        return {"error": f"Failed to parse LeetCode response: {str(e)}"}
