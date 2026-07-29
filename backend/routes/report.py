from fastapi import APIRouter, Depends
from services.simulator import simulate_batch
from services.ai_service import get_shap_global
from routes.auth import verify_token
from services.log_service import save_events, get_recent_events, get_stats
from collections import Counter

router = APIRouter()


@router.get("/report")
def get_report(events: int = 25, hours: int = 8, token: str = Depends(verify_token)):
    """Generate a full handover report for the admin."""
    batch = simulate_batch(n=events, hours_ago=hours)

    actions = Counter(e["action"] for e in batch)
    risks = Counter(e["risk"] for e in batch)
    labels = Counter(e["label"] for e in batch)

    threats = [e for e in batch if e["action"] != "allowed"]
    top_threats = sorted(threats, key=lambda e: {"critical": 0, "high": 1, "medium": 2}.get(e["risk"], 3))[:5]

    global_shap = get_shap_global()

    return {
        "summary": {
            "total_events": len(batch),
            "allowed": actions.get("allowed", 0),
            "blocked": actions.get("blocked", 0),
            "flagged": actions.get("flagged", 0),
            "monitored_hours": hours,
        },
        "risk_breakdown": dict(risks),
        "label_breakdown": dict(labels),
        "top_threats": top_threats,
        "all_events": batch,
        "global_shap": global_shap,
    }





@router.get("/logs")
def get_logs(limit: int = 100, token: str = Depends(verify_token)):
    return {"events": get_recent_events(limit), "stats": get_stats()}
