const express = require("express");
const router = express.Router();

const users = require("../db/users");
const { isValidSecretToken } = require("../utils/telegram");
const { requireSession } = require("../middleware/requireSession");
const { telegramWebhook } = require("../controllers/telegram-webhook");
const {
  auth,
  me,
  ready,
  listVerifications,
  startVerification,
  completeVerification,
} = require("../controllers/miniapp");

router.get("/health", async (req, res) => {
  try {
    const database = await users.ping();
    return res.json({ status: database ? "ok" : "degraded", database });
  } catch (err) {
    return res.status(503).json({ status: "down", database: false, message: err.message });
  }
});

router.post("/telegram/webhook", (req, res) => {
  if (!isValidSecretToken(req.get("X-Telegram-Bot-Api-Secret-Token"))) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  return telegramWebhook(req, res);
});

router.post("/api/miniapp/auth", auth);
router.get("/api/miniapp/me", requireSession, me);
router.post("/api/miniapp/ready", requireSession, ready);
router.get("/api/miniapp/verifications", requireSession, listVerifications);
router.post("/api/miniapp/verifications/:id/start", requireSession, startVerification);
router.post("/api/miniapp/verifications/complete", requireSession, completeVerification);

module.exports = router;