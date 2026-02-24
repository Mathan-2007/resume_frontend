# app/routes/leetcode_routes.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.helpers.leetcode_helper import extract_leetcode_data, analyze_performance

router = APIRouter()

@router.get("/analyze_leetcode/{username}")
def analyze_leetcode(username: str):
    profile = extract_leetcode_data(username)
    if "error" in profile:
        return JSONResponse(profile, status_code=400)
    analysis = analyze_performance(profile)
    activity_graph = profile.get("activity_graph", [])
    return {"profile": profile, "analysis": analysis, "activity_graph": activity_graph}
