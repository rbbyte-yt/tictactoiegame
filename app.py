"""
TicTacToe Arena - Local Backend
================================
FastAPI + WebSockets server for:
  - Serving the static frontend (HTML/CSS/JS)
  - Local-network (LAN) multiplayer rooms via WebSockets
  - Optional local data file management (save/export profile JSON)

Run:
    python app.py
Then open:
    http://localhost:8000
For LAN play, find your host IP (e.g. 192.168.1.10) and open
    http://192.168.1.10:8000
from another device on the SAME Wi-Fi / LAN.

This server stores rooms in memory only. No database, no accounts,
no internet calls. All profile/coin data lives in the player's browser
localStorage; the server never sees it.
"""

from __future__ import annotations

import json
import os
import random
import string
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Rooms are kept in process memory; they disappear when the server restarts.
ROOM_TTL_SECONDS = 60 * 60  # a room is garbage-collected after 1h of inactivity


# ---------------------------------------------------------------------------
# Room model
# ---------------------------------------------------------------------------
@dataclass
class Player:
    ws: WebSocket
    player_id: str
    name: str
    symbol: str  # "X" or "O"
    connected: bool = True


@dataclass
class Room:
    code: str
    board_size: int
    win_len: int
    creator_id: str
    players: Dict[str, Player] = field(default_factory=dict)
    board: List[Optional[str]] = field(default_factory=list)
    turn: str = "X"
    moves: List[dict] = field(default_factory=list)
    winner: Optional[str] = None  # "X" | "O" | "draw" | None
    win_line: Optional[List[int]] = None
    score_x: int = 0
    score_o: int = 0
    score_draw: int = 0
    last_activity: float = field(default_factory=time.time)
    started: bool = False

    def reset_board(self) -> None:
        self.board = [None] * (self.board_size * self.board_size)
        self.turn = "X"
        self.winner = None
        self.win_line = None
        self.moves = []
        self.started = True

    def to_public(self) -> dict:
        return {
            "code": self.code,
            "board_size": self.board_size,
            "win_len": self.win_len,
            "players": {
                pid: {"name": p.name, "symbol": p.symbol, "connected": p.connected}
                for pid, p in self.players.items()
            },
            "board": self.board,
            "turn": self.turn,
            "winner": self.winner,
            "win_line": self.win_line,
            "score_x": self.score_x,
            "score_o": self.score_o,
            "score_draw": self.score_draw,
            "started": self.started,
            "last_activity": self.last_activity,
        }


# ---------------------------------------------------------------------------
# In-memory room registry
# ---------------------------------------------------------------------------
rooms: Dict[str, Room] = {}


def gc_rooms() -> None:
    """Drop stale rooms to keep memory bounded."""
    now = time.time()
    stale = [c for c, r in rooms.items() if now - r.last_activity > ROOM_TTL_SECONDS]
    for code in stale:
        rooms.pop(code, None)


def new_room_code() -> str:
    """Generate a unique 4-digit numeric room code."""
    gc_rooms()
    for _ in range(1000):
        code = "".join(random.choices(string.digits, k=4))
        if code not in rooms:
            return code
    # Extremely unlikely fallback
    return "".join(random.choices(string.digits, k=4))


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="TicTacToe Arena", version="1.0.0")

# Allow same-LAN browsers; we don't ship to the open internet.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "rooms": len(rooms)}


@app.post("/api/rooms")
async def create_room(body: dict) -> JSONResponse:
    """Create a new room. Body: {player_id, name, board_size, win_len}"""
    gc_rooms()
    code = new_room_code()
    board_size = int(body.get("board_size", 3))
    win_len = int(body.get("win_len", 3))
    board_size = max(3, min(10, board_size))
    win_len = max(3, min(board_size, win_len))
    room = Room(
        code=code,
        board_size=board_size,
        win_len=win_len,
        creator_id=body.get("player_id", ""),
    )
    room.reset_board()
    room.started = False
    rooms[code] = room
    return JSONResponse(
        {"code": code, "board_size": board_size, "win_len": win_len}
    )


@app.get("/api/rooms/{code}")
async def room_status(code: str) -> JSONResponse:
    code = code.strip()
    room = rooms.get(code)
    if not room:
        return JSONResponse({"ok": False, "error": "Room not found or expired"}, status_code=404)
    return JSONResponse({"ok": True, "room": room.to_public()})


@app.delete("/api/rooms/{code}")
async def delete_room(code: str) -> JSONResponse:
    rooms.pop(code, None)
    return JSONResponse({"ok": True})


# ---------------------------------------------------------------------------
# WebSocket: /ws/{room_code}?player_id=...&name=...&symbol=...
# ---------------------------------------------------------------------------
@app.websocket("/ws/{room_code}")
async def ws_room(websocket: WebSocket, room_code: str):
    await websocket.accept()
    try:
        # First message must be a "join" payload
        first = await websocket.receive_json()
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close(code=1008)
        return

    if first.get("type") != "join":
        await websocket.send_json({"type": "error", "message": "First message must be a join"})
        await websocket.close(code=1008)
        return

    room_code = room_code.strip()
    room = rooms.get(room_code)
    if not room:
        await websocket.send_json({"type": "error", "message": "Room not found or expired"})
        await websocket.close(code=1008)
        return

    player_id = first.get("player_id", "")
    name = first.get("name", "Player")[:24]
    requested_symbol = first.get("symbol", "")

    # Assign symbol: creator is X, joiner is O if not already taken.
    if not room.players:
        symbol = "X"
    elif len(room.players) == 1:
        existing = next(iter(room.players.values()))
        symbol = "O" if existing.symbol == "X" else "X"
    else:
        # Reconnect path: if player_id matches an existing player, reuse symbol.
        if player_id in room.players:
            symbol = room.players[player_id].symbol
        else:
            await websocket.send_json({"type": "error", "message": "Room is full"})
            await websocket.close(code=1008)
            return

    # Reject if a different human is already holding the same symbol slot.
    if player_id not in room.players:
        same_symbol = [p for p in room.players.values() if p.symbol == symbol]
        if same_symbol:
            await websocket.send_json({"type": "error", "message": "Symbol slot taken"})
            await websocket.close(code=1008)
            return

    player = Player(ws=websocket, player_id=player_id, name=name, symbol=symbol)
    room.players[player_id] = player
    room.last_activity = time.time()

    await websocket.send_json(
        {"type": "joined", "room": room.to_public(), "you": {"symbol": symbol, "player_id": player_id}}
    )
    await broadcast(room)

    try:
        while True:
            msg = await websocket.receive_json()
            await handle_message(room, player, msg)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        player.connected = False
        # Keep the slot so the player can reconnect, but notify the other side.
        await broadcast(room)


async def handle_message(room: Room, player: Player, msg: dict) -> None:
    room.last_activity = time.time()
    mtype = msg.get("type")

    if mtype == "start":
        # Only the creator can (re)start a match.
        if player.player_id != room.creator_id and len(room.players) > 1:
            # Allow either player to start once both are present.
            pass
        if len(room.players) < 2:
            await player.ws.send_json({"type": "error", "message": "Waiting for opponent"})
            return
        room.reset_board()
        await broadcast(room)

    elif mtype == "move":
        if room.winner:
            return
        if not room.started:
            await player.ws.send_json({"type": "error", "message": "Match not started"})
            return
        if player.symbol != room.turn:
            await player.ws.send_json({"type": "error", "message": "Not your turn"})
            return
        idx = int(msg.get("index", -1))
        if idx < 0 or idx >= len(room.board):
            return
        if room.board[idx] is not None:
            await player.ws.send_json({"type": "error", "message": "Cell occupied"})
            return
        room.board[idx] = player.symbol
        room.moves.append({"index": idx, "symbol": player.symbol, "by": player.player_id})

        winner, line = check_winner(room.board, room.board_size, room.win_len)
        if winner == "draw":
            room.winner = "draw"
            room.score_draw += 1
        elif winner:
            room.winner = winner
            room.win_line = line
            if winner == "X":
                room.score_x += 1
            else:
                room.score_o += 1
        else:
            room.turn = "O" if room.turn == "X" else "X"
        await broadcast(room)

    elif mtype == "rematch":
        room.reset_board()
        await broadcast(room)

    elif mtype == "leave":
        await broadcast(room)

    elif mtype == "chat":
        text = str(msg.get("text", ""))[:200]
        await broadcast(room, extra={"type": "chat", "from": player.name, "symbol": player.symbol, "text": text})


async def broadcast(room: Room, extra: Optional[dict] = None) -> None:
    """Send the current room state to every connected player."""
    payload = extra if extra is not None else {"type": "state", "room": room.to_public()}
    dead: List[str] = []
    for pid, p in list(room.players.items()):
        try:
            await p.ws.send_json(payload)
        except Exception:
            dead.append(pid)
    for pid in dead:
        # Mark as disconnected but keep slot for reconnect.
        if pid in room.players:
            room.players[pid].connected = False


# ---------------------------------------------------------------------------
# Win detection (shared with the client to keep rules consistent)
# ---------------------------------------------------------------------------
def check_winner(board: List[Optional[str]], size: int, win_len: int):
    """Return (winner_symbol_or_"draw", line_indices) or (None, None)."""
    n = size
    # Build a 2D grid for readability.
    grid = [board[r * n:(r + 1) * n] for r in range(n)]

    def line_win(line):
        vals = [grid[r][c] for (r, c) in line]
        if not vals[0]:
            return None
        if all(v == vals[0] for v in vals):
            return vals[0]
        return None

    # All lines of length win_len
    lines = []
    # Horizontal
    for r in range(n):
        for c in range(n - win_len + 1):
            lines.append([(r, c + k) for k in range(win_len)])
    # Vertical
    for c in range(n):
        for r in range(n - win_len + 1):
            lines.append([(r + k, c) for k in range(win_len)])
    # Diagonal down-right
    for r in range(n - win_len + 1):
        for c in range(n - win_len + 1):
            lines.append([(r + k, c + k) for k in range(win_len)])
    # Diagonal up-right
    for r in range(win_len - 1, n):
        for c in range(n - win_len + 1):
            lines.append([(r - k, c + k) for k in range(win_len)])

    for line in lines:
        w = line_win(line)
        if w:
            flat = [r * n + c for (r, c) in line]
            return w, flat

    if all(v is not None for v in board):
        return "draw", None
    return None, None


# ---------------------------------------------------------------------------
# Optional local profile backup endpoints (purely convenience; never required)
# ---------------------------------------------------------------------------
@app.post("/api/backup/save")
async def backup_save(body: dict) -> JSONResponse:
    """Save a profile JSON blob to ./data/{player_id}.json (optional)."""
    pid = str(body.get("player_id", "default"))[:32]
    safe = "".join(c for c in pid if c.isalnum() or c in ("-", "_")) or "default"
    path = os.path.join(DATA_DIR, f"{safe}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(body.get("data", {}), f, ensure_ascii=False, indent=2)
    return JSONResponse({"ok": True, "path": path})


@app.get("/api/backup/load/{player_id}")
async def backup_load(player_id: str) -> JSONResponse:
    safe = "".join(c for c in player_id if c.isalnum() or c in ("-", "_")) or "default"
    path = os.path.join(DATA_DIR, f"{safe}.json")
    if not os.path.exists(path):
        return JSONResponse({"ok": False, "error": "No backup"}, status_code=404)
    with open(path, "r", encoding="utf-8") as f:
        return JSONResponse({"ok": True, "data": json.load(f)})


# ---------------------------------------------------------------------------
# Static frontend (must be mounted LAST so API routes win)
# ---------------------------------------------------------------------------
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    # Bind to 0.0.0.0 so other devices on the same LAN can connect.
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
