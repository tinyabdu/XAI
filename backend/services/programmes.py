# Programme catalogue.
#
# The catalogue is stored in the database (tables departments + courses) so an
# administrator can add new courses and edit their admission requirements, and
# the AI engine picks the requirements up automatically on the next run.
#
# PROGRAMMES_SEED below is only used to populate an empty database on first boot.

PROGRAMMES_SEED = {
    "computer_science": {
        "name": "Computer Science",
        "code": "CSC",
        "cutoff": 170,
        "credits": 5,
        "subjects": ["Mathematics", "English Language"],
        "weight": 0.4,
        "age_range": (16, 45),
        "description": "B.Sc. Computer Science — Mathematics and English Language are compulsory credits.",
    },
    "medicine": {
        "name": "Medicine & Surgery",
        "code": "MSS",
        "cutoff": 240,
        "credits": 5,
        "subjects": ["Mathematics", "English Language", "Biology", "Chemistry"],
        "weight": 0.4,
        "age_range": (16, 40),
        "description": "MBBS — very competitive. Requires credits in English, Maths, Biology and Chemistry.",
    },
    "law": {
        "name": "Law",
        "code": "LAW",
        "cutoff": 230,
        "credits": 5,
        "subjects": ["English Language", "Literature in English"],
        "weight": 0.4,
        "age_range": (16, 45),
        "description": "LL.B Law — English Language and Literature are compulsory credits.",
    },
    "nursing": {
        "name": "Nursing Science",
        "code": "NSC",
        "cutoff": 200,
        "credits": 5,
        "subjects": ["English Language", "Biology", "Chemistry"],
        "weight": 0.4,
        "age_range": (16, 40),
        "description": "B.Sc. Nursing — credits required in Biology and Chemistry.",
    },
    "accounting": {
        "name": "Accounting",
        "code": "ACC",
        "cutoff": 180,
        "credits": 5,
        "subjects": ["Mathematics", "English Language"],
        "weight": 0.4,
        "age_range": (16, 45),
        "description": "B.Sc. Accounting — strong Mathematics background required.",
    },
    "business_admin": {
        "name": "Business Administration",
        "code": "BAM",
        "cutoff": 160,
        "credits": 5,
        "subjects": ["Mathematics", "English Language"],
        "weight": 0.4,
        "age_range": (16, 45),
        "description": "B.Sc. Business Administration.",
    },
    "economics": {
        "name": "Economics",
        "code": "ECN",
        "cutoff": 180,
        "credits": 5,
        "subjects": ["Mathematics", "English Language", "Economics"],
        "weight": 0.4,
        "age_range": (16, 45),
        "description": "B.Sc. Economics — Economics plus Maths credits preferred.",
    },
    "mass_communication": {
        "name": "Mass Communication",
        "code": "MCM",
        "cutoff": 170,
        "credits": 5,
        "subjects": ["English Language"],
        "weight": 0.4,
        "age_range": (16, 45),
        "description": "B.Sc. Mass Communication.",
    },
}


def _db_to_programme(course: dict) -> dict:
    """Convert a stored course row into the shape the AI engine expects."""
    return {
        "code": course["code"],
        "name": course["name"],
        "cutoff": course["cutoff"],
        "credits": course["credits"],
        "subjects": course["subjects"],
        "weight": course["weight"],
        "age_range": (course["age_min"], course["age_max"]),
        "description": course.get("description", ""),
    }


def get_programme(key: str):
    """Look up a course by code or name. Falls back to the seed catalogue."""
    if not key:
        return None
    from services import database as db
    course = db.get_course_by_code(key.strip())
    if course:
        return _db_to_programme(course)
    # fall back to seed by name
    for p in PROGRAMMES_SEED.values():
        if p["name"].lower() == key.strip().lower():
            return p
    return None


def all_programmes():
    """Return the full DB-backed catalogue as a list."""
    from services import database as db
    rows = []
    for dept in db.list_departments():
        for course in dept.get("courses", []):
            rows.append(_db_to_programme(course))
    if rows:
        return rows
    # empty DB fallback
    return [_db_to_programme({**p, "age_min": p["age_range"][0], "age_max": p["age_range"][1],
                              "subjects": p["subjects"]}) for p in PROGRAMMES_SEED.values()]