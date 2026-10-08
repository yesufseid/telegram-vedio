const express = require("express");
const cors = require("cors");

require("dotenv").config();

const { telegramBotInit, handleUpdate } = require("./controllers/telegram-webhook");
const { startTelegramPolling } = require("./utils/telegram-poller");
const router = require("./routes/router");
const errorHandler = require("./middleware/error-hendler");
const notFound = require("./middleware/not-found");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use("/", router);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3005;

let poller = null;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  if (process.env.BOT_TOKEN && process.env.MINI_APP_URL) {
    telegramBotInit().catch((err) => console.error("Telegram bot init failed:", err.message));
  } else {
    console.warn("⚠️  BOT_TOKEN / MINI_APP_URL missing, Telegram bot initialisation skipped");
  }

  // Updates arrive by long polling, so the bot needs no public HTTPS endpoint.
  if (process.env.BOT_TOKEN) {
    poller = startTelegramPolling({ handleUpdate });
    console.log("📡 Telegram polling started");
  } else {
    console.warn("⚠️  BOT_TOKEN missing, Telegram polling skipped");
  }
});

// pool.js owns process exit; this only releases the in-flight getUpdates call.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (poller) poller.stop();
  });
}