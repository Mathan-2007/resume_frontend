# app/main.py
# Main entry point for the AI Resume + Platform Analyzer backend

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uvicorn

# Import routers
from app.routes.resume_routes import router as resume_router
from app.routes.leetcode_routes import router as leetcode_router
from app.routes.codechef_routes import router as codechef_router
from app.routes.github_routes import router as github_router
from app.routes.analyze_all import router as analyze_all_router
from app.routes.admin_resume_filter import router as admin_filter_router
from app.routes.auth_routes import router as auth_router   # ✅ contains logout()
from app.routes.user import router as user_router
from app.routes.ai_routes import router as ai_router

# -------------------------
# FastAPI App Initialization
# -------------------------
app = FastAPI(title="AI Resume + Platform Analyzer")

# -------------------------
# ✅ CORS Setup (allow cookies from frontend)
# -------------------------
origins = [
    "http://localhost:3000",
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # ✅ required for HttpOnly cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Root Route
# -------------------------
@app.get("/")
def root():
    return {"message": "AI Resume + Platform Analyzer running ✅"}

# -------------------------
# Routers
# -------------------------
app.include_router(resume_router, prefix="/resume", tags=["Resume"])
app.include_router(leetcode_router, prefix="/leetcode", tags=["LeetCode"])
app.include_router(codechef_router, prefix="/codechef", tags=["CodeChef"])
app.include_router(github_router, prefix="/github", tags=["GitHub"])
app.include_router(analyze_all_router, tags=["Analyze All"])
app.include_router(admin_filter_router, prefix="/admin", tags=["Admin Filter"])
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])  # ✅ includes /logout
app.include_router(user_router, tags=["User"])
app.include_router(ai_router, tags=["AI"])

# -------------------------
# Run Server
# -------------------------
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
