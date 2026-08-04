from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from routes.auth import is_valid_token
from services.live import manager

router = APIRouter()

#live event
@router.websocket("/ws/live")
async def live_stream(websocket: WebSocket, token: str = ""):
    if not is_valid_token(token):
        await websocket.close(code=4401)
        return
    await manager.connect(websocket)
    try:
        # Keep the connection open; any client message keeps us alive.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)