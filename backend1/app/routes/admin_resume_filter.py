from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
from app.helpers.resume_helper import process_resume_file
from io import BytesIO
import json
import re
import asyncio

router = APIRouter()

# ---------------------------------------------------------
# 🔧 Helper functions
# ---------------------------------------------------------
def parse_percentage(value):
    """Convert string percentage (like '92.6%') to float."""
    if not value:
        return 0.0
    try:
        return float(str(value).replace("%", "").strip())
    except Exception:
        return 0.0


def parse_cgpa(value):
    """Convert CGPA string (like '8.32 (upto 5th semester)') to float."""
    if not value:
        return 0.0
    try:
        match = re.search(r"\d+(\.\d+)?", str(value))
        return float(match.group()) if match else 0.0
    except Exception:
        return 0.0


# ---------------------------------------------------------
# 🧠 Real-Time Resume Filter Streaming Endpoint
# ---------------------------------------------------------
@router.post("/filter_uploaded_resumes_stream")
async def filter_uploaded_resumes_stream(
    files: List[UploadFile] = File(...),
    cgpa: Optional[float] = Form(None),
    tenth: Optional[float] = Form(None),
    twelfth: Optional[float] = Form(None),
    ats: Optional[float] = Form(None),
    skills: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    degree: Optional[str] = Form(None),
):
    """
    Stream resume filtering progress file by file, returning live updates to the frontend.
    Each SSE (Server-Sent Event) message includes partial progress and cumulative results.
    """
    skill_list = [s.strip().lower() for s in skills.split(",")] if skills else []
    language = language.lower().strip() if language else None
    department = department.lower().strip() if department else None
    degree = degree.lower().strip() if degree else None
    total_files = len(files)

    async def event_stream():
        results = []
        processed_count = 0

        for i, file in enumerate(files, start=1):
            try:
                original_bytes = await file.read()
                if not original_bytes:
                    print(f"⚠️ Empty file skipped: {file.filename}")
                    continue

                # Process resume in-memory
                processing_copy = UploadFile(filename=file.filename, file=BytesIO(original_bytes))
                parsed = await process_resume_file(processing_copy)
                if not parsed or parsed.get("error"):
                    print(f"⚠️ Parsing failed for: {file.filename}")
                    continue

                data = parsed.get("data", {})
                ats_score = parsed.get("ats_score", 0)
                edu = data.get("education", {}) or {}
                langs = [lang.lower().strip() for lang in data.get("languages", []) if lang]
                tech_skills = [s.lower().strip() for s in data.get("skills", {}).get("technical", []) if s]
                email = data.get("email") or parsed.get("email")
                phone = data.get("phone") or parsed.get("phone")

                # Convert numeric fields
                tenth_value = parse_percentage(edu.get("10th", {}).get("percentage"))
                twelfth_value = parse_percentage(edu.get("12th", {}).get("percentage"))
                cgpa_value = parse_cgpa(edu.get("bachelor", {}).get("cgpa"))

                # Apply filters
                if cgpa and cgpa_value < cgpa:
                    continue
                if tenth and tenth_value < tenth:
                    continue
                if twelfth and twelfth_value < twelfth:
                    continue
                if ats and ats_score < ats:
                    continue
                if language and not any(language in l for l in langs):
                    continue
                if department and department not in str(edu.get("bachelor", {}).get("degree", "")).lower():
                    continue
                if degree and degree not in str(edu.get("bachelor", {}).get("degree", "")).lower():
                    continue
                if skill_list and not all(any(skill in s for s in tech_skills) for skill in skill_list):
                    continue

                # Build final filtered record
                result = {
                    "filename": file.filename,
                    "name": data.get("name"),
                    "email": email,
                    "phone": phone,
                    "ats_score": ats_score,
                    "education": edu,
                    "skills": data.get("skills", {}),
                    "languages": langs,
                }
                results.append(result)
                processed_count += 1

                # Send partial progress
                progress_payload = {
                    "progress": i,
                    "processed": processed_count,
                    "total": total_files,
                    "latest_filename": file.filename,
                    "latest_name": data.get("name"),
                    "results_so_far": results,
                }
                yield f"data: {json.dumps(progress_payload)}\n\n"
                await asyncio.sleep(0.05)

            except Exception as e:
                print(f"⚠️ Error processing {file.filename}: {e}")
                continue

        # Final event — marks completion
        final_payload = {"done": True, "results": results, "count": len(results)}
        yield f"data: {json.dumps(final_payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
