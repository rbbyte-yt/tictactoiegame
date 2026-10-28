/* =========================================================
   data.js — Static data: arenas, symbol packs, frames,
   achievements, missions, level table, redeem codes.
   Exposed as window.ARENAS, window.SYMBOL_PACKS, etc.
   ========================================================= */
(function () {
  "use strict";

  // ---------- ARENAS (50+) ----------
  // Each: { id, name, category, rarity, price, desc }
  // Visual styling lives in styles.css via body[data-arena="id"]
  const ARENAS = [
    // Default (free)
    { id: "neon-cyber-city", name: "Neon Cyber City", category: "Cities", rarity: "common", price: 0, desc: "Neon-lit megacity nightscape. The default arena." },

    // Nature
    { id: "sakura-garden", name: "Sakura Garden", category: "Nature", rarity: "common", price: 80, desc: "Pink blossoms drifting on a spring breeze." },
    { id: "deep-forest", name: "Deep Forest", category: "Nature", rarity: "common", price: 80, desc: "Ancient trees and mossy stones." },
    { id: "jungle-temple", name: "Jungle Temple", category: "Nature", rarity: "rare", price: 180, desc: "Vines swallowing forgotten temples." },
    { id: "waterfall-valley", name: "Waterfall Valley", category: "Nature", rarity: "rare", price: 180, desc: "Mist and rushing waterfalls." },
    { id: "frozen-lake", name: "Frozen Lake", category: "Nature", rarity: "rare", price: 200, desc: "Crystalline ice under pale skies." },
    { id: "crystal-cave", name: "Crystal Cave", category: "Nature", rarity: "epic", price: 320, desc: "Glowing crystals in deep caverns." },
    { id: "desert-oasis", name: "Desert Oasis", category: "Nature", rarity: "rare", price: 200, desc: "A hidden pool amid endless dunes." },
    { id: "rainbow-meadow", name: "Rainbow Meadow", category: "Nature", rarity: "epic", price: 320, desc: "Colorful wildflowers as far as the eye can see." },
    { id: "mushroom-forest", name: "Mushroom Forest", category: "Nature", rarity: "epic", price: 350, desc: "Giant glowing mushrooms tower above." },
    { id: "ancient-tree", name: "Ancient Tree", category: "Nature", rarity: "legendary", price: 500, desc: "The world tree, roots reaching through time." },
    { id: "forest-adventure", name: "Forest Adventure", category: "Nature", rarity: "common", price: 100, desc: "Sun-dappled woodland paths." },
    { id: "underwater-ocean", name: "Underwater Ocean", category: "Nature", rarity: "rare", price: 220, desc: "Coral reefs and shimmering fish." },

    // Fantasy
    { id: "dragon-kingdom", name: "Dragon Kingdom", category: "Fantasy", rarity: "legendary", price: 600, desc: "Where dragons rule the skies." },
    { id: "wizard-tower", name: "Wizard Tower", category: "Fantasy", rarity: "epic", price: 380, desc: "Arcane tomes and floating runes." },
    { id: "fairy-world", name: "Fairy World", category: "Fantasy", rarity: "epic", price: 360, desc: "Tiny lights and enchanted glades." },
    { id: "demon-castle", name: "Demon Castle", category: "Fantasy", rarity: "legendary", price: 550, desc: "Crimson halls of the demon king." },
    { id: "angel-heaven", name: "Angel Heaven", category: "Fantasy", rarity: "legendary", price: 600, desc: "Cloud cities above the dawn." },
    { id: "dark-dimension", name: "Dark Dimension", category: "Fantasy", rarity: "mythic", price: 900, desc: "A void where logic bends." },
    { id: "magic-school", name: "Magic School", category: "Fantasy", rarity: "epic", price: 380, desc: "Classrooms of spellcraft." },
    { id: "crystal-palace", name: "Crystal Palace", category: "Fantasy", rarity: "legendary", price: 520, desc: "Frozen throne of crystal monarchs." },
    { id: "floating-islands", name: "Floating Islands", category: "Fantasy", rarity: "legendary", price: 580, desc: "Continents adrift in the sky." },
    { id: "mythical-arena", name: "Mythical Arena", category: "Fantasy", rarity: "mythic", price: 950, desc: "Where legends are forged." },
    { id: "dragon-arena", name: "Dragon Arena", category: "Fantasy", rarity: "legendary", price: 500, desc: "An arena ringed with dragon fire." },

    // Space
    { id: "space-galaxy", name: "Space Galaxy", category: "Space", rarity: "rare", price: 200, desc: "Spiral arms of distant stars." },
    { id: "moon-base", name: "Moon Base", category: "Space", rarity: "epic", price: 350, desc: "Lunar colony under Earthrise." },
    { id: "mars-colony", name: "Mars Colony", category: "Space", rarity: "epic", price: 380, desc: "Red dust and biodomes." },
    { id: "black-hole", name: "Black Hole", category: "Space", rarity: "mythic", price: 1000, desc: "Event horizon of pure gravity." },
    { id: "saturn-rings", name: "Saturn Rings", category: "Space", rarity: "legendary", price: 550, desc: "Orbit through glittering ice rings." },
    { id: "alien-planet", name: "Alien Planet", category: "Space", rarity: "epic", price: 400, desc: "Bioluminescent alien flora." },
    { id: "galactic-station", name: "Galactic Station", category: "Space", rarity: "legendary", price: 500, desc: "Hub of interstellar travel." },
    { id: "nebula", name: "Nebula", category: "Space", rarity: "epic", price: 420, desc: "Stellar nursery of pink and violet." },
    { id: "starship-bridge", name: "Starship Bridge", category: "Space", rarity: "legendary", price: 520, desc: "Command deck among the stars." },
    { id: "cosmic-battlefield", name: "Cosmic Battlefield", category: "Space", rarity: "mythic", price: 900, desc: "War across the void." },
    { id: "parallel-universe", name: "Parallel Universe", category: "Space", rarity: "mythic", price: 950, desc: "Reality with different rules." },

    // Cities
    { id: "tokyo-night", name: "Tokyo Night", category: "Cities", rarity: "rare", price: 220, desc: "Akihabara neon and ramen steam." },
    { id: "new-york-rooftops", name: "New York Rooftops", category: "Cities", rarity: "rare", price: 220, desc: "Skyscraper gaps at golden hour." },
    { id: "dubai-skyline", name: "Dubai Skyline", category: "Cities", rarity: "epic", price: 380, desc: "Glass towers over desert gold." },
    { id: "london-fog", name: "London Fog", category: "Cities", rarity: "rare", price: 200, desc: "Cobblestones under grey mist." },
    { id: "abandoned-city", name: "Abandoned City", category: "Cities", rarity: "epic", price: 360, desc: "Nature reclaiming concrete." },
    { id: "underground-metro", name: "Underground Metro", category: "Cities", rarity: "rare", price: 220, desc: "Tiled tunnels and yellow lights." },
    { id: "cyberpunk-street", name: "Cyberpunk Street", category: "Cities", rarity: "epic", price: 400, desc: "Rain-slicked holographic alleyways." },
    { id: "future-megacity", name: "Future Megacity", category: "Cities", rarity: "legendary", price: 550, desc: "Vertical city of tomorrow." },
    { id: "rooftop-arena", name: "Rooftop Arena", category: "Cities", rarity: "rare", price: 220, desc: "A duel atop the city." },

    // Adventure
    { id: "pirate-ship", name: "Pirate Ship", category: "Adventure", rarity: "rare", price: 240, desc: "Deck of a galleon at sunset." },
    { id: "lost-island", name: "Lost Island", category: "Adventure", rarity: "epic", price: 380, desc: "Palm shadows on white sand." },
    { id: "ancient-egypt", name: "Ancient Egypt", category: "Adventure", rarity: "epic", price: 380, desc: "Sand-swept pharaoh tombs." },
    { id: "pyramid-chamber", name: "Pyramid Chamber", category: "Adventure", rarity: "legendary", price: 520, desc: "Gold-lit inner sanctum." },
    { id: "viking-village", name: "Viking Village", category: "Adventure", rarity: "rare", price: 240, desc: "Longhouses under northern lights." },
    { id: "wild-west", name: "Wild West", category: "Adventure", rarity: "rare", price: 220, desc: "Dust and saloon doors swinging." },
    { id: "treasure-dungeon", name: "Treasure Dungeon", category: "Adventure", rarity: "epic", price: 380, desc: "Gold piled in forgotten crypts." },
    { id: "underwater-kingdom", name: "Underwater Kingdom", category: "Adventure", rarity: "legendary", price: 550, desc: "Atlantis reborn in coral." },
    { id: "volcano-core", name: "Volcano Core", category: "Adventure", rarity: "legendary", price: 500, desc: "Molten rock and rising heat." },
    { id: "jurassic-world", name: "Jurassic World", category: "Adventure", rarity: "epic", price: 420, desc: "Ferns as tall as dinosaurs." },
    { id: "lava-volcano", name: "Lava Volcano", category: "Adventure", rarity: "epic", price: 380, desc: "River of lava down the slopes." },
    { id: "desert-temple", name: "Desert Temple", category: "Adventure", rarity: "rare", price: 240, desc: "Sandstone columns in the sun." },

    // Games & Entertainment
    { id: "arcade-world", name: "Arcade World", category: "Games", rarity: "epic", price: 380, desc: "Rows of cabinets blinking." },
    { id: "pixel-kingdom", name: "Pixel Kingdom", category: "Games", rarity: "epic", price: 380, desc: "8-bit castle and chip-tune breeze." },
    { id: "candy-land", name: "Candy Land", category: "Games", rarity: "rare", price: 240, desc: "Lollipop trees and frosting hills." },
    { id: "candy-kingdom", name: "Candy Kingdom", category: "Games", rarity: "epic", price: 380, desc: "Royal palace of spun sugar." },
    { id: "toy-world", name: "Toy World", category: "Games", rarity: "rare", price: 220, desc: "Oversized blocks and plastic friends." },
    { id: "football-stadium", name: "Football Stadium", category: "Games", rarity: "rare", price: 240, desc: "Pitch under floodlights." },
    { id: "racing-arena", name: "Racing Arena", category: "Games", rarity: "epic", price: 380, desc: "Checkered flags and burning rubber." },
    { id: "chess-kingdom", name: "Chess Kingdom", category: "Games", rarity: "legendary", price: 520, desc: "Black and white marble squares." },
    { id: "lava-battlefield", name: "Lava Battlefield", category: "Games", rarity: "epic", price: 380, desc: "Embers and scorched earth." },
    { id: "glitch-world", name: "Glitch World", category: "Games", rarity: "mythic", price: 900, desc: "Reality corrupted by data." },
    { id: "golden-temple", name: "Golden Temple", category: "Games", rarity: "mythic", price: 950, desc: "Sacred gold-leafed sanctuary." },
    { id: "golden-palace", name: "Golden Palace", category: "Games", rarity: "legendary", price: 580, desc: "Throne room of pure gold." },
    { id: "retro-arcade", name: "Retro Arcade", category: "Games", rarity: "rare", price: 240, desc: "CRT glow and scanlines." },

    // Special
    { id: "rainbow-world", name: "Rainbow World", category: "Special", rarity: "mythic", price: 800, desc: "A world painted in every color." },
    { id: "shadow-dimension", name: "Shadow Dimension", category: "Special", rarity: "legendary", price: 550, desc: "Only silhouettes remain." },
    { id: "futuristic-laboratory", name: "Futuristic Laboratory", category: "Special", rarity: "epic", price: 400, desc: "Cold steel and holographic readouts." },
    { id: "block-world", name: "Block World", category: "Special", rarity: "rare", price: 240, desc: "Voxel landscapes, blocky creatures." },
    { id: "haunted-graveyard", name: "Haunted Graveyard", category: "Special", rarity: "epic", price: 380, desc: "Crooked tombstones under a pale moon." },
    { id: "ice-kingdom", name: "Ice Kingdom", category: "Special", rarity: "legendary", price: 500, desc: "Frozen spires of the north." },
  ];

  // ---------- SYMBOL PACKS ----------
  // Each: { id, name, xChar, oChar, style (CSS class for .mark), price, rarity }
  // xChar/oChar are the actual text/emoji/character displayed.
  const SYMBOL_PACKS = [
    { id: "classic", name: "Classic X & O", xChar: "✕", oChar: "◯", style: "classic", price: 0, rarity: "common", desc: "The timeless original." },
    { id: "neon", name: "Neon Glow", xChar: "✕", oChar: "◯", style: "neon", price: 80, rarity: "common", desc: "Glowing electric neon." },
    { id: "lightning", name: "Lightning & Orb", xChar: "⚡", oChar: "🔵", style: "lightning", price: 150, rarity: "rare", desc: "Bolt of lightning vs energy orb." },
    { id: "fire", name: "Fire & Ice", xChar: "🔥", oChar: "❄", style: "fire", price: 180, rarity: "rare", desc: "Flames vs frost." },
    { id: "star", name: "Star & Moon", xChar: "★", oChar: "☾", style: "star", price: 150, rarity: "rare", desc: "Twinkling stars and crescent moons." },
    { id: "diamond", name: "Diamond & Heart", xChar: "◆", oChar: "♥", style: "diamond", price: 200, rarity: "rare", desc: "Cuts of crystal and love." },
    { id: "skull", name: "Skull & Ghost", xChar: "☠", oChar: "👻", style: "skull", price: 220, rarity: "epic", desc: "Spooky duo from beyond." },
    { id: "sword", name: "Sword & Shield", xChar: "⚔", oChar: "🛡", style: "sword", price: 220, rarity: "epic", desc: "Knight's eternal duel." },
    { id: "crown", name: "Crown & Ring", xChar: "♛", oChar: "◯", style: "crown", price: 280, rarity: "epic", desc: "Royal power and the one ring." },
    { id: "robot", name: "Robot & Alien", xChar: "🤖", oChar: "👽", style: "robot", price: 260, rarity: "epic", desc: "Earth tech vs visitors from afar." },
    { id: "flower", name: "Flower & Butterfly", xChar: "✿", oChar: "🦋", style: "flower", price: 220, rarity: "rare", desc: "Garden harmony." },
    { id: "pixel", name: "Pixel X & O", xChar: "X", oChar: "O", style: "pixel", price: 180, rarity: "rare", desc: "8-bit arcade nostalgia." },
    { id: "golden", name: "Golden Symbols", xChar: "✕", oChar: "◯", style: "golden", price: 400, rarity: "legendary", desc: "Pure gold finish." },
    { id: "holographic", name: "Holographic", xChar: "✕", oChar: "◯", style: "holographic", price: 500, rarity: "legendary", desc: "Shifting rainbow hologram." },
    { id: "animated", name: "Animated Symbols", xChar: "✨", oChar: "💫", style: "animated", price: 600, rarity: "mythic", desc: "Living, floating symbols." },
  ];

  // ---------- AVATAR FRAMES ----------
  const FRAMES = [
    { id: "default", name: "Default", price: 0, rarity: "common", desc: "Plain circle frame.", css: "border-color: var(--accent-2);" },
    { id: "neon", name: "Neon Frame", price: 120, rarity: "rare", desc: "Cyan glowing ring.", css: "border-color: #22d3ee; box-shadow: 0 0 12px #22d3ee, inset 0 0 12px #22d3ee;" },
    { id: "fire", name: "Fire Frame", price: 200, rarity: "rare", desc: "Burning ember border.", css: "border-color: #f97316; box-shadow: 0 0 14px #f97316, inset 0 0 12px #dc2626;" },
    { id: "gold", name: "Gold Frame", price: 400, rarity: "legendary", desc: "Solid gold ring.", css: "border-color: #fcd34d; box-shadow: 0 0 14px #fcd34d, inset 0 0 10px #b8860b;" },
    { id: "rainbow", name: "Rainbow Frame", price: 600, rarity: "mythic", desc: "Cycling rainbow.", css: "border: 3px solid transparent; background: linear-gradient(white, white) padding-box, linear-gradient(135deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #a855f7) border-box; background-size: 300% 300%; animation: rainbowShift 8s linear infinite;" },
    { id: "void", name: "Void Frame", price: 800, rarity: "mythic", desc: "Swirling dark energy.", css: "border-color: #a855f7; box-shadow: 0 0 20px #a855f7, inset 0 0 14px #2a0a3a; animation: fogDrift 4s ease-in-out infinite;" },
  ];

  // ---------- ACHIEVEMENTS ----------
  const ACHIEVEMENTS = [
    { id: "first-win", name: "First Victory", desc: "Win your first match.", icon: "🏆", reward: 50 },
    { id: "win-10", name: "Decimator", desc: "Win 10 matches.", icon: "⚔", reward: 100 },
    { id: "win-50", name: "Champion", desc: "Win 50 matches.", icon: "🥇", reward: 300 },
    { id: "win-100", name: "Centurion", desc: "Win 100 matches.", icon: "👑", reward: 600 },
    { id: "streak-3", name: "Hat Trick", desc: "Win 3 in a row.", icon: "🔥", reward: 80 },
    { id: "streak-5", name: "On Fire", desc: "Win 5 in a row.", icon: "🔥", reward: 150 },
    { id: "streak-10", name: "Unstoppable", desc: "Win 10 in a row.", icon: "🌋", reward: 400 },
    { id: "draw-5", name: "Diplomat", desc: "Draw 5 matches.", icon: "🤝", reward: 60 },
    { id: "beat-impossible", name: "Tied the Untied", desc: "Draw against Impossible AI.", icon: "🧠", reward: 500 },
    { id: "beat-hard", name: "Strategist", desc: "Beat Hard AI.", icon: "🎯", reward: 200 },
    { id: "beat-expert", name: "Grand Tactician", desc: "Beat Expert AI.", icon: "🎓", reward: 300 },
    { id: "play-4x4", name: "Bigger Picture", desc: "Play a 4×4 match.", icon: "🔲", reward: 50 },
    { id: "play-5x5", name: "Wide Open", desc: "Play a 5×5 match.", icon: "🔲", reward: 80 },
    { id: "play-7x7", name: "Strategist Plus", desc: "Play a 7×7 match.", icon: "🗺", reward: 150 },
    { id: "play-10x10", name: "Tactician Supreme", desc: "Play a 10×10 match.", icon: "🌐", reward: 250 },
    { id: "buy-arena", name: "Collector", desc: "Buy your first arena.", icon: "🖼", reward: 50 },
    { id: "own-10-arenas", name: "Gallery", desc: "Own 10 arenas.", icon: "🏛", reward: 200 },
    { id: "own-25-arenas", name: "Curator", desc: "Own 25 arenas.", icon: "🏛", reward: 400 },
    { id: "own-50-arenas", name: "Connoisseur", desc: "Own 50 arenas.", icon: "💎", reward: 800 },
    { id: "buy-symbol", name: "Stylish", desc: "Buy your first symbol pack.", icon: "✨", reward: 40 },
    { id: "level-10", name: "Rising Star", desc: "Reach level 10.", icon: "⭐", reward: 100 },
    { id: "level-25", name: "Veteran", desc: "Reach level 25.", icon: "🌟", reward: 300 },
    { id: "level-50", name: "Master", desc: "Reach level 50.", icon: "💫", reward: 600 },
    { id: "level-100", name: "Ultimate Legend", desc: "Reach level 100.", icon: "🌠", reward: 1500 },
    { id: "redeem-code", name: "Code Breaker", desc: "Redeem any code.", icon: "🎁", reward: 0 },
    { id: "unlimited-mode", name: "Infinite Wealth", desc: "Activate Unlimited R Coin mode.", icon: "♾", reward: 0 },
    { id: "lan-match", name: "Connected", desc: "Play a LAN multiplayer match.", icon: "🔗", reward: 100 },
    { id: "local-multiplayer", name: "Couch Co-op", desc: "Play a local multiplayer match.", icon: "👥", reward: 50 },
  ];

  // ---------- DAILY MISSIONS ----------
  // Each mission is randomly chosen from these templates per day.
  const MISSION_TEMPLATES = [
    { id: "win-1", text: "Win 1 match", target: 1, type: "wins", reward: 30 },
    { id: "win-3", text: "Win 3 matches", target: 3, type: "wins", reward: 80 },
    { id: "play-3", text: "Play 3 matches", target: 3, type: "plays", reward: 40 },
    { id: "play-5", text: "Play 5 matches", target: 5, type: "plays", reward: 70 },
    { id: "draw-1", text: "Draw 1 match", target: 1, type: "draws", reward: 50 },
    { id: "streak-2", text: "Win 2 in a row", target: 2, type: "streak", reward: 60 },
    { id: "big-board", text: "Play 1 match on a 5×5 or bigger board", target: 1, type: "bigboard", reward: 50 },
    { id: "beat-medium", text: "Beat Medium AI once", target: 1, type: "beat-medium", reward: 50 },
    { id: "beat-hard", text: "Beat Hard AI once", target: 1, type: "beat-hard", reward: 80 },
    { id: "use-symbol", text: "Equip a non-classic symbol pack", target: 1, type: "use-symbol", reward: 30 },
  ];

  // ---------- LEVELS (100+) ----------
  // XP required to go from level N to N+1 is 100 + (N-1)*40 (mild curve)
  // Each level has a title tier; titles change every few levels.
  function buildLevelTable() {
    const tiers = [
      { min: 1, max: 5, title: "Beginner" },
      { min: 6, max: 10, title: "Rookie" },
      { min: 11, max: 20, title: "Skilled Player" },
      { min: 21, max: 30, title: "Pro" },
      { min: 31, max: 40, title: "Expert" },
      { min: 41, max: 50, title: "Master" },
      { min: 51, max: 60, title: "Elite" },
      { min: 61, max: 70, title: "Champion" },
      { min: 71, max: 80, title: "Legendary" },
      { min: 81, max: 90, title: "Mythic" },
      { min: 91, max: 99, title: "Grandmaster" },
      { min: 100, max: 999, title: "Ultimate Legend" },
    ];
    const levels = [];
    let cumulative = 0;
    for (let n = 1; n <= 120; n++) {
      const xpForThisLevel = 100 + (n - 1) * 40;
      cumulative += xpForThisLevel;
      const tier = tiers.find(t => n >= t.min && n <= t.max) || tiers[tiers.length - 1];
      levels.push({
        level: n,
        title: tier.title,
        xpToNext: xpForThisLevel,
        totalXp: cumulative,
        reward: (n % 10 === 0) ? 200 : (n % 5 === 0 ? 80 : 20), // bonus every 5/10 levels
      });
    }
    return levels;
  }
  const LEVELS = buildLevelTable();

  function titleForLevel(n) {
    const lv = LEVELS.find(l => l.level === n) || LEVELS[LEVELS.length - 1];
    return lv ? lv.title : "Ultimate Legend";
  }
  function levelForXp(xp) {
    // Returns { level, title, xpIntoLevel, xpForNext }
    let level = 1;
    let remaining = xp;
    for (let i = 0; i < LEVELS.length; i++) {
      const lv = LEVELS[i];
      if (remaining < lv.xpToNext) {
        return { level: lv.level, title: lv.title, xpIntoLevel: remaining, xpForNext: lv.xpToNext };
      }
      remaining -= lv.xpToNext;
      level = lv.level + 1;
    }
    const last = LEVELS[LEVELS.length - 1];
    return { level: last.level + 1, title: "Ultimate Legend", xpIntoLevel: remaining, xpForNext: last.xpToNext };
  }

  // ---------- REDEEM CODES ----------
  // RABBi is special: enables unlimited mode.
  // Other codes award coins once per profile.
  const REDEEM_CODES = {
    "rabbi": { type: "unlimited", label: "RABBi" },
    "welcome100": { type: "coins", amount: 100, label: "WELCOME100" },
    "arena500": { type: "coins", amount: 500, label: "ARENA500" },
    "starter250": { type: "coins", amount: 250, label: "STARTER250" },
  };

  // ---------- COIN REWARDS ----------
  const REWARDS = {
    winSolo: { easy: 15, medium: 25, hard: 40, expert: 60, impossible: 100 },
    winLocal: 20,
    winLan: 35,
    draw: 8,
    loss: 3,
    dailyLogin: 50,
    levelUp: (level) => (level % 10 === 0 ? 200 : level % 5 === 0 ? 80 : 20),
  };

  // ---------- XP REWARDS ----------
  const XP_REWARDS = {
    play: 10,
    win: 25,
    draw: 12,
    loss: 5,
    beatImpossible: 80,
    beatExpert: 50,
    beatHard: 30,
    beatMedium: 18,
    beatEasy: 8,
    mission: 20,
    achievement: 30,
    bigBoard: 15, // bonus for >=5x5
  };

  // ---------- BOARD SIZE -> ALLOWED WIN LENGTHS ----------
  const BOARD_RULES = {
    3: [3],
    4: [3, 4],
    5: [4, 5],
    6: [4, 5],
    7: [4, 5, 6],
    8: [5, 6, 7],
    9: [5, 6],
    10: [5, 6, 7],
  };

  // ---------- EXPORT ----------
  window.ARENAS = ARENAS;
  window.ARENA_MAP = Object.fromEntries(ARENAS.map(a => [a.id, a]));
  window.SYMBOL_PACKS = SYMBOL_PACKS;
  window.SYMBOL_MAP = Object.fromEntries(SYMBOL_PACKS.map(s => [s.id, s]));
  window.FRAMES = FRAMES;
  window.FRAME_MAP = Object.fromEntries(FRAMES.map(f => [f.id, f]));
  window.ACHIEVEMENTS = ACHIEVEMENTS;
  window.MISSION_TEMPLATES = MISSION_TEMPLATES;
  window.LEVELS = LEVELS;
  window.titleForLevel = titleForLevel;
  window.levelForXp = levelForXp;
  window.REDEEM_CODES = REDEEM_CODES;
  window.REWARDS = REWARDS;
  window.XP_REWARDS = XP_REWARDS;
  window.BOARD_RULES = BOARD_RULES;
})();
