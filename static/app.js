/* =========================================================
   app.js — Main entry: router, UI rendering, event handlers.
   Depends on: data.js, store.js, game.js, net.js
   ========================================================= */
(function () {
  "use strict";

  // ---------- State ----------
  const state = {
    route: "home",
    mode: null, // "solo" | "local" | "code"
    game: null, // current Game state (window.Game.create result)
    config: {
      boardSize: 3,
      winLen: 3,
      difficulty: "medium",
      playerSymbol: "X",
      p1Name: "Player 1",
      p2Name: "Player 2",
    },
    net: {
      joined: false,
      mySymbol: null,
      waiting: false,
    },
    paused: false,
    sound: true,
    haptic: true,
    activeModal: null,
  };

  // ---------- DOM helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const k of Object.keys(props)) {
      if (k === "class") e.className = props[k];
      else if (k === "text") e.textContent = props[k];
      else if (k === "html") e.innerHTML = props[k];
      else if (k === "on") for (const evt of Object.keys(props.on)) e.addEventListener(evt, props.on[evt]);
      else if (k === "attrs") for (const a of Object.keys(props.attrs)) e.setAttribute(a, props.attrs[a]);
      else if (k === "style") Object.assign(e.style, props[k]);
      else e[k] = props[k];
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
    return e;
  }

  // ---------- Toast ----------
  function toast(message, kind = "info", ms = 2400) {
    const wrap = $("#toastWrap");
    const t = el("div", { class: `toast ${kind}`, text: message });
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 250ms"; }, ms - 250);
    setTimeout(() => t.remove(), ms);
  }

  // ---------- Modal ----------
  function openModal(html) {
    $("#modalContent").innerHTML = "";
    const tpl = document.createElement("div");
    tpl.innerHTML = html;
    while (tpl.firstChild) $("#modalContent").appendChild(tpl.firstChild);
    $("#modalBackdrop").classList.remove("hidden");
    state.activeModal = true;
  }
  function closeModal() {
    $("#modalBackdrop").classList.add("hidden");
    state.activeModal = false;
  }

  // ---------- Router ----------
  function go(route) {
    state.route = route;
    $$(".page").forEach(p => p.classList.toggle("active", p.dataset.page === route));
    $$(".nav-links a").forEach(a => a.classList.toggle("active", a.dataset.route === route));
    // Close mobile nav
    $("#navLinks").classList.remove("open");
    // Render page content
    renderPage(route);
    window.scrollTo(0, 0);
  }

  function renderPage(route) {
    switch (route) {
      case "home": renderHome(); break;
      case "play": renderPlay(); break;
      case "profile": renderProfile(); break;
      case "customize": renderCustomize(); break;
      case "wallet": renderWallet(); break;
      case "shop": renderShop(currentShopTab); break;
      case "inventory": renderInventory(currentInvTab); break;
      case "achievements": renderAchievements(); break;
      case "history": renderHistory(); break;
      case "settings": renderSettings(); break;
      case "howto": /* static */ break;
      case "game": /* rendered when match starts */ break;
    }
    refreshNavWallet();
  }

  // ---------- Nav wallet refresh ----------
  function refreshNavWallet() {
    const p = window.Store.Profile.get();
    if (p.unlimited) {
      $("#navCoinAmount").textContent = "∞";
      $("#navCoinAmount").title = "Unlimited R Coins";
    } else {
      $("#navCoinAmount").textContent = formatNumber(p.coins);
    }
    $("#navAvatar").textContent = (p.avatar || p.name[0] || "P").slice(0, 2).toUpperCase();
    $("#navAvatar").style.background = p.avatarColor || "linear-gradient(135deg, var(--accent), var(--accent-4))";
    const lv = window.levelForXp(p.xp);
    $("#navLevel").textContent = "L" + lv.level;
    // Apply arena
    document.body.dataset.arena = p.equippedArena || "neon-cyber-city";
    // Apply settings to body
    const s = window.Store.Settings.get();
    document.body.classList.toggle("reduced-motion", !!s.reducedMotion);
    document.body.classList.remove("anim-low", "anim-off");
    if (s.animLevel === 1) document.body.classList.add("anim-low");
    if (s.animLevel === 0) document.body.classList.add("anim-off");
  }

  function formatNumber(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  // ---------- Apply arena + symbol pack ----------
  function applyEquipped() {
    const p = window.Store.Profile.get();
    document.body.dataset.arena = p.equippedArena || "neon-cyber-city";
    refreshNavWallet();
  }

  // ---------- HOME ----------
  function renderHome() {
    // Render daily missions
    const p = window.Store.Profile.get();
    window.Store.Profile.refreshDailyMissions();
    const missions = p.dailyMissions.missions;
    const wrap = $("#homeMissions");
    wrap.innerHTML = "";
    if (!missions.length) {
      wrap.appendChild(el("p", { class: "muted", text: "No missions today." }));
      return;
    }
    missions.forEach((m, i) => {
      const card = el("div", { class: "mission" + (m.complete ? " complete" : "") });
      const left = el("div", {}, [
        el("div", { class: "mission-title", text: m.text }),
        el("div", { class: "mission-progress", text: `Progress: ${m.progress}/${m.target}` }),
      ]);
      const right = m.complete && !m.claimed
        ? el("button", { class: "mission-claim", on: { click: () => { window.Store.Profile.claimMission(i); renderHome(); sparkCoins(); } }, text: `Claim +${m.reward}` })
        : el("div", { class: "mission-reward", text: `+${m.reward} 🪙` });
      card.appendChild(left);
      card.appendChild(right);
      wrap.appendChild(card);
    });
  }

  // ---------- PLAY ----------
  let currentMode = null;
  function renderPlay() {
    // Wire mode cards
    $$(".mode-card").forEach(c => {
      c.onclick = () => selectMode(c.dataset.mode);
    });
    // Default to solo if nothing chosen
    if (!currentMode) selectMode("solo");
    // Wire board size -> win length
    $("#setupBoardSize").onchange = updateWinLenOptions;
    updateWinLenOptions();
    // Start match
    $("#startMatchBtn").onclick = startMatch;
    // Room buttons
    $("#createRoomBtn").onclick = createRoom;
    $("#joinRoomBtn").onclick = joinRoom;
  }

  function selectMode(mode) {
    currentMode = mode;
    state.mode = mode;
    $$(".mode-card").forEach(c => c.classList.toggle("active", c.dataset.mode === mode));
    $("#setupTitle").textContent =
      mode === "solo" ? "Local Solo — vs AI" :
      mode === "local" ? "Local Multiplayer — Pass & Play" :
      "Join with Code — LAN Multiplayer";
    // Show/hide fields
    $("#difficultyField").style.display = mode === "solo" ? "" : "none";
    $("#aiSymbolField").style.display = mode === "solo" ? "" : "none";
    $("#p1Field").style.display = mode === "local" ? "" : "none";
    $("#p2Field").style.display = mode === "local" ? "" : "none";
    $("#roomField").style.display = mode === "code" ? "" : "none";
    $("#serverField").style.display = mode === "code" ? "" : "none";
    $("#startMatchBtn").textContent =
      mode === "code" ? "Connect to Server" : "Start Match";
    // Pre-fill names from profile
    const p = window.Store.Profile.get();
    if (mode === "solo" || mode === "code") {
      if (!$("#setupP1Name").value) $("#setupP1Name").value = p.name;
    }
  }

  function updateWinLenOptions() {
    const size = parseInt($("#setupBoardSize").value, 10);
    const allowed = window.BOARD_RULES[size] || [3];
    const sel = $("#setupWinLen");
    sel.innerHTML = "";
    allowed.forEach(w => {
      const opt = el("option", { value: w, text: `${w} in a row` });
      sel.appendChild(opt);
    });
    sel.value = allowed[allowed.length - 1]; // default to longest
  }

  function gatherConfig() {
    const size = parseInt($("#setupBoardSize").value, 10);
    const allowed = window.BOARD_RULES[size] || [3];
    let winLen = parseInt($("#setupWinLen").value, 10);
    if (!allowed.includes(winLen)) winLen = allowed[allowed.length - 1];
    return {
      boardSize: size,
      winLen,
      difficulty: $("#setupDifficulty").value,
      playerSymbol: $("#setupPlayerSymbol").value,
      p1Name: $("#setupP1Name").value.trim() || "Player 1",
      p2Name: $("#setupP2Name").value.trim() || "Player 2",
      serverUrl: $("#setupServerUrl").value.trim() || "ws://localhost:8000",
      roomCode: $("#setupRoomCode").value.trim(),
    };
  }

  function startMatch() {
    const cfg = gatherConfig();
    Object.assign(state.config, cfg);
    if (state.mode === "solo" || state.mode === "local") {
      state.game = window.Game.create(cfg.boardSize, cfg.winLen);
      state.net.joined = false;
      go("game");
      renderGame();
    } else if (state.mode === "code") {
      // User must click Create or Join explicitly first
      toast("Use Create or Join button to connect to the server.", "info");
    }
  }

  // ---------- LAN room create / join ----------
  async function createRoom() {
    const cfg = gatherConfig();
    Object.assign(state.config, cfg);
    const p = window.Store.Profile.get();
    try {
      toast("Creating room...", "info");
      const data = await window.Net.createRoom({
        playerId: "p_" + Math.random().toString(36).slice(2, 10),
        name: p.name,
        boardSize: cfg.boardSize,
        winLen: cfg.winLen,
        serverUrl: cfg.serverUrl,
      });
      $("#setupRoomCode").value = data.code;
      toast(`Room ${data.code} created. Waiting for opponent...`, "success", 4000);
      setupNetCallbacks();
    } catch (e) {
      toast("Create failed: " + e.message, "error", 4000);
    }
  }

  async function joinRoom() {
    const cfg = gatherConfig();
    if (!/^\d{4}$/.test(cfg.roomCode)) {
      toast("Enter a valid 4-digit room code.", "error");
      return;
    }
    Object.assign(state.config, cfg);
    const p = window.Store.Profile.get();
    try {
      toast("Joining room...", "info");
      await window.Net.joinRoom({
        playerId: "p_" + Math.random().toString(36).slice(2, 10),
        name: p.name,
        roomCode: cfg.roomCode,
        serverUrl: cfg.serverUrl,
      });
      setupNetCallbacks();
      toast(`Joined room ${cfg.roomCode}`, "success");
    } catch (e) {
      toast("Join failed: " + e.message, "error", 4000);
    }
  }

  function setupNetCallbacks() {
    window.Net.onState = (room) => {
      // Sync room state to local game state for rendering.
      if (!room) return;
      state.config.boardSize = room.board_size;
      state.config.winLen = room.win_len;
      state.game = {
        size: room.board_size,
        winLen: room.win_len,
        board: room.board.slice(),
        turn: room.turn,
        moves: room.moves ? room.moves.slice() : [],
        winner: room.winner,
        winLine: room.win_line,
        startedAt: Date.now(),
      };
      state.net.joined = true;
      state.net.mySymbol = window.Net.symbol;
      // Player names from server
      const playersList = Object.values(room.players);
      // Map X/O to names
      const xPlayer = playersList.find(pp => pp.symbol === "X");
      const oPlayer = playersList.find(pp => pp.symbol === "O");
      state.config.p1Name = xPlayer ? xPlayer.name : "Player X";
      state.config.p2Name = oPlayer ? oPlayer.name : "Player O";
      // Update score from server-side tally
      state.score = { x: room.score_x, o: room.score_o, draw: room.score_draw };

      if (state.route !== "game") {
        go("game");
      }
      renderGame();
      checkLanMatchEnd(room);
    };
    window.Net.onError = (msg) => toast(msg, "error", 4000);
    window.Net.onClose = () => {
      if (state.route === "game" && state.net.joined) {
        toast("Opponent disconnected. You can leave or wait for reconnect.", "info", 4000);
      }
    };
  }

  function checkLanMatchEnd(room) {
    // Detect end-of-match for LAN; record to history once.
    if (!room.winner) return;
    if (state._lanRecorded === room.last_activity) return;
    state._lanRecorded = room.last_activity;
    const mySymbol = window.Net.symbol;
    let result = "draw";
    if (room.winner === mySymbol) result = "win";
    else if (room.winner === "draw") result = "draw";
    else result = "loss";
    if (result !== "draw" || room.winner === "draw") {
      finalizeMatch({
        mode: "code",
        result,
        size: room.board_size,
        winLen: room.win_len,
      });
    }
  }

  // ---------- GAME rendering ----------
  let score = { x: 0, o: 0, draw: 0 };
  function renderGame() {
    if (!state.game) return;
    const g = state.game;
    const p = window.Store.Profile.get();
    applyEquipped();

    // Mode tag
    $("#gameModeTag").textContent =
      state.mode === "solo" ? `Solo vs ${state.config.difficulty}` :
      state.mode === "local" ? "Local Multiplayer" :
      state.net.joined ? `LAN Room ${state.config.roomCode || window.Net.roomCode || ""}` :
      "LAN Multiplayer";

    // Names
    if (state.mode === "solo") {
      const mySym = state.config.playerSymbol;
      const aiSym = mySym === "X" ? "O" : "X";
      $("#playerNameX").textContent = mySym === "X" ? p.name : `AI (${state.config.difficulty})`;
      $("#playerNameO").textContent = mySym === "O" ? p.name : `AI (${state.config.difficulty})`;
    } else if (state.mode === "local") {
      $("#playerNameX").textContent = state.config.p1Name;
      $("#playerNameO").textContent = state.config.p2Name;
    } else if (state.net.joined) {
      $("#playerNameX").textContent = state.config.p1Name;
      $("#playerNameO").textContent = state.config.p2Name;
    }

    // Use server-side score for LAN, otherwise local
    if (state.mode === "code" && state.score) {
      score = state.score;
    }
    $("#playerScoreX").textContent = score.x;
    $("#playerScoreO").textContent = score.o;

    // Turn banner
    if (g.winner === "draw") {
      $("#turnBanner").textContent = "It's a draw!";
    } else if (g.winner) {
      $("#turnBanner").textContent = `${g.winner} wins!`;
    } else if (state.paused) {
      $("#turnBanner").textContent = "Paused";
    } else {
      $("#turnBanner").textContent = `${g.turn}'s turn`;
    }

    // Active player highlight
    $("#playerCardX").classList.toggle("active", g.turn === "X" && !g.winner);
    $("#playerCardO").classList.toggle("active", g.turn === "O" && !g.winner);

    // Board
    const board = $("#board");
    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${g.size}, 1fr)`;
    // Adjust font size for bigger boards
    const cellSize = g.size <= 3 ? "clamp(20px, 12vw, 56px)" :
                     g.size <= 5 ? "clamp(14px, 8vw, 36px)" :
                     g.size <= 7 ? "clamp(10px, 5vw, 26px)" :
                     "clamp(8px, 4vw, 20px)";
    const xPack = window.SYMBOL_MAP[p.equippedX] || window.SYMBOL_MAP.classic;
    const oPack = window.SYMBOL_MAP[p.equippedO] || window.SYMBOL_MAP.classic;

    for (let i = 0; i < g.board.length; i++) {
      const v = g.board[i];
      const cell = el("button", {
        class: "cell" + (v ? " filled" : "") + (g.winner ? " disabled" : ""),
        attrs: { "data-index": String(i), "aria-label": `Cell ${i + 1}` + (v ? ` ${v}` : " empty") },
        style: { fontSize: cellSize },
      });
      if (v) {
        const pack = v === "X" ? xPack : oPack;
        const mark = el("span", {
          class: `mark ${v.toLowerCase()}`,
          attrs: { "data-style": pack.style },
          text: v === "X" ? pack.xChar : pack.oChar,
        });
        cell.appendChild(mark);
      }
      if (g.winLine && g.winLine.includes(i)) cell.classList.add("win");
      cell.addEventListener("click", () => handleCellClick(i));
      // Keyboard
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCellClick(i); }
      });
      board.appendChild(cell);
    }

    // Controls visibility
    $("#undoBtn").style.display = state.mode === "code" ? "none" : "";
    $("#pauseBtn").style.display = state.mode === "code" ? "none" : "";

    // Result overlay
    if (g.winner) {
      showResult(g.winner);
    } else {
      $("#gameResult").classList.add("hidden");
    }

    // If it's AI's turn (solo mode), schedule AI move.
    if (state.mode === "solo" && !g.winner && !state.paused) {
      const aiSym = state.config.playerSymbol === "X" ? "O" : "X";
      if (g.turn === aiSym) {
        setTimeout(() => aiPlay(), 380);
      }
    }
  }

  function handleCellClick(index) {
    if (!state.game || state.game.winner) return;
    if (state.paused) return;
    if (state.mode === "solo") {
      const mySym = state.config.playerSymbol;
      if (state.game.turn !== mySym) return;
      attemptMove(index, mySym);
    } else if (state.mode === "local") {
      attemptMove(index, state.game.turn);
    } else if (state.mode === "code") {
      if (!state.net.joined) { toast("Not connected.", "error"); return; }
      if (state.game.turn !== state.net.mySymbol) { toast("Not your turn.", "error"); return; }
      if (!state.game.startedAt || !window.Net.sendMove(index)) {
        toast("Move failed — connection issue.", "error");
      }
      // Server will broadcast new state, which re-renders.
    }
  }

  function attemptMove(index, symbol) {
    const r = window.Game.play(state.game, index, symbol);
    if (!r.ok) {
      if (r.reason !== "Game over") toast(r.reason, "error", 1500);
      return;
    }
    playSound("move");
    haptic(8);
    renderGame();
    checkLocalMatchEnd();
  }

  function aiPlay() {
    if (!state.game || state.game.winner) return;
    const aiSym = state.config.playerSymbol === "X" ? "O" : "X";
    if (state.game.turn !== aiSym) return;
    const idx = window.AI.move(state.game, state.config.difficulty, aiSym);
    if (idx == null || idx < 0) return;
    const r = window.Game.play(state.game, idx, aiSym);
    if (!r.ok) return;
    playSound("move");
    haptic(8);
    renderGame();
    checkLocalMatchEnd();
  }

  function checkLocalMatchEnd() {
    if (!state.game || !state.game.winner) return;
    if (state._localRecorded === state.game.startedAt + state.game.moves.length) return;
    state._localRecorded = state.game.startedAt + state.game.moves.length;
    const g = state.game;
    let result = "draw";
    if (g.winner === "draw") result = "draw";
    else {
      const mySym = state.mode === "solo" ? state.config.playerSymbol : g.winner;
      // For local multiplayer, "win" is just for the player who won — record as a draw-from-perspective? Better: record per player perspective using X/O.
      if (state.mode === "solo") {
        result = g.winner === mySym ? "win" : "loss";
      } else if (state.mode === "local") {
        // For local pass-and-play, record as a win for the symbol who won.
        result = g.winner === "X" ? "winX" : "winO";
      }
    }
    finalizeMatch({
      mode: state.mode,
      result,
      size: g.size,
      winLen: g.winLen,
      winner: g.winner,
      difficulty: state.config.difficulty,
    });
    // Score tracking
    if (g.winner === "X") score.x++;
    else if (g.winner === "O") score.o++;
    else score.draw++;
  }

  function finalizeMatch({ mode, result, size, winLen, winner, difficulty }) {
    const p = window.Store.Profile.get();
    let coins = 0;
    let xp = window.XP_REWARDS.play;
    const stats = { matches: 1 };

    if (mode === "solo") {
      if (result === "win") {
        coins = window.REWARDS.winSolo[difficulty] || 20;
        xp += window.XP_REWARDS.win;
        stats.wins = 1;
        stats.streak = 1;
        if (difficulty === "easy") stats.winVsEasy = 1;
        if (difficulty === "medium") { stats.winVsMedium = 1; xp += window.XP_REWARDS.beatMedium; }
        if (difficulty === "hard") { stats.winVsHard = 1; xp += window.XP_REWARDS.beatHard; }
        if (difficulty === "expert") { stats.winVsExpert = 1; xp += window.XP_REWARDS.beatExpert; }
        if (difficulty === "impossible") xp += window.XP_REWARDS.beatImpossible;
      } else if (result === "loss") {
        coins = window.REWARDS.loss;
        xp += window.XP_REWARDS.loss;
        stats.losses = 1;
        // Reset streak
        const cur = p.stats.streak || 0;
        if (cur > 0) { stats.streak = -cur; } // set streak to 0 via negative delta
      } else { // draw
        coins = window.REWARDS.draw;
        xp += window.XP_REWARDS.draw;
        stats.draws = 1;
        if (difficulty === "impossible") {
          stats.drawVsImpossible = 1;
          xp += window.XP_REWARDS.beatImpossible;
        }
      }
    } else if (mode === "local") {
      // Pass-and-play: award small coins to the winner (X or O), or split for draw.
      if (result === "winX" || result === "winO") {
        coins = window.REWARDS.winLocal;
        xp += window.XP_REWARDS.win;
        stats.wins = 1;
        stats.streak = 1;
      } else {
        coins = window.REWARDS.draw;
        xp += window.XP_REWARDS.draw;
        stats.draws = 1;
      }
    } else if (mode === "code") {
      if (result === "win") {
        coins = window.REWARDS.winLan;
        xp += window.XP_REWARDS.win;
        stats.wins = 1;
        stats.streak = 1;
      } else if (result === "loss") {
        coins = window.REWARDS.loss;
        xp += window.XP_REWARDS.loss;
        stats.losses = 1;
      } else {
        coins = window.REWARDS.draw;
        xp += window.XP_REWARDS.draw;
        stats.draws = 1;
      }
    }

    if (size >= 5) xp += window.XP_REWARDS.bigBoard;

    // Apply coin reward
    if (coins > 0) window.Store.Profile.addCoins(coins, `Match (${mode})`);
    // Apply XP
    const xpResult = window.Store.Profile.addXp(xp);
    // Update stats
    const newStats = { ...p.stats };
    newStats.matches = (newStats.matches || 0) + (stats.matches || 0);
    newStats.wins = (newStats.wins || 0) + (stats.wins || 0);
    newStats.losses = (newStats.losses || 0) + (stats.losses || 0);
    newStats.draws = (newStats.draws || 0) + (stats.draws || 0);
    if (stats.streak) {
      if (stats.streak > 0) {
        newStats.streak = (newStats.streak || 0) + stats.streak;
        if (newStats.streak > (newStats.bestStreak || 0)) newStats.bestStreak = newStats.streak;
      } else {
        newStats.streak = 0;
      }
    } else if (result === "loss" || (mode === "local" && (result === "winX" || result === "winO"))) {
      // streak already handled above for loss
    }
    if (stats.winVsEasy) newStats.winVsEasy = (newStats.winVsEasy || 0) + stats.winVsEasy;
    if (stats.winVsMedium) newStats.winVsMedium = (newStats.winVsMedium || 0) + stats.winVsMedium;
    if (stats.winVsHard) newStats.winVsHard = (newStats.winVsHard || 0) + stats.winVsHard;
    if (stats.winVsExpert) newStats.winVsExpert = (newStats.winVsExpert || 0) + stats.winVsExpert;
    if (stats.drawVsImpossible) newStats.drawVsImpossible = (newStats.drawVsImpossible || 0) + stats.drawVsImpossible;
    window.Store.Profile.updateStats(newStats);

    // Match history
    const symbolOrResult = mode === "local" ? (result === "winX" ? "X won" : result === "winO" ? "O won" : "Draw") : result;
    window.Store.Profile.addMatch({
      mode,
      result: symbolOrResult,
      size,
      winLen,
      difficulty: difficulty || null,
      coins,
      xp,
    });

    // Progress missions
    window.Store.Profile.progressMission("plays", 1);
    if (mode === "solo" && result === "win") window.Store.Profile.progressMission("wins", 1);
    if (result === "draw" || symbolOrResult === "Draw") window.Store.Profile.progressMission("draws", 1);
    if (size >= 5) window.Store.Profile.progressMission("bigboard", 1);
    if (mode === "solo") {
      if (difficulty === "medium" && result === "win") window.Store.Profile.progressMission("beat-medium", 1);
      if (difficulty === "hard" && result === "win") window.Store.Profile.progressMission("beat-hard", 1);
    }
    if (newStats.streak >= 2) window.Store.Profile.progressMission("streak", 1);

    // Achievements
    checkAchievements({ mode, result, size, newStats, difficulty });

    // Level-up toast
    if (xpResult.leveledUp) {
      toast(`Level up! You're now level ${xpResult.newLevel} (+${xpResult.reward} 🪙)`, "success", 4000);
    }
  }

  function checkAchievements({ mode, result, size, newStats, difficulty }) {
    const p = window.Store.Profile.get();
    const ach = window.Store.Profile.unlockAchievement;
    if (newStats.wins >= 1) ach("first-win");
    if (newStats.wins >= 10) ach("win-10");
    if (newStats.wins >= 50) ach("win-50");
    if (newStats.wins >= 100) ach("win-100");
    if (newStats.streak >= 3) ach("streak-3");
    if (newStats.streak >= 5) ach("streak-5");
    if (newStats.streak >= 10) ach("streak-10");
    if (newStats.draws >= 5) ach("draw-5");
    if (mode === "solo" && difficulty === "impossible" && result === "draw") ach("beat-impossible");
    if (mode === "solo" && difficulty === "hard" && result === "win") ach("beat-hard");
    if (mode === "solo" && difficulty === "expert" && result === "win") ach("beat-expert");
    if (size === 4) ach("play-4x4");
    if (size === 5) ach("play-5x5");
    if (size === 7) ach("play-7x7");
    if (size === 10) ach("play-10x10");
    if (p.ownedArenas.length >= 1) ach("buy-arena");
    if (p.ownedArenas.length >= 10) ach("own-10-arenas");
    if (p.ownedArenas.length >= 25) ach("own-25-arenas");
    if (p.ownedArenas.length >= 50) ach("own-50-arenas");
    if (p.ownedSymbols.length >= 2) ach("buy-symbol");
    const lv = window.levelForXp(p.xp);
    if (lv.level >= 10) ach("level-10");
    if (lv.level >= 25) ach("level-25");
    if (lv.level >= 50) ach("level-50");
    if (lv.level >= 100) ach("level-100");
    if (mode === "code") ach("lan-match");
    if (mode === "local") ach("local-multiplayer");
    if (p.equippedX !== "classic" || p.equippedO !== "classic") window.Store.Profile.progressMission("use-symbol", 1);
  }

  function showResult(winner) {
    const g = state.game;
    const p = window.Store.Profile.get();
    const res = $("#gameResult");
    res.classList.remove("hidden");
    let title = "";
    let detail = "";
    if (winner === "draw") {
      title = "Draw!";
      detail = "No winner this round.";
    } else {
      // Determine if "you" won
      let youWon = false;
      if (state.mode === "solo") youWon = winner === state.config.playerSymbol;
      else if (state.mode === "local") {
        title = `${winner} wins!`;
        detail = "Pass-and-play match complete.";
      } else if (state.mode === "code") youWon = winner === state.net.mySymbol;
      if (state.mode !== "local") {
        title = youWon ? "You Win!" : "You Lose!";
        detail = youWon ? "Congratulations on the victory." : "Better luck next time.";
      }
    }
    $("#resultTitle").textContent = title;
    $("#resultDetail").textContent = detail;
    // Reward summary
    const last = p.matchHistory[0];
    $("#rewardLine").textContent = last ? `+${last.coins} 🪙  ·  +${last.xp} XP` : "";
  }

  // ---------- Sound ----------
  let audioCtx = null;
  function playSound(kind) {
    if (!state.sound) return;
    if (!window.Store.Settings.get().sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      if (kind === "move") {
        o.frequency.value = 440;
        o.type = "sine";
      } else if (kind === "win") {
        o.frequency.value = 660;
        o.type = "triangle";
      } else if (kind === "lose") {
        o.frequency.value = 220;
        o.type = "sawtooth";
      } else if (kind === "coin") {
        o.frequency.value = 880;
        o.type = "square";
      }
      g.gain.setValueAtTime(0.08, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
      o.start();
      o.stop(audioCtx.currentTime + 0.2);
    } catch (_) {}
  }

  function haptic(ms) {
    if (!state.haptic) return;
    if (!window.Store.Settings.get().haptic) return;
    if (navigator.vibrate) try { navigator.vibrate(ms); } catch (_) {}
  }

  function sparkCoins() {
    playSound("coin");
    const layer = $("#coinFxLayer");
    for (let i = 0; i < 8; i++) {
      const s = el("div", { class: "coin-spark" });
      s.style.left = (45 + Math.random() * 10) + "%";
      s.style.top = "60%";
      s.style.setProperty("--dx", (Math.random() * 200 - 100) + "px");
      s.style.setProperty("--dy", (-100 - Math.random() * 80) + "px");
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }
  }

  // Expose helpers for other sections
  window.App = { state, toast, openModal, closeModal, go, renderPage, refreshNavWallet, applyEquipped, playSound, sparkCoins, formatNumber, el, $, $$ };

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", init);
  function init() {
    // Apply settings
    const s = window.Store.Settings.get();
    state.sound = s.sound;
    state.haptic = s.haptic;
    applyEquipped();

    // Daily login
    const login = window.Store.Profile.checkDailyLogin();
    if (login.claimed) {
      setTimeout(() => toast(`Daily login reward: +${login.reward} 🪙 (day ${login.streak})`, "success", 4000), 600);
    }
    window.Store.Profile.refreshDailyMissions();

    // Nav links
    $$(".nav-links a").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        go(a.dataset.route);
      });
    });
    // Brand
    $(".brand").addEventListener("click", (e) => { e.preventDefault(); go("home"); });
    // Nav toggle (mobile)
    $("#navToggle").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
    // Nav wallet
    $("#navCoinPill").addEventListener("click", () => go("wallet"));
    $("#navAvatarChip").addEventListener("click", () => go("profile"));
    // Modal close
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    // Generic data-go buttons
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-go]");
      if (t) { e.preventDefault(); go(t.dataset.go); }
    });

    // Game controls
    $("#gameBackBtn").addEventListener("click", confirmLeaveGame);
    $("#gameSoundBtn").addEventListener("click", toggleSound);
    $("#undoBtn").addEventListener("click", undoMove);
    $("#rematchBtn").addEventListener("click", rematch);
    $("#pauseBtn").addEventListener("click", togglePause);
    $("#rulesBtn").addEventListener("click", showRules);
    $("#resultRematch").addEventListener("click", rematch);
    $("#resultHome").addEventListener("click", () => go("home"));

    // Wallet
    $("#redeemBtn").addEventListener("click", openRedeemModal);

    // Profile
    $("#customizeProfileBtn").addEventListener("click", () => go("customize"));
    $("#saveCustomizeBtn").addEventListener("click", saveCustomize);

    // Settings
    $("#exportDataBtn").addEventListener("click", exportData);
    $("#importDataBtn").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", importData);
    $("#resetDataBtn").addEventListener("click", resetData);

    // History
    $("#clearHistoryBtn").addEventListener("click", () => {
      if (confirm("Clear all match history?")) {
        window.Store.Profile.clearHistory();
        renderHistory();
        toast("History cleared.", "info");
      }
    });

    // Shop tabs
    $$(".shop-tabs .tab[data-shop-tab]").forEach(t => {
      t.addEventListener("click", () => {
        $$(".shop-tabs .tab[data-shop-tab]").forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        renderShop(t.dataset.shopTab);
      });
    });
    $$(".shop-tabs .tab[data-inv-tab]").forEach(t => {
      t.addEventListener("click", () => {
        $$(".shop-tabs .tab[data-inv-tab]").forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        renderInventory(t.dataset.invTab);
      });
    });
    $("#shopSearch").addEventListener("input", () => renderShop(currentShopTab));
    $("#shopOwnedOnly").addEventListener("change", () => renderShop(currentShopTab));
    $("#shopLockedOnly").addEventListener("change", () => renderShop(currentShopTab));

    // Settings inputs
    $("#setSound").addEventListener("change", (e) => { window.Store.Settings.set({ sound: e.target.checked }); state.sound = e.target.checked; });
    $("#setHaptic").addEventListener("change", (e) => { window.Store.Settings.set({ haptic: e.target.checked }); state.haptic = e.target.checked; });
    $("#setAnimLevel").addEventListener("change", (e) => { window.Store.Settings.set({ animLevel: parseInt(e.target.value, 10) }); refreshNavWallet(); });
    $("#setReducedMotion").addEventListener("change", (e) => { window.Store.Settings.set({ reducedMotion: e.target.checked }); refreshNavWallet(); });

    // Mouse-tracking backdrop
    document.addEventListener("mousemove", (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--mx", x + "%");
      document.documentElement.style.setProperty("--my", y + "%");
    });

    // Hash routing (optional)
    if (location.hash) {
      const r = location.hash.slice(1);
      if (["home", "play", "profile", "customize", "wallet", "shop", "inventory", "achievements", "history", "settings", "howto"].includes(r)) {
        go(r);
        return;
      }
    }
    go("home");
  }

  // ---------- Game controls ----------
  function confirmLeaveGame() {
    if (state.game && !state.game.winner && state.game.moves.length > 0) {
      if (!confirm("Leave the active match? Progress on this match will be lost.")) return;
    }
    if (state.mode === "code" && window.Net.connected) {
      window.Net.disconnect();
    }
    state.game = null;
    state._localRecorded = null;
    state._lanRecorded = null;
    score = { x: 0, o: 0, draw: 0 };
    go("play");
  }

  function toggleSound() {
    state.sound = !state.sound;
    window.Store.Settings.set({ sound: state.sound });
    $("#gameSoundBtn").textContent = state.sound ? "🔊" : "🔇";
    toast(state.sound ? "Sound on" : "Sound off", "info", 1200);
  }

  function undoMove() {
    if (!state.game) return;
    if (state.mode === "code") return;
    // In solo, undo both player's last and AI's last move
    if (state.mode === "solo") {
      const mySym = state.config.playerSymbol;
      // Undo until it's player's turn again
      let undone = 0;
      while (state.game.moves.length && undone < 2) {
        if (window.Game.undo(state.game)) undone++;
        if (state.game.turn === mySym) break;
      }
    } else {
      window.Game.undo(state.game);
      // Also undo to keep turn alternating
      if (state.game.moves.length && state.game.turn !== "X" && state.game.turn !== "O") {}
    }
    state._localRecorded = null;
    renderGame();
  }

  function rematch() {
    if (state.mode === "code") {
      if (window.Net.connected) {
        window.Net.sendRematch();
      }
      return;
    }
    if (!state.game) return;
    const cfg = state.config;
    state.game = window.Game.create(cfg.boardSize, cfg.winLen);
    state._localRecorded = null;
    $("#gameResult").classList.add("hidden");
    renderGame();
  }

  function togglePause() {
    state.paused = !state.paused;
    $("#pauseBtn").textContent = state.paused ? "▶ Resume" : "⏸ Pause";
    renderGame();
  }

  function showRules() {
    openModal(`
      <h2>How to Play</h2>
      <p>Get <b>${state.game ? state.game.winLen : 3}</b> of your symbols in a row — horizontal, vertical, or diagonal — before your opponent.</p>
      <p>Click any empty cell to place your symbol. Turns alternate automatically.</p>
      <p>Use <b>Undo</b> to take back a move (solo / local only). Use <b>Rematch</b> to start a new game with the same settings.</p>
      <button class="btn btn-primary" onclick="document.getElementById('modalClose').click()">Got it</button>
    `);
  }

  // ---------- Redeem ----------
  function openRedeemModal() {
    const p = window.Store.Profile.get();
    openModal(`
      <h2>🎁 Redeem Code</h2>
      <p>Enter a redeem code to claim R Coins or activate unlimited mode.</p>
      <p class="muted">Codes are case-insensitive. <b>RABBi</b> activates unlimited R Coin mode for this profile.</p>
      <input id="redeemInput" class="redeem-input" type="text" maxlength="20" placeholder="ENTER CODE" autocomplete="off" />
      <button class="btn btn-primary" id="redeemSubmit">Redeem</button>
      <h4>Available codes</h4>
      <div class="code-list">
        <div><b>RABBi</b> — Unlimited R Coins mode</div>
        <div><b>WELCOME100</b> — +100 R Coins (once)</div>
        <div><b>ARENA500</b> — +500 R Coins (once)</div>
        <div><b>STARTER250</b> — +250 R Coins (once)</div>
      </div>
      ${p.redeemedCodes.length ? `<h4>Already redeemed</h4><div class="code-list">${p.redeemedCodes.map(c => `<div>${(window.REDEEM_CODES[c]||{label:c}).label}</div>`).join("")}</div>` : ""}
    `);
    const input = $("#redeemInput");
    input.focus();
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") doRedeem(); });
    $("#redeemSubmit").addEventListener("click", doRedeem);
  }

  function doRedeem() {
    const raw = $("#redeemInput").value;
    const result = window.Store.Profile.redeemCode(raw);
    if (!result.ok) {
      if (result.reason === "invalid") toast("Invalid code.", "error");
      else if (result.reason === "already") toast("Code already redeemed.", "error");
      return;
    }
    if (result.type === "unlimited") {
      toast("♾ UNLIMITED R COINS activated!", "success", 4000);
      window.Store.Profile.unlockAchievement("unlimited-mode");
      sparkCoins();
    } else {
      toast(`Redeemed ${result.label}: +${result.amount} 🪙`, "success", 4000);
      window.Store.Profile.unlockAchievement("redeem-code");
      sparkCoins();
    }
    refreshNavWallet();
    closeModal();
    if (state.route === "wallet") renderWallet();
  }

  // ---------- Profile ----------
  function renderProfile() {
    const p = window.Store.Profile.get();
    const lv = window.levelForXp(p.xp);
    $("#profileName").textContent = p.name;
    $("#profileTitle").textContent = `${lv.title} · L${lv.level}`;
    $("#profileAvatar").textContent = (p.avatar || p.name[0] || "P").slice(0, 2).toUpperCase();
    $("#profileAvatar").style.background = p.avatarColor || "linear-gradient(135deg, var(--accent), var(--accent-4))";
    $("#profileBanner").style.background = `linear-gradient(135deg, ${p.banner1}, ${p.banner2})`;
    const frame = window.FRAME_MAP[p.frame] || window.FRAME_MAP.default;
    $("#profileFrame").setAttribute("style", frame.css);
    $("#xpFill").style.width = (lv.xpIntoLevel / lv.xpForNext * 100) + "%";
    $("#xpText").textContent = `${lv.xpIntoLevel} / ${lv.xpForNext} XP`;
    const s = p.stats;
    $("#statMatches").textContent = s.matches || 0;
    $("#statWins").textContent = s.wins || 0;
    $("#statLosses").textContent = s.losses || 0;
    $("#statDraws").textContent = s.draws || 0;
    const wr = s.matches ? Math.round((s.wins / s.matches) * 100) : 0;
    $("#statWinRate").textContent = wr + "%";
    $("#statStreak").textContent = s.streak || 0;
    $("#statBestStreak").textContent = s.bestStreak || 0;
    $("#statCoins").textContent = p.unlimited ? "∞" : formatNumber(p.coins);
    $("#equippedArena").textContent = (window.ARENA_MAP[p.equippedArena] || { name: "Default" }).name;
    $("#equippedX").textContent = (window.SYMBOL_MAP[p.equippedX] || { name: "Classic" }).name;
    $("#equippedO").textContent = (window.SYMBOL_MAP[p.equippedO] || { name: "Classic" }).name;
    $("#equippedFrame").textContent = (window.FRAME_MAP[p.frame] || { name: "Default" }).name;
    // Recent matches
    const recent = $("#profileRecent");
    recent.innerHTML = "";
    if (!p.matchHistory.length) {
      recent.appendChild(el("p", { class: "muted", text: "No matches yet. Go play!" }));
    } else {
      p.matchHistory.slice(0, 5).forEach(m => recent.appendChild(renderMatchItem(m)));
    }
  }

  function renderMatchItem(m) {
    const time = new Date(m.ts).toLocaleString();
    const resultClass = m.result === "win" || m.result === "winX" || m.result === "winO" ? "result-win" :
                       m.result === "loss" ? "result-loss" : "result-draw";
    const resultText = m.result === "win" ? "Won" :
                       m.result === "loss" ? "Lost" :
                       m.result === "winX" ? "X Won" :
                       m.result === "winO" ? "O Won" : "Draw";
    return el("div", { class: "recent-item" }, [
      el("div", {}, [
        el("div", { text: `${m.size}×${m.size} · ${m.mode}${m.difficulty ? " · " + m.difficulty : ""}` }),
        el("div", { class: "muted", text: time }),
      ]),
      el("div", { style: { textAlign: "right" } }, [
        el("div", { class: resultClass, text: resultText }),
        el("div", { class: "muted", text: `+${m.coins} 🪙 · +${m.xp} XP` }),
      ]),
    ]);
  }

  // ---------- Customize ----------
  function renderCustomize() {
    const p = window.Store.Profile.get();
    $("#custName").value = p.name;
    $("#custAvatar").value = p.avatar;
    $("#custAvatarColor").value = p.avatarColor || "#7c3aed";
    $("#custBanner1").value = p.banner1 || "#7c3aed";
    $("#custBanner2").value = p.banner2 || "#22d3ee";
    // Frame grid
    const grid = $("#frameGrid");
    grid.innerHTML = "";
    window.FRAMES.forEach(f => {
      const owned = window.Store.Profile.ownFrame(f.id);
      const equipped = p.frame === f.id;
      const item = el("div", { class: "shop-item" + (owned ? " owned" : "") + (equipped ? " equipped" : "") }, [
        el("div", { class: "shop-preview", style: { padding: "20px" } }, [
          el("div", { class: "avatar-mini", text: p.avatar || "P", style: { cssText: f.css.replace("border-color", "border") } }),
        ]),
        el("div", { class: "shop-info" }, [
          el("div", { class: "shop-name", text: f.name }),
          el("div", { class: "shop-desc", text: f.desc }),
          el("div", { class: "shop-meta" }, [
            el("span", { class: `rarity-tag rarity-${f.rarity}`, text: f.rarity }),
            owned ? el("span", { class: "price-tag", text: "Owned" }) : el("span", { class: "price-tag", text: `${f.price} 🪙` }),
          ]),
          el("div", { class: "shop-actions" }, [
            owned
              ? (equipped
                  ? el("button", { class: "btn btn-ghost", text: "Equipped", attrs: { disabled: "true" } })
                  : el("button", { class: "btn btn-primary", text: "Equip", on: { click: () => { window.Store.Profile.equipFrame(f.id); renderCustomize(); refreshNavWallet(); } } }))
              : el("button", { class: "btn btn-primary", text: `Buy ${f.price}`, on: { click: () => buyFrame(f) } }),
          ]),
        ]),
      ]);
      grid.appendChild(item);
    });
  }

  function buyFrame(f) {
    const p = window.Store.Profile.get();
    if (window.Store.Profile.ownFrame(f.id)) { toast("Already owned.", "info"); return; }
    if (!window.Store.Profile.spendCoins(f.price, `Frame: ${f.name}`)) {
      toast("Not enough R Coins.", "error");
      return;
    }
    window.Store.Profile.addFrame(f.id);
    window.Store.Profile.equipFrame(f.id);
    toast(`Unlocked ${f.name}!`, "success");
    sparkCoins();
    renderCustomize();
    refreshNavWallet();
  }

  function saveCustomize() {
    const name = $("#custName").value.trim().slice(0, 16) || "Player";
    const avatar = $("#custAvatar").value.trim().slice(0, 2) || name[0].toUpperCase();
    const avatarColor = $("#custAvatarColor").value;
    const banner1 = $("#custBanner1").value;
    const banner2 = $("#custBanner2").value;
    window.Store.Profile.set({ name, avatar, avatarColor, banner1, banner2 });
    toast("Profile saved.", "success");
    refreshNavWallet();
    go("profile");
  }

  // ---------- Wallet ----------
  function renderWallet() {
    const p = window.Store.Profile.get();
    if (p.unlimited) {
      $("#walletCoinBig").textContent = "∞";
      $("#walletSub").textContent = "UNLIMITED R COINS";
    } else {
      $("#walletCoinBig").textContent = formatNumber(p.coins);
      $("#walletSub").textContent = "R Coins";
    }
    // Transactions
    const txList = $("#txList");
    txList.innerHTML = "";
    if (!p.transactions.length) {
      txList.appendChild(el("p", { class: "muted", text: "No transactions yet." }));
    } else {
      p.transactions.slice(0, 30).forEach(tx => {
        const time = new Date(tx.ts).toLocaleString();
        const cls = (tx.amount || 0) >= 0 ? "amount-pos" : "amount-neg";
        const amt = (tx.amount || 0) >= 0 ? `+${tx.amount}` : `${tx.amount}`;
        txList.appendChild(el("div", { class: "tx-item" }, [
          el("div", {}, [
            el("div", { text: tx.label || "—" }),
            el("div", { class: "muted", text: time }),
          ]),
          el("div", { class: cls, text: tx.amount === 0 && tx.label && tx.label.includes("UNLIMITED") ? "∞" : amt + " 🪙" }),
        ]));
      });
    }
    // Redeemed codes
    const rList = $("#redeemedList");
    rList.innerHTML = "";
    if (!p.redeemedCodes.length) {
      rList.appendChild(el("p", { class: "muted", text: "No codes redeemed yet." }));
    } else {
      p.redeemedCodes.forEach(c => {
        const def = window.REDEEM_CODES[c] || { label: c };
        rList.appendChild(el("div", { class: "tx-item" }, [
          el("div", { text: def.label }),
          el("div", { class: "amount-pos", text: def.type === "unlimited" ? "♾ Unlimited" : `+${def.amount || 0} 🪙` }),
        ]));
      });
    }
  }

  // ---------- Shop ----------
  let currentShopTab = "arenas";
  let currentInvTab = "arenas";
  function renderShop(tab) {
    currentShopTab = tab || currentShopTab;
    const grid = $("#shopGrid");
    grid.innerHTML = "";
    const p = window.Store.Profile.get();
    const q = ($("#shopSearch").value || "").toLowerCase();
    const ownedOnly = $("#shopOwnedOnly").checked;
    const lockedOnly = $("#shopLockedOnly").checked;

    let items = [];
    if (currentShopTab === "arenas") {
      items = window.ARENAS.map(a => ({
        id: a.id, name: a.name, desc: a.desc, rarity: a.rarity, price: a.price,
        previewHTML: arenaPreview(a),
        owned: window.Store.Profile.ownArena(a.id),
        equipped: p.equippedArena === a.id,
        onBuy: () => buyArena(a),
        onEquip: () => { window.Store.Profile.equipArena(a.id); applyEquipped(); renderShop(currentShopTab); toast(`${a.name} equipped.`, "success"); },
      }));
    } else if (currentShopTab === "symbols") {
      items = window.SYMBOL_PACKS.map(s => ({
        id: s.id, name: s.name, desc: s.desc, rarity: s.rarity, price: s.price,
        previewHTML: symbolPreview(s),
        owned: window.Store.Profile.ownSymbol(s.id),
        equipped: p.equippedX === s.id || p.equippedO === s.id,
        onBuy: () => buySymbol(s),
        onEquip: () => openSymbolEquipModal(s),
      }));
    } else if (currentShopTab === "frames") {
      items = window.FRAMES.map(f => ({
        id: f.id, name: f.name, desc: f.desc, rarity: f.rarity, price: f.price,
        previewHTML: `<div class="avatar-mini" style="${f.css}">P</div>`,
        owned: window.Store.Profile.ownFrame(f.id),
        equipped: p.frame === f.id,
        onBuy: () => buyFrame(f),
        onEquip: () => { window.Store.Profile.equipFrame(f.id); renderShop(currentShopTab); refreshNavWallet(); toast(`${f.name} equipped.`, "success"); },
      }));
    }

    items = items.filter(it => {
      if (q && !(it.name.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q))) return false;
      if (ownedOnly && !it.owned) return false;
      if (lockedOnly && it.owned) return false;
      return true;
    });

    if (!items.length) {
      grid.appendChild(el("p", { class: "muted", text: "No items match your filters." }));
      return;
    }
    items.forEach(it => grid.appendChild(renderShopItem(it)));
  }

  function renderShopItem(it) {
    const item = el("div", { class: "shop-item" + (it.owned ? " owned" : "") + (it.equipped ? " equipped" : "") + (!it.owned ? " locked" : "") });
    const preview = el("div", { class: "shop-preview", html: it.previewHTML });
    if (!it.owned) preview.appendChild(el("div", { class: "lock-overlay", text: "🔒" }));
    item.appendChild(preview);
    const info = el("div", { class: "shop-info" }, [
      el("div", { class: "shop-name", text: it.name }),
      el("div", { class: "shop-desc", text: it.desc }),
      el("div", { class: "shop-meta" }, [
        el("span", { class: `rarity-tag rarity-${it.rarity}`, text: it.rarity }),
        it.owned
          ? el("span", { class: "price-tag", text: "Owned" })
          : (it.price === 0 ? el("span", { class: "price-tag", text: "Free" }) : el("span", { class: "price-tag", text: `${it.price} 🪙` })),
      ]),
      el("div", { class: "shop-actions" }, [
        it.owned
          ? (it.equipped
              ? el("button", { class: "btn btn-ghost", text: "Equipped", attrs: { disabled: "true" } })
              : el("button", { class: "btn btn-primary", text: "Equip", on: { click: it.onEquip } }))
          : el("button", { class: "btn btn-primary", text: `Buy ${it.price === 0 ? "" : it.price}`, on: { click: it.onBuy } }),
      ]),
    ]);
    item.appendChild(info);
    return item;
  }

  function arenaPreview(a) {
    // Use a mini board styled via the arena's CSS variables
    return `<div class="mini-board" style="background: var(--arena-cell-bg, rgba(0,0,0,0.3)); padding: 6px; gap: 3px; width: 80px; height: 80px;" data-arena-preview="${a.id}">
      <style scoped>body[data-arena-preview="${a.id}"] {}</style>
      <div class="mini-cell x">✕</div><div class="mini-cell"></div><div class="mini-cell o">◯</div>
      <div class="mini-cell o">◯</div><div class="mini-cell x">✕</div><div class="mini-cell"></div>
      <div class="mini-cell"></div><div class="mini-cell o">◯</div><div class="mini-cell x">✕</div>
    </div>`;
  }

  function symbolPreview(s) {
    return `<div style="display:flex;gap:14px;align-items:center;">
      <span class="mark x" data-style="${s.style}" style="font-size:38px;">${s.xChar}</span>
      <span class="mark o" data-style="${s.style}" style="font-size:38px;">${s.oChar}</span>
    </div>`;
  }

  function buyArena(a) {
    if (window.Store.Profile.ownArena(a.id)) { toast("Already owned.", "info"); return; }
    if (!window.Store.Profile.spendCoins(a.price, `Arena: ${a.name}`)) {
      toast("Not enough R Coins.", "error");
      return;
    }
    window.Store.Profile.addArena(a.id);
    window.Store.Profile.unlockAchievement("buy-arena");
    if (window.Store.Profile.get().ownedArenas.length >= 10) window.Store.Profile.unlockAchievement("own-10-arenas");
    if (window.Store.Profile.get().ownedArenas.length >= 25) window.Store.Profile.unlockAchievement("own-25-arenas");
    if (window.Store.Profile.get().ownedArenas.length >= 50) window.Store.Profile.unlockAchievement("own-50-arenas");
    toast(`Unlocked ${a.name}!`, "success");
    sparkCoins();
    renderShop(currentShopTab);
    refreshNavWallet();
  }

  function buySymbol(s) {
    if (window.Store.Profile.ownSymbol(s.id)) { toast("Already owned.", "info"); return; }
    if (!window.Store.Profile.spendCoins(s.price, `Symbol: ${s.name}`)) {
      toast("Not enough R Coins.", "error");
      return;
    }
    window.Store.Profile.addSymbol(s.id);
    window.Store.Profile.unlockAchievement("buy-symbol");
    toast(`Unlocked ${s.name}!`, "success");
    sparkCoins();
    renderShop(currentShopTab);
    refreshNavWallet();
  }

  function openSymbolEquipModal(s) {
    openModal(`
      <h2>Equip ${s.name}</h2>
      <p>Choose where to equip this symbol pack:</p>
      <div style="display:flex;gap:20px;justify-content:center;margin:16px 0;">
        <div style="text-align:center;">
          <div class="mark x" data-style="${s.style}" style="font-size:48px;">${s.xChar}</div>
          <div class="muted">as X</div>
        </div>
        <div style="text-align:center;">
          <div class="mark o" data-style="${s.style}" style="font-size:48px;">${s.oChar}</div>
          <div class="muted">as O</div>
        </div>
      </div>
      <button class="btn btn-primary" id="equipXBtn">Equip as X</button>
      <button class="btn btn-primary" id="equipOBtn">Equip as O</button>
      <button class="btn btn-primary" id="equipBothBtn">Equip as Both</button>
    `);
    $("#equipXBtn").onclick = () => { window.Store.Profile.equipX(s.id); applyEquipped(); closeModal(); renderShop(currentShopTab); toast(`${s.name} equipped as X.`, "success"); };
    $("#equipOBtn").onclick = () => { window.Store.Profile.equipO(s.id); applyEquipped(); closeModal(); renderShop(currentShopTab); toast(`${s.name} equipped as O.`, "success"); };
    $("#equipBothBtn").onclick = () => { window.Store.Profile.equipX(s.id); window.Store.Profile.equipO(s.id); applyEquipped(); closeModal(); renderShop(currentShopTab); toast(`${s.name} equipped as X and O.`, "success"); };
  }

  // ---------- Inventory ----------
  function renderInventory(tab) {
    currentInvTab = tab || currentInvTab;
    const grid = $("#invGrid");
    grid.innerHTML = "";
    const p = window.Store.Profile.get();
    let items = [];
    if (currentInvTab === "arenas") {
      items = window.ARENAS
        .filter(a => window.Store.Profile.ownArena(a.id))
        .map(a => ({
          id: a.id, name: a.name, desc: a.desc, rarity: a.rarity,
          previewHTML: arenaPreview(a),
          equipped: p.equippedArena === a.id,
          onEquip: () => { window.Store.Profile.equipArena(a.id); applyEquipped(); renderInventory(currentInvTab); toast(`${a.name} equipped.`, "success"); },
        }));
    } else if (currentInvTab === "symbols") {
      items = window.SYMBOL_PACKS
        .filter(s => window.Store.Profile.ownSymbol(s.id))
        .map(s => ({
          id: s.id, name: s.name, desc: s.desc, rarity: s.rarity,
          previewHTML: symbolPreview(s),
          equipped: p.equippedX === s.id || p.equippedO === s.id,
          onEquip: () => openSymbolEquipModal(s),
        }));
    } else if (currentInvTab === "frames") {
      items = window.FRAMES
        .filter(f => window.Store.Profile.ownFrame(f.id))
        .map(f => ({
          id: f.id, name: f.name, desc: f.desc, rarity: f.rarity,
          previewHTML: `<div class="avatar-mini" style="${f.css}">P</div>`,
          equipped: p.frame === f.id,
          onEquip: () => { window.Store.Profile.equipFrame(f.id); renderInventory(currentInvTab); refreshNavWallet(); toast(`${f.name} equipped.`, "success"); },
        }));
    }
    if (!items.length) {
      grid.appendChild(el("p", { class: "muted", text: "Nothing here yet. Visit the shop to unlock items." }));
      return;
    }
    items.forEach(it => {
      const item = el("div", { class: "shop-item owned" + (it.equipped ? " equipped" : "") }, [
        el("div", { class: "shop-preview", html: it.previewHTML }),
        el("div", { class: "shop-info" }, [
          el("div", { class: "shop-name", text: it.name }),
          el("div", { class: "shop-desc", text: it.desc }),
          el("div", { class: "shop-meta" }, [
            el("span", { class: `rarity-tag rarity-${it.rarity}`, text: it.rarity }),
            el("span", { class: "price-tag", text: it.equipped ? "Equipped" : "Owned" }),
          ]),
          el("div", { class: "shop-actions" }, [
            it.equipped
              ? el("button", { class: "btn btn-ghost", text: "Equipped", attrs: { disabled: "true" } })
              : el("button", { class: "btn btn-primary", text: "Equip", on: { click: it.onEquip } }),
          ]),
        ]),
      ]);
      grid.appendChild(item);
    });
  }

  // ---------- Achievements ----------
  function renderAchievements() {
    const p = window.Store.Profile.get();
    const grid = $("#achGrid");
    grid.innerHTML = "";
    const unlocked = p.achievements.length;
    const total = window.ACHIEVEMENTS.length;
    $("#achSummary").textContent = `${unlocked} / ${total} unlocked`;
    $("#achFill").style.width = (unlocked / total * 100) + "%";
    window.ACHIEVEMENTS.forEach(a => {
      const has = window.Store.Profile.hasAchievement(a.id);
      const item = el("div", { class: "shop-item" + (has ? " owned" : " locked") }, [
        el("div", { class: "shop-preview", style: { fontSize: "38px" }, text: a.icon }),
        el("div", { class: "shop-info" }, [
          el("div", { class: "shop-name", text: a.name }),
          el("div", { class: "shop-desc", text: a.desc }),
          el("div", { class: "shop-meta" }, [
            has ? el("span", { class: "rarity-tag rarity-legendary", text: "Unlocked" }) : el("span", { class: "rarity-tag rarity-common", text: "Locked" }),
            el("span", { class: "price-tag", text: a.reward ? `+${a.reward} 🪙` : "—" }),
          ]),
        ]),
      ]);
      if (!has) item.querySelector(".shop-preview").appendChild(el("div", { class: "lock-overlay", text: "🔒" }));
      grid.appendChild(item);
    });
  }

  // ---------- History ----------
  function renderHistory() {
    const p = window.Store.Profile.get();
    const list = $("#historyList");
    list.innerHTML = "";
    if (!p.matchHistory.length) {
      list.appendChild(el("p", { class: "muted", text: "No matches played yet." }));
      return;
    }
    p.matchHistory.forEach(m => list.appendChild(renderMatchItem(m)));
  }

  // ---------- Settings ----------
  function renderSettings() {
    const s = window.Store.Settings.get();
    $("#setSound").checked = !!s.sound;
    $("#setHaptic").checked = !!s.haptic;
    $("#setAnimLevel").value = s.animLevel;
    $("#setReducedMotion").checked = !!s.reducedMotion;
  }

  function exportData() {
    const data = window.Store.Profile.exportJSON();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { attrs: { href: url, download: `tictactoe-arena-save-${Date.now()}.json` } });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Save exported.", "success");
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        window.Store.Profile.importJSON(reader.result);
        toast("Save imported!", "success");
        refreshNavWallet();
        renderSettings();
      } catch (err) {
        toast("Import failed: " + err.message, "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function resetData() {
    if (!confirm("Reset ALL data? This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? Your profile, coins, and unlocks will be wiped.")) return;
    window.Store.Profile.reset();
    toast("All data reset.", "info");
    refreshNavWallet();
    go("home");
  }
})();
