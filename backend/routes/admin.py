from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import json

import services.database as db
from services.admission_service import run_admission as run_admission_engine, status_label
from routes.auth import require_admin

router = APIRouter()


def _serialise(app: dict) -> dict:
    app = dict(app)
    app["ai_explanation"] = json.loads(app["ai_explanation"]) if app.get("ai_explanation") else []
    app["admin_override"] = json.loads(app["admin_override"]) if app.get("admin_override") else None
    app["status_label"] = status_label(app.get("status"))
    from services.programmes import get_programme
    prog = get_programme(app.get("programme", ""))
    if prog:
        app["programme_name"] = prog["name"]
        app["cutoff"] = prog["cutoff"]
        app["credits"] = prog["credits"]
        app["required_subjects"] = prog["subjects"]
    else:
        app["programme_name"] = app.get("programme")
    return app


@router.get("/admin/applications")
def list_applications(user: dict = Depends(require_admin)):
    apps = db.list_all_applications()
    return {"applications": [_serialise(a) for a in apps], "stats": db.get_stats()}


@router.post("/admin/run-admission")
def run_admission(user: dict = Depends(require_admin)):
    """Run the AI admission engine over all pending applications."""
    pending = db.get_pending_applications()
    if not pending:
        return {"evaluated": 0, "results": {"admitted": 0, "waitlisted": 0, "rejected": 0, "evaluated": 0, "per_programme": {}}}
    results = run_admission_engine(pending)
    return {"evaluated": results["evaluated"], "results": results}


class OverrideRequest(BaseModel):
    status: str
    reason: Optional[str] = "Manual decision by the admissions officer."


@router.post("/admin/applications/{app_id}/override")
def override_application(app_id: int, payload: OverrideRequest, user: dict = Depends(require_admin)):
    if payload.status not in {"admitted", "waitlisted", "rejected", "applied"}:
        raise HTTPException(status_code=400, detail="Invalid status.")
    app = db.get_application(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    db.apply_override(app_id, payload.status, payload.reason)
    return {"message": "Decision updated.", "status": payload.status}


# ── Departments & Courses management ───────────────────────────────────

class DepartmentRequest(BaseModel):
    code: str
    name: str


class CourseRequest(BaseModel):
    department_id: int
    code: str
    name: str
    cutoff: int = 0
    credits: int = 5
    weight: float = 0.4
    age_min: int = 16
    age_max: int = 45
    subjects: list = []
    description: str = ""


class CourseUpdateRequest(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    cutoff: Optional[int] = None
    credits: Optional[int] = None
    weight: Optional[float] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    subjects: Optional[list] = None
    description: Optional[str] = None


@router.get("/admin/departments")
def get_departments(user: dict = Depends(require_admin)):
    return {"departments": db.list_departments()}


@router.post("/admin/departments")
def add_department(payload: DepartmentRequest, user: dict = Depends(require_admin)):
    dept, error = db.create_department(payload.code, payload.name)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"message": "Department created.", "department": dept}


@router.post("/admin/courses")
def add_course(payload: CourseRequest, user: dict = Depends(require_admin)):
    if not db.get_department(payload.department_id):
        raise HTTPException(status_code=404, detail="Department not found.")
    course, error = db.create_course(
        payload.department_id, payload.code, payload.name,
        payload.cutoff, payload.credits, payload.weight,
        payload.age_min, payload.age_max, payload.subjects, payload.description,
    )
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"message": "Course created.", "course": course}


@router.put("/admin/courses/{course_id}")
def edit_course(course_id: int, payload: CourseUpdateRequest, user: dict = Depends(require_admin)):
    updated = db.update_course(course_id, payload.dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Course not found.")
    return {"message": "Course updated.", "course": updated}


@router.delete("/admin/courses/{course_id}")
def remove_course(course_id: int, user: dict = Depends(require_admin)):
    if not db.delete_course(course_id):
        raise HTTPException(status_code=404, detail="Course not found.")
    return {"message": "Course deleted."}