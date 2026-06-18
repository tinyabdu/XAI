# XAI Admin Monitor
**An Enhanced Administration Management System Using Explainable AI (XAI)**  
Abubakar Dahiru · Kaduna State University (KASU) · Final Year Project

---

## Project Structure

```
xai_admin/
├── backend/          ← Python FastAPI + ML + SHAP + LIME
│   ├── main.py
│   ├── requirements.txt
│   ├── data/         ← Simulated traffic dataset (CSV)
│   ├── models/       ← Trained RandomForest + LabelEncoder (.pkl)
│   ├── routes/       ← API endpoints
│   └── services/     ← AI logic, simulator
└── frontend/         ← React + Tailwind dashboard
    ├── src/
    │   ├── pages/    ← Dashboard, Events, Predict, Report
    │   ├── components/
    │   └── services/ ← Axios API calls
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

### 2. Frontend (React + Tailwind)

```bash
cd frontend
npm install
npm start
```

Dashboard will open at: http://localhost:3000

---

## API Endpoints

| Method | Endpoint          | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | /api/report       | Full handover report (summary + events)  |
| GET    | /api/simulate     | Generate simulated traffic events        |
| POST   | /api/predict      | Predict a single traffic sample          |
| GET    | /api/shap/global  | Global SHAP feature importance           |

---

## How It Works

1. **Dataset** — Simulated traffic with 4 classes: `normal`, `brute_force`, `ddos`, `suspicious`
2. **ML Model** — RandomForestClassifier trained on 8 traffic features
3. **SHAP** — Explains which features mattered most globally across all decisions
4. **LIME** — Explains each individual decision in plain terms
5. **React Dashboard** — Admin sees a handover report with every AI decision explained

---

## Features

- **Dashboard** — Risk breakdown pie, classification bar chart, global SHAP
- **Live Events** — Simulate traffic, filter by action/risk, expand each event for SHAP & LIME
- **Predict** — Manual input form with quick presets (Normal / Brute Force / DDoS / Suspicious)
- **Handover Report** — Plain-English summary of what the AI did, top threats, all events

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Python, FastAPI, uvicorn          |
| AI/ML     | scikit-learn (RandomForest)       |
| XAI       | SHAP, LIME                        |
| Data      | pandas, numpy                     |
| Frontend  | React 18, Tailwind CSS, Recharts  |
| HTTP      | axios                             |
