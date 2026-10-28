/* =========================================================
   game.js — Game logic: board state, win detection,
   AI difficulty levels, undo.
   Exposed as window.Game (engine) and window.AI (opponent).
   ========================================================= */
(function () {
  "use strict";

  // ---------- Game engine ----------
  // size: board side length (3..10)
  // winLen: number of marks in a row needed to win
  const Game = {
    create(size, winLen) {
      size = Math.max(3, Math.min(10, parseInt(size, 10) || 3));
      winLen = Math.max(3, Math.min(size, parseInt(winLen, 10) || 3));
      return {
        size,
        winLen,
        board: new Array(size * size).fill(null),
        turn: "X",
        moves: [], // { index, symbol, by }
        winner: null, // "X" | "O" | "draw" | null
        winLine: null, // array of indices
        startedAt: Date.now(),
      };
    },

    // Returns: { ok: true } | { ok: false, reason: string }
    play(state, index, symbol) {
      if (state.winner) return { ok: false, reason: "Game over" };
      if (state.turn !== symbol) return { ok: false, reason: "Not your turn" };
      if (index < 0 || index >= state.board.length) return { ok: false, reason: "Out of range" };
      if (state.board[index] !== null) return { ok: false, reason: "Cell occupied" };
      state.board[index] = symbol;
      state.moves.push({ index, symbol });
      const win = Game.checkWinner(state.board, state.size, state.winLen);
      if (win.winner === "draw") {
        state.winner = "draw";
      } else if (win.winner) {
        state.winner = win.winner;
        state.winLine = win.line;
      } else {
        state.turn = symbol === "X" ? "O" : "X";
      }
      return { ok: true };
    },

    undo(state) {
      if (!state.moves.length) return false;
      const last = state.moves.pop();
      state.board[last.index] = null;
      state.winner = null;
      state.winLine = null;
      state.turn = last.symbol;
      return true;
    },

    legalMoves(board) {
      const out = [];
      for (let i = 0; i < board.length; i++) if (board[i] === null) out.push(i);
      return out;
    },

    // Returns { winner: "X"|"O"|"draw"|null, line: number[]|null }
    checkWinner(board, size, winLen) {
      const n = size;
      // Build grid
      const grid = [];
      for (let r = 0; r < n; r++) grid.push(board.slice(r * n, (r + 1) * n));

      function checkLine(cells) {
        if (!cells.length) return null;
        const first = cells[0];
        if (!first) return null;
        for (const c of cells) if (c !== first) return null;
        return first;
      }

      // Horizontal
      for (let r = 0; r < n; r++) {
        for (let c = 0; c <= n - winLen; c++) {
          const cells = [];
          for (let k = 0; k < winLen; k++) cells.push(grid[r][c + k]);
          const w = checkLine(cells);
          if (w) return { winner: w, line: cells.map((_, k) => r * n + c + k) };
        }
      }
      // Vertical
      for (let c = 0; c < n; c++) {
        for (let r = 0; r <= n - winLen; r++) {
          const cells = [];
          for (let k = 0; k < winLen; k++) cells.push(grid[r + k][c]);
          const w = checkLine(cells);
          if (w) return { winner: w, line: cells.map((_, k) => (r + k) * n + c) };
        }
      }
      // Diagonal down-right
      for (let r = 0; r <= n - winLen; r++) {
        for (let c = 0; c <= n - winLen; c++) {
          const cells = [];
          for (let k = 0; k < winLen; k++) cells.push(grid[r + k][c + k]);
          const w = checkLine(cells);
          if (w) return { winner: w, line: cells.map((_, k) => (r + k) * n + c + k) };
        }
      }
      // Diagonal up-right
      for (let r = winLen - 1; r < n; r++) {
        for (let c = 0; c <= n - winLen; c++) {
          const cells = [];
          for (let k = 0; k < winLen; k++) cells.push(grid[r - k][c + k]);
          const w = checkLine(cells);
          if (w) return { winner: w, line: cells.map((_, k) => (r - k) * n + c + k) };
        }
      }
      // Draw
      if (board.every(v => v !== null)) return { winner: "draw", line: null };
      return { winner: null, line: null };
    },
  };

  // ---------- AI ----------
  // Difficulty levels: easy, medium, hard, expert, impossible
  // - easy: random
  // - medium: 70% take win/block, else random
  // - hard: 1-ply lookahead with win/block + heuristic
  // - expert: bounded minimax with alpha-beta (deeper)
  // - impossible: full minimax for 3x3 (unbeatable); bounded depth for larger boards
  const AI = {
    move(state, difficulty, aiSymbol) {
      const board = state.board.slice();
      const size = state.size;
      const winLen = state.winLen;
      const human = aiSymbol === "X" ? "O" : "X";
      const legal = Game.legalMoves(board);
      if (!legal.length) return null;

      if (difficulty === "easy") {
        return legal[Math.floor(Math.random() * legal.length)];
      }
      if (difficulty === "medium") {
        // Try to win, then block, else random with center bias
        const win = findWinningMove(board, size, winLen, aiSymbol);
        if (win !== -1 && Math.random() < 0.85) return win;
        const block = findWinningMove(board, size, winLen, human);
        if (block !== -1 && Math.random() < 0.75) return block;
        return biasedRandom(board, size, legal);
      }
      if (difficulty === "hard") {
        // 1-ply lookahead with win/block + heuristic
        const win = findWinningMove(board, size, winLen, aiSymbol);
        if (win !== -1) return win;
        const block = findWinningMove(board, size, winLen, human);
        if (block !== -1) return block;
        // Heuristic: prefer center, then corners, then edges
        return heuristicMove(board, size, winLen, aiSymbol, human, 1);
      }
      if (difficulty === "expert") {
        // Bounded minimax with alpha-beta — deeper
        return minimaxMove(board, size, winLen, aiSymbol, human, maxDepth(size, 5));
      }
      if (difficulty === "impossible") {
        // Full minimax for 3x3 (truly unbeatable).
        // Bounded depth for larger boards (strong but not literally unbeatable).
        if (size === 3 && winLen === 3) {
          return minimaxMove(board, size, winLen, aiSymbol, human, 9);
        }
        return minimaxMove(board, size, winLen, aiSymbol, human, maxDepth(size, 6));
      }
      // Fallback: random
      return legal[Math.floor(Math.random() * legal.length)];
    },
  };

  // ---------- Helpers ----------
  function maxDepth(size, cap) {
    // More cells => shallower search to keep it snappy.
    const total = size * size;
    if (total <= 9) return Math.min(cap, 9);
    if (total <= 16) return Math.min(cap, 5);
    if (total <= 25) return Math.min(cap, 4);
    if (total <= 49) return Math.min(cap, 3);
    return Math.min(cap, 2);
  }

  function findWinningMove(board, size, winLen, symbol) {
    const legal = Game.legalMoves(board);
    for (const idx of legal) {
      board[idx] = symbol;
      const r = Game.checkWinner(board, size, winLen);
      board[idx] = null;
      if (r.winner === symbol) return idx;
    }
    return -1;
  }

  function biasedRandom(board, size, legal) {
    // Center bias
    const center = Math.floor(size / 2);
    const centerIdx = center * size + center;
    if (board[centerIdx] === null && Math.random() < 0.4) return centerIdx;
    return legal[Math.floor(Math.random() * legal.length)];
  }

  function heuristicMove(board, size, winLen, ai, human, depth) {
    const legal = Game.legalMoves(board);
    let bestScore = -Infinity;
    let bestMoves = [];
    for (const idx of legal) {
      board[idx] = ai;
      const score = evaluate(board, size, winLen, ai, human) + (Math.random() * 4 - 2);
      board[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [idx];
      } else if (score === bestScore) {
        bestMoves.push(idx);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // Static evaluation: + for AI lines, - for human lines.
  function evaluate(board, size, winLen, ai, human) {
    // Sample all win-lines and score them.
    let score = 0;
    const lines = allLines(size, winLen);
    for (const line of lines) {
      let aiCount = 0, humanCount = 0;
      for (const idx of line) {
        if (board[idx] === ai) aiCount++;
        else if (board[idx] === human) humanCount++;
      }
      if (humanCount === 0 && aiCount > 0) {
        score += aiCount * aiCount * 3;
        if (aiCount === winLen - 1) score += 50;
      } else if (aiCount === 0 && humanCount > 0) {
        score -= humanCount * humanCount * 3;
        if (humanCount === winLen - 1) score -= 60; // weight blocking
      }
    }
    // Center control bonus
    const c = Math.floor(size / 2);
    const centerIdx = c * size + c;
    if (board[centerIdx] === ai) score += 4;
    return score;
  }

  function allLines(size, winLen) {
    if (allLines._cache && allLines._cache[`${size}-${winLen}`]) return allLines._cache[`${size}-${winLen}`];
    const lines = [];
    const n = size;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c <= n - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push(r * n + c + k);
        lines.push(line);
      }
    }
    for (let c = 0; c < n; c++) {
      for (let r = 0; r <= n - winLen; r++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * n + c);
        lines.push(line);
      }
    }
    for (let r = 0; r <= n - winLen; r++) {
      for (let c = 0; c <= n - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * n + c + k);
        lines.push(line);
      }
    }
    for (let r = winLen - 1; r < n; r++) {
      for (let c = 0; c <= n - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r - k) * n + c + k);
        lines.push(line);
      }
    }
    if (!allLines._cache) allLines._cache = {};
    allLines._cache[`${size}-${winLen}`] = lines;
    return lines;
  }

  // Minimax with alpha-beta pruning
  function minimaxMove(board, size, winLen, ai, human, maxDepth) {
    const legal = Game.legalMoves(board);
    if (!legal.length) return -1;
    // Quick win/block first
    const win = findWinningMove(board, size, winLen, ai);
    if (win !== -1) return win;
    const block = findWinningMove(board, size, winLen, human);
    if (block !== -1) return block;
    let bestScore = -Infinity;
    let bestMoves = [];
    // Order moves: center first (improves alpha-beta pruning)
    const ordered = orderMoves(legal, size);
    for (const idx of ordered) {
      board[idx] = ai;
      const score = minimax(board, size, winLen, maxDepth - 1, false, ai, human, -Infinity, Infinity);
      board[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [idx];
      } else if (score === bestScore) {
        bestMoves.push(idx);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function orderMoves(legal, size) {
    const c = Math.floor(size / 2);
    const center = c * size + c;
    return legal.slice().sort((a, b) => {
      const da = Math.abs(a - center);
      const db = Math.abs(b - center);
      return da - db;
    });
  }

  function minimax(board, size, winLen, depth, maximizing, ai, human, alpha, beta) {
    const result = Game.checkWinner(board, size, winLen);
    if (result.winner === ai) return 1000 + depth;
    if (result.winner === human) return -1000 - depth;
    if (result.winner === "draw") return 0;
    if (depth <= 0) return evaluate(board, size, winLen, ai, human);

    const legal = Game.legalMoves(board);
    if (!legal.length) return 0;
    const ordered = orderMoves(legal, size);

    if (maximizing) {
      let best = -Infinity;
      for (const idx of ordered) {
        board[idx] = ai;
        const v = minimax(board, size, winLen, depth - 1, false, ai, human, alpha, beta);
        board[idx] = null;
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const idx of ordered) {
        board[idx] = human;
        const v = minimax(board, size, winLen, depth - 1, true, ai, human, alpha, beta);
        board[idx] = null;
        if (v < best) best = v;
        if (v < beta) beta = v;
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  // ---------- Export ----------
  window.Game = Game;
  window.AI = AI;
})();
