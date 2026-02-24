# app/routes/resume_routes.py
from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse

from app.helpers.resume_helper import process_resume_file

router = APIRouter()

@router.post("/upload_resume")
async def upload_resume_endpoint(file: UploadFile = File(...)):
    result = await process_resume_file(file)
    print("🔍 DEBUG resume result:", result)  # <---- Add this line
    if isinstance(result, dict) and result.get("error"):
        return JSONResponse(result, status_code=400)
    return result

# ==========================
# ✅ Exported for user.py
# ==========================
from app.helpers.resume_helper import extract_resume_data, process_resume_file
