from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from routes.auth import verify_token
from services.log_service import save_admin_action, get_admin_actions

router = APIRouter()


class AdminAction(BaseModel):
    event_id:  str
    action:    str   # "confirm", "override", "flag", "note"
    new_label: str | None = None   # used when action = "override" or "flag"
    note:      str | None = None


@router.post("/actions")
def take_action(body: AdminAction, token: str = Depends(verify_token)):
    allowed_actions = ["confirm", "override", "flag", "note"]
    if body.action not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"Action must be one of {allowed_actions}")
    save_admin_action(
        event_id=body.event_id,
        action=body.action,
        new_label=body.new_label,
        note=body.note,
    )
    return {"message": f"Action '{body.action}' saved for event {body.event_id}"}


@router.get("/actions")
def list_actions(token: str = Depends(verify_token)):
    return {"actions": get_admin_actions()}
