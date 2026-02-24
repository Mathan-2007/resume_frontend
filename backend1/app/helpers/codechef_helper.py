# app/helpers/codechef_helper.py
# Extracted fully from main.py — CodeChef scraping, rating, learning paths & badges logic.

import re
import requests
from bs4 import BeautifulSoup

def is_valid_topic(text):
    """Filter out invalid or irrelevant topic names."""
    if not text:
        return False
    text = text.strip()
    if len(text) < 3 or len(text) > 60:
        return False
    if re.search(
        r"(Privacy Policy|About us|COMPANY|COMPILERS|Policy|Contact|Terms|Recent Activity|Fetch|\.js|var |const |async|function|window|script|developer|More Roadmaps|Problems Solved|Skill tests|None|Total Problems|Badges|Contests)",
        text, re.I
    ):
        return False
    return True


def extract_codechef_paths_and_badges(profile_url: str):
    """Scrape CodeChef profile for paths, badges, and stats (rating, ranks, total solved)."""
    headers = {"User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9"}
    try:
        resp = requests.get(profile_url, headers=headers, timeout=12)
        if resp.status_code != 200:
            return {"error": f"Failed to access CodeChef (status {resp.status_code})"}
        soup = BeautifulSoup(resp.content, "html.parser")
    except Exception as e:
        return {"error": f"Request failed: {str(e)}"}

    # -------- extract Learning & Practice Paths --------
    def extract_path_topics_with_percentage(soup, section_title):
        paths_list = []
        section_div = None
        for div in soup.find_all("div"):
            if div.find(string=lambda t: t and section_title in t):
                section_div = div
                break
        if not section_div:
            return []
        text_content = section_div.get_text(" ", strip=True)
        text_content = re.sub(r"\s+", " ", text_content)
        text_content = re.sub(r"(\d)\s*(\d)", r"\1\2", text_content)
        text_content = re.sub(r"(\d+)\s*%", r"\1%", text_content)
        pairs = re.findall(r"([A-Za-z][A-Za-z0-9 &+\-:]{2,60})\s*(\d{1,3}%)", text_content)
        clean_topics = []
        seen = set()
        for topic, percent in pairs:
            topic = topic.strip().rstrip()
            percent = percent.strip()
            if is_valid_topic(topic) and topic not in seen:
                seen.add(topic)
                try:
                    clean_topics.append({
                        "name": topic,
                        "completed_percentage": int(percent.strip('%'))
                    })
                except Exception:
                    continue
        if section_title == "Learning Paths":
            clean_topics = [t for t in clean_topics if not t["name"].startswith("Practice")]
        elif section_title == "Practice Paths":
            clean_topics = [t for t in clean_topics if t["name"].startswith("Practice")]
        return clean_topics

    # -------- badges --------
        # -------- badges (robust method) --------
    badges = []
    try:
        # Look for image alt text or span tags containing badge names
        badge_imgs = soup.find_all("img", alt=True)
        for img in badge_imgs:
            alt = img.get("alt", "").strip()
            if alt and "badge" in alt.lower():
                badges.append(alt)

        # Also check for divs/spans with class names or text containing 'badge'
        badge_spans = soup.find_all(["div", "span"], string=lambda t: t and "badge" in t.lower())
        for span in badge_spans:
            txt = span.get_text(" ", strip=True)
            if txt and txt not in badges:
                badges.append(txt)

        # Remove duplicates and keep clean names
        badges = list(dict.fromkeys([b.replace("Badge", "").strip().title() for b in badges if len(b) < 100]))
    except Exception as e:
        print("⚠️ Badge parsing error:", e)


    learning_paths = extract_path_topics_with_percentage(soup, "Learning Paths")
    practice_paths = extract_path_topics_with_percentage(soup, "Practice Paths")

    # -------- rating, ranks, total solved --------
    rating = 0
    stars = None
    global_rank = 0
    country_rank = 0
    try:
        rating_el = soup.find('div', class_='rating-number')
        if rating_el:
            rating = int(re.sub(r'[^\d]', '', rating_el.text) or 0)
        star_el = soup.find('span', class_='rating')
        if star_el:
            stars = star_el.text.strip()
        rank_row = soup.find('ul', class_='inline-list')
        if rank_row:
            items = rank_row.find_all('li')
            if len(items) >= 1:
                global_rank = int(re.sub(r'[^\d]', '', items[0].get_text() or "0") or 0)
            if len(items) >= 2:
                country_rank = int(re.sub(r'[^\d]', '', items[1].get_text() or "0") or 0)
    except Exception:
        pass

    # -------- total problems solved --------
    total_solved = 0
    try:
        text = soup.get_text(" ", strip=True)
        m = re.search(r"Total Problems Solved[:\s]*([0-9,]+)", text)
        if m:
            total_solved = int(m.group(1).replace(",", ""))
    except Exception:
        total_solved = 0

    return {
        "Profile_URL": profile_url,
        "Rating": rating,
        "Star_Rating": stars,
        "Global_Rank": global_rank,
        "Country_Rank": country_rank,
        "Learning_Paths": learning_paths,
        "Practice_Paths": practice_paths,
        "Badges": list(dict.fromkeys(badges)),
        "Total_Solved": total_solved,
    }
