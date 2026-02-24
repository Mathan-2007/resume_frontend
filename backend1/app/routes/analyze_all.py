# app/routes/analyze_all.py
# Combined route extracted from main.py — merges all analyses into one response.

from fastapi import APIRouter, File, UploadFile, Query
from fastapi.responses import JSONResponse

from app.helpers.resume_helper import process_resume_file
from app.routes.github_routes import analyze_github
from app.routes.leetcode_routes import analyze_leetcode
from app.routes.codechef_routes import analyze_codechef

router = APIRouter()

@router.post("/analyze_all")
async def analyze_all(
    file: UploadFile = File(...),
    github: str = Query(None),
    leetcode: str = Query(None),
    codechef: str = Query(None),
    token: str = Query(None),
):
    """
    Upload resume + optionally analyze GitHub / LeetCode / CodeChef.
    Returns a combined JSON object.
    """
    results = {}

    # ---------------- Resume ----------------
    resume_result = await process_resume_file(file)
    if isinstance(resume_result, dict) and resume_result.get("error"):
        return JSONResponse(resume_result, status_code=400)
    results["resume"] = resume_result

    # ---------------- GitHub ----------------
    if github:
        try:
            gh_data = analyze_github(github, token)
            results["github"] = gh_data
        except Exception as e:
            results["github_error"] = str(e)

    # ---------------- LeetCode ----------------
    if leetcode:
        try:
            lc_data = analyze_leetcode(leetcode)
            results["leetcode"] = lc_data
        except Exception as e:
            results["leetcode_error"] = str(e)

    # ---------------- CodeChef ----------------
    if codechef:
        try:
            cc_data = analyze_codechef(codechef)
            results["codechef"] = cc_data
        except Exception as e:
            results["codechef_error"] = str(e)

    return results
