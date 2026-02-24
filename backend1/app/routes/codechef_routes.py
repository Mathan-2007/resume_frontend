# app/routes/codechef_routes.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.helpers.codechef_helper import extract_codechef_paths_and_badges

router = APIRouter()

@router.get("/analyze_codechef/{username}")
def analyze_codechef(username: str):
    profile_url = f"https://www.codechef.com/users/{username}"
    data = extract_codechef_paths_and_badges(profile_url)
    if "error" in data:
        return JSONResponse(data, status_code=400)
    return {"profile": data}
