import json
from datetime import date

from services.programmes import all_programmes, get_programme


# O-level grade -> points used to compute the composite score.
GRADE_POINTS = {
    "A1": 10, "B2": 9, "B3": 8, "C4": 7, "C5": 6, "C6": 5,
    "A": 10,  "B": 8,  "C": 6,  "D": 4,  "E": 2,  "F": 0,
}

# Grades that count as a "credit".
CREDIT_GRADES = {"A1", "B2", "B3", "C4", "C5", "C6", "A", "B", "C"}

STATUS_LABELS = {
    "admitted": "Admitted",
    "waitlisted": "Waitlisted",
    "rejected": "Rejected",
    "applied": "Application Received",
}


def _age(birth_date_str):
    if not birth_date_str:
        return None
    try:
        y, m, d = (int(x) for x in birth_date_str.split("-"))
        today = date.today()
        return today.year - y - ((today.month, today.day) < (m, d))
    except Exception:
        return None


def _normalise_grade(grade):
    return (grade or "").strip().upper()


def evaluate_application(app: dict) -> dict:
    """Run the admission rules for a single application.

    Returns { status, score, explanation: [str] } where explanation gives the
    human-readable reasoning behind the AI decision.
    """
    explanation = []
    programme = get_programme(app.get("programme", ""))
    if not programme:
        return {"status": "rejected", "score": 0.0,
                "explanation": ["Selected programme is not offered by this institution."]}

    # Pull the O-level subjects into a lookup.
    olevel = app.get("olevel", [])
    subjects = {}
    for row in olevel:
        subj = (row.get("subject") or "").strip().title()
        grade = _normalise_grade(row.get("grade"))
        subjects[subj] = grade

    jamb = app.get("jamb_score") or 0
    age = _age(app.get("date_of_birth"))

    # 1) JAMB score must meet the programme cut-off.
    if jamb < programme["cutoff"]:
        explanation.append(
            f"JAMB score of {jamb} is below the {programme['name']} cut-off of {programme['cutoff']}."
        )
        return {"status": "rejected", "score": round(jamb / 400 * 100, 2), "explanation": explanation}

    # 2) Age band check.
    if age is not None:
        lo, hi = programme["age_range"]
        if not (lo <= age <= hi):
            explanation.append(
                f"Age ({age}) is outside the acceptable range ({lo}-{hi} years) for {programme['name']}."
            )
            return {"status": "rejected", "score": round(jamb / 400 * 100, 2), "explanation": explanation}

    # 3) O-level credits: count credits and check compulsory subjects.
    credit_count = 0
    for grade in subjects.values():
        if grade in CREDIT_GRADES:
            credit_count += 1

    missing = [s for s in programme["subjects"] if subjects.get(s) not in CREDIT_GRADES]
    if credit_count < programme["credits"]:
        explanation.append(
            f"Only {credit_count} O-level credit(s) provided; {programme['name']} requires at least {programme['credits']}."
        )
    if missing:
        explanation.append(
            "Missing compulsory credit(s): " + ", ".join(missing) + "."
        )
    if credit_count < programme["credits"] or missing:
        explanation.append(
            f"JAMB score of {jamb} meets the cut-off, but O-level requirements are not satisfied."
        )
        return {"status": "rejected", "score": round(jamb / 400 * 100, 2), "explanation": explanation}

    # 4) Composite score = weighted JAMB + weighted average O-level grade points.
    jamb_pct = jamb / 400 * 100
    grade_points = [GRADE_POINTS.get(g, 0) for g in subjects.values() if g]
    o_pct = (sum(grade_points) / len(grade_points)) / 10 * 100 if grade_points else 0
    w = programme["weight"]
    score = round(jamb_pct * (1 - w) + o_pct * w, 2)

    explanation.append(
        f"JAMB score of {jamb} meets the {programme['name']} cut-off of {programme['cutoff']}."
    )
    explanation.append(
        f"{credit_count} O-level credit(s) recorded, including all compulsory subjects."
    )
    if age is not None:
        explanation.append(f"Age of {age} is within the acceptable range.")

    # 5) Merit band: strong scores get admitted, moderate ones waitlisted.
    if score >= 70:
        explanation.append(
            f"Composite score of {score} is strong and meets the merit threshold."
        )
        status = "admitted"
    elif score >= 55:
        explanation.append(
            f"Composite score of {score} is acceptable but below the merit threshold; placed on the waitlist."
        )
        status = "waitlisted"
    else:
        explanation.append(
            f"Composite score of {score} is below the minimum benchmark for {programme['name']}."
        )
        status = "rejected"

    return {"status": status, "score": score, "explanation": explanation}


def run_admission(apps: list) -> dict:
    """Score a batch of applications with the ML engine (SHAP/LIME) and persist.

    Falls back to the deterministic rule engine if the ML model is unavailable.
    """
    from services.database import save_decision

    results = {"admitted": 0, "waitlisted": 0, "rejected": 0, "evaluated": 0}
    per_programme = {}
    for app in apps:
        try:
            from services.ml_service import predict_application
            decision = predict_application(app)
        except Exception:
            decision = evaluate_application(app)
            decision["features"] = None
        save_decision(
            app["id"], decision["status"], decision["score"],
            decision["explanation"], decision.get("features"),
        )
        results[decision["status"]] = results.get(decision["status"], 0) + 1
        results["evaluated"] += 1
        key = get_programme(app.get("programme", ""))
        pname = key["name"] if key else app.get("programme", "Unknown")
        per_programme.setdefault(pname, {"admitted": 0, "waitlisted": 0, "rejected": 0})
        per_programme[pname][decision["status"]] = per_programme[pname].get(decision["status"], 0) + 1
    results["per_programme"] = per_programme
    return results


def status_label(status):
    return STATUS_LABELS.get(status, status)