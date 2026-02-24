from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pymongo import MongoClient
import bcrypt
import jwt
import os
import datetime
import certifi
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["Authentication"])

# -------------------------------
# MongoDB Connection
# -------------------------------
try:
    client = MongoClient(
        os.getenv("MONGO_URI"),
        tls=True,
        tlsCAFile=certifi.where(),
        retryWrites=True
    )
    db = client[os.getenv("MONGO_DB_NAME")]
    users = db["users"]
    print("✅ MongoDB connection established successfully!")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    raise e


# -------------------------------
# Models
# -------------------------------
class LoginModel(BaseModel):
    email: str
    password: str


# -------------------------------
# JWT Settings
# -------------------------------
SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")
ALGORITHM = "HS256"


# -------------------------------
# Login Route
# -------------------------------
@router.post("/login")
def login_user(user: LoginModel):
    found = users.find_one({"email": {"$regex": f"^{user.email}$", "$options": "i"}})
    if not found:
        raise HTTPException(status_code=404, detail="User not found ❌")

    stored_password = found.get("password")
    if not stored_password:
        raise HTTPException(status_code=401, detail="Invalid password ❌")

    # Verify password
    if stored_password != user.password:
        try:
            if not bcrypt.checkpw(user.password.encode("utf-8"), stored_password.encode("utf-8")):
                raise HTTPException(status_code=401, detail="Invalid password ❌")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid password ❌")

    # Create JWT token
    payload = {
        "email": user.email.lower(),
        "role": found.get("role", "user"),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # Build response
    response = JSONResponse(content={
        "message": "Login successful ✅",
        "role": found.get("role", "user"),
    })

    # ✅ Correctly indented and scoped cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,        # ✅ must be True for SameSite=None
        samesite="None",    # ✅ allows cross-origin cookies
        domain="localhost", # ✅ match your frontend
        path="/"            # ✅ cookie available to all routes
    )

    return response


# -------------------------------
# Verify Token Route
# -------------------------------
@router.get("/verify_token")
def verify_token(request: Request):
    token = request.cookies.get("access_token")
    print("🔍 Cookie token:", token)
    if not token:
        raise HTTPException(status_code=401, detail="Missing token ❌")

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        print("✅ Decoded token:", decoded)
        return {"valid": True, "user": decoded}
    except jwt.ExpiredSignatureError:
        print("⚠️ Token expired")
        raise HTTPException(status_code=401, detail="Token expired ❌")
    except jwt.InvalidSignatureError:
        print("⚠️ Invalid signature - wrong secret")
        raise HTTPException(status_code=401, detail="Invalid signature ❌ (check secret key)")
    except jwt.InvalidTokenError as e:
        print("⚠️ Invalid token:", e)
        raise HTTPException(status_code=401, detail=f"Invalid token ❌: {str(e)}")

# -------------------------------
# logout
# -------------------------------
@router.post("/logout")
def logout(response: Response):
    """
    Log the user out by deleting the authentication cookie.
    """
    response.delete_cookie("access_token")  
    return {"message": "Logout successful"}
