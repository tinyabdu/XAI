# AI Admission System
**An Explainable AI-Driven University Admission System**  
Built on the KASU University admission model workflow.

---

## Project Structure

```
ai_admissions/
├── backend/              ← Python FastAPI + SQLAlchemy
│   ├── main.py
│   ├── requirements.txt
│   ├── data/             ← SQLite database (admissions.db)
│   ├── routes/           ← API endpoints (auth, students, admin)
│   └── services/         ← AI admission logic, programmes, database
└── frontend/             ← React + Tailwind portal
    ├── src/
    │   ├── pages/        ← Login, Register, Apply, Status, Admin
    │   └── services/     ← Axios API calls
    └── package.json
```

---

## How to Run

### 1. Backend (Python FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API will be live at: http://localhost:8000
Docs available at:   http://localhost:8000/docs

> A default **admin** account is seeded on first run:
> `admin@kasu.edu.ng` / `admin1234`

### 2. Frontend (React + Tailwind)

```bash
cd frontend
npm install
npm start
```

Portal will open at: http://localhost:3000

---

## How It Works

1. **Student registers** — creates an account on the portal.
2. **Student applies** — fills in bio data (name, DOB, gender, phone, state,
   address), JAMB/UTME details and O-level results, then chooses a programme.
   Students can also upload supporting documents (passport photo, O-level
   certificate, JAMB result slip, birth certificate, LG identification).
3. **Admin runs the AI** — clicks **"Run AI Admission"**, and the engine
   evaluates every pending application.
4. **AI decision** — based on JAMB score vs. the programme cut-off, O-Level
   credits (grade A1–C6 = credit), compulsory subjects, and the applicant's age.
5. **Explainable outcome** — every applicant receives a plain-English list of
   reasons (e.g. *"JAMB score of 285 meets the Computer Science cut-off"*).
6. **Admin can override** — an officer can manually change a decision to
   Admitted / Waitlisted / Rejected with a reason; the student sees it on their
   status page.

---

## API Endpoints

| Method | Endpoint                        | Auth   | Description                                    |
|--------|---------------------------------|--------|------------------------------------------------|
| POST   | /api/auth/register              | public | Create a student account                       |
| POST   | /api/auth/login                 | public | Login → returns token + role                   |
| POST   | /api/auth/logout                | token  | Invalidate the current token                   |
| GET    | /api/auth/me                    | token  | Current user profile                           |
| GET    | /api/programmes                 | token  | List programmes + cut-offs + requirements      |
| POST   | /api/applications               | student| Submit/update application (bio, JAMB, O-Level) |
| GET    | /api/applications/me            | student| My application + admission status              |
| GET    | /api/documents/types            | token  | List allowed document types                    |
| POST   | /api/applications/documents     | student| Upload a supporting document (multipart)       |
| GET    | /api/applications/documents     | student| List my uploaded documents                     |
| GET    | /api/documents/{id}/download    | token  | Download a document (header or ?token=)        |
| DELETE | /api/documents/{id}             | owner  | Delete a document                              |
| GET    | /api/admin/applications         | admin  | List all applications + stats + documents      |
| POST   | /api/admin/run-admission        | admin  | Run AI engine over all pending applications    |
| POST   | /api/admin/applications/{id}/override | admin | Manually override a decision                |

---

## Admission Logic (Explainable AI)

The decision engine is **machine-learning based** (`services/ml_service.py`):

1. **Training data** — a synthetic corpus (~4000 applicants) is generated from the
   admission criteria and labelled by the rule engine in
   `services/admission_service.py` (JAMB cut-off, age band, O-level credits,
   composite score).
2. **Model** — a scikit-learn `RandomForestClassifier` is trained to predict
   Admitted / Waitlisted / Rejected from features like JAMB score, age, credit
   count and programme cut-off. The trained model is cached in `data/ml/` and
   retrained automatically whenever the programme catalogue changes.
3. **Decision** — each new application is scored by the ML model
   (`/api/admin/run-admission`), giving a status and an admission-likelihood
   probability.
4. **SHAP** — `shap.TreeExplainer` computes exact per-feature attributions,
   showing what pushed each applicant's decision and by how much.
5. **LIME** — a local surrogate model (`lime.lime_tabular`) independently
   explains the same prediction; the two explanations are shown side-by-side on
   the student status page and the admin dashboard.
6. **Fallback** — if the ML engine is unavailable, the deterministic rules in
   `admission_service.py` still produce a decision.
7. **Admin override** — an officer can manually change a decision to
   Admitted / Waitlisted / Rejected with a reason; the student sees it on their
   status page.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Python, FastAPI, uvicorn          |
| AI/ML     | scikit-learn (RandomForest), SHAP, LIME, joblib |
| Data      | SQLAlchemy ORM, SQLite            |
| Frontend  | React 18, Tailwind CSS, lucide    |
| HTTP      | axios                             |