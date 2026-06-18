
from fastapi import APIRouter, Depends
from routes.auth import verify_token
from services.simulator import simulate_batch
from services.log_service import save_events, get_stats
router = APIRouter()


router = APIRouter()

@router.get("/simulate")
def simulate(n: int = 10, hours: int = 8, token: str = Depends(verify_token)):
    events = simulate_batch(n=n, hours_ago=hours)
    save_events(events)
    stats = get_stats()
    return {
        "events": events,
        "count": len(events),
        "message": f"{len(events)} events generated and saved to database.",
        "db_stats": stats
    }
