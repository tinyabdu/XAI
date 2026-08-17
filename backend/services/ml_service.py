"""Machine-learning admission engine with SHAP + LIME explanations.

The model is a scikit-learn RandomForest trained on applications generated from
the admission rules (services.admission_service.evaluate_application), which act
as the source of ground truth. Once trained, each new application is scored by
the model (not the raw rules) and the prediction is explained locally with:

  * SHAP  — exact TreeExplainer feature attributions
  * LIME  — local surrogate feature weights

The trained model and background data are cached on disk in data/ml/ so the
system only retrains when the programme catalogue changes.
"""
import os, json, hashlib, threading, random
from datetime import date

import numpy as np
import joblib

from services.programmes import all_programmes, get_programme
from services.admission_service import evaluate_application, _age, GRADE_POINTS, CREDIT_GRADES

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ml")
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
META_PATH = os.path.join(MODEL_DIR, "meta.json")
BACKGROUND_PATH = os.path.join(MODEL_DIR, "background.npy")

N_SAMPLES = 4000
N_ESTIMATORS = 180

FEATURE_LABELS = {
    "jamb_score": "JAMB Score",
    "jamb_margin": "JAMB Score vs Cut-off",
    "meets_cutoff": "JAMB Meets Cut-off",
    "age": "Age",
    "age_in_range": "Age In Range",
    "credit_count": "O-Level Credits",
    "credits_met": "Credits Requirement Met",
    "compulsory_hit": "Compulsory Subjects Credited",
    "missing_compulsory": "Missing Compulsory Subjects",
    "avg_grade_points": "Average O-Level Points",
    "cutoff": "Programme Cut-off",
}
FEATURE_ORDER = list(FEATURE_LABELS)

_LOCK = threading.Lock()
_MODEL = None
_BACKGROUND_X = None
_PREDICT_FN = None


# Feature engineering

def extract_features(app: dict, programme: dict) -> dict:
    """Map an application + programme onto the model's feature vector."""
    subjects = {}
    for row in app.get("olevel", []) or []:
        subj = (row.get("subject") or "").strip().title()
        grade = (row.get("grade") or "").strip().upper()
        subjects[subj] = grade

    jamb = float(app.get("jamb_score") or 0)
    cutoff = float(programme["cutoff"])
    age = _age(app.get("date_of_birth")) or 20
    age = max(15, min(age, 60))
    lo, hi = programme["age_range"]

    credit_count = sum(1 for g in subjects.values() if g in CREDIT_GRADES)
    compulsory = [s for s in programme["subjects"] if subjects.get(s) in CREDIT_GRADES]
    pool = [g for g in subjects.values() if g]
    points = [GRADE_POINTS.get(g, 0) for g in pool]

    return {
        "jamb_score": jamb,
        "jamb_margin": jamb - cutoff,
        "meets_cutoff": 1.0 if jamb >= cutoff else 0.0,
        "age": float(age),
        "age_in_range": 1.0 if lo <= age <= hi else 0.0,
        "credit_count": float(credit_count),
        "credits_met": 1.0 if credit_count >= programme["credits"] else 0.0,
        "compulsory_hit": (len(compulsory) / len(programme["subjects"])) if programme["subjects"] else 1.0,
        "missing_compulsory": float(len(programme["subjects"]) - len(compulsory)),
        "avg_grade_points": float(sum(points) / len(points)) if points else 0.0,
        "cutoff": cutoff,
    }


def _feature_vector(app: dict, programme: dict) -> list:
    feats = extract_features(app, programme)
    return [feats[k] for k in FEATURE_ORDER]


# Synthetic training data from the admission rules

_GRADE_POOL = ["A1", "B2", "B3", "C4", "C5", "C6", "D", "E", "F"]
_GRADE_WEIGHTS = [0.18, 0.16, 0.14, 0.12, 0.10, 0.08, 0.08, 0.07, 0.07]
_SUBJECT_POOL = [
    "Mathematics", "English Language", "Biology", "Chemistry", "Physics",
    "Geography", "Economics", "Literature in English", "Government",
    "Agricultural Science", "Commerce", "Accounting", "Further Mathematics",
]


def _random_olevel(programme: dict) -> list:
    rows = [{"subject": s, "grade": random.choices(_GRADE_POOL, _GRADE_WEIGHTS)[0]}
            for s in programme["subjects"]]
    extra_pool = [s for s in _SUBJECT_POOL if s not in programme["subjects"]]
    for subj in random.sample(extra_pool, k=random.randint(0, 3)):
        rows.append({"subject": subj, "grade": random.choices(_GRADE_POOL, _GRADE_WEIGHTS)[0]})
    return rows


def _random_app(programme: dict) -> dict:
    age = random.randint(14, 50)
    today = date.today()
    dob = f"{today.year - age:04d}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"
    return {
        "programme": programme["code"],
        "jamb_score": random.randint(90, 400),
        "date_of_birth": dob,
        "olevel": _random_olevel(programme),
    }


def _build_dataset(programmes: list, n: int = N_SAMPLES, seed: int = 42) -> tuple:
    random.seed(seed)
    np.random.seed(seed)
    X, y = [], []
    for _ in range(n):
        prog = random.choice(programmes)
        app = _random_app(prog)
        decision = evaluate_application(app)
        X.append(_feature_vector(app, prog))
        y.append(decision["status"])
    return np.asarray(X, dtype=float), np.asarray(y)


# Training / persistence

def _programme_signature(programmes: list) -> str:
    data = sorted(
        (p["code"], p["cutoff"], p["credits"], tuple(p["subjects"]),
         tuple(p["age_range"]), p["weight"])
        for p in programmes
    )
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


def _train(programmes: list, signature: str):
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split

    global _MODEL, _BACKGROUND_X, _PREDICT_FN
    X, y = _build_dataset(programmes)
    classes = sorted(set(y.tolist()))
    model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=14,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    acc = None
    try:
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.15, random_state=7, stratify=y)
        model.fit(Xtr, ytr)
        acc = round(float(model.score(Xte, yte)), 4)
        X = Xtr  # keep training split as LIME background
    except Exception:
        model.fit(X, y)

    _MODEL = model
    _BACKGROUND_X = X
    _PREDICT_FN = lambda rows: model.predict_proba(np.atleast_2d(np.asarray(rows, dtype=float)))

    meta = {
        "signature": signature,
        "classes": classes,
        "features": FEATURE_ORDER,
        "n_samples": int(X.shape[0]),
        "accuracy": acc,
        "model": "RandomForestClassifier (scikit-learn)",
    }
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    np.save(BACKGROUND_PATH, X)
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)


def _load_meta() -> dict:
    if not os.path.exists(META_PATH):
        return {}
    try:
        with open(META_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def ensure_model(force: bool = False):
    """Return the cached/trained model, retraining only when needed."""
    global _MODEL, _BACKGROUND_X, _PREDICT_FN
    if _MODEL is not None and not force:
        return _MODEL
    with _LOCK:
        if _MODEL is not None and not force:
            return _MODEL
        programmes = all_programmes()
        if not programmes:
            raise RuntimeError("No programmes available to train the ML model.")
        signature = _programme_signature(programmes)
        meta = _load_meta()
        if (
            not force
            and meta.get("signature") == signature
            and os.path.exists(MODEL_PATH)
            and os.path.exists(BACKGROUND_PATH)
        ):
            model = joblib.load(MODEL_PATH)
            _MODEL = model
            _BACKGROUND_X = np.load(BACKGROUND_PATH)
            _PREDICT_FN = lambda rows: model.predict_proba(np.atleast_2d(np.asarray(rows, dtype=float)))
            return model
        _train(programmes, signature)
        return _MODEL


def model_summary() -> dict:
    meta = _load_meta()
    return {
        "model": _MODEL.__class__.__name__ if _MODEL is not None else meta.get("model", "unavailable"),
        "accuracy": meta.get("accuracy"),
        "n_samples": meta.get("n_samples"),
        "classes": meta.get("classes", []),
        "features": meta.get("features", FEATURE_ORDER),
    }


# Local explanations: SHAP + LIME

def _shap_rows(model, X_row, pred_idx, feats: list) -> list:
    import shap
    explainer = shap.TreeExplainer(model)
    values = explainer.shap_values(X_row)
    # shap 0.52 multi-class tree output is (n_samples, n_features, n_classes);
    # older versions return a per-class list of (n_samples, n_features).
    arr = np.asarray(values)
    if arr.ndim == 3:
        sv = arr[0, :, pred_idx]
    elif isinstance(values, list):
        sv = np.asarray(values[pred_idx])[0]
    else:
        sv = arr[0]
    rows = []
    for i, key in enumerate(FEATURE_ORDER):
        rows.append({
            "feature": key,
            "label": FEATURE_LABELS[key],
            "value": round(float(feats[i]), 4),
            "weight": round(float(sv[i]), 4),
        })
    rows.sort(key=lambda r: abs(r["weight"]), reverse=True)
    return rows


def _lime_rows(x_row: list, class_names: list, pred_idx: int, n: int = 8) -> list:
    from lime.lime_tabular import LimeTabularExplainer
    if _BACKGROUND_X is None or len(_BACKGROUND_X) < 20 or _PREDICT_FN is None:
        return []
    explainer = LimeTabularExplainer(
        _BACKGROUND_X,
        feature_names=list(FEATURE_ORDER),
        class_names=list(class_names),
        discretize_continuous=False,
        mode="classification",
        random_state=42,
    )
    exp = explainer.explain_instance(
        np.asarray(x_row, dtype=float), _PREDICT_FN,
        labels=[pred_idx], num_features=n, num_samples=300,
    )
    mapping = exp.as_map().get(pred_idx, [])
    rows = []
    for idx, weight in mapping:
        key = FEATURE_ORDER[idx]
        rows.append({
            "feature": key,
            "label": FEATURE_LABELS[key],
            "value": round(float(x_row[idx]), 4),
            "weight": round(float(weight), 4),
        })
    rows.sort(key=lambda r: abs(r["weight"]), reverse=True)
    return rows


def _build_explanation(pred, score, prog, feats, shap_rows, lime_rows) -> list:
    from services.admission_service import status_label
    lines = []
    lines.append(
        f"ML model (RandomForest on scikit-learn, trained on admission criteria) "
        f"classified this applicant as {status_label(pred)} with a {score}% admission likelihood."
    )
    if shap_rows:
        top = shap_rows[0]
        verb = "raised" if top["weight"] >= 0 else "lowered"
        lines.append(
            f"SHAP shows {top['label']} ({top['value']}) {verb} the probability of admission most."
        )
        if len(shap_rows) > 1:
            second = shap_rows[1]
            verb2 = "raised" if second["weight"] >= 0 else "lowered"
            lines.append(
                f"SHAP: {second['label']} ({second['value']}) also {verb2} the outcome."
            )
    if lime_rows:
        top = lime_rows[0]
        verb = "supported" if top["weight"] >= 0 else "opposed"
        lines.append(f"LIME's local model agrees: {top['label']} ({top['value']}) {verb} admission.")
    if not shap_rows and not lime_rows:
        lines.append("No feature-attribution data was produced for this applicant.")
    # A plain-language rule check is still appended for transparency.
    if jamb := feats[FEATURE_ORDER.index("jamb_score")]:
        meets = "meets" if jamb >= prog["cutoff"] else "does not meet"
        lines.append(f"JAMB score of {round(jamb)} {meets} the {prog['name']} cut-off of {prog['cutoff']}.")
    return lines


# Public API

def predict_application(app: dict, programme: dict = None) -> dict:
    """Score one application with the ML model and attach SHAP/LIME data.

    Returns { status, score, explanation, features } — features carries the
    structured SHAP/LIME attributions for the frontend.
    """
    prog = programme or get_programme(app.get("programme", ""))
    if not prog:
        return {"status": "rejected", "score": 0.0,
                "explanation": ["Selected programme is not offered by this institution."],
                "features": None}
    try:
        model = ensure_model()
    except Exception:
        fallback = evaluate_application(app)
        fallback["features"] = None
        return fallback

    feats = _feature_vector(app, prog)
    X = np.asarray([feats], dtype=float)
    probs = model.predict_proba(X)[0]
    class_names = list(model.classes_)
    pred_idx = int(np.argmax(probs))
    pred = class_names[pred_idx]
    admitted_idx = class_names.index("admitted") if "admitted" in class_names else pred_idx
    admitted_prob = probs[admitted_idx]
    score = round(float(admitted_prob) * 100, 2)

    profile = [
        {"feature": k, "label": FEATURE_LABELS[k], "value": round(float(feats[i]), 4)}
        for i, k in enumerate(FEATURE_ORDER)
    ]

    shap_rows, lime_rows = [], []
    try:
        shap_rows = _shap_rows(model, X, pred_idx, feats)
    except Exception:
        shap_rows = []
    try:
        lime_rows = _lime_rows(feats, class_names, pred_idx)
    except Exception:
        lime_rows = []

    explanation = _build_explanation(pred, score, prog, feats, shap_rows, lime_rows)
    features = {
        "model": model_summary()["model"],
        "probabilities": {c: round(float(p), 3) for c, p in zip(class_names, probs)},
        "profile": profile,
        "shap": shap_rows,
        "lime": lime_rows,
    }
    return {"status": pred, "score": score, "explanation": explanation, "features": features}