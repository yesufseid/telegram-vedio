const WebSocket = require("ws");

const clients = {
  users: new Set(),
  admins: new Set(),
};

function initializeWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🟢 New client connected");

    // First message should define role: { type: "ROLE", role: "user" | "admin" }
    ws.once("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch (err) {
        console.error("Invalid JSON:", data);
        ws.close();
        return;
      }

      if (msg.type === "ROLE" && msg.role === "admin") {
        clients.admins.add(ws);
        console.log("👑 Admin connected");
       ws.on("message", (userData) => {
          let parsed;
          try {
            parsed = JSON.parse(userData);
          } catch (err) {
            console.error("Invalid ADMIN data");
            return;
          }
          broadcastToUsers(parsed)
        });
        
        ws.send(JSON.stringify({ type: "WELCOME", role: "admin" }));
      } else if (msg.type === "ROLE" && msg.role === "user") {
        clients.users.add(ws);
        console.log("🙋 User connected");

        // notify all admins
        broadcastToAdmins({
          type: "USER_CONNECTED",
          data: "A new user has connected",
        });

        ws.send(JSON.stringify({ type: "WELCOME", role: "user" }));

        // Forward all next messages from this user to admins
        ws.on("message", (userData) => {
          let parsed;
          try {
            parsed = JSON.parse(userData);
          } catch (err) {
            console.error("Invalid user data");
            return;
          }

          console.log("📩 User message:", parsed);
          broadcastToAdmins({
            type: "USER_MESSAGE",
            data: parsed.data,
          });
        });
      } else {
        console.error("❌ Unknown role");
        ws.close();
      }

      ws.on("close", () => {
        clients.users.delete(ws);
        clients.admins.delete(ws);
        console.log("🔴 Client disconnected");
      });
    });
  });
}

function broadcastToAdmins(data) {
  for (const admin of clients.admins) {
    if (admin.readyState === WebSocket.OPEN) {
      admin.send(JSON.stringify(data));
    }
  }
}

function broadcastToUsers(data) {
  for (const user of clients.users) {
    if (user.readyState === WebSocket.OPEN) {
      user.send(JSON.stringify(data));
    }
  }
}

module.exports = {
  initializeWebSocket,
  broadcastToAdmins,
  broadcastToUsers,
};
