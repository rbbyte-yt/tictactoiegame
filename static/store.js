/* =========================================================
   store.js — LocalStorage persistence layer.
   Exposed as window.Store with simple get/set helpers and
   higher-level methods for profile/coins/inventory/settings.
   ========================================================= */
(function () {
  "use strict";

  const KEY = "tictactoe_arena_save_v1";

  const DEFAULT_PROFILE = {
    name: "Player",
    avatar: "P",
    avatarColor: "#7c3aed",
    banner1: "#7c3aed",
    banner2: "#22d3ee",
    frame: "default",
    xp: 0,
    coins: 100, // starter coins
    unlimited: false,
    stats: {
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      bestStreak: 0,
      winVsEasy: 0,
      winVsMedium: 0,
      winVsHard: 0,
      winVsExpert: 0,
      drawVsImpossible: 0,
    },
    ownedArenas: ["neon-cyber-city"],
    ownedSymbols: ["classic"],
    ownedFrames: ["default"],
    equippedArena: "neon-cyber-city",
    equippedX: "classic",
    equippedO: "classic",
    achievements: [], // ids unlocked
    redeemedCodes: [], // codes already redeemed
    transactions: [], // { ts, type, amount, label }
    matchHistory: [], // last 50 matches
    dailyMissions: { date: "", missions: [] }, // generated per day
    lastLogin: "", // yyyy-mm-dd
    loginStreak: 0,
    createdAt: Date.now(),
  };

  const DEFAULT_SETTINGS = {
    sound: true,
    haptic: true,
    animLevel: 2, // 0=off, 1=low, 2=full
    reducedMotion: false,
  };

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        cache = { profile: { ...DEFAULT_PROFILE }, settings: { ...DEFAULT_SETTINGS } };
        save();
        return cache;
      }
      const parsed = JSON.parse(raw);
      // Deep-merge profile to ensure new fields exist
      cache = {
        profile: deepMerge({ ...DEFAULT_PROFILE }, parsed.profile || {}),
        settings: deepMerge({ ...DEFAULT_SETTINGS }, parsed.settings || {}),
      };
      return cache;
    } catch (e) {
      console.warn("Save file corrupted, starting fresh:", e);
      cache = { profile: { ...DEFAULT_PROFILE }, settings: { ...DEFAULT_SETTINGS } };
      save();
      return cache;
    }
  }

  function save() {
    if (!cache) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn("Failed to save:", e);
    }
  }

  function deepMerge(target, source) {
    if (Array.isArray(target)) return source.slice();
    if (typeof target === "object" && target !== null) {
      const out = { ...target };
      for (const k of Object.keys(source)) {
        if (typeof source[k] === "object" && source[k] !== null && !Array.isArray(source[k])) {
          out[k] = deepMerge(target[k] || {}, source[k]);
        } else {
          out[k] = source[k];
        }
      }
      return out;
    }
    return source;
  }

  // ---------- Profile ----------
  const Profile = {
    get() { return load().profile; },
    set(patch) { Object.assign(load().profile, patch); save(); },
    updateStats(patch) { Object.assign(load().profile.stats, patch); save(); },

    // Coins
    addCoins(n, label) {
      const p = load().profile;
      if (p.unlimited) {
        // Still log for history, but don't change balance.
        if (label) Profile.logTx({ type: "earn", amount: n, label });
        return;
      }
      p.coins = Math.max(0, p.coins + n);
      if (label) Profile.logTx({ type: n >= 0 ? "earn" : "spend", amount: n, label });
      save();
    },
    spendCoins(n, label) {
      const p = load().profile;
      if (p.unlimited) {
        // Unlimited mode: never reduce balance, but log.
        Profile.logTx({ type: "spend", amount: 0, label: `${label} (UNLIMITED)` });
        return true;
      }
      if (p.coins < n) return false;
      p.coins -= n;
      Profile.logTx({ type: "spend", amount: -n, label });
      save();
      return true;
    },
    logTx(tx) {
      const p = load().profile;
      p.transactions.unshift({ ts: Date.now(), ...tx });
      p.transactions = p.transactions.slice(0, 100);
      save();
    },

    // XP & level
    addXp(n) {
      const p = load().profile;
      const before = window.levelForXp(p.xp);
      p.xp += n;
      const after = window.levelForXp(p.xp);
      save();
      if (after.level > before.level) {
        const reward = window.REWARDS.levelUp(after.level);
        Profile.addCoins(reward, `Level up to ${after.level}`);
        return { leveledUp: true, newLevel: after.level, reward };
      }
      return { leveledUp: false };
    },

    // Ownership
    ownArena(id) { return load().profile.ownedArenas.includes(id); },
    ownSymbol(id) { return load().profile.ownedSymbols.includes(id); },
    ownFrame(id) { return load().profile.ownedFrames.includes(id); },
    addArena(id) { const p = load().profile; if (!p.ownedArenas.includes(id)) p.ownedArenas.push(id); save(); },
    addSymbol(id) { const p = load().profile; if (!p.ownedSymbols.includes(id)) p.ownedSymbols.push(id); save(); },
    addFrame(id) { const p = load().profile; if (!p.ownedFrames.includes(id)) p.ownedFrames.push(id); save(); },
    equipArena(id) { if (Profile.ownArena(id)) { load().profile.equippedArena = id; save(); } },
    equipX(id) { if (Profile.ownSymbol(id)) { load().profile.equippedX = id; save(); } },
    equipO(id) { if (Profile.ownSymbol(id)) { load().profile.equippedO = id; save(); } },
    equipFrame(id) { if (Profile.ownFrame(id)) { load().profile.equippedFrame = id; save(); } },

    // Match history
    addMatch(entry) {
      const p = load().profile;
      p.matchHistory.unshift({ ts: Date.now(), ...entry });
      p.matchHistory = p.matchHistory.slice(0, 50);
      save();
    },
    clearHistory() { load().profile.matchHistory = []; save(); },

    // Achievements
    unlockAchievement(id) {
      const p = load().profile;
      if (p.achievements.includes(id)) return false;
      p.achievements.push(id);
      save();
      const ach = window.ACHIEVEMENTS.find(a => a.id === id);
      if (ach && ach.reward) Profile.addCoins(ach.reward, `Achievement: ${ach.name}`);
      Profile.addXp(window.XP_REWARDS.achievement);
      return true;
    },
    hasAchievement(id) { return load().profile.achievements.includes(id); },

    // Daily login
    checkDailyLogin() {
      const today = new Date().toISOString().slice(0, 10);
      const p = load().profile;
      if (p.lastLogin === today) return { claimed: false };
      // Streak handling
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (p.lastLogin === yesterday) p.loginStreak = (p.loginStreak || 0) + 1;
      else p.loginStreak = 1;
      p.lastLogin = today;
      const reward = window.REWARDS.dailyLogin + Math.min(p.loginStreak - 1, 6) * 10; // bonus up to +60
      Profile.addCoins(reward, `Daily login (day ${p.loginStreak})`);
      save();
      return { claimed: true, reward, streak: p.loginStreak };
    },

    // Daily missions
    refreshDailyMissions() {
      const today = new Date().toISOString().slice(0, 10);
      const p = load().profile;
      if (p.dailyMissions.date === today && p.dailyMissions.missions.length) return p.dailyMissions.missions;
      const templates = [...window.MISSION_TEMPLATES];
      // Pick 3 random missions
      const picked = [];
      while (picked.length < 3 && templates.length) {
        const idx = Math.floor(Math.random() * templates.length);
        const t = templates.splice(idx, 1)[0];
        picked.push({ ...t, progress: 0, complete: false, claimed: false });
      }
      p.dailyMissions = { date: today, missions: picked };
      save();
      return picked;
    },
    progressMission(type, count = 1) {
      const p = load().profile;
      let changed = false;
      for (const m of p.dailyMissions.missions) {
        if (m.complete) continue;
        if (m.type === type) {
          m.progress = Math.min(m.target, (m.progress || 0) + count);
          if (m.progress >= m.target) { m.complete = true; changed = true; }
          else changed = true;
        }
      }
      if (changed) save();
      return changed;
    },
    claimMission(idx) {
      const p = load().profile;
      const m = p.dailyMissions.missions[idx];
      if (!m || !m.complete || m.claimed) return false;
      m.claimed = true;
      Profile.addCoins(m.reward, `Mission: ${m.text}`);
      Profile.addXp(window.XP_REWARDS.mission);
      save();
      return true;
    },

    // Redeem codes
    redeemCode(rawCode) {
      const code = String(rawCode || "").trim().toLowerCase();
      const def = window.REDEEM_CODES[code];
      if (!def) return { ok: false, reason: "invalid" };
      const p = load().profile;
      // RABBi can be redeemed multiple times (idempotent: just turns on unlimited mode).
      if (def.type !== "unlimited" && p.redeemedCodes.includes(code)) {
        return { ok: false, reason: "already" };
      }
      if (def.type === "unlimited") {
        p.unlimited = true;
        if (!p.redeemedCodes.includes(code)) p.redeemedCodes.push(code);
        save();
        return { ok: true, type: "unlimited", label: def.label };
      } else {
        Profile.addCoins(def.amount, `Redeemed ${def.label}`);
        p.redeemedCodes.push(code);
        save();
        return { ok: true, type: "coins", amount: def.amount, label: def.label };
      }
    },

    // Reset
    reset() {
      cache = { profile: { ...DEFAULT_PROFILE }, settings: { ...DEFAULT_SETTINGS } };
      save();
    },
    exportJSON() {
      return JSON.stringify(load(), null, 2);
    },
    importJSON(str) {
      const obj = JSON.parse(str);
      cache = {
        profile: deepMerge({ ...DEFAULT_PROFILE }, obj.profile || {}),
        settings: deepMerge({ ...DEFAULT_SETTINGS }, obj.settings || {}),
      };
      save();
    },
  };

  // ---------- Settings ----------
  const Settings = {
    get() { return load().settings; },
    set(patch) { Object.assign(load().settings, patch); save(); },
  };

  // ---------- Export ----------
  window.Store = { Profile, Settings, _load: load, _save: save };
})();
