from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from typing import List, Optional
import os, uuid

import services.database as db
from services.programmes import all_programmes, get_programme
from services.admission_service import evaluate_application, status_label
from routes.auth import verify_token

router = APIRouter()
_optional_bearer = HTTPBearer(auto_error=False)

ALLOWED_DOC_TYPES = {
    "passport": "Passport Photograph",
    "olevel_cert": "O-Level Certificate",
    "jamb_result": "JAMB Result Slip",
    "admission_form": "Admission Form",
    "birth_cert": "Birth Certificate",
    "local_govt": "Local Government Identification",
    "other": "Other Document",
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class OLevelSubject(BaseModel):
    subject: str
    grade: str
    exam_type: Optional[str] = None
    year: Optional[int] = None


class ApplicationRequest(BaseModel):
    programme: str                # programme code, e.g. "CSC"
    jamb_reg: str
    jamb_score: int
    full_name: str
    date_of_birth: str
    gender: str
    phone: str
    state: str
    address: str
    olevel: List[OLevelSubject]


def _serialise(app: dict) -> dict:
    import json
    app = dict(app)
    app["ai_explanation"] = json.loads(app["ai_explanation"]) if app.get("ai_explanation") else []
    app["admin_override"] = json.loads(app["admin_override"]) if app.get("admin_override") else None
    app["status_label"] = status_label(app.get("status"))
    prog = get_programme(app.get("programme", ""))
    if prog:
        app["programme_name"] = prog["name"]
    else:
        app["programme_name"] = app.get("programme")
    return app


@router.get("/programmes")
def get_programmes(user: dict = Depends(verify_token)):
    # Students only need the course name + code — cut-offs and subject
    # requirements are internal admission details, kept on the admin side.
    return sorted([
        {"code": p["code"], "name": p["name"]}
        for p in all_programmes()
    ], key=lambda x: x["name"])


@router.post("/applications")
def submit_application(payload: ApplicationRequest, user: dict = Depends(verify_token)):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit applications.")
    if payload.jamb_score < 0 or payload.jamb_score > 400:
        raise HTTPException(status_code=400, detail="JAMB score must be between 0 and 400.")
    if not get_programme(payload.programme):
        raise HTTPException(status_code=400, detail="Unknown programme selected.")

    data = payload.dict()
    olevel = [
        {"subject": o.subject, "grade": o.grade, "exam_type": o.exam_type, "year": o.year}
        for o in payload.olevel
    ]
    db.upsert_application(user["id"], payload.full_name, data, olevel)
    return {"message": "Application submitted successfully."}


@router.get("/applications/me")
def my_application(user: dict = Depends(verify_token)):
    app = db.get_application_by_user(user["id"])
    if not app:
        return {"application": None}
    return {"application": _serialise(app)}


@router.get("/documents/types")
def document_types(user: dict = Depends(verify_token)):
    return ALLOWED_DOC_TYPES


@router.post("/applications/documents")
async def upload_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(verify_token),
):
    app = db.get_application_by_user(user["id"])
    if not app:
        raise HTTPException(status_code=404, detail="Submit your application before uploading documents.")
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Unknown document type.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB).")
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    ext = os.path.splitext(file.filename or "")[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(db.DOCUMENTS_DIR, stored_name), "wb") as f:
        f.write(data)

    db.save_document(app["id"], doc_type, file.filename, stored_name, file.content_type, len(data))
    return {"message": f"{ALLOWED_DOC_TYPES[doc_type]} uploaded successfully."}


@router.get("/applications/documents")
def my_documents(user: dict = Depends(verify_token)):
    app = db.get_application_by_user(user["id"])
    if not app:
        return {"documents": []}
    return {"documents": db.list_documents(app["id"])}


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: int,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(_optional_bearer),
):
    """Download a document. Authenticates via the Bearer header when present,
    otherwise falls back to the ?token= query parameter (used by browser <a> links)."""
    from routes.auth import is_valid_token

    user = None
    if credentials:
        user = is_valid_token(credentials.credentials)
    if not user and token:
        user = is_valid_token(token)
    return _serve_document(doc_id, user)


def _serve_document(doc_id: int, user: dict):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    # Student may only access their own documents; admin can access any.
    app = db.get_application_by_user(user["id"])
    is_owner = app and app["id"] == doc["application_id"]
    if not is_owner and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You cannot access this document.")
    path = os.path.join(db.DOCUMENTS_DIR, doc["stored_name"])
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File missing from storage.")
    return FileResponse(path, filename=doc["filename"], media_type=doc["content_type"])


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, user: dict = Depends(verify_token)):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    app = db.get_application_by_user(user["id"])
    if user["role"] != "admin" and (not app or app["id"] != doc["application_id"]):
        raise HTTPException(status_code=403, detail="You cannot delete this document.")
    db.delete_document(doc_id)
    return {"message": "Document deleted."}