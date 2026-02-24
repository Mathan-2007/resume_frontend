# app/routes/user.py

from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import Response
from datetime import datetime
import httpx
import gridfs
from io import BytesIO
from bson import ObjectId

from app.routes.auth_routes import db
from app.routes.resume_routes import process_resume_file

router = APIRouter(prefix="/user", tags=["User Dashboard"])

# Mongo collections
users = db["users"]
reports = db["reports"]

# GridFS instance
fs = gridfs.GridFS(db)

# Local AI API endpoint
AI_CHAT_URL = "http://127.0.0.1:8000/ai/chat"


# ---------------------------------------------------------------------
# 1️⃣ Fetch user info
# ---------------------------------------------------------------------
@router.get("/info/{email}")
def get_user_info(email: str):
    user = users.find_one(
        {"email": email.lower()},
        {"_id": 0, "password": 0}
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"status": "success", "user": user}


# ---------------------------------------------------------------------
# 2️⃣ Upload Resume → Process + AI Skill Suggestion + GridFS Save
# ---------------------------------------------------------------------
@router.post("/upload_resume")
async def upload_resume(email: str = Form(...), file: UploadFile = None):

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    try:
        # ✅ Read file ONLY ONCE
        file_bytes = await file.read()
        file_stream = BytesIO(file_bytes)

        # -------------------------
        # Step 1: Process resume
        # -------------------------
        result = await process_resume_file(file_stream)

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        structured_info = result.get("data", {})
        ats_score = result.get("ats_score", 0)
        ats_breakdown = result.get("ats_breakdown", {})
        word_count = result.get("word_count", 0)

        # -------------------------
        # Step 2: Extract skills
        # -------------------------
        technical_skills = structured_info.get("skills", {}).get("technical", [])
        skills_text = ", ".join(technical_skills) if technical_skills else "None"

        # -------------------------
        # Step 3: AI role detection
        # -------------------------
        ai_prompt = (
            f"Analyze this candidate's resume data and determine their most suitable job role "
            f"based on their skills, education, and experience.\n\n"
            f"Resume technical skills: {skills_text}\n\n"
            f"Return strictly:\n"
            f"Role: <predicted role>\n"
            f"Missing Skills: <comma-separated list>"
        )

        detected_role = "Unknown"
        suggested_skills = []

        async with httpx.AsyncClient() as client:
            try:
                ai_response = await client.post(
                    AI_CHAT_URL,
                    json={"query": ai_prompt, "resume_data": structured_info},
                    timeout=30,
                )

                if ai_response.status_code == 200:
                    data = ai_response.json()
                    ai_text = data.get("response", "")

                    if "Role:" in ai_text:
                        parts = ai_text.split("Role:")[1].split("Missing Skills:")
                        detected_role = parts[0].strip() if len(parts) > 0 else "Unknown"

                        if len(parts) > 1:
                            suggested_skills = [
                                s.strip() for s in parts[1].split(",") if s.strip()
                            ]

            except Exception as e:
                print("⚠️ AI request failed:", e)

        # -------------------------
        # Step 4: Save PDF into GridFS
        # -------------------------
        file_id = fs.put(
            file_bytes,
            filename=file.filename,
            contentType="application/pdf",
            email=email.lower(),
            created_at=datetime.utcnow().isoformat()
        )

        # -------------------------
        # Step 5: Save report metadata
        # -------------------------
        reports.insert_one({
            "email": email.lower(),
            "resume_filename": file.filename,
            "file_id": str(file_id),
            "structured_info": structured_info,
            "ats_score": ats_score,
            "ats_breakdown": ats_breakdown,
            "word_count": word_count,
            "detected_role": detected_role,
            "suggested_skills": suggested_skills,
            "created_at": datetime.utcnow().isoformat(),
        })

        # -------------------------
        # Step 6: Response
        # -------------------------
        return {
            "status": "success",
            "message": "Resume processed successfully ✅",
            "structured_info": structured_info,
            "ats_score": ats_score,
            "ats_breakdown": ats_breakdown,
            "word_count": word_count,
            "detected_role": detected_role,
            "suggested_skills": suggested_skills,
        }

    except Exception as e:
        print("❌ Error in upload_resume:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# 3️⃣ Fetch Resume History
# ---------------------------------------------------------------------
@router.get("/history/{email}")
def get_history(email: str):

    history = list(
        reports.find({"email": email.lower()}, {"_id": 0})
               .sort("created_at", -1)
    )

    if not history:
        raise HTTPException(status_code=404, detail="No reports found")

    return {"status": "success", "history": history}


# ---------------------------------------------------------------------
# 4️⃣ Download Resume PDF from MongoDB GridFS
# ---------------------------------------------------------------------
@router.get("/resume-file/{file_id}")
def get_resume_file(file_id: str):
    try:
        file = fs.get(ObjectId(file_id))
        return Response(file.read(), media_type="application/pdf")
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


# ---------------------------------------------------------------------
# 5️⃣ Admin – List all users
# ---------------------------------------------------------------------
@router.get("/all")
def get_all_users():
    all_users = list(users.find({}, {"_id": 0, "password": 0}))
    return {"status": "success", "users": all_users}