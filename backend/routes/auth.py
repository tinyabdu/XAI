from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import hashlib, secrets, time

router = APIRouter()
security = HTTPBearer()

# Single admin account — change these before deployment
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD_HASH = hashlib.sha256("admin1234".encode()).hexdigest()

# In-memory token store {token: expiry_timestamp}
ACTIVE_TOKENS: dict = {}
TOKEN_TTL = 60 * 60 * 8  # 8 hours


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def _issue_token() -> str:
    token = secrets.token_hex(32)
    ACTIVE_TOKENS[token] = time.time() + TOKEN_TTL
    return token


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    expiry = ACTIVE_TOKENS.get(token)
    if not expiry or time.time() > expiry:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please log in again.")
    return token


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(body: LoginRequest):
    if body.username != ADMIN_USERNAME or _hash(body.password) != ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    token = _issue_token()
    return {"token": token, "message": "Login successful", "expires_in_hours": 8}


@router.post("/auth/logout")
def logout(token: str = Depends(verify_token)):
    ACTIVE_TOKENS.pop(token, None)
    return {"message": "Logged out successfully."}


@router.get("/auth/me")
def me(token: str = Depends(verify_token)):
    return {"username": ADMIN_USERNAME, "role": "Administrator"}