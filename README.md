# TicTacToe Arena — Ultimate Edition

A complete, offline-first Tic-Tac-Toe game built with **vanilla HTML/CSS/JavaScript** and a **Python FastAPI** backend for optional same-LAN multiplayer.

> 50+ arenas · 3×3 to 10×10 boards · 5 AI difficulties (incl. minimax unbeatable on 3×3) · custom X/O symbols · profile system · R Coin economy · redeem codes (incl. `RABBi` for unlimited coins) · LAN room multiplayer.

---

## ✨ Features

### Game modes
- **Local Solo** — play vs AI (Easy / Medium / Hard / Expert / Impossible).
- **Local Multiplayer** — pass-and-play on one device.
- **Join with Code** — same-LAN multiplayer via the Python WebSocket server. Create a 4-digit room code, share it, both devices connect.

### Board sizes & win rules
| Size | Win length choices |
|------|-------------------|
| 3×3  | 3 in a row |
| 4×4  | 3 or 4 in a row |
| 5×5  | 4 or 5 in a row |
| 6×6  | 4 or 5 in a row |
| 7×7  | 4, 5 or 6 in a row |
| 8×8  | 5, 6 or 7 in a row |
| 9×9  | 5 or 6 in a row |
| 10×10 | 5, 6 or 7 in a row |

Horizontal, vertical, and both diagonals count.

### AI difficulties
- **Easy** — random legal moves.
- **Medium** — basic win/block logic with center bias.
- **Hard** — 1-ply lookahead + heuristic evaluation.
- **Expert** — bounded minimax with alpha-beta pruning (deeper).
- **Impossible** — full minimax on 3×3 (truly unbeatable); bounded-depth minimax on larger boards (very strong but not literally unbeatable — the UI never claims otherwise).

### 50+ arenas
Arenas are pure CSS themes (gradients, animations, particles) — no copyrighted assets. Categories: Nature, Fantasy, Space, Cities, Adventure, Games & Entertainment, Special. Each has its own background, board tint, X/O colors, and animated backdrop.

### Custom X/O symbols
15 symbol packs (Classic, Neon, Lightning & Orb, Fire & Ice, Star & Moon, Diamond & Heart, Skull & Ghost, Sword & Shield, Crown & Ring, Robot & Alien, Flower & Butterfly, Pixel, Golden, Holographic, Animated). Each pack can be equipped independently for X and O.

### Profile system
- Username, avatar letter, avatar color, banner gradient, avatar frame
- XP & level (100+ levels with 12 title tiers from Beginner → Ultimate Legend)
- Stats: matches, wins, losses, draws, win rate, streak, best streak
- Equipped arena/symbols/frame, R Coin balance
- Recent matches
- Match history (last 50)
- All stored locally in browser localStorage

### R Coin economy
- Wallet with coin icon
- Earn coins by winning (more for harder AI), draws (smaller), LAN wins (biggest)
- Daily login reward (grows with streak)
- Daily missions (3 per day, claim for coins + XP)
- Achievements with coin rewards
- Transaction history
- Purchase confirmation
- Cannot go negative
- Unlimited R Coin mode (via `RABBi` code) — purchases don't reduce balance; UI shows `∞`

### Redeem codes (open the wallet → 🎁 Redeem Code)
| Code | Effect |
|------|--------|
| `RABBi` | Activates **Unlimited R Coins** mode for this profile. (Case-insensitive, but must be spelled exactly R-A-B-B-i.) |
| `WELCOME100` | +100 R Coins (once per profile) |
| `ARENA500` | +500 R Coins (once per profile) |
| `STARTER250` | +250 R Coins (once per profile) |

Codes are validated locally — no internet call. Local redeem codes are NOT secure against someone editing their browser localStorage; that's acceptable for an offline single-player game.

### Match features
- Smooth turn animations
- Winning line highlight
- Draw detection
- Restart / rematch
- Match score tracking
- Undo (solo & local only)
- Sound effects with mute
- Haptic feedback (where supported)
- Adjustable animation level (off / low / full)
- Pause / resume
- Rules modal
- Keyboard accessible (Tab + Enter on cells)
- Mobile touch controls
- Confirmation before leaving an active match

### Performance & privacy
- No external fonts, images, or analytics
- No tracking, no accounts, no internet required after first load
- All data in `localStorage` — your device, your data
- Reduced-motion support (auto + manual override)
- Static CSS/JS — fast first paint

---

## 📁 Project structure

```
tictactoe-arena/
├─ app.py                  # FastAPI backend (static + WebSocket rooms)
├─ requirements.txt
├─ README.md
├─ static/
│  ├─ index.html           # All pages & modals
│  ├─ styles.css           # Dark premium UI + 50+ arena themes
│  ├─ data.js              # Arenas, symbol packs, frames, achievements, levels, codes
│  ├─ store.js             # localStorage persistence (profile/coins/settings)
│  ├─ game.js              # Game engine + AI (minimax + alpha-beta)
│  ├─ net.js               # WebSocket client for LAN rooms
│  └─ app.js               # Router + UI rendering + event handlers
└─ data/                   # Optional profile backup files (auto-created)
```

---

## 🚀 Setup — Windows PowerShell

### 1. Install Python 3.10+
Download from <https://www.python.org/downloads/windows/> and tick "Add Python to PATH" during install.

Verify:
```powershell
python --version
```

### 2. Get the project
Place the `tictactoe-arena/` folder anywhere, e.g. `C:\Users\you\tictactoe-arena`.

### 3. Create & activate a virtual environment
```powershell
cd C:\Users\you\tictactoe-arena
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> If PowerShell blocks the script, run once:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### 4. Install requirements
```powershell
pip install -r requirements.txt
```

### 5. Start the server
```powershell
python app.py
```

You'll see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 6. Open the game
Open your browser at <http://localhost:8000>. The game loads once and works offline afterward.

### 7. Play offline
- Solo vs AI and Local Multiplayer modes work fully offline (just keep the static files open in the browser; the Python server is only required for LAN multiplayer).
- To run purely offline without the Python server, you can also open `static/index.html` directly in your browser — every feature except "Join with Code" works.

### 8. Connect two devices on the same LAN
1. Find the host computer's local IP. In PowerShell:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
   Look for something like `192.168.1.10` (your Wi-Fi adapter).
2. Make sure Windows Firewall allows Python on port 8000 (the first time you run `python app.py`, Windows usually prompts — click **Allow**).
3. On the other device (phone, tablet, another laptop on the **same Wi-Fi**), open:
   ```
   http://192.168.1.10:8000
   ```
4. On the host device: **Play → Join with Code → Create**. Note the 4-digit code.
5. On the second device: **Play → Join with Code → enter the code → Join**. Make sure the server URL field is set to `ws://192.168.1.10:8000` (replace with your host IP).
6. The host clicks **Start** (or the server auto-starts when both players are in). Take turns.

> ⚠️ This is **same-LAN multiplayer only**, not cross-internet. Both devices must be on the same Wi-Fi network and able to reach the host computer.

### 9. Back up your local data
- **In-app:** Settings → Export Save (JSON). Pick a safe location.
- **Manual:** The data lives in your browser's localStorage for `http://localhost:8000`. To back up, use the in-app Export feature, or use your browser's DevTools → Application → Local Storage → copy the `tictactoe_arena_save_v1` key.
- **Optional server-side backup:** the Python server exposes `POST /api/backup/save` and `GET /api/backup/load/{player_id}` to write a profile JSON into `./data/`. This is purely a convenience and never required.

---

## 🎮 Quick start

1. Open the app.
2. **Play → Local Solo → Medium → Start Match** — beat the AI.
3. Win to earn R Coins (visible in the top-right pill).
4. **Wallet → 🎁 Redeem Code → enter `RABBi`** → Unlimited R Coins mode activated.
5. **Shop → Arenas** → unlock any arena you like → Equip.
6. **Shop → Symbols** → unlock a symbol pack → Equip as X and/or O.
7. Try **Local Multiplayer** with a friend on the same device.
8. For LAN play, follow section 8 above.

---

## 🔧 Troubleshooting

**"Connection timed out. Is the Python server running?"**
- Make sure `python app.py` is running on the host.
- Make sure both devices are on the same Wi-Fi.
- Check Windows Firewall allows port 8000.
- Verify the host IP in the server URL field matches `ipconfig` output.

**The board looks wrong on huge sizes (9×9, 10×10)**
- This is expected on small phone screens — cells shrink automatically. Try a tablet or desktop.

**AI takes too long on 10×10 Impossible**
- The depth limiter caps thinking time. For best experience use Hard/Expert on huge boards, or Impossible only on 3×3 (where it's truly unbeatable).

**My save is gone!**
- Browser localStorage is per-browser, per-origin. If you clear site data, switch browsers, or use private mode, your save won't carry over. Use **Settings → Export Save** regularly.

**Redeem code says "Invalid code"**
- Codes are case-insensitive but must match exactly. Try `rabbi`, `RABBI`, `RABBi` — all work. `welcome100`, `WELCOME100` — all work. Spaces are trimmed automatically.

---

## 🛡️ Security & privacy notes

- No accounts, no login, no analytics, no tracking.
- All data lives in your browser's localStorage on your own device.
- The Python server only relays moves between two players on the same LAN — it never sees your profile, coins, or settings.
- Local redeem codes are NOT cryptographically secure; anyone with access to your browser's DevTools can grant themselves unlimited coins. This is by design for an offline single-player game.
- The server uses in-memory room state — no database, no persistent server-side data.

---

## 🧩 Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript (no frameworks, no TypeScript)
- **Backend:** Python 3.10+, FastAPI, uvicorn, WebSockets
- **Persistence:** Browser localStorage (frontend), in-memory rooms (backend)

---

## 📜 License

Personal offline entertainment. Use freely. All arena artwork is original CSS — no copyrighted game assets are used. "Minecraft-Inspired Block World" is an original voxel-style theme and is not affiliated with Mojang or Microsoft.
