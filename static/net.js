/* =========================================================
   net.js — WebSocket client for LAN room multiplayer.
   Exposed as window.Net (RoomClient).
   Connects to the Python FastAPI backend at /ws/{room_code}.
   ========================================================= */
(function () {
  "use strict";

  // Default server URL — can be overridden by the user.
  let serverUrl = "ws://localhost:8000";

  const RoomClient = {
    socket: null,
    roomCode: null,
    playerId: null,
    playerName: "Player",
    symbol: null, // "X" or "O" assigned by server
    onState: null, // callback(state)
    onJoined: null, // callback({ symbol, player_id })
    onError: null, // callback(message)
    onClose: null, // callback()
    onChat: null, // callback({from, symbol, text})
    isHost: false,
    connected: false,

    setServer(url) { serverUrl = url; },
    getServer() { return serverUrl; },

    // Create a room via REST, then connect via WS.
    async createRoom({ playerId, name, boardSize, winLen, serverUrl: srv }) {
      if (srv) serverUrl = srv;
      const base = serverUrl.replace(/^ws/, "http").replace(/\/$/, "");
      const resp = await fetch(`${base}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          name: name,
          board_size: boardSize,
          win_len: winLen,
        }),
      });
      if (!resp.ok) throw new Error(`Failed to create room (${resp.status})`);
      const data = await resp.json();
      this.roomCode = data.code;
      this.isHost = true;
      await this.connect({ playerId, name, roomCode: data.code });
      return data;
    },

    // Join an existing room by code via WS.
    async joinRoom({ playerId, name, roomCode, serverUrl: srv }) {
      if (srv) serverUrl = srv;
      this.roomCode = roomCode;
      this.isHost = false;
      await this.connect({ playerId, name, roomCode });
    },

    connect({ playerId, name, roomCode }) {
      return new Promise((resolve, reject) => {
        this.playerId = playerId;
        this.playerName = name;
        const url = `${serverUrl}/ws/${roomCode}`;
        try {
          this.socket = new WebSocket(url);
        } catch (e) {
          reject(e);
          return;
        }
        const timeout = setTimeout(() => {
          if (this.socket.readyState !== WebSocket.OPEN) {
            try { this.socket.close(); } catch (_) {}
            reject(new Error("Connection timed out. Is the Python server running?"));
          }
        }, 8000);

        this.socket.onopen = () => {
          clearTimeout(timeout);
          this.socket.send(JSON.stringify({
            type: "join",
            player_id: playerId,
            name: name,
          }));
        };
        this.socket.onmessage = (evt) => {
          let msg;
          try { msg = JSON.parse(evt.data); } catch (_) { return; }
          this.handleMessage(msg, resolve);
        };
        this.socket.onerror = () => {
          clearTimeout(timeout);
          if (!this.connected) reject(new Error("WebSocket error — server unreachable."));
        };
        this.socket.onclose = () => {
          const wasConnected = this.connected;
          this.connected = false;
          if (!wasConnected) {
            // never connected — reject
            // (resolve will not fire; reject already done by error/timeout)
          } else if (this.onClose) {
            this.onClose();
          }
        };
      });
    },

    handleMessage(msg, resolveJoin) {
      if (msg.type === "joined") {
        this.connected = true;
        this.symbol = msg.you.symbol;
        if (this.onJoined) this.onJoined(msg.you);
        if (this.onState) this.onState(msg.room);
        if (resolveJoin) resolveJoin(msg);
      } else if (msg.type === "state") {
        if (this.onState) this.onState(msg.room);
      } else if (msg.type === "chat") {
        if (this.onChat) this.onChat(msg);
      } else if (msg.type === "error") {
        if (this.onError) this.onError(msg.message);
      }
    },

    sendMove(index) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
      this.socket.send(JSON.stringify({ type: "move", index }));
      return true;
    },
    sendStart() {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
      this.socket.send(JSON.stringify({ type: "start" }));
      return true;
    },
    sendRematch() {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
      this.socket.send(JSON.stringify({ type: "rematch" }));
      return true;
    },
    sendChat(text) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
      this.socket.send(JSON.stringify({ type: "chat", text }));
      return true;
    },
    disconnect() {
      try { if (this.socket) this.socket.close(); } catch (_) {}
      this.socket = null;
      this.connected = false;
    },
  };

  // ---------- Export ----------
  window.Net = RoomClient;
})();
