# TicTacToe Arena — Ultimate Edition

A complete, offline-first neon Tic-Tac-Toe gaming site. Pure **HTML + CSS + JavaScript** frontend, optional **Python (FastAPI)** backend for local-network room duels. No accounts, no tracking, no cloud, no real money.

## Features

- **3 modes** — Solo vs AI (Easy / Normal / Hard / Expert / Impossible), Pass & Play on one device, and 4-digit **Room Code** duels (tabs on one device, or two devices over Wi-Fi via the Python server).
- **64 arenas** — every arena has its own palette, board skin, glow, glass cells and a live particle ambience (petals, embers, snow, matrix rain, rifts, streaks…). All original CSS/canvas art — zero copyrighted assets.
- **Board sizes 3×3 → 10×10** with configurable win length (3/4/5/6 in a row) and full horizontal/vertical/diagonal detection.
- **16 X/O symbol sets** — lightning vs orb, flame vs snowflake, skull vs ghost, pixel, gold, holographic, animated pulse… P1 and P2 equip independently.
- **Profile system** — username, SVG avatar + frames, banners, 100+ levels with titles, XP, full stats, match history.
- **R Coin economy** — earn by playing, daily login streaks, daily missions, weekly challenge, achievements, transaction ledger, purchase confirmations, no negative balances, no double-purchases.
- **Redeem codes** — Wallet → Redeem Code. Documented starter codes: `WELCOME100`, `STARTER250`, `ARENA500`. The legendary code `RABBi` switches your local profile to **UNLIMITED R COINS** mode (case-insensitive; a local fun feature, not a financial balance).
- **Fair AI** — Impossible is true full-tree minimax on 3×3 (provably cannot lose there); larger boards use alpha-beta search with heuristic evaluation (very strong, honestly not claimed unbeatable).
- **Match tools** — undo, restart, rematch, per-session scores, pause, winning-line animation, confetti, WebAudio sound FX (procedurally generated — works offline), haptics, keyboard play (arrows + Enter, `U` undo, `Esc` pause), touch support, reduced-motion support, leave-match confirmation.

## Project structure

```
tictactoe-arena/
├─ app.py            # optional Python local server (FastAPI + WebSockets)
├─ requirements.txt
├─ README.md
├─ index.html        # THE WHOLE GAME (open this file directly to play offline)
├─ static/           # optional: you may move index.html here; app.py finds both spots
└─ data/             # created at runtime for optional local save-file backups
```

## Quick start — play offline (no Python needed)

1. Open `index.html` in any modern browser (double-click works — `file://` is supported).
2. That's it. Everything works offline: arenas, symbols, AI, wallet, missions, and same-device room duels between browser tabs.

> Tip for same-device rooms with separate profiles: open the game in a normal tab **and** a private/incognito window — the private window gets its own profile and storage. Both tabs join via the 4-digit code.

## Full setup — Windows PowerShell (two-device LAN play)

Run these in PowerShell, inside the project folder:

```powershell
# 1) Install Python
#    Download Python 3.11+ from https://www.python.org/downloads/
#    IMPORTANT: tick "Add python.exe to PATH" during installation.
#    Verify:
python --version

# 2) Create & activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
#    If activation is blocked, run this once, then retry:
#    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# 3) Install requirements (needs internet, once)
pip install -r requirements.txt

# 4) Start the local server
uvicorn app:app --host 0.0.0.0 --port 8000
#    (or simply: python app.py)

# 5) Open the game on THIS computer
start http://localhost:8000
```

When Windows Firewall asks, allow access on **Private networks** so other devices on your Wi-Fi can reach the server.

## Play with two devices on the same Wi-Fi

1. On the host PC, find your local IP:

   ```powershell
   ipconfig | findstr /i "IPv4"
   # e.g. 192.168.1.23
   ```

2. On the second device (phone/laptop) connected to the **same Wi-Fi**, open:

   ```
   http://192.168.1.23:8000
   ```

3. One player: **Play → Room Code Duel → Create Room** → share the 4-digit code.
   Other player: **Join Room** → enter the 4 digits → play. The lobby shows who is X / who is O, waiting status, copy/share buttons, rematch flow, and disconnection handling.

**Honesty note:** this is *local-network* multiplayer only. There is deliberately **no internet matchmaking** — no external server, no accounts, nothing leaves your LAN.

## Playing offline after loading

Once opened, the game needs no network at all. There are no external fonts, images, CDNs, APIs or analytics; even sound effects are synthesized live with WebAudio. You can disconnect from the internet and keep playing — solo, pass-and-play, and room tabs on the same browser all keep working.

## Backing up your game data

- **Easiest:** Settings → **Export save** → a `tictactoe-arena-save.json` file downloads. Restore anytime via **Import save** (even on another device).
- **Manual:** progress lives in your browser's `localStorage` under the key `tta_save_v1`.
- **Server backup (optional):** while running `app.py`, POST your exported JSON to `/save`; a copy is written to `data/save.json` and can be fetched back from `/save`.
- To move to a new browser/device: export → copy file → import.

## Privacy & security notes

- No registration, no personal data collection, no analytics, no external requests.
- All progress is stored **on your device** in localStorage.

> **Transparency:** localStorage is readable and editable by anyone with access to your browser's developer tools. That means a technical user could grant themselves R Coins or redeem codes manually. This is acceptable by design — R Coins and the `RABBi` unlimited mode are a local, personal-entertainment feature, **not** real currency, and no purchase ever touches real money or a payment system. Please only edit your own data; don't tamper with other people's saves or devices.

## Troubleshooting

- **Phone can't reach the server:** confirm both devices share the same Wi-Fi, the firewall allowed private-network access, and you're using the PC's IPv4 address with port `:8000`.
- **`uvicorn` not recognized:** activate the venv (`.\.venv\Scripts\Activate.ps1`) or run `python -m uvicorn app:app --host 0.0.0.0 --port 8000`.
- **Reset everything:** Settings → Reset all (double confirmation), or clear the site's storage in browser settings.
- **Slow device:** Settings → Animations → Reduced/Off — particles and effects scale down or stop.

Made for the arena. X takes the first move — make it count.
