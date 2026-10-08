const users = require("../db/users");
const telegram = require("../utils/telegram");

/**
 * Referral is stored as a plain Telegram username string (never a foreign key).
 * An unknown referral falls back to the SUPERADMIN username; if no SUPERADMIN
 * exists we refuse the registration instead of storing an invalid relationship.
 */
async function resolveReferralUsername(payloadReferral) {
  const superadmin = await users.findSuperadmin();

  if (payloadReferral) {
    const referrer = await users.findByUsername(payloadReferral);
    if (referrer) return { referral: referrer.username || payloadReferral, referrer, superadmin };
    if (!superadmin || !superadmin.username) {
      const err = new Error("Referral is invalid and no SUPERADMIN fallback is configured");
      err.status = 400;
      throw err;
    }
    return { referral: superadmin.username, referrer: superadmin, superadmin };
  }

  if (!superadmin || !superadmin.username) {
    const err = new Error("No SUPERADMIN is configured to attribute the referral to");
    err.status = 503;
    throw err;
  }

  return { referral: superadmin.username, referrer: superadmin, superadmin };
}

/**
 * Creates (or returns the already existing) user for the given Telegram chat.
 * Registration always uses role = USER and never trusts a client supplied role.
 */
/**
 * Phone number collection was removed on 2026-10-08, so `phoneNumber` is
 * optional. The column is nullable in Neon and stays null unless a caller
 * supplies one (e.g. a future admin import).
 */
async function registerUser({ telegramChatId, username, phoneNumber = null, payloadReferral }) {
  if (!telegramChatId) {
    const err = new Error("A Telegram chat id is required to register");
    err.status = 400;
    throw err;
  }

  const existing = await users.findByTelegramChatId(telegramChatId);
  if (existing) {
    return { user: existing, created: false, referrer: null };
  }

  const { referral, referrer } = await resolveReferralUsername(payloadReferral);
  const result = await users.insertUser({
    username,
    phoneNumber,
    telegramChatId,
    role: users.ROLES.USER,
    referral,
  });

  return { user: result.user, created: result.created, referrer: result.created ? referrer : null };
}

/**
 * Telegram message to the referrer announcing the new registration. The phone
 * number is only included when one is actually stored, since phone collection
 * was removed; the username is the primary identifier.
 */
async function notifyReferralOfRegistration(referrer, referredUser) {
  if (!referrer || !referrer.telegramChatId) return false;

  const lines = ["A new user has registered using your referral.", ""];
  lines.push(`Username: ${referredUser.username ? `@${referredUser.username}` : "not set"}`);
  if (referredUser.phoneNumber) {
    lines.push(`Phone: ${referredUser.phoneNumber}`);
  }

  await telegram.sendMessage(referrer.telegramChatId, lines.join("\n"));
  return true;
}

module.exports = {
  resolveReferralUsername,
  registerUser,
  notifyReferralOfRegistration,
};