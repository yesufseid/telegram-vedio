const express = require("express");
const http = require("http");
const cors = require("cors");

require("dotenv").config();

const { initializeWebSocket } = require("./utils/socket-server");
const { telegramBotInit } = require("./controllers/telegram-webhook");
const router = require("./routes/router");
const errorHandler = require("./middleware/error-hendler");
const notFound = require("./middleware/not-found");

const app = express();
const server = http.createServer(app);

initializeWebSocket(server);

app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use("/", router);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3005;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  if (process.env.BOT_TOKEN && process.env.MINI_APP_URL) {
    telegramBotInit().catch((err) => console.error("Telegram bot init failed:", err.message));
  } else {
    console.warn("⚠️  BOT_TOKEN / MINI_APP_URL missing, Telegram bot initialisation skipped");
  }
});