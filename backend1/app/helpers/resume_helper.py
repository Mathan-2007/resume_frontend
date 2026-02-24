# app/helpers/resume_helper.py
# Combines your resume AI logic + detailed ATS scoring
# Updated: robust language normalization + consistent OpenRouter usage

import json
import io
import pdfplumber
import re
from datetime import datetime
from urllib.parse import urlparse

from app.config import db, openrouter_client  # config.py defines db and openrouter_client


# -------------------------
# Helper: normalize languages
# -------------------------
def normalize_languages(languages):
    """Normalize language names to a consistent format."""
    standard_langs = {
        "english": "English", "tamil": "Tamil", "hindi": "Hindi",
        "telugu": "Telugu", "malayalam": "Malayalam", "kannada": "Kannada",
        "french": "French", "german": "German", "spanish": "Spanish",
        "bengali": "Bengali", "marathi": "Marathi", "punjabi": "Punjabi",
        "gujarati": "Gujarati", "urdu": "Urdu", "oriya": "Oriya", "nepali": "Nepali"
    }
    normalized = []
    for lang in (languages or []):
        if not lang:
            continue
        key = str(lang).strip().lower()
        # some AI outputs might be like "Tamil (native), English (fluent)"
        key = re.sub(r"[\(\)\d%]", "", key).strip()
        # try splitting composite tokens
        parts = re.split(r"[,;/\|]+", key)
        for p in parts:
            pkey = p.strip().lower()
            # handle common alternatives
            if pkey in standard_langs:
                val = standard_langs[pkey]
                if val not in normalized:
                    normalized.append(val)
            else:
                # sometimes AI outputs short forms or capitalized forms
                for k, v in standard_langs.items():
                    if pkey == k or pkey == v.lower():
                        if v not in normalized:
                            normalized.append(v)
    return normalized


# -------------------------
# Extract username from URL
# -------------------------
def extract_username_from_input(input_str: str):
    if not input_str:
        return None
    s = input_str.strip()
    if s.startswith(("http://", "https://")) or "github.com" in s:
        if s.startswith("github.com"):
            s = "https://" + s
        parsed = urlparse(s)
        parts = [p for p in parsed.path.split("/") if p]
        return parts[0] if parts else None
    if re.match(r"^[A-Za-z0-9-_.]{1,39}$", s):
        return s
    if "/" in s:
        return s.split("/")[-1]
    return None


# -------------------------
# ATS Score Calculator
# -------------------------
import re

def calculate_ats_score(data, text, job_description=None, normalized_languages=None):
    score_details = {}

    # Pre-normalize text
    text_lower = (text or "").lower()

    # Lists
    action_verbs = r"\b(developed|built|designed|implemented|managed|optimized|increased|reduced|led|collaborated|deployed|created|trained|improved|tested|analyzed|automated|integrated|streamlined)\b"
    metrics_regex = r"\b(\d+%|\d+\s+(users|clients|projects|transactions|systems)|\$\d+|\d+\s+(x|times|months|years))\b"

    tech_keywords = [
        "python","java","c++","node","react","mongodb","mysql","aws","azure","gcp",
        "docker","kubernetes","tensorflow","pytorch","devops","fastapi","django",
        "flask","typescript","postgres","rest","graphql"
    ]
    tools_keywords = [
        "git","github","jira","jenkins","figma","linux","bash","tableau",
        "power bi","excel","visual studio","colab"
    ]
    soft_skills = ["leadership","communication","teamwork","problem solving","ownership"]
    cert_keywords = ["aws","azure","gcp","oracle","pmp","cisco","scrum","microsoft certified"]

    # 1. Section coverage (max 20)
    required_sections = ["experience", "education", "skills", "projects"]
    section_score = 0
    for section in required_sections:
        content = data.get(section) or ""
        if isinstance(content, str) and len(content.strip()) > 50:
            section_score += 5
        elif isinstance(content, list) and len(content) > 0:
            section_score += 5
    score_details["Section Coverage"] = min(section_score, 20)

    # 2. Contact info (max 5)
    contact_score = 0
    if data.get("email"): contact_score += 1
    if data.get("phone"): contact_score += 1
    if re.search(r"linkedin\.com", text_lower): contact_score += 1
    if re.search(r"github\.com", text_lower): contact_score += 1
    # add one more if address/location exists maybe
    if data.get("location"): contact_score += 1
    score_details["Contact Info"] = min(contact_score, 5)

    # 3. Word count (max 5)
    word_count = len((text or "").split())
    if 500 <= word_count <= 1200:
        wc_score = 5
    elif word_count >= 300:
        wc_score = 3
    else:
        wc_score = 0
    score_details["Word Count"] = wc_score

    # 4. Bullet points (max 5)
    bullet_patterns = [r"•", r"◦", r"\*", r"-\s", r"→"]
    bullet_count = sum(len(re.findall(pattern, text or "")) for pattern in bullet_patterns)
    if bullet_count >= 8:
        bp_score = 5
    elif bullet_count >= 3:
        bp_score = 3
    else:
        bp_score = 0
    score_details["Bullet Points"] = bp_score

    # 5. Action verbs (max 10)
    action_count = len(re.findall(action_verbs, text_lower))
    if action_count >= 12:
        av_score = 10
    elif action_count >= 5:
        av_score = 5
    else:
        av_score = 0
    score_details["Action Verbs"] = av_score

    # 6. Achievements (metrics) (max 10)
    metrics_count = len(re.findall(metrics_regex, text_lower))
    if metrics_count >= 8:
        ach_score = 10
    elif metrics_count >= 3:
        ach_score = 5
    else:
        ach_score = 0
    score_details["Achievements"] = ach_score

    # 7. Technical skills (max 15)
    tech_match = sum(1 for kw in tech_keywords if kw in text_lower)
    tech_score = min(tech_match * 1.0, 15)
    score_details["Technical Skills"] = tech_score

    # 8. Tools & platforms (max 10)
    tool_match = sum(1 for kw in tools_keywords if kw in text_lower)
    tool_score = min(tool_match * 0.8, 10)
    score_details["Tools & Platforms"] = tool_score

    # 9. Soft skills (max 5)
    soft_match = sum(1 for kw in soft_skills if kw in text_lower)
    soft_score = min(soft_match * 1.0, 5)
    score_details["Soft Skills Mention"] = soft_score

    # 10. Certifications (max 5)
    cert_count = sum(1 for kw in cert_keywords if kw in text_lower)
    cert_score = min(cert_count * 1.0, 5)
    score_details["Certifications"] = cert_score

    # 11. Formatting & layout penalty (max deduction 5)
    formatting_penalty = 0
    if re.search(r"<table|</table>", text_lower): formatting_penalty += 2
    if re.search(r"\.(png|jpg|jpeg|svg)", text_lower): formatting_penalty += 2
    try:
        if len(max(text.split("\n"), key=len)) > 160:
            formatting_penalty += 1
    except Exception:
        pass
    formatting_score = 5 - min(formatting_penalty, 5)
    score_details["Formatting and Layout"] = formatting_score

    # 12. Job description matching (if provided) (max 25)
    jd_score = 0
    if job_description:
        jd_lower = job_description.lower()
        jd_keywords = set(re.findall(r"[a-zA-Z]+", jd_lower))
        resume_words = set(re.findall(r"[a-zA-Z]+", text_lower))
        match_count = len(jd_keywords.intersection(resume_words))
        # scale to 25
        jd_score = min(match_count * 0.2, 25)
    score_details["JD Match"] = jd_score

    # Total
    total_score = sum(score_details.values())
    if total_score > 100:
        total_score = 100
    score_details["Total ATS Score"] = round(total_score, 2)

    return {
        "ats_breakdown": score_details,
        "ats_score": score_details["Total ATS Score"],
        "word_count": word_count,
        "languages": normalized_languages,
    }

# -------------------------
# Core Resume Processor
# -------------------------
async def process_resume_file(upload_file):
    """Handle resume PDF upload + AI parsing + ATS scoring + DB save."""
    try:
        contents = await upload_file.read()
        if not contents:
            return {"error": "Empty file received. Please upload a valid PDF."}

        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        if not text.strip():
            return {"error": "No readable text found in the uploaded PDF."}

        if not openrouter_client:
            return {"error": "AI client not configured (missing OPENROUTER_API_KEY)."}

        # Truncate long documents for model context safety (you already used similar earlier)
        max_chars = 80000  # conservative
        prompt_text = text if len(text) <= max_chars else text[:max_chars] + "\n...[Truncated for AI]..."

        # ---- AI extraction ----
        prompt = f"""
Extract structured resume info and return valid JSON ONLY:
{{
  "name": "", 
  "email": "", 
  "phone": "",
  "linkedin": "", 
  "github": "", 
  "leetcode": "", 
  "codechef": "",
  "languages": [],  
  "education": {{
      "10th": {{
          "school": "",
          "location": "",
          "year": "",
          "percentage": ""
      }},
      "12th": {{
          "school": "",
          "location": "",
          "year": "",
          "percentage": ""
      }},
      "bachelor": {{
          "institute": "",
          "location": "",
          "degree": "",
          "expected_graduation": "",
          "cgpa": ""
      }}
  }},
  "skills": {{
      "technical": [], 
      "soft": []
  }},
  "certificates": [], 
  "role_match": "", 
  "summary": ""
}}
Resume text:
{prompt_text}
"""

        # ---- Call AI model via openrouter_client ----
        try:
            response = openrouter_client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "Return valid JSON only. Do not include commentary."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2000,
            )
            ai_output = response.choices[0].message.content
        except Exception as exc:
            return {"error": f"AI request failed: {str(exc)}"}

        # ---- Parse JSON ----
        ai_output = ai_output.strip().replace("```json", "").replace("```", "")
        try:
            data = json.loads(ai_output)
        except Exception as e:
            return {"error": f"Failed to parse AI JSON: {str(e)}", "raw": ai_output}

        # ---- Normalize languages (robust) ----
        raw_langs = data.get("languages", [])
        if isinstance(raw_langs, str):
            raw_langs = re.split(r"[,;/]| and ", raw_langs)
        langs = normalize_languages([lang.strip() for lang in raw_langs if lang and str(lang).strip()])

        # If AI missed languages or returned unexpected value, detect from text
        if not langs:
            detected = []
            standard_langs = {
                "english": "English", "tamil": "Tamil", "hindi": "Hindi",
                "telugu": "Telugu", "malayalam": "Malayalam", "kannada": "Kannada",
                "french": "French", "german": "German", "spanish": "Spanish",
                "bengali": "Bengali", "marathi": "Marathi", "punjabi": "Punjabi",
                "gujarati": "Gujarati", "urdu": "Urdu", "oriya": "Oriya", "nepali": "Nepali"
            }
            tlower = text.lower()
            for key, val in standard_langs.items():
                # match exact language token in resume text (word boundary)
                if re.search(rf"\b{re.escape(key)}\b", tlower):
                    detected.append(val)
            langs = detected if detected else ["English"]

        data["languages"] = langs

        # ---- Compute ATS ----
        ats = calculate_ats_score(data, text, normalized_languages=langs)

        # ---- Save to MongoDB ----
        try:
            await db.reports.insert_one({
                "filename": getattr(upload_file, "filename", "uploaded_resume"),
                "data": data,
                "ats_breakdown": ats["ats_breakdown"],
                "ats_score": ats["ats_score"],
                "word_count": ats["word_count"],
                "uploaded_at": datetime.utcnow(),
            })
        except Exception as e:
            print("⚠️ MongoDB insert failed:", e)

        # ---- Return Result ----
        return {
            "data": data,
            "ats_score": ats["ats_score"],
            "ats_breakdown": ats["ats_breakdown"],
            "word_count": ats["word_count"],
        }

    except Exception as e:
        import traceback
        print("❌ Error in process_resume_file:", traceback.format_exc())
        return {"error": str(e)}


# -------------------------
# Text-only extractor (use when you pass resume text instead of PDF)
# -------------------------
async def extract_resume_data(text: str):
    """
    Extract structured resume data using OpenRouter AI.
    Returns parsed JSON with keys like name, email, education, etc.
    """
    if not openrouter_client:
        return {}


    prompt = f"""
Extract structured resume info and return valid JSON ONLY:
{{
  "name": "", "email": "", "phone": "",
  "linkedin": "", "github": "", "leetcode": "", "codechef": "",
  "languages": [],
  "education": {{
      "10th": {{"school": "", "location": "", "year": "", "percentage": ""}},
      "12th": {{"school": "", "location": "", "year": "", "percentage": ""}},
      "bachelor": {{"institute": "", "location": "", "degree": "", "expected_graduation": "", "cgpa": ""}}
  }},
  "skills": {{"technical": [], "soft": []}},
  "certificates": [],
  "role_match": "",
  "summary": ""
}}
Resume text:
{prompt_text}
"""
    try:
        completion = openrouter_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "system", "content": "Return valid JSON only."}, {"role": "user", "content": prompt}],
            temperature=0.2,
        )
        raw = completion.choices[0].message.content.strip()
    except Exception as exc:
        print("⚠️ OpenRouter request failed in extract_resume_data:", exc)
        return {}

    raw_clean = raw.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(raw_clean)
    except Exception:
        print("⚠️ Invalid JSON returned by AI (extract_resume_data):", raw_clean)
        return {}

    # Normalize languages same as process function
    raw_langs = data.get("languages", [])
    if isinstance(raw_langs, str):
        raw_langs = re.split(r"[,;/]| and ", raw_langs)
    langs = normalize_languages([lang.strip() for lang in raw_langs if lang and str(lang).strip()])

    if not langs:
        detected = []
        standard_langs = {
            "english": "English", "tamil": "Tamil", "hindi": "Hindi",
            "telugu": "Telugu", "malayalam": "Malayalam", "kannada": "Kannada",
            "french": "French", "german": "German", "spanish": "Spanish",
            "bengali": "Bengali", "marathi": "Marathi", "punjabi": "Punjabi",
            "gujarati": "Gujarati", "urdu": "Urdu", "oriya": "Oriya", "nepali": "Nepali"
        }
        tlower = text.lower()
        for key, val in standard_langs.items():
            if re.search(rf"\b{re.escape(key)}\b", tlower):
                detected.append(val)
        langs = detected if detected else ["English"]

    data["languages"] = langs
    return data
