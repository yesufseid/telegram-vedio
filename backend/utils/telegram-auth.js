const crypto = require("crypto");

const AUTH_DATE_TTL_SECONDS = 60 * 60 * 24; // initData older than 24h is rejected

/**
 * Validates Telegram Mini App `initData` using the documented HMAC-SHA256
 * secret_key = HMAC_SHA256(bot_token, "WebAppData") scheme and returns the
 * Telegram user object. Throws when the payload cannot be trusted.
 */
function validateInitData(initData) {
  if (typeof initData !== "string" || !initData.trim()) {
    throw new Error("Missing Telegram initData");
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) throw new Error("BOT_TOKEN is not configured");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing initData hash");

  params.delete("hash");
  params.delete("signature");

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => [key, value].join("="))
    .sort()
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const provided = Buffer.from(hash, "utf8");
  const computed = Buffer.from(computedHash, "utf8");
  if (provided.length !== computed.length || !crypto.timingSafeEqual(provided, computed)) {
    throw new Error("Invalid initData signature");
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Number.isNaN(authDate)) throw new Error("Invalid auth_date");
  if (Math.floor(Date.now() / 1000) - authDate > AUTH_DATE_TTL_SECONDS) {
    throw new Error("initData is too old");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("initData does not contain a user");

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new Error("Malformed initData user payload");
  }

  if (!user || typeof user.id !== "number") throw new Error("Invalid Telegram user id");

  return user;
}

/**
 * Telegram sends /start payloads either as `/start ref` or as `ref` for deep
 * links. Returns a normalised username (no leading @) or null.
 */
function parseReferralPayload(payload) {
  if (!payload) return null;

  const cleaned = String(payload).trim().replace(/^\//, "").trim();
  if (!cleaned) return null;

  const candidate = cleaned.startsWith("start=") ? cleaned.slice("start=".length) : cleaned;
  const value = candidate.replace(/^@/, "").trim();
  return value || null;
}

module.exports = { validateInitData, parseReferralPayload };