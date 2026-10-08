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

  // Only `hash` is excluded. `signature` REMAINS part of the HMAC
  // data-check-string -- verified empirically against live Telegram initData
  // (Ed25519 verified true; HMAC matched only with `signature` included).
  // The third-party Ed25519 path is the one that excludes both fields, because
  // that data-check-string is prefixed with "<bot_id>:WebAppData".
  params.delete("hash");

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
 * Telegram sends /start payloads either as `/start ref`, `/start@BotName ref`,
 * or as `ref` for deep links. Returns a normalised username (no leading @) or
 * null when the message carries no payload.
 *
 * The command name is never a referral: `/start` alone means "no payload", and
 * `/start@SomeBot` is a command aimed at a specific bot in group chats.
 */
function parseReferralPayload(payload) {
  if (!payload) return null;

  const cleaned = String(payload).trim();
  if (!cleaned) return null;

  // Explicit command form: `/start`, `/start ref`, `/start@BotName ref`, and the
  // deep-link style `start=ref`. The bot-name suffix is only matched when it is
  // attached to the command, so a real payload like `/start @ref` survives.
  const command = cleaned.match(/^\/?start(?:@\w+)?(?:[=\s]+(.*))?$/);
  if (command) {
    return normalise(command[1]);
  }

  // Anything else is a bare deep-link payload (`ref`).
  return normalise(cleaned);
}

function normalise(value) {
  const cleaned = String(value ?? "")
    .replace(/^@/, "")
    .trim();
  return cleaned || null;
}

module.exports = { validateInitData, parseReferralPayload };