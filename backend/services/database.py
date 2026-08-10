import os, json
from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "admissions.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student")
    created_at = Column(String, nullable=False)

    application = relationship("Application", back_populates="user", uselist=False)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String, nullable=False)
    programme = Column(String, nullable=False)
    jamb_reg = Column(String)
    jamb_score = Column(Integer)
    date_of_birth = Column(String)
    gender = Column(String)
    phone = Column(String)
    state = Column(String)
    address = Column(Text)
    status = Column(String, default="applied")
    ai_score = Column(Float)
    ai_explanation = Column(Text)
    admin_override = Column(Text)
    submitted_at = Column(String)
    created_at = Column(String, nullable=False)

    user = relationship("User", back_populates="application")
    olevel = relationship(
        "OlevelResult", back_populates="application",
        cascade="all, delete-orphan", order_by="OlevelResult.id"
    )
    documents = relationship(
        "Document", back_populates="application",
        cascade="all, delete-orphan", order_by="Document.id"
    )


class OlevelResult(Base):
    __tablename__ = "olevel_results"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    subject = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    exam_type = Column(String)
    year = Column(Integer)

    application = relationship("Application", back_populates="olevel")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    doc_type = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    stored_name = Column(String, nullable=False)
    content_type = Column(String)
    size = Column(Integer)
    uploaded_at = Column(String, nullable=False)

    application = relationship("Application", back_populates="documents")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)

    courses = relationship("Course", back_populates="department",
                           cascade="all, delete-orphan", order_by="Course.id")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    cutoff = Column(Integer, default=0)
    credits = Column(Integer, default=5)
    weight = Column(Float, default=0.4)
    age_min = Column(Integer, default=16)
    age_max = Column(Integer, default=45)
    subjects = Column(Text, default="[]")   # JSON list of compulsory O-level subjects
    description = Column(Text, default="")

    department = relationship("Department", back_populates="courses")


Base.metadata.create_all(engine)


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _session():
    return SessionLocal()


def seed_admin():
    import hashlib
    with _session() as db:
        exists = db.query(User).filter(User.role == "admin").first()
        if exists:
            return
        db.add(
            User(
                email="admin@kasu.edu.ng",
                password_hash=hashlib.sha256("admin1234".encode()).hexdigest(),
                full_name="Admissions Officer",
                role="admin",
                created_at=_now(),
            )
        )
        db.commit()


def _app_to_dict(app: Application) -> dict:
    return {
        "id": app.id,
        "user_id": app.user_id,
        "full_name": app.full_name,
        "programme": app.programme,
        "jamb_reg": app.jamb_reg,
        "jamb_score": app.jamb_score,
        "date_of_birth": app.date_of_birth,
        "gender": app.gender,
        "phone": app.phone,
        "state": app.state,
        "address": app.address,
        "status": app.status,
        "ai_score": app.ai_score,
        "ai_explanation": app.ai_explanation,
        "admin_override": app.admin_override,
        "submitted_at": app.submitted_at,
        "olevel": [
            {"subject": o.subject, "grade": o.grade, "exam_type": o.exam_type, "year": o.year}
            for o in (app.olevel or [])
        ],
        "documents": [
            {
                "id": d.id,
                "doc_type": d.doc_type,
                "filename": d.filename,
                "content_type": d.content_type,
                "size": d.size,
                "uploaded_at": d.uploaded_at,
            }
            for d in (app.documents or [])
        ],
    }


# ── Users ──────────────────────────────────────────────────────────────

def create_user(email, password_hash, full_name, role="student"):
    with _session() as db:
        user = User(email=email, password_hash=password_hash, full_name=full_name,
                    role=role, created_at=_now())
        db.add(user)
        db.commit()
        return user.id


def get_user_by_email(email):
    with _session() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        return {
            "id": user.id, "email": user.email, "password_hash": user.password_hash,
            "full_name": user.full_name, "role": user.role, "created_at": user.created_at,
        }


def get_user(user_id):
    with _session() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        return {
            "id": user.id, "email": user.email, "password_hash": user.password_hash,
            "full_name": user.full_name, "role": user.role, "created_at": user.created_at,
        }


# ── Applications ───────────────────────────────────────────────────────

def get_application_by_user(user_id):
    with _session() as db:
        app = db.query(Application).filter(Application.user_id == user_id).first()
        return _app_to_dict(app) if app else None


def get_application(application_id):
    with _session() as db:
        app = db.query(Application).filter(Application.id == application_id).first()
        return _app_to_dict(app) if app else None


def upsert_application(user_id, full_name, data: dict, olevel: list):
    with _session() as db:
        app = db.query(Application).filter(Application.user_id == user_id).first()
        now = _now()
        common = dict(
            full_name=full_name,
            programme=data.get("programme", ""),
            jamb_reg=data.get("jamb_reg", ""),
            jamb_score=data.get("jamb_score"),
            date_of_birth=data.get("date_of_birth"),
            gender=data.get("gender"),
            phone=data.get("phone"),
            state=data.get("state"),
            address=data.get("address"),
            status="applied",
            ai_score=None,
            ai_explanation=None,
            admin_override=None,
            submitted_at=now,
        )
        if app:
            for k, v in common.items():
                setattr(app, k, v)
            app.olevel.clear()
            application_id = app.id
        else:
            app = Application(user_id=user_id, created_at=now, **common)
            db.add(app)
            db.flush()
            application_id = app.id
        for o in olevel:
            db.add(OlevelResult(
                application_id=application_id,
                subject=o.get("subject", ""),
                grade=o.get("grade", ""),
                exam_type=o.get("exam_type"),
                year=o.get("year"),
            ))
        db.commit()
    return application_id


def get_olevel(application_id):
    with _session() as db:
        rows = (
            db.query(OlevelResult)
            .filter(OlevelResult.application_id == application_id)
            .order_by(OlevelResult.id)
            .all()
        )
    return [{"subject": r.subject, "grade": r.grade, "exam_type": r.exam_type, "year": r.year} for r in rows]


def list_all_applications(limit: int = 500) -> list:
    with _session() as db:
        apps = db.query(Application).order_by(Application.submitted_at.desc()).limit(limit).all()
        result = []
        for app in apps:
            item = _app_to_dict(app)
            result.append(item)
    return result


def get_pending_applications() -> list:
    with _session() as db:
        apps = db.query(Application).filter(Application.status == "applied").all()
        return [_app_to_dict(a) for a in apps]


def save_decision(application_id, status, score, explanation: list):
    with _session() as db:
        app = db.query(Application).filter(Application.id == application_id).first()
        app.status = status
        app.ai_score = score
        app.ai_explanation = json.dumps(explanation)
        db.commit()


def apply_override(application_id, status, reason):
    with _session() as db:
        app = db.query(Application).filter(Application.id == application_id).first()
        app.admin_override = json.dumps({"status": status, "reason": reason})
        app.status = status
        db.commit()


def get_stats() -> dict:
    with _session() as db:
        total = db.query(Application).count()
        admitted = db.query(Application).filter(Application.status == "admitted").count()
        waitlisted = db.query(Application).filter(Application.status == "waitlisted").count()
        rejected = db.query(Application).filter(Application.status == "rejected").count()
        applied = db.query(Application).filter(Application.status == "applied").count()
    return {"total": total, "admitted": admitted, "waitlisted": waitlisted, "rejected": rejected, "applied": applied}


# ── Documents ──────────────────────────────────────────────────────────

DOCUMENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "documents")
os.makedirs(DOCUMENTS_DIR, exist_ok=True)


def save_document(application_id, doc_type, filename, stored_name, content_type, size):
    with _session() as db:
        doc = Document(
            application_id=application_id,
            doc_type=doc_type,
            filename=filename,
            stored_name=stored_name,
            content_type=content_type,
            size=size,
            uploaded_at=_now(),
        )
        db.add(doc)
        db.commit()
        return doc.id


def get_document(doc_id):
    with _session() as db:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return None
        return {
            "id": doc.id, "application_id": doc.application_id, "doc_type": doc.doc_type,
            "filename": doc.filename, "stored_name": doc.stored_name,
            "content_type": doc.content_type, "size": doc.size, "uploaded_at": doc.uploaded_at,
        }


def list_documents(application_id):
    with _session() as db:
        docs = (
            db.query(Document)
            .filter(Document.application_id == application_id)
            .order_by(Document.id)
            .all()
        )
    return [
        {
            "id": d.id, "doc_type": d.doc_type, "filename": d.filename,
            "content_type": d.content_type, "size": d.size, "uploaded_at": d.uploaded_at,
        }
        for d in docs
    ]


def delete_document(doc_id):
    with _session() as db:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return False
        stored_path = os.path.join(DOCUMENTS_DIR, doc.stored_name)
        if os.path.exists(stored_path):
            try:
                os.remove(stored_path)
            except OSError:
                pass
        db.delete(doc)
        db.commit()
        return True


# ── Departments & Courses ──────────────────────────────────────────────

def _course_to_dict(course: Course) -> dict:
    return {
        "id": course.id,
        "department_id": course.department_id,
        "code": course.code,
        "name": course.name,
        "cutoff": course.cutoff,
        "credits": course.credits,
        "weight": course.weight,
        "age_min": course.age_min,
        "age_max": course.age_max,
        "subjects": json.loads(course.subjects or "[]"),
        "description": course.description or "",
    }


def list_departments() -> list:
    with _session() as db:
        depts = db.query(Department).order_by(Department.name).all()
        result = []
        for d in depts:
            result.append({
                "id": d.id,
                "code": d.code,
                "name": d.name,
                "courses": [_course_to_dict(c) for c in (d.courses or [])],
            })
    return result


def create_department(code, name):
    with _session() as db:
        exists = db.query(Department).filter(Department.code == code.upper()).first()
        if exists:
            return None, "A department with this code already exists."
        d = Department(code=code.upper(), name=name)
        db.add(d)
        db.commit()
        return {"id": d.id, "code": d.code, "name": d.name}, None


def get_department(department_id):
    with _session() as db:
        d = db.query(Department).filter(Department.id == department_id).first()
        if not d:
            return None
        return {"id": d.id, "code": d.code, "name": d.name}


def create_course(department_id, code, name, cutoff, credits, weight, age_min, age_max, subjects, description=""):
    with _session() as db:
        exists = db.query(Course).filter(Course.code == code.upper()).first()
        if exists:
            return None, "A course with this code already exists."
        c = Course(
            department_id=department_id, code=code.upper(), name=name,
            cutoff=cutoff, credits=credits, weight=weight,
            age_min=age_min, age_max=age_max,
            subjects=json.dumps(subjects), description=description,
        )
        db.add(c)
        db.commit()
        return _course_to_dict(c), None


def update_course(course_id, payload: dict) -> dict:
    with _session() as db:
        c = db.query(Course).filter(Course.id == course_id).first()
        if not c:
            return None
        fields = {
            "code": payload.get("code"), "name": payload.get("name"),
            "cutoff": payload.get("cutoff"), "credits": payload.get("credits"),
            "weight": payload.get("weight"),
            "age_min": payload.get("age_min"), "age_max": payload.get("age_max"),
            "subjects": json.dumps(payload.get("subjects", [])),
            "description": payload.get("description", ""),
        }
        for k, v in fields.items():
            if v is not None:
                setattr(c, k, v.upper() if k == "code" else v)
        db.commit()
        return _course_to_dict(c)


def delete_course(course_id) -> bool:
    with _session() as db:
        c = db.query(Course).filter(Course.id == course_id).first()
        if not c:
            return False
        db.delete(c)
        db.commit()
        return True


def get_course_by_code(code) -> dict:
    with _session() as db:
        c = db.query(Course).filter(Course.code == code.upper()).first()
        if not c:
            return None
        return _course_to_dict(c)


def seed_courses():
    """Seed departments and courses from the static catalogue if empty."""
    from services.programmes import PROGRAMMES_SEED  # imported lazily to avoid a cycle
    departments = [
        ("CMP", "Computing & Information Sciences"),
        ("MED", "Medicine & Health Sciences"),
        ("LAW", "Law"),
        ("MGT", "Management Sciences"),
        ("SOC", "Social Sciences"),
    ]
    with _session() as db:
        if db.query(Course).count() > 0:
            return
        for code, name in departments:
            db.add(Department(code=code, name=name))
        db.flush()
        dept_by_name = {d.name: d for d in db.query(Department).all()}

        def find_dept(code):
            if code in {"MSS", "NSC"}:
                return "Medicine & Health Sciences"
            if code == "LAW":
                return "Law"
            if code in {"ACC", "BAM"}:
                return "Management Sciences"
            if code in {"ECN", "MCM"}:
                return "Social Sciences"
            return "Computing & Information Sciences"

        for p in PROGRAMMES_SEED.values():
            db.add(Course(
                department_id=dept_by_name[find_dept(p["code"])].id,
                code=p["code"], name=p["name"],
                cutoff=p["cutoff"], credits=p["credits"], weight=p["weight"],
                age_min=p["age_range"][0], age_max=p["age_range"][1],
                subjects=json.dumps(p["subjects"]),
                description=p.get("description", ""),
            ))
        db.commit()


# Seed the default admin on import
seed_admin()
seed_courses()