from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import hashlib, secrets, time

import services.database as db

router = APIRouter()
security = HTTPBearer()

# In-memory token store {token: {"exp": ts, "user": {...}}}
ACTIVE_TOKENS: dict = {}
TOKEN_TTL = 60 * 60 * 8  # 8 hours


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def _issue_token(user: dict) -> str:
    token = secrets.token_hex(32)
    ACTIVE_TOKENS[token] = {"exp": time.time() + TOKEN_TTL, "user": user}
    return token


def is_valid_token(token: str):
    entry = ACTIVE_TOKENS.get(token)
    if not entry:
        return None
    if time.time() > entry["exp"]:
        ACTIVE_TOKENS.pop(token, None)
        return None
    return entry["user"]


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = is_valid_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please log in again.")
    return user


def require_admin(user: dict = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/register")
def register(body: RegisterRequest):
    if db.get_user_by_email(body.email):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    hash_pw = _hash(body.password)
    db.create_user(body.email.strip(), hash_pw, body.name.strip(), role="student")
    return {"message": "Account created. Please log in."}


@router.post("/auth/login")
def login(body: LoginRequest):
    user = db.get_user_by_email(body.email.strip())
    if not user or user["password_hash"] != _hash(body.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = _issue_token(user)
    return {
        "token": token,
        "role": user["role"],
        "name": user["full_name"],
        "email": user["email"],
        "expires_in_hours": 8,
    }


@router.post("/auth/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    ACTIVE_TOKENS.pop(credentials.credentials, None)
    return {"message": "Logged out successfully."}


@router.get("/auth/me")
def me(user: dict = Depends(verify_token)):
    fresh = db.get_user(user["id"]) or {}
    return {"name": fresh.get("full_name"), "email": fresh.get("email"), "role": fresh.get("role")}


# Helper used elsewhere that resolves a raw token string to a user dict.
def current_user_from_token(token: str):
    return is_valid_token(token)