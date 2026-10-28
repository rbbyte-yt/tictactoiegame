"""
TicTacToe Arena — Ultimate Edition :: optional local Python server

What this file does (and nothing more):
  1. Serves the game (index.html) over your local network.
  2. Relays 4-digit room duels between browsers/devices via WebSockets.
  3. Optionally stores one local save-file backup in ./data (personal use).

No accounts, no internet calls, no tracking. All game data stays local.
Run:  uvicorn app:app --host 0.0.0.0 --port 8000
"""

import json
import re
import time
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "static" / "index.html"
if not INDEX.exists():
    INDEX = ROOT / "index.html"
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)

app = FastAPI(title="TicTacToe Arena (local network)", docs_url=None, redoc_url=None)

ROOMS: dict[str, dict] = {}          # code -> room state (client-authoritative relay)
CONNS: dict[str, set[WebSocket]] = {}  # code -> connected sockets
ROOM_TTL = 2 * 60 * 60                 # rooms expire after 2 hours
CODE_RE = re.compile(r"^\d{4}$")
MAX_MSG = 64 * 1024                    # 64 KB safety cap per message


def clean_rooms() -> None:
    now = time.time()
    for code in list(ROOMS):
        created = ROOMS[code].get("created_at", now)
        if ROOMS[code].get("status") == "closed" or now - created > ROOM_TTL:
            ROOMS.pop(code, None)


@app.get("/")
async def index():
    if not INDEX.exists():
        return JSONResponse({"error": "index.html not found next to app.py"}, status_code=404)
    return FileResponse(INDEX)


@app.get("/api/health")
async def health():
    return {"ok": True, "rooms": len(ROOMS)}


@app.get("/api/rooms/{code}")
async def get_room(code: str):
    """Used by the join screen to validate a 4-digit code before connecting."""
    clean_rooms()
    if not CODE_RE.match(code):
        return JSONResponse({"detail": "invalid code format"}, status_code=400)
    room = ROOMS.get(code)
    if not room:
        return JSONResponse({"detail": "room not found or expired"}, status_code=404)
    return room


@app.post("/save")
async def save_backup(payload: dict):
    """Optional local save-file management (personal backup)."""
    try:
        (DATA / "save.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1))
        return {"ok": True}
    except OSError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)


@app.get("/save")
async def load_backup():
    f = DATA / "save.json"
    if not f.exists():
        return JSONResponse({"detail": "no backup stored"}, status_code=404)
    return json.loads(f.read_text())


async def broadcast(code: str, message: str, exclude: WebSocket | None = None):
    dead = []
    for ws in CONNS.get(code, set()):
        if ws is exclude:
            continue
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        CONNS.get(code, set()).discard(ws)


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    """Room relay: clients publish authoritative room states; server stores + fans out."""
    await websocket.accept()
    joined: set[str] = set()
    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw) > MAX_MSG:
                continue
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            mtype = msg.get("type")
            if mtype == "publish":
                room = msg.get("room") or {}
                code = str(room.get("code", ""))
                if not CODE_RE.match(code):
                    continue
                clean_rooms()
                prev = ROOMS.get(code)
                # keep original creation timestamp, reject stale revisions
                if prev and isinstance(room.get("seq"), (int, float)) and isinstance(prev.get("seq"), (int, float)):
                    if room["seq"] <= prev["seq"]:
                        room = prev  # keep newer
                if "created_at" not in (prev or {}):
                    room["created_at"] = time.time()
                else:
                    room["created_at"] = prev.get("created_at", time.time())
                ROOMS[code] = room
                CONNS.setdefault(code, set()).add(websocket)
                joined.add(code)
                await broadcast(code, json.dumps({"room": room}), exclude=websocket)
            elif mtype == "close":
                code = str(msg.get("code", ""))
                room = ROOMS.pop(code, None)
                if room:
                    room["status"] = "closed"
                    room["seq"] = room.get("seq", 0) + 1
                    await broadcast(code, json.dumps({"room": room}))
    except WebSocketDisconnect:
        pass
    finally:
        for code in joined:
            CONNS.get(code, set()).discard(websocket)


if __name__ == "__main__":
    # Allows: python app.py  (uvicorn still recommended for production-style runs)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
