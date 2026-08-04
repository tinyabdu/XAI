import asyncio
import os

from fastapi import WebSocket

from services.simulator import generate_event
from services.log_service import save_events

# Configurable live-stream settings (seconds between emissions, events per tick)
LIVE_INTERVAL = float(os.environ.get("LIVE_INTERVAL", "3"))
EVENTS_PER_TICK = int(os.environ.get("LIVE_EVENTS_PER_TICK", "1"))


class LiveManager:
    """Continuously generates AI-evaluated traffic and pushes it to connected admins."""

    def __init__(self):
        self.connections: set = set()
        self._task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)

    async def broadcast(self, event: dict):
        stale = []
        for ws in list(self.connections):
            try:
                await ws.send_json(event)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)

    async def _emit(self):
        for _ in range(EVENTS_PER_TICK):
            event = await asyncio.to_thread(generate_event)
            await asyncio.to_thread(save_events, [event])
            await self.broadcast(event)

    async def run(self):
        while True:
            await asyncio.sleep(LIVE_INTERVAL)
            try:
                await self._emit()
            except Exception as exc:
                print(f"[live] generation error: {exc}")


manager = LiveManager()
