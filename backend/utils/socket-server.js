const WebSocket = require("ws");
const session = require("./session");
const { EVENTS } = require("./events");

const clients = {
  users: new Set(),
  admins: new Set(),
  sessions: new Map(),
};

const openSockets = (set) => {
  const result = [];
  for (const socket of set) {
    if (socket.readyState === WebSocket.OPEN) result.push(socket);
  }
  return result;
};

function addSession(userId, ws) {
  if (!clients.sessions.has(userId)) clients.sessions.set(userId, new Set());
  clients.sessions.get(userId).add(ws);
}

function removeSession(userId, ws) {
  const sockets = clients.sessions.get(userId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) clients.sessions.delete(userId);
}

function initializeWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🟢 New client connected");

    ws.once("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        console.error("Invalid JSON:", raw);
        ws.close();
        return;
      }

      ws.on("close", () => {
        clients.users.delete(ws);
        clients.admins.delete(ws);
        if (ws.userId) removeSession(ws.userId, ws);
        console.log("🔴 Client disconnected");
      });

      ws.on("error", (err) => console.error("WebSocket error:", err.message));

      if (msg.type === "IDENTIFY" && msg.token) {
        const user = session.verifySessionToken(msg.token);
        if (!user) {
          ws.send(JSON.stringify({ type: "AUTH_ERROR", message: "Invalid session" }));
          ws.close();
          return;
        }
        ws.userId = user.id;
        addSession(user.id, ws);
        ws.send(JSON.stringify({ type: "WELCOME", role: "user", userId: user.id }));
        return;
      }

      if (msg.type === "ROLE" && msg.role === "admin") {
        clients.admins.add(ws);
        console.log("👑 Admin connected");
        ws.on("message", (adminData) => {
          try {
            broadcastToUsers(JSON.parse(adminData));
          } catch {
            console.error("Invalid ADMIN data");
          }
        });
        ws.send(JSON.stringify({ type: "WELCOME", role: "admin" }));
        return;
      }

      if (msg.type === "ROLE" && msg.role === "user") {
        clients.users.add(ws);
        console.log("🙋 User connected");
        broadcastToAdmins({ type: "USER_CONNECTED", data: "A new user has connected" });
        ws.send(JSON.stringify({ type: "WELCOME", role: "user" }));
        ws.on("message", (userData) => {
          let parsed;
          try {
            parsed = JSON.parse(userData);
          } catch {
            console.error("Invalid user data");
            return;
          }
          if (parsed.type === "IDENTIFY" && parsed.token) {
            const user = session.verifySessionToken(parsed.token);
            if (!user) return;
            ws.userId = user.id;
            addSession(user.id, ws);
            return;
          }
          console.log("📩 User message:", parsed);
          broadcastToAdmins({ type: "USER_MESSAGE", data: parsed.data });
        });
        return;
      }

      console.error("❌ Unknown role");
      ws.close();
    });
  });

  return wss;
}

function broadcastToAdmins(data) {
  const payload = JSON.stringify(data);
  for (const admin of openSockets(clients.admins)) admin.send(payload);
}

function broadcastToUsers(data) {
  const payload = JSON.stringify(data);
  for (const user of openSockets(clients.users)) user.send(payload);
}

/**
 * Sends an event to every live socket of one authenticated Mini App user.
 * Returns false when the user has no connected session (never throws).
 */
function sendToUser(userId, type, data) {
  const sockets = clients.sessions.get(userId);
  if (!sockets || sockets.size === 0) return false;

  const payload = JSON.stringify({ type, data });
  let delivered = false;
  for (const socket of openSockets(sockets)) {
    try {
      socket.send(payload);
      delivered = true;
    } catch (err) {
      console.error(`Failed to deliver ${type} to ${userId}:`, err.message);
    }
  }
  return delivered;
}

function isOnline(userId) {
  const sockets = clients.sessions.get(userId);
  return Boolean(sockets && sockets.size > 0);
}

module.exports = {
  EVENTS,
  initializeWebSocket,
  broadcastToAdmins,
  broadcastToUsers,
  sendToUser,
  isOnline,
};